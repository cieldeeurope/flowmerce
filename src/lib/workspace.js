import { getApiBaseUrl, getUserAuthHeaders, signOut } from "@/lib/auth";

const API_BASE_URL = getApiBaseUrl();
const USER_SESSION_EXPIRED_MESSAGE =
   "로그인 정보가 만료되었습니다. 다시 로그인해주세요.";

async function readApiResponseBody(response) {
   const text = await response.text().catch(() => "");

   if (!text) {
      return {};
   }

   try {
      return JSON.parse(text);
   } catch {
      return { rawText: text };
   }
}

function getApiErrorMessage(data, fallback = "요청을 처리하지 못했습니다.") {
   return data?.message || data?.error || data?.rawText || fallback;
}

function isMissingRouteResponse(response, data) {
   const text = String(data?.rawText || data?.error || data?.message || "");

   return (
      response.status === 404 ||
      text.includes("Cannot GET") ||
      text.includes("Cannot POST") ||
      text.includes("Cannot PUT") ||
      text.includes("Cannot DELETE")
   );
}

async function parseApiResponse(response, fallbackMessage, options = {}) {
   const data = await readApiResponseBody(response);

   if (
      options.signOutOnUnauthorized &&
      (response.status === 401 || response.status === 403)
   ) {
      signOut();
      throw new Error(USER_SESSION_EXPIRED_MESSAGE);
   }

   if (!response.ok) {
      throw new Error(getApiErrorMessage(data, fallbackMessage));
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

function inferPlatformFromAccountPlatform(accountPlatform) {
   const value = String(accountPlatform || "").toLowerCase();

   if (value.startsWith("godomall")) {
      return "godomall";
   }

   if (value.startsWith("smartstore")) {
      return "smartstore";
   }

   if (value.startsWith("cafe24")) {
      return "cafe24";
   }

   if (value.startsWith("makeshop")) {
      return "makeshop";
   }

   return "smartstore";
}

function buildQuery(params) {
   const query = new URLSearchParams();

   Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
         query.set(key, String(value));
      }
   });

   return query.toString();
}

async function fetchJson(path, options = {}, fallbackMessage) {
   const response = await fetch(`${API_BASE_URL}${path}`, {
      cache: "no-store",
      ...options,
      headers: getUserAuthHeaders(options.headers || {}),
   });

   return parseApiResponse(response, fallbackMessage, {
      signOutOnUnauthorized: true,
   });
}

export async function fetchWorkspaceHostingAccounts(customId) {
   const detailResponse = await fetch(
      `${API_BASE_URL}/hosting/accounts/detail?customId=${encodeURIComponent(customId)}`,
      {
         headers: getUserAuthHeaders(),
         cache: "no-store",
      },
   );

   if (detailResponse.ok) {
      const data = await parseApiResponse(detailResponse, undefined, {
         signOutOnUnauthorized: true,
      });
      return normalizeListResponse(data, "accounts");
   }

   const detailError = await readApiResponseBody(detailResponse);

   if (detailResponse.status === 401 || detailResponse.status === 403) {
      signOut();
      throw new Error(USER_SESSION_EXPIRED_MESSAGE);
   }

   if (!isMissingRouteResponse(detailResponse, detailError)) {
      throw new Error(getApiErrorMessage(detailError));
   }

   const fallbackResponse = await fetch(
      `${API_BASE_URL}/hosting/accounts?customId=${encodeURIComponent(customId)}`,
      {
         headers: getUserAuthHeaders(),
         cache: "no-store",
      },
   );

   const fallbackData = await parseApiResponse(fallbackResponse, undefined, {
      signOutOnUnauthorized: true,
   });
   const accountPlatforms = normalizeListResponse(fallbackData, "accounts");

   return accountPlatforms.map((accountPlatform) => ({
      id: "",
      customId,
      accountPlatform,
      platform: inferPlatformFromAccountPlatform(accountPlatform),
      partnerKey: "",
      apiKey: "",
      refreshToken: "",
      tokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      topImages: [],
      bottomImages: [],
      isLegacyFallback: true,
   }));
}

export async function saveWorkspaceHostingAccount(payload) {
   const hasId =
      payload.id !== undefined && payload.id !== null && String(payload.id).trim() !== "";
   const endpoint = hasId
      ? `${API_BASE_URL}/hosting/accounts/${payload.id}`
      : `${API_BASE_URL}/hosting/accounts`;

   const response = await fetch(endpoint, {
      method: hasId ? "PUT" : "POST",
      headers: getUserAuthHeaders({
         "Content-Type": "application/json",
      }),
      body: JSON.stringify(payload),
   });

   if (!response.ok) {
      const data = await readApiResponseBody(response);

      if (response.status === 401 || response.status === 403) {
         signOut();
         throw new Error(USER_SESSION_EXPIRED_MESSAGE);
      }

      if (isMissingRouteResponse(response, data)) {
         throw new Error(
            "현재 서버에는 고객용 호스팅 계정 저장 API가 아직 반영되지 않았습니다. 관리자 화면이나 기존 프로그램에서 먼저 설정해주세요.",
         );
      }

      throw new Error(getApiErrorMessage(data));
   }

   return parseApiResponse(response);
}

export async function fetchWorkspaceHostingCategories(customId, accountPlatform) {
   const query = buildQuery({ customId, accountPlatform });
   return fetchJson(`/hosting/categories?${query}`);
}

export async function refetchWorkspaceHostingCategories(customId, accountPlatform) {
   const query = buildQuery({ customId, accountPlatform });
   return fetchJson(`/hosting/categories/fetch?${query}`, {
      method: "POST",
   });
}

export async function fetchWorkspaceMallCategories(customId, accountPlatform) {
   const query = buildQuery({ customId, accountPlatform });
   const data = await fetchJson(`/categories/categories?${query}`);
   return normalizeListResponse(data, "categories");
}

export async function fetchWorkspaceSourceCategories(site) {
   const route = String(site || "").toLowerCase();
   const data = await fetchJson(`/categories/${encodeURIComponent(route)}`);
   return normalizeListResponse(data, "categories");
}

export async function refreshWorkspaceSourceCategories(site) {
   const query = buildQuery({ site });
   return fetchJson(`/categories/update-categories?${query}`);
}

export async function fetchWorkspaceDesignerOptions(site) {
   const normalizedSite = String(site || "").toLowerCase();
   let route = "";

   if (normalizedSite === "farfetch") {
      route = "farfetchdesigner";
   } else if (normalizedSite === "cettire") {
      route = "cettiredesigner";
   } else {
      return [];
   }

   const data = await fetchJson(`/categories/${route}`);
   return normalizeListResponse(data, "categories");
}

export async function fetchWorkspaceMappedCategories(site, customId, accountPlatform) {
   const query = buildQuery({ customId, accountPlatform });
   const route = String(site || "");
   const data = await fetchJson(`/mapping/${encodeURIComponent(route)}?${query}`);
   return normalizeListResponse(data, "mappings");
}

export async function fetchWorkspaceCollectionMappings(site, customId, accountPlatform) {
   const query = buildQuery({ customId, accountPlatform });
   const route = String(site || "");
   const data = await fetchJson(
      `/mapping/${encodeURIComponent(route)}-collection?${query}`,
   );
   return normalizeListResponse(data, "mappings");
}

export async function saveWorkspaceMapping(site, payload) {
   const route = String(site || "").toLowerCase();
   return fetchJson(`/mapping/${encodeURIComponent(route)}`, {
      method: "POST",
      headers: {
         "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
   });
}

export async function deleteWorkspaceMapping(payload) {
   return fetchJson(`/mapping/delete`, {
      method: "POST",
      headers: {
         "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
   });
}

export async function saveWorkspaceSelectedDesigners(payload) {
   return fetchJson(`/mapping/save`, {
      method: "POST",
      headers: {
         "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
   });
}

export async function loadWorkspaceSelectedDesigners(site, customId, accountPlatform) {
   const query = buildQuery({ site, customId, accountPlatform });
   const data = await fetchJson(`/mapping/load?${query}`);
   return normalizeListResponse(data, "designers");
}

export async function processWorkspaceCettireFilter(customId, accountPlatform) {
   return fetchJson(`/mapping/process-after-cettire-url`, {
      method: "POST",
      headers: {
         "Content-Type": "application/json",
      },
      body: JSON.stringify({ customId, accountPlatform }),
   });
}

export async function fetchWorkspaceMargins(customId, accountPlatform) {
   const query = buildQuery({ customId, accountPlatform });
   const data = await fetchJson(`/margin/all?${query}`);
   return normalizeListResponse(data, "margins");
}

export async function saveWorkspaceMargin(payload) {
   return fetchJson(`/margin/save`, {
      method: "POST",
      headers: {
         "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
   });
}

export async function deleteWorkspaceMargin(id) {
   return fetchJson(`/margin/${id}`, {
      method: "DELETE",
   });
}

export async function fetchWorkspaceReplacements(customId) {
   const query = buildQuery({ customId });
   const data = await fetchJson(`/word-replacement/all?${query}`);
   return normalizeListResponse(data, "replacements");
}

export async function saveWorkspaceReplacement(payload) {
   return fetchJson(`/word-replacement/save`, {
      method: "POST",
      headers: {
         "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
   });
}

export async function deleteWorkspaceReplacement(id) {
   return fetchJson(`/word-replacement/${id}`, {
      method: "DELETE",
   });
}

export async function createWorkspaceSchedule(payload) {
   return fetchJson(`/schedule/create`, {
      method: "POST",
      headers: {
         "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
   });
}

export async function fetchWorkspaceSchedules(customId, accountPlatform, status = "active") {
   const query = buildQuery({ customId, accountPlatform, status });
   const response = await fetch(`${API_BASE_URL}/schedule/list?${query}`, {
      headers: getUserAuthHeaders(),
      cache: "no-store",
   });

   if (!response.ok) {
      const data = await readApiResponseBody(response);

      if (response.status === 401 || response.status === 403) {
         signOut();
         throw new Error(USER_SESSION_EXPIRED_MESSAGE);
      }

      if (isMissingRouteResponse(response, data)) {
         return [];
      }

      throw new Error(getApiErrorMessage(data));
   }

   const data = await parseApiResponse(response);
   return normalizeListResponse(data, "schedules");
}

export async function deleteWorkspaceSchedules(ids) {
   const response = await fetch(`${API_BASE_URL}/schedule/delete-user`, {
      method: "POST",
      headers: getUserAuthHeaders({
         "Content-Type": "application/json",
      }),
      body: JSON.stringify({ ids }),
   });

   if (!response.ok) {
      const data = await readApiResponseBody(response);

      if (response.status === 401 || response.status === 403) {
         signOut();
         throw new Error(USER_SESSION_EXPIRED_MESSAGE);
      }

      if (isMissingRouteResponse(response, data)) {
         throw new Error(
            "현재 서버에는 고객용 예약 삭제 API가 아직 없습니다. 관리자 화면에서 예약을 정리해주세요.",
         );
      }

      throw new Error(getApiErrorMessage(data));
   }

   return parseApiResponse(response);
}

export async function fetchWorkspaceCafe24AuthorizeUrl({ mallId, state }) {
   const query = buildQuery({
      mallId: String(mallId || "").trim(),
      state: String(state || "").trim(),
   });

   const response = await fetch(`${API_BASE_URL}/cafe24/authorize-url?${query}`, {
      headers: getUserAuthHeaders(),
      cache: "no-store",
   });

   if (!response.ok) {
      const data = await readApiResponseBody(response);

      if (response.status === 401 || response.status === 403) {
         signOut();
         throw new Error(USER_SESSION_EXPIRED_MESSAGE);
      }

      if (isMissingRouteResponse(response, data)) {
         throw new Error(
            "현재 운영 서버에는 고객용 Cafe24 연동 API가 아직 열려 있지 않습니다. 관리자 화면에서 먼저 연동해주세요.",
         );
      }

      throw new Error(getApiErrorMessage(data));
   }

   return parseApiResponse(response);
}

export async function exchangeWorkspaceCafe24AccessToken(payload) {
   const response = await fetch(`${API_BASE_URL}/cafe24/token/exchange`, {
      method: "POST",
      headers: getUserAuthHeaders({
         "Content-Type": "application/json",
      }),
      body: JSON.stringify(payload),
   });

   if (!response.ok) {
      const data = await readApiResponseBody(response);

      if (response.status === 401 || response.status === 403) {
         signOut();
         throw new Error(USER_SESSION_EXPIRED_MESSAGE);
      }

      if (isMissingRouteResponse(response, data)) {
         throw new Error(
            "현재 운영 서버에는 고객용 Cafe24 토큰 교환 API가 아직 열려 있지 않습니다.",
         );
      }

      throw new Error(getApiErrorMessage(data));
   }

   return parseApiResponse(response);
}
