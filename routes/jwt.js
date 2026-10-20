/**
 * Kollus 플레이어 JWT 발급 라우터
 * GET(쿼리 파라미터)/POST(JSON 바디) /jwt/create로 표준 토큰을, /jwt/create-multidrm으로 Multi DRM 토큰을 발급합니다.
 */
const express = require('express');
const router = express.Router();
const { generateKollusToken, generateKollusMultiDrmToken, generateDoverunnerCustomHeaderValue, detectDrmProfile, DEFAULT_EXPIRY_MINUTES } = require('../utils/jwt');
const HTTP_STATUS = require('../utils/httpStatus');
const config = require('../config');

const SECURITY_KEY = config.KOLLUS_SECURITY_KEY;
const CUSTOM_KEY = config.KOLLUS_CUSTOM_KEY;
const MULTIDRM_SECURITY_KEY = config.KOLLUS_MULTIDRM_SECURITY_KEY;
const MULTIDRM_CUSTOM_KEY = config.KOLLUS_MULTIDRM_CUSTOM_KEY;
const DOVERUNNER_SITE_ID = config.KOLLUS_DOVERUNNER_SITE_ID;
const DOVERUNNER_ACCESS_KEY = config.KOLLUS_DOVERUNNER_ACCESS_KEY;
const DOVERUNNER_SITE_KEY = config.KOLLUS_DOVERUNNER_SITE_KEY;
const DOVERUNNER_IV = config.KOLLUS_DOVERUNNER_IV;
const DOVERUNNER_LICENSE_URL = config.KOLLUS_DOVERUNNER_LICENSE_URL;
const DOVERUNNER_CERTIFICATE_URL = config.KOLLUS_DOVERUNNER_CERTIFICATE_URL;

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
            securityKey,
            customKey
        } = params;

        // 필수 파라미터 검증
        if (!mck) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                error: 'Missing required parameters: mck'
            });
        }

        const tokenParams = {
            securityKey: securityKey || SECURITY_KEY,
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
            securityKey,
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
        const resolvedSiteId = siteId || DOVERUNNER_SITE_ID;
        if (!resolvedSiteId) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                error: 'Missing required parameters: siteId (DoveRunner Site ID)'
            });
        }

        // 라이선스/인증서 서버 주소는 config.js 값만 사용 (누락 시 서버 설정 오류)
        if (!DOVERUNNER_LICENSE_URL || !DOVERUNNER_CERTIFICATE_URL) {
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                error: 'config.js에 KOLLUS_DOVERUNNER_LICENSE_URL / KOLLUS_DOVERUNNER_CERTIFICATE_URL을 설정하세요'
            });
        }

        // drmType이 명시되지 않으면 재생 브라우저의 User-Agent로 자동 감지 (Safari/iOS Chrome → FairPlay/hls, 그 외 → Widevine 또는 PlayReady/dash)
        const profile = drmType
            ? { drmType, streamingType: streamingType || (drmType === 'FairPlay' ? 'hls' : 'dash') }
            : detectDrmProfile(userAgent);

        const customHeaderValue = generateDoverunnerCustomHeaderValue({
            accessKey: accessKey || DOVERUNNER_ACCESS_KEY,
            siteKey: siteKey || DOVERUNNER_SITE_KEY,
            iv: iv || DOVERUNNER_IV,
            siteId: resolvedSiteId,
            userId: cuid,
            cid,
            drmType: profile.drmType,
            ...(duration !== undefined && { duration: parseInt(duration) })
        });

        const tokenParams = {
            // Multi DRM은 표준 JWT와 별도의 Kollus 서비스 계정(보안키/커스텀키)을 사용
            securityKey: securityKey || MULTIDRM_SECURITY_KEY,
            customKey: customKey || MULTIDRM_CUSTOM_KEY,
            cuid,
            mck,
            expt: parseInt(expt) || DEFAULT_EXPIRY_MINUTES,
            streamingType: profile.streamingType,
            licenseUrl: DOVERUNNER_LICENSE_URL,
            // FairPlay 인증서 주소는 고정 주소에 siteId 쿼리 파라미터를 덧붙여 사용
            certificateUrl: `${DOVERUNNER_CERTIFICATE_URL}?siteId=${encodeURIComponent(resolvedSiteId)}`,
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