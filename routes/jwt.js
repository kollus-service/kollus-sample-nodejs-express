/**
 * Kollus 플레이어 JWT 발급 라우터
 * GET(쿼리 파라미터)/POST(JSON 바디) /jwt/create로 표준 토큰을, /jwt/create-multidrm으로 Multi DRM 토큰을 발급합니다.
 */
const express = require('express');
const router = express.Router();
const { generateKollusToken, generateKollusMultiDrmToken, generatePallyConCustomHeaderValue, detectDrmProfile, DEFAULT_EXPIRY_MINUTES } = require('../utils/jwt');
const HTTP_STATUS = require('../utils/httpStatus');
const config = require('../config');

const SECRET_KEY = config.KOLLUS_SECRET_KEY;
const CUSTOM_KEY = config.KOLLUS_CUSTOM_KEY;
const MULTIDRM_SECRET_KEY = config.KOLLUS_MULTIDRM_SECRET_KEY;
const MULTIDRM_CUSTOM_KEY = config.KOLLUS_MULTIDRM_CUSTOM_KEY;
const PALLYCON_SITE_ID = config.PALLYCON_SITE_ID;
const PALLYCON_ACCESS_KEY = config.PALLYCON_ACCESS_KEY;
const PALLYCON_SITE_KEY = config.PALLYCON_SITE_KEY;
const PALLYCON_IV = config.PALLYCON_IV;

/**
 * JWT 생성 공통 로직 — GET/POST 요청 파라미터를 받아 토큰을 발급합니다.
 *
 * @param {Object} params - 요청 파라미터 (req.query 또는 req.body)
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function createJWT(params, res, next) {
    try {
        const {
            cuid,
            mck,
            expt,
            seek,
            intro,
            outro,
            title,
            playback_rates,
            video_watermarking_code_policy,
            subtitle_policy,
            play_section,
            mcpf,
            seekable_end,
            next_episode,
            playcallback_ignore,
            secretKey,
            customKey
        } = params;

        // 필수 파라미터 검증
        if (!mck) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                error: 'Missing required parameters: mck'
            });
        }

        const tokenParams = {
            secretKey: secretKey || SECRET_KEY,
            customKey: customKey || CUSTOM_KEY,
            cuid,
            mck,
            expt: parseInt(expt) || DEFAULT_EXPIRY_MINUTES,
            // 선택 파라미터
            ...(seek !== undefined && { seek: typeof seek === 'string' ? seek === 'true' : seek }),
            ...(intro && { intro }),
            ...(outro && { outro }),
            ...(title && { title }),
            ...(mcpf && { mcpf }),
            ...(seekable_end !== undefined && { seekable_end }),
            ...(next_episode !== undefined && { next_episode }),
            ...(playcallback_ignore !== undefined && { playcallback_ignore }),
            ...(playback_rates && { playback_rates }),
            ...(video_watermarking_code_policy && { video_watermarking_code_policy }),
            ...(subtitle_policy && { subtitle_policy }),
            ...(play_section && { play_section })
        };

        const result = generateKollusToken(tokenParams);
        res.json(result);
    } catch (error) {
        // 토큰 생성 실패: 상위 에러 핸들러로 전달
        next(error);
    }
}

// GET /jwt/create — 쿼리 파라미터로 토큰 발급
router.get('/create', function (req, res, next) {
    createJWT(req.query, res, next);
});

// POST /jwt/create — JSON 바디로 토큰 발급
router.post('/create', function (req, res, next) {
    createJWT(req.body, res, next);
});

/**
 * Multi DRM(Widevine/PlayReady/FairPlay) JWT 생성 공통 로직 — GET/POST 요청 파라미터를 받아 토큰을 발급합니다.
 *
 * @param {Object} params - 요청 파라미터 (req.query 또는 req.body)
 * @param {string} userAgent - 요청의 User-Agent 헤더 값 (drmType 미지정 시 자동 감지에 사용)
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function createMultiDrmJWT(params, userAgent, res, next) {
    try {
        const {
            cuid,
            mck,
            expt,
            siteId,
            cid,
            drmType,
            streamingType,
            duration,
            accessKey,
            siteKey,
            iv,
            secretKey,
            customKey
        } = params;

        // 필수 파라미터 검증
        if (!mck) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                error: 'Missing required parameters: mck'
            });
        }
        if (!cid) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                error: 'Missing required parameters: cid (Kollus 업로드 파일 키, mck와는 다른 값)'
            });
        }

        // Site ID는 고객사 서비스 계정 고정값이라 config.js 기본값 사용, 필요시 요청으로 오버라이드
        const resolvedSiteId = siteId || PALLYCON_SITE_ID;
        if (!resolvedSiteId) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                error: 'Missing required parameters: siteId (PallyCon Site ID)'
            });
        }

        // drmType이 명시되지 않으면 재생 브라우저의 User-Agent로 자동 감지 (Safari/iOS Chrome → FairPlay/hls, 그 외 → Widevine 또는 PlayReady/dash)
        const profile = drmType
            ? { drmType, streamingType: streamingType || (drmType === 'FairPlay' ? 'hls' : 'dash') }
            : detectDrmProfile(userAgent);

        const customHeaderValue = generatePallyConCustomHeaderValue({
            accessKey: accessKey || PALLYCON_ACCESS_KEY,
            siteKey: siteKey || PALLYCON_SITE_KEY,
            iv: iv || PALLYCON_IV,
            siteId: resolvedSiteId,
            userId: cuid,
            cid,
            drmType: profile.drmType,
            ...(duration !== undefined && { duration: parseInt(duration) })
        });

        const tokenParams = {
            // Multi DRM은 표준 JWT와 별도의 Kollus 서비스 계정(보안키/커스텀키)을 사용
            secretKey: secretKey || MULTIDRM_SECRET_KEY,
            customKey: customKey || MULTIDRM_CUSTOM_KEY,
            cuid,
            mck,
            expt: parseInt(expt) || DEFAULT_EXPIRY_MINUTES,
            streamingType: profile.streamingType,
            siteId: resolvedSiteId,
            customHeaderValue
        };

        const result = generateKollusMultiDrmToken(tokenParams);
        res.json(result);
    } catch (error) {
        // 멀티 DRM 토큰 생성 실패: 에러 로깅 후 상위 에러 핸들러로 전달
        console.error('[Kollus] Multi DRM JWT 생성 실패:', error.message);
        next(error);
    }
}

// GET /jwt/create-multidrm — 쿼리 파라미터로 Multi DRM 토큰 발급
router.get('/create-multidrm', function (req, res, next) {
    createMultiDrmJWT(req.query, req.headers['user-agent'], res, next);
});

// POST /jwt/create-multidrm — JSON 바디로 Multi DRM 토큰 발급
router.post('/create-multidrm', function (req, res, next) {
    createMultiDrmJWT(req.body, req.headers['user-agent'], res, next);
});

module.exports = router;