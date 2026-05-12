# 유저 세션 만료 처리 가이드

최종 업데이트: 2026-05-12

## 목표

`admin-flowmerce`처럼 일반 유저도 만료된 세션으로는 더 이상 `mypage`와 `flowmerce-studio`를 사용할 수 없게 만들고, 만료 시 자동 로그아웃되도록 맞춥니다.

## 현재 적용 기준

- 비활동 1시간 시 프론트에서 자동 로그아웃
- 로그인 후 최대 12시간까지만 유지
- 즉, 활동이 계속 있어도 12시간이 지나면 다시 로그인해야 합니다.

## 기본 원리

1. 로그인 시 서버가 유저 전용 토큰을 발급합니다.
2. 토큰에는 최소한 `loginId`, `customId`, `role`, `exp`가 들어갑니다.
3. 프론트는 이 토큰과 만료 시각을 저장합니다.
4. 보호된 API는 `Authorization: Bearer ...`를 검사합니다.
5. 토큰이 없거나 만료되면 `401` 또는 `403`을 반환합니다.
6. 프론트는 해당 응답을 받으면 세션을 지우고 다시 로그인시키면 됩니다.

## admin 방식과 같은 점

- `Bearer` 토큰 기반
- 서버에서 만료 시간(`exp`) 검사
- 만료 또는 위조 시 `401 Unauthorized`
- 프론트에서 만료 응답을 받으면 세션 제거

## admin 방식과 다른 점

- 유저 토큰에는 반드시 `customId`가 들어가야 합니다.
- 유저 API는 body/query로 받은 `customId`를 신뢰하지 않고, 토큰 안의 `customId`를 기준으로 처리해야 합니다.
- 즉, 핵심은 `자동 로그아웃` 자체보다 `다른 계정 customId를 넣어도 못 건드리게 만드는 것`입니다.

## 이번 작업에서 맞춘 프론트 준비

- `src/lib/auth.js`
  - 유저 세션에 `accessToken`, `expiresAt` 저장 가능
  - 만료 시간 도달 시 세션 자동 제거
  - 보호 API `401/403` 응답 시 자동 로그아웃 처리
- `src/lib/workspace.js`
  - `flowmerce-studio` 주요 API 호출에 유저 인증 헤더 연결
  - 보호 API `401/403` 응답 시 자동 로그아웃 처리

## 백엔드에 필요한 최소 구현

### 1. 유저 토큰 발급

로그인 성공 시 아래 형태의 응답이 필요합니다.

```json
{
  "success": true,
  "loginId": "sample-user",
  "customId": "sample-shop",
  "role": "user",
  "accessToken": "....",
  "accessTokenExpiresAt": "2026-05-13T01:30:00.000Z"
}
```

### 2. 유저 가드 추가

필수 보호 대상 예시:

- `/user/profile`
- `/user/sites`
- `/user/change-password`
- `/hosting/accounts`
- `/hosting/accounts/detail`
- `/hosting/categories`
- `/schedule/create`
- `/schedule/list`
- `/schedule/delete-user`
- `/mapping/*`
- `/margin/*`
- `/word-replacement/*`
- `/cafe24/authorize-url`
- `/cafe24/token/exchange`

### 3. 토큰 기준 사용자 식별

예시 원칙:

- `request.user.customId`를 사용
- 요청 body의 `customId`는 무시하거나 일치 여부만 검증
- 다른 계정 데이터에 접근하려 하면 `403` 반환

### 4. 위험한 패턴 제거

아래 패턴은 가급적 피해야 합니다.

- `GET /user/profile?customId=...` 에서 쿼리값만 믿고 조회
- `POST /schedule/delete-user` 에서 id 목록만 받아 바로 삭제
- `PUT /hosting/accounts/:id` 에서 id만 맞으면 다른 계정 정보도 수정 가능

## src - 복사본 기준 권장 적용 방향

- `admin-auth`와 같은 방식으로 `user-auth` 서비스/가드 추가
- `user/login` 응답에 `accessToken`, `accessTokenExpiresAt` 포함
- 유저 보호 컨트롤러에서 `customId`를 토큰 기준으로 덮어쓰기
- 삭제/수정 API는 `id + customId`를 함께 검증

## 확인 순서

1. 유저 로그인 후 `accessToken`이 내려오는지 확인
2. 토큰 없이 보호 API 호출 시 `401` 확인
3. 만료 토큰으로 보호 API 호출 시 `401` 확인
4. 다른 `customId`를 넣어도 자기 데이터만 보이는지 확인
5. 프론트에서 만료 응답 뒤 자동 로그아웃되는지 확인
