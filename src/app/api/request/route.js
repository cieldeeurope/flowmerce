export async function POST(request) {
   const body = await request.json();
   const requiredFields = [
      "name",
      "email",
      "platform",
      "mallId",
      "mallPassword",
      "plan",
      "phone",
      "content",
   ];
   const hasMissingField = requiredFields.some((field) => !body[field]);

   if (hasMissingField) {
      return Response.json(
         { message: "필수 항목을 모두 입력해주세요." },
         { status: 400 },
      );
   }

   return Response.json({
      message: "요청 완료",
      request: {
         ...body,
         receivedAt: new Date().toISOString(),
      },
   });
}
