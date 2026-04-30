import { getApiBaseUrl } from "@/lib/auth";

const API_BASE_URL = getApiBaseUrl();

async function parseApiResponse(response) {
   const data = await response.json().catch(() => ({}));

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
      cache: "no-store",
   });

   const data = await parseApiResponse(response);
   return normalizeListResponse(data, "users");
}

export async function createAdminUser(payload) {
   const response = await fetch(`${API_BASE_URL}/user/admin/users`, {
      method: "POST",
      headers: {
         "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
   });

   return parseApiResponse(response);
}

export async function updateAdminUser(id, payload) {
   const response = await fetch(`${API_BASE_URL}/user/admin/users/${id}`, {
      method: "PUT",
      headers: {
         "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
   });

   return parseApiResponse(response);
}

export async function fetchAdminHostingAccounts() {
   const response = await fetch(`${API_BASE_URL}/hosting/admin/accounts`, {
      cache: "no-store",
   });

   const data = await parseApiResponse(response);
   return normalizeListResponse(data, "accounts");
}

export async function createAdminHostingAccount(payload) {
   const response = await fetch(`${API_BASE_URL}/hosting/admin/accounts`, {
      method: "POST",
      headers: {
         "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
   });

   return parseApiResponse(response);
}

export async function updateAdminHostingAccount(id, payload) {
   const response = await fetch(`${API_BASE_URL}/hosting/admin/accounts/${id}`, {
      method: "PUT",
      headers: {
         "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
   });

   return parseApiResponse(response);
}
