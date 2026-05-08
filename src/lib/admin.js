import { getAdminAuthHeaders, getApiBaseUrl, signOutAdmin } from "@/lib/auth";

const API_BASE_URL = getApiBaseUrl();

async function parseApiResponse(response) {
   const data = await response.json().catch(() => ({}));

   if (response.status === 401 || response.status === 403) {
      signOutAdmin();
      throw new Error("관리자 인증이 만료되었습니다. 다시 로그인해주세요.");
   }

   if (!response.ok) {
      throw new Error(data.message || "잠시 후 다시 시도해주세요.");
   }

   return data;
}

function normalizeListResponse(data, key) {
   if (Array.isArray(data)) {
      return data;
   }

   if (Array.isArray(data?.[key])) {
      return data[key];
   }

   return [];
}

export async function fetchAdminUsers() {
   const response = await fetch(`${API_BASE_URL}/user/admin/users`, {
      headers: getAdminAuthHeaders(),
      cache: "no-store",
   });

   const data = await parseApiResponse(response);
   return normalizeListResponse(data, "users");
}

export async function createAdminUser(payload) {
   const response = await fetch(`${API_BASE_URL}/user/admin/users`, {
      method: "POST",
      headers: getAdminAuthHeaders({
         "Content-Type": "application/json",
      }),
      body: JSON.stringify(payload),
   });

   return parseApiResponse(response);
}

export async function updateAdminUser(id, payload) {
   const response = await fetch(`${API_BASE_URL}/user/admin/users/${id}`, {
      method: "PUT",
      headers: getAdminAuthHeaders({
         "Content-Type": "application/json",
      }),
      body: JSON.stringify(payload),
   });

   return parseApiResponse(response);
}

export async function fetchAdminHostingAccounts() {
   const response = await fetch(`${API_BASE_URL}/hosting/admin/accounts`, {
      headers: getAdminAuthHeaders(),
      cache: "no-store",
   });

   const data = await parseApiResponse(response);
   return normalizeListResponse(data, "accounts");
}

export async function createAdminHostingAccount(payload) {
   const response = await fetch(`${API_BASE_URL}/hosting/admin/accounts`, {
      method: "POST",
      headers: getAdminAuthHeaders({
         "Content-Type": "application/json",
      }),
      body: JSON.stringify(payload),
   });

   return parseApiResponse(response);
}

export async function updateAdminHostingAccount(id, payload) {
   const response = await fetch(`${API_BASE_URL}/hosting/admin/accounts/${id}`, {
      method: "PUT",
      headers: getAdminAuthHeaders({
         "Content-Type": "application/json",
      }),
      body: JSON.stringify(payload),
   });

   return parseApiResponse(response);
}

export async function fetchCafe24AuthorizeUrl({ mallId, state }) {
   const query = new URLSearchParams({
      mallId: String(mallId || "").trim(),
      state: String(state || "").trim(),
   });

   const response = await fetch(`${API_BASE_URL}/cafe24/authorize-url?${query.toString()}`, {
      headers: getAdminAuthHeaders(),
      cache: "no-store",
   });

   return parseApiResponse(response);
}

export async function exchangeCafe24AccessToken(payload) {
   const response = await fetch(`${API_BASE_URL}/cafe24/token/exchange`, {
      method: "POST",
      headers: getAdminAuthHeaders({
         "Content-Type": "application/json",
      }),
      body: JSON.stringify(payload),
   });

   return parseApiResponse(response);
}
