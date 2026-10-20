/**
 * Kollus 연동 설정 파일 템플릿
 *
 * 이 파일을 config.js로 복사한 뒤 실제 값으로 교체하세요.
 * 발급 위치: Kollus 관리자 콘솔 (https://admin.kollus.com)
 *
 * config.js는 .gitignore에 포함되어 있습니다. 절대 커밋하지 마세요.
 */
module.exports = {
    // Kollus 플레이어 설정
    KOLLUS_SECURITY_KEY: 'YOUR_SECURITY_KEY',   // 서비스 계정 > 보안키
    KOLLUS_CUSTOM_KEY: 'YOUR_CUSTOM_KEY',        // 서비스 계정 > 커스텀키

    // Multi DRM 전용 Kollus 서비스 계정 — 표준 JWT 계정과 별도로 분리
    KOLLUS_MULTIDRM_SECURITY_KEY: 'YOUR_MULTIDRM_SECURITY_KEY',
    KOLLUS_MULTIDRM_CUSTOM_KEY: 'YOUR_MULTIDRM_CUSTOM_KEY',

    // Kollus Upload API 설정
    KOLLUS_API_TOKEN: 'YOUR_API_TOKEN',          // 서비스 계정 > API 액세스 토큰
    KOLLUS_CATEGORY_KEY: 'YOUR_CATEGORY_KEY',     // 콘텐츠 > 카테고리 키
    NEXT_EPISODE_MCKS: '', // 다음회차 기능 샘플 MCK 목록 (콤마 구분, 예: 'mckA,mckB')

    // Multi DRM(DoveRunner) 설정 — 고객사 서비스 계정 고정값 (DoveRunner 콘솔 > Access Key 관리)
    KOLLUS_DOVERUNNER_SITE_ID: 'YOUR_DOVERUNNER_SITE_ID',
    KOLLUS_DOVERUNNER_ACCESS_KEY: 'YOUR_DOVERUNNER_ACCESS_KEY',
    KOLLUS_DOVERUNNER_SITE_KEY: 'YOUR_DOVERUNNER_SITE_KEY',    // 라이선스 정책 AES-256 암호화 키
    KOLLUS_DOVERUNNER_IV: 'YOUR_DOVERUNNER_IV',                // AES 초기화 벡터 (16바이트)
    // DoveRunner 라이선스/인증서 서버 주소 — 계정과 무관한 고정값 (FairPlay 인증서 주소에는 서버가 ?siteId= 를 덧붙임)
    KOLLUS_DOVERUNNER_LICENSE_URL: 'https://drm-license.doverunner.com/ri/licenseManager.do',
    KOLLUS_DOVERUNNER_CERTIFICATE_URL: 'https://drm-license.doverunner.com/ri/fpsKeyManager.do'

};
