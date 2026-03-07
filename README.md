# Taskrit Backend REST API

TypeScript 기반 Node.js REST API. Web3 지갑 인증, JWT 기반 사용자 인증, bcrypt 비밀번호 암호화, Rate Limiting을 지원합니다.

## 주요 기능

- **사용자 인증**: ID/비밀번호 기반 JWT 로그인
- **사용자 관리**: 회원가입, 정보 조회/수정, 회원 탈퇴 (Soft Delete)
- **Web3 지갑 연동**: EIP-191 서명 검증을 통한 안전한 지갑 연동
- **보안**:
  - 비밀번호: Client SHA-256 → Server bcrypt(12+)
  - JWT: Access Token (1시간), Refresh Token (14일)
  - Rate Limiting: 로그인 5회 실패 시 10분 잠금
- **데이터베이스**: MongoDB

## 설치

### 필수 사항
- Node.js 16+ 
- npm 또는 yarn
- MongoDB 4.4+ (로컬 또는 원격)

### 설치 단계

```bash
# 프로젝트 디렉토리로 이동
cd /Users/devleo/Desktop/dev/Taskrit-backend

# 의존성 설치
npm install

# .env 파일 생성 (.env.example 참고)
cp .env.example .env

# 환경변수 수정 (필수: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, MONGODB_URI)
# 텍스트 에디터로 .env 파일을 열고 시크릿 키 및 MongoDB 연결 문자열 설정
```

### MongoDB 설정

**로컬 MongoDB 실행 (Mac):**
```bash
# Homebrew로 설치된 경우
brew services start mongodb-community

# 또는 Docker 사용
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**MongoDB Atlas (클라우드):**
1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)에서 계정 생성
2. 클러스터 생성
3. 연결 문자열 복사
4. `.env` 파일의 `MONGODB_URI`에 붙여넣기

```bash
# 연결 문자열 예시
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/taskrit
```

## 실행

### 개발 모드 (ts-node)
```bash
npm run dev
```

### 프로덕션 모드
```bash
# TypeScript 컴파일
npm run build

# 실행
npm start
```

### Watch 모드 (파일 변경 감지)
```bash
npm run watch
```

## API 엔드포인트

### 인증 (Auth)

#### POST /user/register
**회원가입**

Request Body:
```json
{
  "user_id": "john_doe",
  "nickname": "John",
  "password": "hashed_password_from_client",
  "wallet_address": "0x1234...abcd"
}
```

Response (201 Created):
```json
{
  "message": "User created successfully",
  "user_uuid": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### POST /user/login
**로그인**

Request Body:
```json
{
  "user_id": "john_doe",
  "password": "hashed_password_from_client"
}
```

Response (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 3600
}
```

#### POST /user/refresh
**토큰 갱신**

Request Body:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

Response (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 3600
}
```

### 사용자 (Users)

#### GET /user/me
**현재 사용자 정보 조회**

Header:
```
Authorization: Bearer {access_token}
```

Response (200 OK):
```json
{
  "user_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "john_doe",
  "nickname": "John",
  "wallet_address": "0x1234...abcd",
  "created_at": 1704067200
}
```

#### PATCH /user/me
**사용자 정보 수정**

Header:
```
Authorization: Bearer {access_token}
```

Request Body:
```json
{
  "nickname": "John Doe",
  "password": "new_hashed_password"
}
```

Response (200 OK):
```json
{
  "message": "User updated successfully"
}
```

#### DELETE /user/me
**회원 탈퇴 (Soft Delete)**

Header:
```
Authorization: Bearer {access_token}
```

Response (200 OK):
```json
{
  "message": "User account deleted successfully"
}
```

Response (400 Bad Request - 이미 삭제된 사용자):
```json
{
  "error": "User already deleted"
}
```

Response (404 Not Found - 사용자가 없음):
```json
{
  "error": "User not found"
}
```

Response (401 Unauthorized - 인증 실패):
```json
{
  "error": "Unauthorized"
}
```

### 지갑 (Wallets)

#### POST /wallets/connect/request
**지갑 연동 요청 (Nonce 발급)**

Request Body:
```json
{
  "wallet_address": "0x1234567890123456789012345678901234567890"
}
```

Response (200 OK):
```json
{
  "nonce": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "message": "Sign this message to verify wallet ownership"
}
```

#### POST /wallets/connect/confirm
**지갑 연동 완료 (Signature 검증)**

Header:
```
Authorization: Bearer {access_token}
```

Request Body:
```json
{
  "wallet_address": "0x1234567890123456789012345678901234567890",
  "signature": "0x...",
  "nonce": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}
```

Response (200 OK):
```json
{
  "message": "Wallet connected successfully"
}
```

#### DELETE /wallets
**지갑 연동 해제**

Header:
```
Authorization: Bearer {access_token}
```

Response (204 No Content)

### 테스트 유틸 (Test Utils)

#### POST /test/hash-password
**비밀번호 해싱 테스트 (개발용)**

개발 중 프론트엔드에서 평문 비밀번호를 암호화하기 전에 사용할 수 있는 테스트 엔드포인트입니다.

Request Body:
```json
{
  "password": "mypassword123"
}
```

Response (200 OK - 개발 환경에서만):
```json
{
  "hashed_password": "$2b$12$...",
  "message": "Use hashed_password in login/register requests"
}
```

⚠️ **주의사항**:
- **개발 환경에서만** 사용 가능 (프로덕션에서는 403 에러 반환)
- 반환된 `hashed_password` 값을 회원가입/로그인 요청의 `password` 필드에 입력하세요

Response (403 - 프로덕션):
```json
{
  "error": "This endpoint is not available in production"
}
```

## 프로젝트 구조

```
src/
├── index.ts                 # 메인 서버 파일
├── controllers/
│   ├── authController.ts    # 인증 관련 로직
│   ├── userController.ts    # 사용자 관련 로직
│   ├── walletController.ts  # 지갑 관련 로직
│   └── testController.ts    # 테스트 유틸 로직
├── services/
│   ├── userService.ts       # 사용자 비즈니스 로직
│   └── nonceService.ts      # Nonce 관리 로직
├── routes/
│   ├── auth.ts              # 인증 라우트
│   ├── users.ts             # 사용자 라우트
│   ├── wallets.ts           # 지갑 라우트
│   └── test.ts              # 테스트 유틸 라우트
├── middleware/
│   └── auth.ts              # JWT 검증 미들웨어
├── models/
│   ├── database.ts          # MongoDB 연결
│   ├── User.ts              # User 스키마
│   └── Nonce.ts             # Nonce 스키마
├── utils/
│   ├── jwt.ts               # JWT 유틸
│   ├── password.ts          # bcrypt 유틸
│   ├── web3.ts              # Web3 서명 검증
│   └── rateLimit.ts         # Rate Limiting
└── types/
    └── index.ts             # TypeScript 타입 정의
```

## 환경변수 설정 (.env)

```
PORT=3000
NODE_ENV=development

# JWT 시크릿 키 (반드시 변경 필요)
JWT_ACCESS_SECRET=your_access_secret_key_here_change_in_production
JWT_REFRESH_SECRET=your_refresh_secret_key_here_change_in_production

# JWT 만료 시간 (초)
JWT_ACCESS_EXPIRES_IN=3600         # 1시간
JWT_REFRESH_EXPIRES_IN=1209600     # 14일

# MongoDB 연결 문자열
MONGODB_URI=mongodb://localhost:27017/taskrit

# Rate Limiting 설정
RATE_LIMIT_WINDOW_MS=900000        # 15분
RATE_LIMIT_MAX_REQUESTS=5          # 최대 시도 5회
RATE_LIMIT_LOCK_TIME=600000        # 10분 잠금
```

## 보안 사항

1. **비밀번호 해싱**
   - 클라이언트에서 SHA-256으로 1차 해싱
   - 서버에서 bcrypt(12+)로 2차 해싱

2. **JWT 인증**
   - Access Token: 1시간 유효
   - Refresh Token: 14일 유효
   - Bearer 토큰 방식 사용

3. **Web3 지갑 인증**
   - EIP-191 규격 서명 검증
   - Nonce 기반 replay attack 방지
   - 서명 검증 후 지갑 주소 정규화

4. **Rate Limiting**
   - 로그인 시도 5회 실패 시 10분 계정 잠금
   - IP/사용자별 추적

5. **Soft Delete**
   - 삭제된 사용자 정보 보존
   - 데이터 복구 가능

## API 테스트

### curl을 이용한 기본 테스트

```bash
# 0. 비밀번호 해싱 (개발 환경에서만)
curl -X POST http://localhost:3000/test/hash-password \
  -H "Content-Type: application/json" \
  -d '{
    "password": "mypassword123"
  }'

# 이 요청의 결과 hashed_password 값을 다음 요청들에서 사용합니다

# 1. 회원가입
curl -X POST http://localhost:3000/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "testuser",
    "nickname": "Test User",
    "password": "hashed_password_from_above"
  }'

# 2. 로그인
curl -X POST http://localhost:3000/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "testuser",
    "password": "hashed_password_from_above"
  }'

# 3. 사용자 정보 조회 (TOKEN을 반환받은 access_token으로 교체)
curl -X GET http://localhost:3000/user/me \
  -H "Authorization: Bearer TOKEN"
```
  -H "Authorization: Bearer TOKEN"
```

## 에러 코드

| 코드 | 설명 |
|------|------|
| 200 | 성공 |
| 201 | 생성됨 |
| 204 | 콘텐츠 없음 (삭제 성공) |
| 400 | 잘못된 요청 |
| 401 | 인증 실패 |
| 404 | 찾을 수 없음 |
| 409 | 충돌 (중복 ID, 중복 지갑 등) |
| 422 | 처리 불가 (형식 오류) |
| 429 | 너무 많은 요청 (Rate Limited) |
| 500 | 서버 내부 오류 |

## 라이선스

ISC
