export async function POST(request) {
   const body = await request.json();
   const requiredFields = ["type", "name", "phone", "content"];
   const hasMissingField = requiredFields.some((field) => !body[field]);

   if (hasMissingField) {
      return Response.json(
         { message: "필수 항목을 모두 입력해주세요." },
         { status: 400 },
      );
   }

   return Response.json({
      message: "문의 접수 완료",
      request: {
         ...body,
         receivedAt: new Date().toISOString(),
      },
   });
}
