/**
 * Kollus 플레이어 JWT 발급 라우터
 * GET /jwt/create (쿼리 파라미터) 또는 POST /jwt/create (JSON 바디)로 토큰을 발급합니다.
 */
const express = require('express');
const router = express.Router();
const { generateKollusToken } = require('../utils/jwt');
const config = require('../config');

const SECRET_KEY = config.KOLLUS_SECRET_KEY;
const CUSTOM_KEY = config.KOLLUS_CUSTOM_KEY;

// Kollus JWT 기본 만료 시간 (분) — 단기 테스트용 기본값
const DEFAULT_EXPIRY_MINUTES = 3;

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
            return res.status(400).json({
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

module.exports = router;