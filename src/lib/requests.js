import { getApiBaseUrl } from "@/lib/auth";

const API_BASE_URL = getApiBaseUrl();

async function parseApiResponse(response) {
   const data = await response.json().catch(() => ({}));

   if (!response.ok) {
      throw new Error(data.message || "잠시 후 다시 시도해주세요.");
   }

   return data;
}

export async function submitInquiry(payload, session = null) {
   const response = await fetch(`${API_BASE_URL}/user/contact`, {
      method: "POST",
      headers: {
         "Content-Type": "application/json",
      },
      body: JSON.stringify({
         ...payload,
         title: payload.title || payload.type,
         authorLoginId: session?.loginId || undefined,
         authorCustomId: session?.customId || undefined,
      }),
   });

   return parseApiResponse(response);
}

export async function fetchAdminContacts() {
   const response = await fetch(`${API_BASE_URL}/user/contacts`, {
      cache: "no-store",
   });

   const data = await parseApiResponse(response);

   if (Array.isArray(data)) {
      return data;
   }

   if (Array.isArray(data.contacts)) {
      return data.contacts;
   }

   return [];
}
