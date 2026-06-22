/**
 * Kollus 플레이어 JWT 토큰 생성 유틸리티
 * HS256 서명 방식으로 Kollus 전용 페이로드를 직접 인코딩합니다.
 */
const crypto = require('crypto');

// Kollus 플레이어 베이스 URL — 국내 서비스 고정값
const DEFAULT_PLAYER_BASE_URL = 'https://v.kr.kollus.com/';

/**
 * Kollus 플레이어 JWT 토큰과 재생 URL을 생성합니다.
 *
 * @param {Object} tokenParams - 토큰 생성 파라미터
 * @param {string} tokenParams.secretKey - HMAC 서명 키
 * @param {string} tokenParams.customKey - 플레이어 URL에 추가되는 커스텀 키
 * @param {string} tokenParams.mck - 미디어 콘텐츠 키
 * @param {string} [tokenParams.cuid] - 클라이언트 사용자 ID (워터마킹용)
 * @param {number} [tokenParams.expt=3] - 토큰 만료 시간 (분 단위)
 * @returns {{ token: string, link: string, payload: Object }} JWT 토큰, 재생 URL, 페이로드
 */
function generateKollusToken(tokenParams) {
    const {
        secretKey,
        customKey,
        cuid,
        mck,
        expt = 3,
        seek,
        baseUrl = DEFAULT_PLAYER_BASE_URL,
        // 전역 옵션
        video_watermarking_code_policy,
        subtitle_policy,
        playback_rates,
        playcallback_ignore,
        next_episode = true,
        // mc 항목별 옵션
        intro,
        outro,
        mcpf,
        title,
        seekable_end,
        play_section,
        mc_subtitle_policy
    } = tokenParams;

    // 1. Payload 생성
    const exptInSeconds = Math.floor(Date.now() / 1000) + 60 * expt;

    const payload = {
        cuid: cuid,
        expt: exptInSeconds,
        // 전역 옵션들 (조건부)
        ...(next_episode !== undefined && { next_episode }),
        ...(playback_rates && { playback_rates }),
        ...(playcallback_ignore !== undefined && { playcallback_ignore }),
        ...(video_watermarking_code_policy && { video_watermarking_code_policy }),
        mc: [
            // intro가 있으면 맨 앞에 추가
            ...(intro ? [{
                mckey: intro,
                intr: true
            }] : []),

            // 메인 콘텐츠
            {
                mckey: mck,
                ...(mcpf && { mcpf }),
                ...(title && { title }),
                ...(seek !== undefined && { seek }),
                ...(seekable_end !== undefined && { seekable_end }),
                ...(play_section && { play_section }),
                // mc_subtitle_policy가 있으면 항목별 subtitle_policy로 우선 적용, 없으면 전역 subtitle_policy 사용
                // 두 값이 모두 전달되면 mc_subtitle_policy가 subtitle_policy를 덮어씀 (키 충돌)
                ...(mc_subtitle_policy ? { subtitle_policy: mc_subtitle_policy } : subtitle_policy ? { subtitle_policy } : {}),
            },
            // outro가 있으면 맨 뒤에 추가
            ...(outro ? [{
                mckey: outro,
                intr: true
            }] : [])
        ]
    };

    // 2. JWT Encoding (HS256)
    const header = Buffer.from(JSON.stringify({ typ: "JWT", alg: "HS256" })).toString('base64url');
    const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const content = `${header}.${payloadEncoded}`;

    const signature = crypto
        .createHmac('sha256', secretKey)
        .update(content)
        .digest('base64url');

    const token = `${content}.${signature}`;

    // 3. URL 생성
    const link = `${baseUrl}s?jwt=${token}&custom_key=${customKey}`;

    return { token, link, payload };
}

module.exports = { generateKollusToken };

