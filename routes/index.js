/**
 * 메인 페이지 및 샘플 UI 라우터
 * 홈(/), 업로드(/upload), 샘플 플레이어(/sample), Multi DRM 샘플 플레이어(/sample-multidrm), 데모(/demo) 페이지를 제공합니다.
 */
const express = require('express');
const router = express.Router();
const config = require('../config');
const { DEFAULT_EXPIRY_MINUTES } = require('../utils/jwt');

const SECURITY_KEY = config.KOLLUS_SECURITY_KEY;
const CUSTOM_KEY = config.KOLLUS_CUSTOM_KEY;
const MULTIDRM_SECURITY_KEY = config.KOLLUS_MULTIDRM_SECURITY_KEY;
const MULTIDRM_CUSTOM_KEY = config.KOLLUS_MULTIDRM_CUSTOM_KEY;
const CATEGORY_KEY = config.KOLLUS_CATEGORY_KEY;
const DOVERUNNER_SITE_ID = config.KOLLUS_DOVERUNNER_SITE_ID;
const DOVERUNNER_ACCESS_KEY = config.KOLLUS_DOVERUNNER_ACCESS_KEY;
const DOVERUNNER_SITE_KEY = config.KOLLUS_DOVERUNNER_SITE_KEY;
const DOVERUNNER_IV = config.KOLLUS_DOVERUNNER_IV;

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
        defaultSecurityKey: SECURITY_KEY,
        defaultCustomKey: CUSTOM_KEY,
        defaultMck: DEFAULT_SAMPLE_MCK,
        defaultExpiryMinutes: DEFAULT_EXPIRY_MINUTES
    });
});

/** GET /sample-multidrm — Multi DRM(Widevine/PlayReady/FairPlay) JWT 발급 + 플레이어 샘플 UI */
router.get('/sample-multidrm', function (req, res) {
    res.render('sample-multidrm', {
        title: 'Kollus Multi DRM Player Sample',
        defaultSecurityKey: MULTIDRM_SECURITY_KEY,
        defaultCustomKey: MULTIDRM_CUSTOM_KEY,
        defaultSiteId: DOVERUNNER_SITE_ID,
        defaultAccessKey: DOVERUNNER_ACCESS_KEY,
        defaultSiteKey: DOVERUNNER_SITE_KEY,
        defaultIv: DOVERUNNER_IV,
        defaultExpiryMinutes: DEFAULT_EXPIRY_MINUTES
    });
});

module.exports = router;
