/**
 * Kollus Upload API 프록시 라우터
 * 브라우저에서 직접 호출할 수 없는 Kollus c-api-kr 엔드포인트를 서버 사이드에서 중계합니다.
 */
const express = require('express');
const router = express.Router();
const axios = require('axios');
const HTTP_STATUS = require('../utils/httpStatus');
const config = require('../config');

const KOLLUS_API_BASE_URL = 'https://c-api-kr.kollus.com/api';
// Kollus API 액세스 토큰은 요청으로 받지 않고 config 값만 사용
const API_TOKEN = config.KOLLUS_API_TOKEN;
const DEFAULT_CATEGORY_KEY = config.KOLLUS_CATEGORY_KEY;

// 업로드 URL 유효 시간 (초) — 기본값과 허용 범위 (범위 밖 값은 경계값으로 보정)
const DEFAULT_EXPIRE_TIME_SEC = 600;
const MIN_EXPIRE_TIME_SEC = 60;
const MAX_EXPIRE_TIME_SEC = 21600;

// Kollus create-url 로 그대로 전달을 허용하는 선택 필드 (그 외 요청 필드는 무시)
const ALLOWED_OPTIONAL_FIELDS = ['is_encryption_upload', 'is_audio_upload'];

/**
 * expire_time 을 정수로 변환하고 허용 범위로 보정합니다.
 *
 * @param {*} value - 요청의 expire_time 값
 * @returns {number} MIN_EXPIRE_TIME_SEC ~ MAX_EXPIRE_TIME_SEC 범위의 초 단위 값 (파싱 실패 시 기본값)
 */
function resolveExpireTime(value) {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) return DEFAULT_EXPIRE_TIME_SEC;
    return Math.min(Math.max(parsed, MIN_EXPIRE_TIME_SEC), MAX_EXPIRE_TIME_SEC);
}

/**
 * Kollus 업로드 URL을 발급받아 반환합니다.
 * POST /api/upload/create-url
 *
 * @param {string} req.body.title - 업로드할 콘텐츠 제목
 * @param {string} [req.body.expire_time] - 업로드 URL 유효 시간 (초 단위, 60~21600, 기본 600)
 * @param {string} [req.body.category_key] - 카테고리 키 (생략 시 config 기본값 사용)
 * @param {string} [req.body.is_encryption_upload] - 암호화 업로드 여부
 * @param {string} [req.body.is_audio_upload] - 오디오 전용 업로드 여부
 * @returns {Object} Kollus API 응답 (upload_url, upload_file_key 포함)
 */
router.post('/upload/create-url', async (req, res) => {
    try {
        const { expire_time, title, category_key } = req.body;

        if (!title) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                status: 'fail',
                error: 'Missing required parameters',
                required: ['title']
            });
        }

        const form = {
            expire_time: String(resolveExpireTime(expire_time)),
            title,
            category_key: category_key || DEFAULT_CATEGORY_KEY
        };
        // 허용된 선택 필드만 전달 (요청 본문 전체를 Kollus API 로 넘기지 않음)
        for (const field of ALLOWED_OPTIONAL_FIELDS) {
            if (req.body[field] !== undefined && req.body[field] !== '') {
                form[field] = String(req.body[field]);
            }
        }

        const response = await axios.post(
            `${KOLLUS_API_BASE_URL}/upload/create-url?access_token=${encodeURIComponent(API_TOKEN)}`,
            new URLSearchParams(form).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        res.json(response.data);
    } catch (error) {
        // Kollus API 에러: 상태코드와 메시지를 로깅하고 클라이언트에 오류 반환
        console.error('[Kollus] Upload API Error:', error.response?.data || error.message);
        res.status(error.response?.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            status: 'fail',
            error: error.response?.data || error.message
        });
    }
});

/**
 * 업로드 진행 상태를 조회합니다.
 * GET /api/upload/progress/:upload_file_key
 *
 * @param {string} req.params.upload_file_key - 업로드 파일 키
 * @returns {Object} Kollus API 응답 (progress, status 포함)
 */
router.get('/upload/progress/:upload_file_key', async (req, res) => {
    try {
        const { upload_file_key } = req.params;

        const response = await axios.get(
            `${KOLLUS_API_BASE_URL}/upload/progress/${encodeURIComponent(upload_file_key)}?access_token=${encodeURIComponent(API_TOKEN)}`
        );

        res.json(response.data);
    } catch (error) {
        // Kollus API 에러: 상태코드와 메시지를 로깅하고 클라이언트에 오류 반환
        console.error('[Kollus] Progress API Error:', error.response?.data || error.message);
        res.status(error.response?.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            status: 'fail',
            error: error.response?.data || error.message
        });
    }
});

module.exports = router;