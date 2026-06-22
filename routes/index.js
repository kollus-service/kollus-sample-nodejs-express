/**
 * 메인 페이지 및 샘플 UI 라우터
 * 홈(/), 업로드(/upload), 샘플 플레이어(/sample) 페이지를 제공합니다.
 */
const express = require('express');
const router = express.Router();
const config = require('../config');

const SECRET_KEY = config.KOLLUS_SECRET_KEY;
const CUSTOM_KEY = config.KOLLUS_CUSTOM_KEY;
const API_TOKEN = config.KOLLUS_API_TOKEN;
const CATEGORY_KEY = config.KOLLUS_CATEGORY_KEY;

// 샘플 플레이어 페이지에 기본으로 노출할 MCK — 실제 서비스에서는 제거
const DEFAULT_SAMPLE_MCK = 'yPDMxQQV';

/** GET / — 홈 페이지 */
router.get('/', function (req, res) {
    res.render('index', { title: 'Kollus Node.js Sample' });
});

/** GET /upload — 파일 업로드 UI */
router.get('/upload', function (req, res) {
    res.render('upload', {
        title: 'Kollus 파일 업로드',
        defaultApiToken: API_TOKEN,
        defaultCategoryKey: CATEGORY_KEY
    });
});

/** GET /demo — 정적 iframe 데모 페이지 */
router.get('/demo', function (req, res) {
    res.render('demo', { title: 'Kollus Player Demo' });
});

/** GET /sample — JWT 발급 + 플레이어 샘플 UI */
router.get('/sample', function (req, res) {
    res.render('sample', {
        title: 'Kollus Player Sample',
        defaultSecretKey: SECRET_KEY,
        defaultCustomKey: CUSTOM_KEY,
        defaultMck: DEFAULT_SAMPLE_MCK
    });
});

module.exports = router;
