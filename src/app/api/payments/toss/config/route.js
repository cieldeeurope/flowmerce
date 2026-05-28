import { NextResponse } from "next/server";
import { getTossClientKey } from "@/lib/tossEnv";

export async function GET() {
   const clientKey = getTossClientKey();

   if (!clientKey) {
      return NextResponse.json(
         {
            message:
               ".env에 toss_clientKey 또는 TOSS_CLIENT_KEY를 설정해주세요.",
         },
         { status: 500 },
      );
   }

   return NextResponse.json({
      clientKey,
   });
}
