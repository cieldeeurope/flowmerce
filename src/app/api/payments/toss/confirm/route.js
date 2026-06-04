import { NextResponse } from "next/server";
import { getTossApiVersion, getTossSecretKey } from "@/lib/tossEnv";

function createBasicAuthHeader(secretKey) {
   return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

export async function POST(request) {
   const secretKey = getTossSecretKey();

   if (!secretKey) {
      return NextResponse.json(
         {
            message:
               ".env에 toss_secretKey 또는 TOSS_SECRET_KEY를 설정해주세요.",
         },
         { status: 500 },
      );
   }

   const body = await request.json().catch(() => ({}));
   const paymentKey = String(body.paymentKey || "").trim();
   const orderId = String(body.orderId || "").trim();
   const amount = Number(body.amount);

   if (!paymentKey || !orderId || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
         { message: "결제 승인에 필요한 값이 올바르지 않습니다." },
         { status: 400 },
      );
   }

   const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
         Authorization: createBasicAuthHeader(secretKey),
         "Content-Type": "application/json",
         "TossPayments-API-Version": getTossApiVersion(),
      },
      body: JSON.stringify({
         paymentKey,
         orderId,
         amount,
      }),
   });

   const text = await response.text().catch(() => "");
   let data = {};

   if (text) {
      try {
         data = JSON.parse(text);
      } catch {
         data = { rawText: text };
      }
   }

   if (!response.ok) {
      return NextResponse.json(
         {
            message:
               data.message ||
               data.rawText ||
               `결제 승인에 실패했습니다. (HTTP ${response.status})`,
            code: data.code || null,
         },
         { status: response.status },
      );
   }

   return NextResponse.json({
      payment: data,
   });
}
