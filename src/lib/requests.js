import { getAdminAuthHeaders, getApiBaseUrl, signOutAdmin } from "@/lib/auth";

const API_BASE_URL = getApiBaseUrl();

async function parseApiResponse(response, options = {}) {
   const data = await response.json().catch(() => ({}));

   if (!options.adminBypass && (response.status === 401 || response.status === 403)) {
      signOutAdmin();
      throw new Error("관리자 인증이 만료되었습니다. 다시 로그인해주세요.");
   }

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

   return parseApiResponse(response, { adminBypass: true });
}

export async function fetchAdminContacts() {
   const response = await fetch(`${API_BASE_URL}/user/contacts`, {
      headers: getAdminAuthHeaders(),
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

export async function markAdminContactAsRead(id, readBy) {
   const response = await fetch(`${API_BASE_URL}/user/contacts/${id}/read`, {
      method: "POST",
      headers: getAdminAuthHeaders({
         "Content-Type": "application/json",
      }),
      body: JSON.stringify({
         readBy: readBy || undefined,
      }),
   });

   return parseApiResponse(response);
}
