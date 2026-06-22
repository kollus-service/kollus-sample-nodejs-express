/**
 * Kollus 콜백 처리 라우터
 * 재생(Play), DRM, 다음회차(Next Episode), LMS 콜백을 수신하고 규격에 맞는 응답을 반환합니다.
 */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { generateKollusToken } = require('../utils/jwt');
const config = require('../config');

const SECRET_KEY = config.KOLLUS_SECRET_KEY;
const CUSTOM_KEY = config.KOLLUS_CUSTOM_KEY;
const LOG_DIR = path.join(__dirname, '../logs');

// 콜백 JWT 만료 시간 (10분) — 재생 권한 응답은 단기 유효해야 함
const CALLBACK_JWT_EXPIRE_SEC = 600;
// 콘텐츠 만료 기간 (30일, 초 단위)
const CONTENT_EXPIRE_SEC = 60 * 60 * 24 * 30;

// 다음 회차 샘플 MCK 목록 — 실제 서비스에서는 DB/API 조회로 교체
const SAMPLE_NEXT_EPISODE_MCKS = config.NEXT_EPISODE_MCKS;

/**
 * Kollus 콜백 응답용 JWT를 HS256으로 서명합니다.
 * Kollus API는 jwt 라이브러리 없이 직접 서명을 요구합니다.
 *
 * @param {Object} payload - JWT 페이로드
 * @returns {string} 서명된 JWT 문자열
 */
function signCallbackJWT(payload) {
    const header = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'HS256' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const content = `${header}.${body}`;
    const sig = crypto.createHmac('sha256', SECRET_KEY).update(content).digest('base64url');
    return `${content}.${sig}`;
}

/**
 * Kollus 콜백 규격에 따라 JWT와 X-KOLLUS-USERKEY 헤더를 응답합니다.
 *
 * @param {import('express').Response} res
 * @param {Object} payload - 응답 페이로드
 */
function sendCallbackJWT(res, payload) {
    res.set('X-KOLLUS-USERKEY', CUSTOM_KEY);
    res.type('text/plain').send(signCallbackJWT(payload));
}

/**
 * 다음 회차 MCK를 반환합니다.
 * 샘플에서는 SAMPLE_NEXT_EPISODE_MCKS 목록에서 랜덤 반환합니다.
 * 실제 서비스에서는 currentMck 기준으로 DB 또는 API를 조회하여 구현합니다.
 *
 * @param {string} currentMck - 현재 재생 중인 미디어 콘텐츠 키
 * @returns {string|null} 다음 회차 MCK, 없으면 null
 */
function getNextMck(currentMck) {
    return SAMPLE_NEXT_EPISODE_MCKS[Math.floor(Math.random() * SAMPLE_NEXT_EPISODE_MCKS.length)];
}

// POST /callback/play — 재생 콜백
// kind1: 재생 만료 설정 (expiration_date 반환), kind3: 최종 재생 승인 (result만 반환)
router.post('/play', function (req, res) {
    const kind = parseInt(req.body.kind);
    const now = Math.floor(Date.now() / 1000);

    if (kind === 1) {
        sendCallbackJWT(res, {
            data: { expiration_date: now + CONTENT_EXPIRE_SEC, result: 1 },
            exp: now + CALLBACK_JWT_EXPIRE_SEC
        });
    } else if (kind === 3) {
        sendCallbackJWT(res, {
            data: { result: 1 },
            exp: now + CALLBACK_JWT_EXPIRE_SEC
        });
    } else {
        res.status(400).send('Unknown kind');
    }
});

// POST /callback/drm — DRM 콜백 (오프라인 콘텐츠 재생 권한 처리)
// 요청: items 파라미터에 JSON 배열 문자열 (kind별로 다운로드 승인/완료/재생 권한 확인)
// 응답: data 배열을 JWT로 반환
router.post('/drm', function (req, res) {
    let items;
    try {
        items = JSON.parse(req.body.items);
    } catch (e) {
        // items 파싱 실패: 잘못된 JSON 형식
        return res.status(400).send('Invalid items');
    }

    const now = Math.floor(Date.now() / 1000);

    const data = items.map(item => {
        const kind = parseInt(item.kind);

        if (kind === 1) {
            // 다운로드 승인: kind, media_content_key, expiration_date, result 필수
            return {
                kind: 1,
                media_content_key: item.media_content_key,
                expiration_date: now + CONTENT_EXPIRE_SEC,
                result: 1
            };
        } else if (kind === 2) {
            // 다운로드 완료 통보: kind, media_content_key, result 필수
            return {
                kind: 2,
                media_content_key: item.media_content_key,
                result: 1
            };
        } else if (kind === 3) {
            // 오프라인 재생 권한 확인: kind, media_content_key, start_at, result 필수
            return {
                kind: 3,
                media_content_key: item.media_content_key,
                start_at: item.start_at,
                result: 1
            };
        }
    }).filter(Boolean);

    sendCallbackJWT(res, { data });
});

// POST /callback/next-episode — 다음 회차 연속 재생 콜백
// 요청: mck(현재 콘텐츠 키), id(client_user_id)
// 응답: plain JSON { result, next_url } — next_url은 반드시 SI링크(/si) 형태
router.post('/next-episode', function (req, res) {
    const { mck, id } = req.body;

    const nextMck = getNextMck(mck);

    if (!nextMck) {
        return res.json({ result: 0 });
    }

    try {
        const { link } = generateKollusToken({
            secretKey: SECRET_KEY,
            customKey: CUSTOM_KEY,
            cuid: id || 'unknown',
            mck: nextMck,
            expt: 3
        });

        // Kollus 다음회차 콜백은 SI링크(/si) 형태를 요구함 — /s가 아님
        const nextUrl = link.replace('/s?', '/si?');

        res.json({ result: 1, next_url: nextUrl });
    } catch (err) {
        // 토큰 생성 실패: 결과 0으로 응답하여 플레이어가 연속 재생을 중단하도록 처리
        console.error('[Kollus] Next episode callback error:', err);
        res.json({ result: 0 });
    }
});

// POST /callback/lms — LMS 콜백 (시청 이력 및 학습 진도 데이터 수신)
// fire-and-forget: 데이터를 로그 파일에 기록하고 즉시 200 응답
router.post('/lms', async function (req, res) {
    try {
        await fs.mkdir(LOG_DIR, { recursive: true });
        const entry = JSON.stringify({ timestamp: new Date().toISOString(), ...req.body }) + '\n';
        await fs.appendFile(path.join(LOG_DIR, 'lms.log'), entry);
    } catch (err) {
        // 로그 기록 실패: 클라이언트 응답에는 영향 없음, 서버 로그로만 기록
        console.error('[Kollus] LMS log write error:', err);
    }

    res.sendStatus(200);
});

module.exports = router;
