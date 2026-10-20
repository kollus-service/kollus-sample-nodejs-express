# Kollus Node.js Express Sample — 플레이어 재생·콘텐츠 업로드·콜백·멀티 DRM 연동

## 개요

Kollus 미디어 플랫폼을 Node.js / Express로 연동하는 샘플입니다. 다음 기능을 한 앱에서 확인할 수 있습니다.

- 플레이어 JWT 발급 및 웹(iframe)/모바일 앱(`kollus://` 스킴) 플레이어 호출 — `/sample`
- Multi DRM(Widevine/PlayReady/FairPlay, DoveRunner 라이선스) JWT 발급 및 재생 — `/sample-multidrm`
- Kollus Upload API 프록시를 통한 파일 업로드 및 진행률 표시 — `/upload`
- Kollus 플레이어 콜백(재생/DRM/다음 회차/LMS) 수신 — `/callback/*`

> ⚠ **보안 주의**: 이 샘플은 편의상 Security Key·Custom Key·DoveRunner 키를 브라우저 입력 폼으로 받아 서버에 전달합니다. 운영 환경에서는 이 값들을 **서버에서만 보관**하고 JWT 발급·Kollus API 호출도 **서버에서만 수행**해야 합니다. 브라우저로 키를 내려보내지 마세요.

## 사전 요구사항

- Node.js 20 이상
- Kollus 서비스 계정 및 키 ([Kollus 관리자 콘솔](https://admin.kollus.com) 로그인 필요)
- (Multi DRM 사용 시) DoveRunner 계정의 Site ID / Access Key / Site Key / IV

## 환경 설정

`config.example.js`를 복사해서 시작합니다.

```bash
cp config.example.js config.js
```

`config.js`에서 아래 값을 실제 값으로 교체합니다. (`config.js`는 `.gitignore`에 포함되어 커밋되지 않습니다.)

| 키 | 설명 | 위치 |
|----|------|------|
| `KOLLUS_SECURITY_KEY` | 플레이어 JWT 서명 키 (보안키) | Kollus 관리자 콘솔 > 서비스 계정 > 보안키 |
| `KOLLUS_CUSTOM_KEY` | 플레이어 URL 커스텀 키 | Kollus 관리자 콘솔 > 서비스 계정 > 커스텀키 |
| `KOLLUS_MULTIDRM_SECURITY_KEY` | Multi DRM 전용 서비스 계정 보안키 (표준 JWT 계정과 별도) | Kollus 관리자 콘솔 > 서비스 계정 > 보안키 |
| `KOLLUS_MULTIDRM_CUSTOM_KEY` | Multi DRM 전용 서비스 계정 커스텀키 | Kollus 관리자 콘솔 > 서비스 계정 > 커스텀키 |
| `KOLLUS_API_TOKEN` | Upload API 액세스 토큰 (서버에서만 사용, 업로드 화면에서 입력받지 않음) | Kollus 관리자 콘솔 > 서비스 계정 > API 액세스 토큰 |
| `KOLLUS_CATEGORY_KEY` | 업로드 카테고리 키 | Kollus 관리자 콘솔 > 콘텐츠 > 카테고리 키 |
| `NEXT_EPISODE_MCKS` | 다음 회차 콜백 샘플용 MCK 목록 (콤마 구분 문자열, 예: `'mckA,mckB'`, 랜덤 반환) | Kollus 관리자 콘솔 > 콘텐츠 > 미디어 콘텐츠 키 |
| `KOLLUS_DOVERUNNER_SITE_ID` | DoveRunner Site ID | DoveRunner 콘솔 > Access Key 관리 |
| `KOLLUS_DOVERUNNER_ACCESS_KEY` | DoveRunner Access Key (라이선스 토큰 해시 생성용) | DoveRunner 콘솔 > Access Key 관리 |
| `KOLLUS_DOVERUNNER_SITE_KEY` | 라이선스 정책 AES-256 암호화 키 (32바이트) | DoveRunner 콘솔 > Access Key 관리 |
| `KOLLUS_DOVERUNNER_IV` | AES 초기화 벡터 (16바이트) | DoveRunner 콘솔 > Access Key 관리 |
| `KOLLUS_DOVERUNNER_LICENSE_URL` | DoveRunner 라이선스 서버 URL | 기본값 `https://drm-license.doverunner.com/ri/licenseManager.do` |
| `KOLLUS_DOVERUNNER_CERTIFICATE_URL` | DoveRunner FairPlay 인증서 서버 URL (`?siteId=` 는 서버가 자동 부착) | 기본값 `https://drm-license.doverunner.com/ri/fpsKeyManager.do` |

## 실행 방법

```bash
npm install

# 개발 (파일 변경 시 자동 재시작)
npm run dev

# 운영
npm start
```

기본 포트: `http://localhost:3000` (`PORT` 환경 변수로 변경 가능, 예: `PORT=3999 npm start`)

브라우저에서 `http://localhost:3000`에 접속하면 각 샘플 페이지로 이동하는 링크가 표시됩니다.

## 주요 파일

| 파일 | 설명 |
|------|------|
| `app.js` | Express 앱 설정 — 플레이어 iframe 권한/Private Network Access 헤더, 라우터 마운트, 404·에러 핸들러 |
| `bin/www` | HTTP 서버 기동 스크립트 (`PORT` 환경 변수 처리) |
| `config.example.js` | 설정 파일 템플릿 — `config.js`로 복사해 사용 |
| `routes/index.js` | 홈(`/`)·샘플 플레이어(`/sample`)·Multi DRM 샘플(`/sample-multidrm`)·업로드(`/upload`)·데모(`/demo`) 페이지 렌더링 |
| `routes/jwt.js` | 플레이어 JWT 발급 API (`/jwt/create`, `/jwt/create-multidrm`) |
| `routes/api.js` | Kollus Upload API 프록시 (`/api/upload/create-url`, `/api/upload/progress/:upload_file_key`) |
| `routes/callback.js` | Kollus 콜백 수신 (`/callback/play`, `/callback/drm`, `/callback/next-episode`, `/callback/lms`) |
| `utils/jwt.js` | JWT 생성 유틸 — HS256 서명, Multi DRM(DoveRunner) 라이선스 토큰 생성, User-Agent 기반 DRM 종류 감지, 기본 만료 시간 상수 |
| `utils/httpStatus.js` | HTTP 상태 코드 상수 |
| `views/layout.pug` | 공통 레이아웃 |
| `views/index.pug` | 홈 페이지 (샘플 링크 목록) |
| `views/sample.pug` | 샘플 플레이어 페이지 — JWT 발급 → iframe 재생 / 모바일 앱 스킴 호출 |
| `views/sample-multidrm.pug` | Multi DRM 샘플 플레이어 페이지 — Multi DRM JWT 발급 → iframe 재생 |
| `views/upload.pug` | 파일 업로드 페이지 — 업로드 URL 발급 → XHR 업로드 진행률 표시 |
| `views/demo.pug` | 정적 iframe 데모 페이지 (JWT 하드코딩, 데모 전용) |
| `views/error.pug` | 에러 페이지 |
| `public/stylesheets/style.css` | 공통 스타일 |

## API 흐름

```
클라이언트(브라우저)
  │
  ├── GET /sample
  │     └── POST /jwt/create → JWT + 플레이어 URL 반환 → iframe 로드 / kollus:// 스킴 호출
  │
  ├── GET /sample-multidrm
  │     └── POST /jwt/create-multidrm → DoveRunner 라이선스 토큰 생성 → Multi DRM JWT + 플레이어 URL 반환 → iframe 로드
  │
  ├── GET /upload
  │     ├── POST /api/upload/create-url → Kollus c-api-kr 프록시 (upload_url, upload_file_key 발급)
  │     ├── XHR → Kollus 업로드 서버 (파일 직접 전송)
  │     └── GET /api/upload/progress/:upload_file_key → Kollus c-api-kr 프록시 (인코딩 진행 상태)
  │
  ├── GET /demo → 정적 iframe 데모
  │
  └── Kollus 플레이어 → 고객사 서버 콜백
        ├── POST /callback/play
        ├── POST /callback/drm
        ├── POST /callback/next-episode
        └── POST /callback/lms
```

### 샘플 페이지

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/` | 홈 — 샘플 링크 목록 |
| `GET` | `/sample` | 샘플 플레이어 (JWT 발급 + 웹/모바일 플레이어 호출) |
| `GET` | `/sample-multidrm` | Multi DRM 샘플 플레이어 (Widevine/PlayReady/FairPlay JWT 발급 + 재생) |
| `GET` | `/upload` | 파일 업로드 |
| `GET` | `/demo` | 정적 iframe 데모 (JWT 하드코딩) |

### 샘플 플레이어 `/sample`

Security Key, Custom Key, MCK를 입력해 JWT를 발급하고 플레이어를 호출합니다.

- 웹 플레이어 (iframe)
- 모바일 전용 플레이어 (Kollus 앱 커스텀 스킴 `kollus://`, 앱 미설치 시 스토어 이동)

### Multi DRM 샘플 플레이어 `/sample-multidrm`

Multi DRM 전용 Kollus 서비스 계정 키와 DoveRunner 설정, MCK, CID(Kollus 업로드 파일 키)를 입력해 Multi DRM JWT를 발급하고 iframe으로 재생합니다.

- DRM 종류를 지정하지 않으면 서버가 요청 User-Agent로 DRM 종류(Widevine/PlayReady/FairPlay)와 스트리밍 방식(dash/hls)을 자동 감지합니다.
- 서버는 DoveRunner 라이선스 정책을 AES-256-CBC로 암호화하고 SHA-256 해시를 붙여 `mc[].drm_policy.data.custom_header.value`에 넣습니다.

### 파일 업로드 `/upload`

Kollus Upload API를 통해 파일을 업로드합니다.

1. 업로드 URL 발급 (`POST /api/upload/create-url`) — API 토큰은 서버의 `KOLLUS_API_TOKEN` 만 사용하며 화면에서 입력받지 않습니다
2. 발급된 URL로 파일 직접 전송 (XHR, 진행률 표시)
3. Upload File Key 및 인코딩 상태 링크 확인 (`GET /api/upload/progress/:upload_file_key`)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/api/upload/create-url` | 업로드 URL 발급 (Kollus c-api-kr 프록시). 필수: `title` / 선택: `expire_time`(초, 60~21600 범위로 보정, 기본 600), `category_key`, `is_encryption_upload`, `is_audio_upload` (그 외 필드는 전달하지 않음). `access_token` 은 요청으로 받지 않음 (config 값 사용) |
| `GET` | `/api/upload/progress/:upload_file_key` | 업로드/인코딩 진행 상태 조회 (Kollus c-api-kr 프록시). `access_token` 은 config 값 사용 |

### JWT 발급 API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/jwt/create` | 쿼리 파라미터로 JWT 발급 |
| `POST` | `/jwt/create` | JSON 바디로 JWT 발급 |
| `GET` | `/jwt/create-multidrm` | 쿼리 파라미터로 Multi DRM JWT 발급 |
| `POST` | `/jwt/create-multidrm` | JSON 바디로 Multi DRM JWT 발급 |

**`/jwt/create` 필수 파라미터:** `mck` (미디어 콘텐츠 키)

**`/jwt/create` 선택 파라미터:** `cuid`, `expt`(분, 기본 3), `seek`, `intro`, `outro`, `title`, `mcpf`, `seekable_end`, `play_section`, `playback_rates`, `subtitle_policy`, `video_watermarking_code_policy`, `next_episode`, `playcallback_ignore`, `securityKey`, `customKey`

**`/jwt/create-multidrm` 필수 파라미터:** `mck` (미디어 콘텐츠 키), `cid` (Kollus 업로드 파일 키, MCK와 다른 값), `siteId` (config 기본값 있으면 생략 가능)

**`/jwt/create-multidrm` 선택 파라미터:** `cuid`, `expt`(분, 기본 3), `drmType`(`Widevine`|`PlayReady`|`FairPlay`, 미지정 시 User-Agent 자동 감지), `streamingType`(`dash`|`hls`), `duration`(라이선스 유효기간 초), `accessKey`, `siteKey`, `iv`, `securityKey`, `customKey`

### 콜백 처리

Kollus 플레이어에서 발생하는 콜백을 수신합니다.

| 경로 | 설명 | 응답 |
|------|------|------|
| `POST /callback/play` | 재생 콜백 (kind1: 만료 설정, kind3: 재생 승인) | JWT |
| `POST /callback/drm` | DRM 콜백 (다운로드 승인/완료/재생 권한) | JWT |
| `POST /callback/next-episode` | 다음 회차 연속 재생 | JSON |
| `POST /callback/lms` | 시청 이력 및 학습 진도 수신 | 200 OK |

LMS 콜백 데이터는 `logs/lms.log`에 기록됩니다.

## 관련 문서

- [Kollus API 레퍼런스](https://docs.kollus.com)
- [Kollus 관리자 콘솔](https://admin.kollus.com)
- [DoveRunner 라이선스 토큰 가이드](https://docs.doverunner.com/ko/content-security/multi-drm/license/license-token)
