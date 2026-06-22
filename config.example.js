/**
 * Kollus 연동 설정 파일 템플릿
 *
 * 이 파일을 config.js로 복사한 뒤 실제 값으로 교체하세요.
 * 발급 위치: Kollus 관리자 콘솔 (https://admin.kollus.com)
 *
 * config.js는 .gitignore에 포함되어 있습니다. 절대 커밋하지 마세요.
 *
 * config.example.js를=> config.js 변경하세요.
 */
module.exports = {
    // Kollus 플레이어 설정
    KOLLUS_SECRET_KEY: 'YOUR_SECRET_KEY',       // 서비스 계정 > 보안키
    KOLLUS_CUSTOM_KEY: 'YOUR_CUSTOM_KEY',        // 서비스 계정 > 커스텀키

    // Kollus Upload API 설정
    KOLLUS_API_TOKEN: 'YOUR_API_TOKEN',          // 서비스 계정 > API 액세스 토큰
    KOLLUS_CATEGORY_KEY: 'YOUR_CATEGORY_KEY',     // 콘텐츠 > 카테고리 키
    NEXT_EPISODE_MCKS: [] // 다음회차 기능 샘플 MCK 목록

};
