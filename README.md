# kollus-sample-nodejs-express

Kollus 미디어 플랫폼 연동 샘플 코드 — Node.js / Express

## 사전 요구사항

- Node.js 20 이상
- Kollus 서비스 계정 및 API Key ([Kollus 관리자 콘솔](https://c-kr.kollus.com/service-account/custom-key)/로그인 필요)

## 환경 설정

`config.example.js`를 복사해서 시작합니다.

```bash
cp config.example.js config.js
```

`config.js`에서 아래 값을 실제 값으로 교체합니다.

| 키 | 설명 | 위치 |
|----|------|------|
| `KOLLUS_SECRET_KEY` | JWT 서명 키 | 서비스 계정 > 보안키 |
| `KOLLUS_CUSTOM_KEY` | 플레이어 URL 커스텀 키 | 서비스 계정 > 커스텀키 |
| `KOLLUS_API_TOKEN` | Upload API 액세스 토큰 | 서비스 계정 > API 토큰 |
| `KOLLUS_CATEGORY_KEY` | 업로드 카테고리 키 | 콘텐츠 > 카테고리 |

## 실행

```bash
npm install

# 개발 (파일 변경 시 자동 재시작)
npm run dev

# 운영
npm start
```

기본 포트: `http://localhost:3000`

## 주요 기능

### 샘플 플레이어 `/sample`

Secret Key, Custom Key, MCK를 입력해 JWT를 발급하고 플레이어를 호출합니다.

- 웹 플레이어 (iframe)
- 모바일 전용 플레이어 (Kollus 앱 커스텀 스킴 `kollus://`)

### 파일 업로드 `/upload`

Kollus Upload API를 통해 파일을 업로드합니다.

1. 업로드 URL 발급 (`POST /api/upload/create-url`)
2. 발급된 URL로 파일 직접 전송
3. Upload File Key 및 인코딩 상태 링크 확인

### JWT 발급 API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/jwt/create` | 쿼리 파라미터로 JWT 발급 |
| `POST` | `/jwt/create` | JSON 바디로 JWT 발급 |

**필수 파라미터:** `mck` (미디어 콘텐츠 키)

**선택 파라미터:** `cuid`, `expt`, `seek`, `intro`, `outro`, `play_section`, `playback_rates`, `subtitle_policy`, `video_watermarking_code_policy` 등

### 콜백 처리

Kollus 플레이어에서 발생하는 콜백을 수신합니다.

| 경로 | 설명 | 응답 |
|------|------|------|
| `POST /callback/play` | 재생 콜백 (kind1: 만료 설정, kind3: 재생 승인) | JWT |
| `POST /callback/drm` | DRM 콜백 (다운로드 승인/완료/재생 권한) | JWT |
| `POST /callback/next-episode` | 다음 회차 연속 재생 | JSON |
| `POST /callback/lms` | 시청 이력 및 학습 진도 수신 | 200 OK |

LMS 콜백 데이터는 `logs/lms.log`에 기록됩니다.

## API 흐름

```
클라이언트
  │
  ├── GET /sample
  │     └── POST /jwt/create → JWT + 플레이어 URL 반환
  │
  ├── GET /upload
  │     ├── POST /api/upload/create-url → Kollus c-api-kr 프록시
  │     └── XHR → Kollus 업로드 서버 (직접 전송)
  │
  └── Kollus 플레이어
        ├── POST /callback/play
        ├── POST /callback/drm
        ├── POST /callback/next-episode
        └── POST /callback/lms
```

## 관련 문서

- [Kollus API 레퍼런스](https://docs.kollus.com)
- [Kollus 관리자 콘솔](https://admin.kollus.com)
