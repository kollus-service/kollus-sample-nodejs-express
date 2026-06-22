/**
 * Kollus Upload API 프록시 라우터
 * 브라우저에서 직접 호출할 수 없는 Kollus c-api-kr 엔드포인트를 서버 사이드에서 중계합니다.
 */
const express = require('express');
const router = express.Router();
const axios = require('axios');
const config = require('../config');

const KOLLUS_API_BASE_URL = 'https://c-api-kr.kollus.com/api';
const DEFAULT_TOKEN = config.KOLLUS_API_TOKEN;
const DEFAULT_CATEGORY_KEY = config.KOLLUS_CATEGORY_KEY;

/**
 * Kollus 업로드 URL을 발급받아 반환합니다.
 * POST /api/upload/create-url
 *
 * @param {string} req.body.expire_time - 업로드 URL 유효 시간 (초 단위)
 * @param {string} req.body.title - 업로드할 콘텐츠 제목
 * @param {string} [req.body.access_token] - Kollus API 액세스 토큰 (생략 시 config 기본값 사용)
 * @param {string} [req.body.category_key] - 카테고리 키 (생략 시 config 기본값 사용)
 * @returns {Object} Kollus API 응답 (upload_url, upload_file_key 포함)
 */
router.post('/upload/create-url', async (req, res) => {
    try {
        const { access_token, expire_time, title, category_key, ...optionalParams } = req.body;

        if (!expire_time || !title) {
            return res.status(400).json({
                status: 'fail',
                error: 'Missing required parameters',
                required: ['expire_time', 'title']
            });
        }

        const token = access_token || DEFAULT_TOKEN;
        const category = category_key || DEFAULT_CATEGORY_KEY;

        const response = await axios.post(
            `${KOLLUS_API_BASE_URL}/upload/create-url?access_token=${token}`,
            new URLSearchParams({ expire_time, title, category_key: category, ...optionalParams }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        res.json(response.data);
    } catch (error) {
        // Kollus API 에러: 상태코드와 메시지를 로깅하고 클라이언트에 오류 반환
        console.error('[Kollus] Upload API Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
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
 * @param {string} [req.query.access_token] - Kollus API 액세스 토큰
 * @returns {Object} Kollus API 응답 (progress, status 포함)
 */
router.get('/upload/progress/:upload_file_key', async (req, res) => {
    try {
        const { upload_file_key } = req.params;
        const token = req.query.access_token || DEFAULT_TOKEN;

        const response = await axios.get(
            `${KOLLUS_API_BASE_URL}/upload/progress/${upload_file_key}?access_token=${token}`
        );

        res.json(response.data);
    } catch (error) {
        // Kollus API 에러: 상태코드와 메시지를 로깅하고 클라이언트에 오류 반환
        console.error('[Kollus] Progress API Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            status: 'fail',
            error: error.response?.data || error.message
        });
    }
});

module.exports = router;