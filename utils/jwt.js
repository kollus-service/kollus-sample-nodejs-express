/**
 * Kollus 플레이어 JWT 토큰 생성 유틸리티
 * HS256 서명 방식으로 Kollus 전용 페이로드를 직접 인코딩합니다.
 */
const crypto = require('crypto');

// Kollus 플레이어 베이스 URL — 국내 서비스 고정값
const DEFAULT_PLAYER_BASE_URL = 'https://v.kr.kollus.com/';

// PallyCon(DoveRunner) 라이선스/인증서 서버 주소 — 계정과 무관한 고정값. FairPlay는 certificate_url에 siteId 쿼리 파라미터를 덧붙여 사용
const PALLYCON_LICENSE_URL = 'https://license.pallycon.com/ri/licenseManager.do';
const PALLYCON_CERTIFICATE_BASE_URL = 'https://license.pallycon.com/ri/fpsKeyManager.do?siteId=';

// PallyCon 라이선스 정책 기본값 — 재생 가능 기간 10일 (초 단위)
const DEFAULT_PALLYCON_DURATION_SECONDS = 864000;

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
    const token = signPayload(payload, secretKey);

    // 3. URL 생성
    const link = `${baseUrl}s?jwt=${token}&custom_key=${customKey}`;

    return { token, link, payload };
}

/**
 * Kollus 플레이어 JWT Payload를 HS256으로 서명합니다.
 *
 * @param {Object} payload - JWT Payload
 * @param {string} secretKey - HMAC 서명 키
 * @returns {string} 서명된 JWT 토큰 문자열
 */
function signPayload(payload, secretKey) {
    const header = Buffer.from(JSON.stringify({ typ: "JWT", alg: "HS256" })).toString('base64url');
    const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const content = `${header}.${payloadEncoded}`;

    const signature = crypto
        .createHmac('sha256', secretKey)
        .update(content)
        .digest('base64url');

    return `${content}.${signature}`;
}

/**
 * User-Agent 문자열로 재생 브라우저에 맞는 DRM 타입과 스트리밍 타입을 감지합니다.
 * PallyCon 라이선스 정책 구조가 DRM 타입별로 다르므로, JWT 발급 전에 실제 재생 브라우저 기준으로 결정해야 합니다.
 *
 * @param {string} [userAgent=''] - 요청의 User-Agent 헤더 값
 * @returns {{ drmType: 'Widevine'|'PlayReady'|'FairPlay', streamingType: 'dash'|'hls' }}
 */
function detectDrmProfile(userAgent = '') {
    const browsers = ['CriOS', 'Edge', 'Edg', 'Firefox', 'Chrome', 'Safari', 'Opera', 'MSIE', 'Trident'];
    const matched = browsers.find((browser) => userAgent.includes(browser)) || '';

    let drmType;
    let streamingType;

    switch (matched) {
        case 'MSIE':
        case 'Trident':
        case 'Edge':
        case 'Edg':
            drmType = 'PlayReady';
            streamingType = 'dash';
            break;
        case 'Chrome':
        case 'Firefox':
        case 'Opera':
            drmType = 'Widevine';
            streamingType = 'dash';
            break;
        case 'Safari':
        case 'CriOS':
            drmType = 'FairPlay';
            streamingType = 'hls';
            break;
        default:
            drmType = 'Widevine';
            streamingType = 'dash';
    }

    // Mac용 Edge는 PlayReady를 지원하지 않아 Widevine으로 대체
    if (userAgent.includes('Macintosh') && userAgent.includes('Edg')) {
        drmType = 'Widevine';
        streamingType = 'dash';
    }

    return { drmType, streamingType };
}

/**
 * DRM 타입별 PallyCon 라이선스 정책 객체를 만듭니다.
 * Widevine과 PlayReady/FairPlay/NCG는 정책 스키마 자체가 다릅니다.
 *
 * @param {'Widevine'|'PlayReady'|'FairPlay'} drmType
 * @param {number} durationSeconds - 재생 가능 기간 (초)
 * @returns {Object} PallyCon 라이선스 정책 객체 (암호화 전 원본)
 */
function buildPallyConPolicy(drmType, durationSeconds) {
    const playbackPolicy = {
        limit: true,
        persistent: false,
        duration: durationSeconds
    };

    if (drmType === 'Widevine') {
        return {
            policy_version: 2,
            playback_policy: playbackPolicy,
            security_policy: [{
                widevine: {
                    security_level: 1,
                    required_hdcp_version: 'HDCP_NONE',
                    required_cgms_flags: 'CGMS_NONE',
                    disable_analog_output: false,
                    hdcp_srm_rule: 'HDCP_SRM_RULE_NONE',
                    override_device_revocation: true
                }
            }]
        };
    }

    return {
        playback_policy: playbackPolicy,
        security_policy: {
            playready: {
                security_level: 150,
                digital_video_protection_level: 100,
                analog_video_protection_level: 100,
                digital_audio_protection_level: 100,
                require_hdcp_type_1: false
            },
            fairplay: {
                hdcp_enforcement: -1,
                allow_airplay: true,
                allow_av_adapter: true
            },
            ncg: {
                allow_mobile_abnormal_device: false,
                allow_external_display: false,
                control_hdcp: 0
            }
        }
    };
}

/**
 * PallyCon 라이선스 정책 JSON을 AES-256-CBC로 암호화합니다 (PallyCon Site Key + IV 사용).
 *
 * @param {string} policyJson - JSON.stringify된 라이선스 정책
 * @param {string} siteKey - PallyCon Site Key (32바이트 AES-256 키)
 * @param {string} iv - AES 초기화 벡터 (16바이트)
 * @returns {string} Base64로 인코딩된 암호문
 */
function encryptPallyConPolicy(policyJson, siteKey, iv) {
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(siteKey, 'utf8'), Buffer.from(iv, 'utf8'));
    const encrypted = Buffer.concat([cipher.update(policyJson, 'utf8'), cipher.final()]);
    return encrypted.toString('base64');
}

/**
 * PallyCon(Inka) DRM custom_header.value에 들어갈 페이로드를 생성합니다.
 * 라이선스 정책을 AES-256-CBC로 암호화하고, 위변조 방지를 위한 SHA-256 해시를 첨부한 뒤 전체를 Base64로 인코딩합니다.
 * (참고: https://docs.doverunner.com/ko/content-security/multi-drm/license/license-token)
 *
 * @param {Object} params
 * @param {string} params.accessKey - PallyCon Access Key
 * @param {string} params.siteKey - PallyCon Site Key (AES-256 암호화 키)
 * @param {string} params.iv - AES 초기화 벡터
 * @param {string} params.siteId - PallyCon Site ID
 * @param {string} params.userId - 클라이언트 사용자 ID
 * @param {string} params.cid - PallyCon 콘텐츠 ID (Kollus 업로드 파일 키, mck와는 다른 값)
 * @param {'Widevine'|'PlayReady'|'FairPlay'} params.drmType - 재생 브라우저에 맞는 DRM 타입
 * @param {number} [params.duration] - 재생 가능 기간 (초). 미지정 시 기본값 사용
 * @returns {string} Base64로 인코딩된 PallyCon 페이로드 (drm_policy.data.custom_header.value 값)
 */
function generatePallyConCustomHeaderValue(params) {
    const {
        accessKey,
        siteKey,
        iv,
        siteId,
        userId,
        cid,
        drmType,
        duration = DEFAULT_PALLYCON_DURATION_SECONDS
    } = params;

    // PallyCon 타임스탬프 규격 — 밀리초 없는 ISO 8601 (예: 2026-07-10T04:44:58Z)
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

    const policy = buildPallyConPolicy(drmType, duration);
    const encryptedToken = encryptPallyConPolicy(JSON.stringify(policy), siteKey, iv);

    // 위변조 방지 해시 — PallyCon 규격상 각 필드를 지정된 순서로 이어붙인 문자열의 SHA-256
    const hash = crypto
        .createHash('sha256')
        .update(accessKey + drmType + siteId + userId + cid + encryptedToken + timestamp, 'utf8')
        .digest('base64');

    const inkaPayload = {
        drm_type: drmType,
        site_id: siteId,
        user_id: userId,
        cid,
        token: encryptedToken,
        timestamp,
        hash
    };

    return Buffer.from(JSON.stringify(inkaPayload)).toString('base64');
}

/**
 * Multi DRM(Widevine/PlayReady/FairPlay) 재생을 위한 Kollus 플레이어 JWT 토큰과 재생 URL을 생성합니다.
 * mc[].drm_policy에 DoveRunner(Kollus 내부에서는 kind: 'inka'로 지칭) 라이선스 연동 정보를 포함합니다.
 *
 * @param {Object} tokenParams - 토큰 생성 파라미터
 * @param {string} tokenParams.secretKey - HMAC 서명 키
 * @param {string} tokenParams.customKey - 플레이어 URL에 추가되는 커스텀 키
 * @param {string} tokenParams.mck - 미디어 콘텐츠 키
 * @param {string} [tokenParams.cuid] - 시청자 ID
 * @param {number} [tokenParams.expt=3] - 토큰 만료 시간 (분 단위)
 * @param {'dash'|'hls'} [tokenParams.streamingType='dash'] - dash: Widevine/PlayReady, hls: FairPlay
 * @param {string} [tokenParams.siteId] - PallyCon Site ID. certificateUrl 미지정 시 이 값으로 자동 조합
 * @param {string} [tokenParams.licenseUrl] - 라이선스 서버 주소. 미지정 시 PallyCon 고정 주소 사용
 * @param {string} [tokenParams.certificateUrl] - FairPlay 인증서 주소. 미지정 시 siteId로 PallyCon 고정 주소를 조합
 * @param {string} tokenParams.customHeaderValue - PallyCon 라이선스 토큰 (Base64 인코딩된 값, generatePallyConCustomHeaderValue로 생성)
 * @param {string} [tokenParams.baseUrl] - 플레이어 베이스 URL
 * @returns {{ token: string, link: string, payload: Object }} JWT 토큰, 재생 URL, 페이로드
 */
function generateKollusMultiDrmToken(tokenParams) {
    const {
        secretKey,
        customKey,
        cuid,
        mck,
        expt = 3,
        baseUrl = DEFAULT_PLAYER_BASE_URL,
        streamingType = 'dash',
        siteId,
        licenseUrl = PALLYCON_LICENSE_URL,
        certificateUrl = siteId ? `${PALLYCON_CERTIFICATE_BASE_URL}${siteId}` : undefined,
        customHeaderValue
    } = tokenParams;

    const exptInSeconds = Math.floor(Date.now() / 1000) + 60 * expt;

    const payload = {
        cuid,
        expt: exptInSeconds,
        mc: [{
            mckey: mck,
            drm_policy: {
                // kind는 DoveRunner의 구 사명인 'inka' 고정값
                kind: 'inka',
                streaming_type: streamingType,
                data: {
                    ...(licenseUrl && { license_url: licenseUrl }),
                    ...(certificateUrl && { certificate_url: certificateUrl }),
                    custom_header: {
                        key: 'pallycon-customdata-v2',
                        value: customHeaderValue
                    }
                }
            }
        }]
    };

    const token = signPayload(payload, secretKey);
    const link = `${baseUrl}s?jwt=${token}&custom_key=${customKey}`;

    return { token, link, payload };
}

module.exports = { generateKollusToken, generateKollusMultiDrmToken, generatePallyConCustomHeaderValue, detectDrmProfile };

