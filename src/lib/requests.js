const REQUESTS_KEY = "flowmerce_requests";

export function getRequests() {
   if (typeof window === "undefined") {
      return [];
   }

   try {
      return JSON.parse(window.localStorage.getItem(REQUESTS_KEY)) || [];
   } catch {
      return [];
   }
}

export function addRequest(payload, session) {
   const authorKey =
      session.loginId || session.customId || session.email || crypto.randomUUID();

   const request = {
      id: crypto.randomUUID(),
      title: "요청서 작성드립니다.",
      ...payload,
      authorKey,
      authorLoginId: session.loginId || "",
      authorCustomId: session.customId || "",
      authorEmail: payload.email || session.email || "",
      authorName: payload.name || session.name,
      createdAt: new Date().toISOString(),
   };
   const requests = [request, ...getRequests()];

   window.localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));

   return request;
}

export function getVisibleRequests(session) {
   const requests = getRequests();

   if (!session) {
      return requests;
   }

   if (session.role === "admin") {
      return requests;
   }

   return [...requests].sort((a, b) => {
      const sessionKey = session.loginId || session.customId || session.email;
      const aIsMine = (a.authorKey || a.authorEmail) === sessionKey;
      const bIsMine = (b.authorKey || b.authorEmail) === sessionKey;

      if (aIsMine === bIsMine) {
         return 0;
      }

      return aIsMine ? -1 : 1;
   });
}

export function canReadRequestDetail(request, session) {
   if (!session) {
      return false;
   }

   const sessionKey = session.loginId || session.customId || session.email;

   return (
      session.role === "admin" ||
      (request.authorKey || request.authorEmail) === sessionKey
   );
}
