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
   const request = {
      id: crypto.randomUUID(),
      title: "요청서 작성드립니다.",
      ...payload,
      authorEmail: session.email,
      authorName: session.name,
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
      const aIsMine = a.authorEmail === session.email;
      const bIsMine = b.authorEmail === session.email;

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

   return session.role === "admin" || request.authorEmail === session.email;
}
