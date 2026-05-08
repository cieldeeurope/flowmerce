# Kakao Notification Setup

## 1. What is already prepared in code

The backend copy at `src - 복사본/notification/notification.service.ts` is ready to send two admin notifications:

- inquiry received
- schedule reserved

It uses a webhook-based adapter so you can connect the Kakao sender you prefer later without changing the app flow again.

## 2. Required Kakao-side setup

Go to [business.kakao.com](https://business.kakao.com/) and complete these in order:

1. Create or log in to your Kakao Business account
2. Complete business verification for the company
3. Create a Kakao Channel for Flowmerce
4. Convert the channel to a business channel if required
5. Prepare AlimTalk templates for:
   - inquiry received
   - schedule reserved
6. Get template approval

## 3. You still need a sending adapter

Kakao Business approval does not automatically give you a direct send API for this project.

You need one of these:

- a BizMessage/AlimTalk sending partner
- your own internal webhook adapter server that forwards approved template messages to that partner

The current code is designed for that adapter approach.

## 4. Environment variables to set

Set these on the Nest backend side:

```env
KAKAO_NOTIFY_ENABLED=true
KAKAO_NOTIFY_WEBHOOK_URL=https://your-adapter.example.com/kakao/notify
KAKAO_NOTIFY_WEBHOOK_TOKEN=your-secret-token
KAKAO_NOTIFY_ADMIN_PHONE=01012345678
KAKAO_NOTIFY_SENDER_KEY=your-kakao-sender-key
KAKAO_NOTIFY_TEMPLATE_INQUIRY=FLOWMERCE_INQUIRY_RECEIVED
KAKAO_NOTIFY_TEMPLATE_SCHEDULE=FLOWMERCE_SCHEDULE_RESERVED
```

## 5. Payload shape sent by Flowmerce

The webhook receives JSON like this:

```json
{
  "channel": "kakao_alimtalk",
  "senderKey": "YOUR_SENDER_KEY",
  "eventType": "schedule_reserved",
  "payload": {
    "templateCode": "FLOWMERCE_SCHEDULE_RESERVED",
    "to": "01012345678",
    "title": "[플로우머스] 새 수집 예약",
    "text": "...",
    "variables": {
      "customId": "admin",
      "accountPlatform": "smartstore_1",
      "site": "Lv",
      "categoryName": "남성가방",
      "pendingCount": "8"
    }
  }
}
```

## 6. Current event points

The current backend copy calls notifications here:

- inquiry created: `src - 복사본/user/user.service.ts`
- schedule created: `src - 복사본/schedule/schedule.service.ts`

## 7. Recommended go-live order

1. Finish Kakao Business verification
2. Approve templates
3. Prepare webhook adapter
4. Set env vars
5. Test inquiry creation
6. Test schedule creation
7. Confirm admin phone receives both messages
