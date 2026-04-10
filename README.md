# Taskrit Backend

Taskrit Backend는 Express + TypeScript + MongoDB 기반 REST API 서버입니다.

현재 문서는 실제 라우트와 컨트롤러 동작 기준으로 작성되었으며, 상세 스키마는 openapi.json에서 확인할 수 있습니다.

## Tech Stack

- Node.js
- TypeScript
- Express
- MongoDB (Mongoose)
- JWT 인증
- Multer 파일 업로드
- Solana 지갑 서명 검증

## Run

### 1) Install

```bash
npm install
```

### 2) Env

필수 환경변수 예시:

```env
PORT=3000
NODE_ENV=development

MONGODB_URI=mongodb://localhost:27017/taskrit

JWT_ACCESS_SECRET=change_me
JWT_REFRESH_SECRET=change_me
JWT_ACCESS_EXPIRES_IN=3600
JWT_REFRESH_EXPIRES_IN=1209600

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=5
RATE_LIMIT_LOCK_TIME=600000
RATE_LIMIT_MAX_STORE_SIZE=50000

SOLANA_CLUSTER=devnet

UPLOAD_DIR=uploads

TEAMING_API_BASE=http://localhost:3002
TEAMING_ENGINE_URL=http://localhost:3002
HMAC_KEY=change_me
```

### 3) Start

```bash
npm run dev
```

## Auth Header

인증이 필요한 API는 아래 헤더를 사용합니다.

```http
Authorization: Bearer <access_token>
```

## API Docs

- OpenAPI 스펙 파일: openapi.json
- Base URL (local): http://localhost:3000

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /health | No | 서버 상태 확인 |

응답 예시:

```json
{ "status": "ok" }
```

### Auth APIs

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /user/register | No | 회원가입 |
| POST | /user/login | No | 아이디/비밀번호 로그인 |
| POST | /user/refresh | No | 리프레시 토큰으로 재발급 |

#### POST /user/register

요청 본문:

```json
{
  "user_id": "devuser_01",
  "nickname": "Dev User",
  "password": "hashed_or_raw_password",
  "profile_bio": "소개글",
  "wallet_address": "7kbnvuGBxxj8AG9qp8Scn56muWGaRaFqxg1FsRp3PaFT"
}
```

성공 응답 (201):

```json
{
  "message": "User created successfully",
  "user_uuid": "7ddad81d-0938-4fdd-aaf1-6db86ed3037e"
}
```

주요 실패 코드: 400, 409, 422

#### POST /user/login

요청 본문:

```json
{
  "user_id": "devuser_01",
  "password": "hashed_or_raw_password",
  "otp_code": "123456"
}
```

성공 응답 (200):

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 3600
}
```

OTP가 켜진 계정에서 otp_code가 없거나 틀린 경우:

```json
{
  "error": "OTP code is required",
  "otp_required": true
}
```

주요 실패 코드: 400, 401, 422, 429

#### POST /user/refresh

요청 본문:

```json
{ "refresh_token": "..." }
```

성공 응답 (200): TokenResponse

### User APIs

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /user/me | Yes | 내 프로필 조회 |
| PATCH | /user/me | Yes | 내 정보 수정 |
| DELETE | /user/me | Yes | 회원 Soft Delete |
| POST | /user/me/profile-image | Yes | 프로필 이미지 업로드 |
| GET | /user/me/otp/status | Yes | OTP 상태 조회 |
| POST | /user/me/otp/setup | Yes | OTP 시크릿/QR 발급 |
| POST | /user/me/otp/enable | Yes | OTP 활성화 |
| POST | /user/me/otp/disable | Yes | OTP 비활성화 |
| POST | /user/:uuid/report | Yes | 사용자 신고 |

#### GET /user/me

성공 응답 (200):

```json
{
  "user_uuid": "7ddad81d-0938-4fdd-aaf1-6db86ed3037e",
  "user_id": "devuser_01",
  "nickname": "Dev User",
  "profile_bio": "소개글",
  "capabilities": ["React", "Node.js"],
  "wallet_address": null,
  "profile_image_url": "/uploads/abc.webp",
  "otp_enabled": false,
  "created_at": 1710000000
}
```

#### PATCH /user/me

요청 본문 예시:

```json
{
  "nickname": "Updated Nick",
  "password": "new_password",
  "profile_bio": "업데이트 소개",
  "capabilities": ["TypeScript", "Solana"]
}
```

성공 응답 (200):

```json
{ "message": "User updated successfully" }
```

#### POST /user/me/profile-image

Content-Type: multipart/form-data

필드:
- profile_image: 이미지 파일 (최대 10MB)

성공 시 /user/me와 유사한 사용자 프로필 객체 반환.

#### OTP 관련

- GET /user/me/otp/status

```json
{ "otp_enabled": false, "otp_pending": true }
```

- POST /user/me/otp/setup

```json
{
  "secret": "BASE32SECRET",
  "otpauth_url": "otpauth://totp/...",
  "qr_code_data_url": "data:image/png;base64,..."
}
```

- POST /user/me/otp/enable

```json
{ "code": "123456" }
```

응답:

```json
{ "message": "OTP enabled successfully" }
```

- POST /user/me/otp/disable

```json
{ "code": "123456" }
```

응답:

```json
{ "message": "OTP disabled successfully" }
```

#### POST /user/:uuid/report

요청 본문:

```json
{ "reason": "스팸/악성 행위" }
```

성공 응답:

```json
{ "message": "사용자가 신고되었습니다." }
```

### Wallet APIs

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /wallets/connect/request | No | nonce 발급 |
| POST | /wallets/connect/confirm | Yes | 지갑 연동 확정 |
| POST | /wallets/login/confirm | No | 지갑 서명 로그인 |
| DELETE | /wallets | Yes | 지갑 연결 해제 |

#### POST /wallets/connect/request

요청:

```json
{
  "wallet_address": "7kbnvuGBxxj8AG9qp8Scn56muWGaRaFqxg1FsRp3PaFT"
}
```

응답:

```json
{
  "nonce": "hex_nonce",
  "message": "Taskrit Wallet Verification\nNetwork: solana-devnet\nWallet: ...\nNonce: ..."
}
```

#### POST /wallets/connect/confirm

요청:

```json
{
  "wallet_address": "...",
  "signature": "...",
  "nonce": "...",
  "message": "...",
  "signature_encoding": "base58"
}
```

성공:

```json
{ "message": "Wallet connected successfully" }
```

#### POST /wallets/login/confirm

요청:

```json
{
  "wallet_address": "...",
  "signature": "...",
  "nonce": "...",
  "message": "...",
  "signature_encoding": "base58",
  "otp_code": "123456"
}
```

성공 시 TokenResponse 반환.

#### DELETE /wallets

성공 코드: 204 No Content

### Project APIs

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /projects/feed | No | 공개 프로젝트 피드 |
| GET | /projects/public/metrics | No | 공개 지표 |
| GET | /projects/dashboard | Yes | 내 대시보드 요약 |
| POST | /projects/match/suggest | Yes | 매칭 추천 |
| POST | /projects | Yes | 프로젝트 생성 |
| GET | /projects | Yes | 내 프로젝트 목록 |
| GET | /projects/:project_uuid | Yes | 프로젝트 상세 |
| PATCH | /projects/:project_uuid | Yes | 프로젝트 수정 |
| DELETE | /projects/:project_uuid | Yes | 프로젝트 삭제 |

#### Project Object

```json
{
  "project_uuid": "...",
  "owner_user_uuid": "...",
  "name": "Taskrit API",
  "category": "backend",
  "budget": 100000,
  "deadline": 1750000000,
  "team_requirements": "backend 1, frontend 1",
  "detailed_description": "프로젝트 상세 설명",
  "created_at": 1710000000,
  "updated_at": 1710000100,
  "deleted_at": null
}
```

#### POST /projects/match/suggest

요청:

```json
{
  "request": "백엔드 API 설계 가능한 팀원 추천",
  "requiredDate": 0,
  "requiredElo": 0,
  "requiredCost": 0,
  "requireHuman": false,
  "maxCost": 0
}
```

응답:

```json
{
  "matches": [
    {
      "taskId": "...",
      "requiredAbility": "...",
      "candidates": [
        {
          "accountId": "...",
          "accountType": "human",
          "displayName": "닉네임",
          "abilityText": "...",
          "similarity": 0.9,
          "score": 0.88,
          "linkedAssetId": null
        }
      ]
    }
  ]
}
```

### Asset APIs

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /assets | Yes | 에셋 생성(파일 업로드) |
| GET | /assets/my | Yes | 내 에셋 목록 |
| DELETE | /assets/:asset_uuid | Yes | 에셋 삭제 |

#### POST /assets

Content-Type: multipart/form-data

필드:
- name: string
- description: string
- file: binary (최대 50MB)

성공 응답 (201): Asset 객체

#### GET /assets/my

성공 응답 (200): Asset 배열

#### DELETE /assets/:asset_uuid

성공 코드: 204 No Content

### Test API

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /test/hash-password | No | 개발환경 비밀번호 해싱 테스트 |

요청:

```json
{ "password": "plain-password" }
```

응답:

```json
{
  "hashed_password": "$2b$12$...",
  "message": "Use hashed_password in login/register requests"
}
```

주의:
- NODE_ENV=production에서는 403을 반환합니다.

## HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

## Notes

- 상세한 요청/응답 스키마는 openapi.json을 기준으로 사용하세요.
- 문서와 코드가 불일치하면 라우트/컨트롤러 구현이 최종 기준입니다.
