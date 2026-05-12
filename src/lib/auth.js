const SESSION_KEY = "flowmerce_session";
const ADMIN_SESSION_KEY = "flowmerce_admin_session";
const API_BASE_URL = (
   process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.flowmerce.co.kr"
).replace(/\/$/, "");
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const DEFAULT_PLAN = "none";
const RESERVED_ADMIN_LOGIN_ID_REGEX = /admin/i;
const USER_MAX_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const USER_IDLE_SESSION_TTL_MS = 60 * 60 * 1000;
const SESSION_ACTIVITY_WRITE_INTERVAL_MS = 60 * 1000;
const USER_SESSION_EXPIRED_MESSAGE =
   "로그인 정보가 만료되었습니다. 다시 로그인해주세요.";

async function parseApiResponse(response, options = {}) {
   const data = await response.json().catch(() => ({}));

   if (
      options.signOutOnUnauthorized &&
      (response.status === 401 || response.status === 403)
   ) {
      signOut();
      throw new Error(USER_SESSION_EXPIRED_MESSAGE);
   }

   if (!response.ok) {
      throw new Error(data.message || "요청을 처리하지 못했습니다.");
   }

   return data;
}

function resolveSessionExpiry(user) {
   const candidateValues = [
      user.accessTokenExpiresAt,
      user.tokenExpiresAt,
      user.expiresAt,
      user.expiredAt,
      user.exp,
   ];

   for (const value of candidateValues) {
      if (!value) {
         continue;
      }

      if (typeof value === "number") {
         const numericDate =
            value > 1_000_000_000_000 ? new Date(value) : new Date(value * 1000);

         if (!Number.isNaN(numericDate.getTime())) {
            return numericDate.toISOString();
         }
      }

      if (/^\d+$/.test(String(value))) {
         const numericValue = Number(value);
         const numericDate =
            numericValue > 1_000_000_000_000
               ? new Date(numericValue)
               : new Date(numericValue * 1000);

         if (!Number.isNaN(numericDate.getTime())) {
            return numericDate.toISOString();
         }
      }

      const parsed = new Date(value);

      if (!Number.isNaN(parsed.getTime())) {
         return parsed.toISOString();
      }
   }

   return null;
}

function toIsoString(value) {
   if (!value) {
      return null;
   }

   const parsed = new Date(value);

   if (Number.isNaN(parsed.getTime())) {
      return null;
   }

   return parsed.toISOString();
}

function buildAbsoluteExpiry(startedAt) {
   const normalizedStartedAt = toIsoString(startedAt);

   if (!normalizedStartedAt) {
      return null;
   }

   return new Date(
      new Date(normalizedStartedAt).getTime() + USER_MAX_SESSION_TTL_MS,
   ).toISOString();
}

function normalizeSession(session) {
   if (!session || typeof session !== "object") {
      return null;
   }

   const nowIso = new Date().toISOString();
   const sessionStartedAt = toIsoString(session.sessionStartedAt) || nowIso;
   const lastActivityAt = toIsoString(session.lastActivityAt) || sessionStartedAt;

   return {
      ...session,
      sessionStartedAt,
      lastActivityAt,
      absoluteExpiresAt:
         toIsoString(session.absoluteExpiresAt) || buildAbsoluteExpiry(sessionStartedAt),
   };
}

function persistSession(session, shouldBroadcast = true) {
   window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));

   if (shouldBroadcast) {
      window.dispatchEvent(new Event("flowmerce-auth"));
   }
}

function buildSession(user) {
   const nowIso = new Date().toISOString();
   const session = {
      name: user.name || user.customId || user.loginId,
      email: user.email || "",
      loginId: user.loginId,
      customId: user.customId || "",
      role: user.role || "user",
      plan: user.plan || DEFAULT_PLAN,
      subscriptionStartAt: user.subscriptionStartAt || null,
      subscriptionEndAt: user.subscriptionEndAt || null,
      sites: Array.isArray(user.sites) ? user.sites : [],
      sessionStartedAt: user.sessionStartedAt || nowIso,
      lastActivityAt: user.lastActivityAt || nowIso,
   };

   if (user.accessToken) {
      session.accessToken = user.accessToken;
   }

   const expiresAt = resolveSessionExpiry(user);

   if (expiresAt) {
      session.expiresAt = expiresAt;
   }

   return normalizeSession(session);
}

function isReservedAdminLoginId(loginId) {
   return RESERVED_ADMIN_LOGIN_ID_REGEX.test(String(loginId || "").trim());
}

function formatPhoneNumber(phone) {
   const digits = String(phone || "")
      .replace(/\D/g, "")
      .slice(0, 11);

   if (digits.length <= 3) {
      return digits;
   }

   if (digits.length <= 7) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
   }

   return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function saveSession(session) {
   persistSession(normalizeSession(session));
}

function saveAdminSession(session) {
   window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
   window.dispatchEvent(new Event("flowmerce-admin-auth"));
}

function isSessionExpired(session) {
   const normalizedSession = normalizeSession(session);

   if (!normalizedSession) {
      return false;
   }

   const deadlines = [
      toIsoString(normalizedSession.absoluteExpiresAt),
      toIsoString(normalizedSession.expiresAt),
   ]
      .filter(Boolean)
      .map((value) => new Date(value).getTime());

   if (deadlines.some((deadline) => deadline <= Date.now())) {
      return true;
   }

   const lastActivityAt = toIsoString(normalizedSession.lastActivityAt);

   if (!lastActivityAt) {
      return false;
   }

   return new Date(lastActivityAt).getTime() + USER_IDLE_SESSION_TTL_MS <= Date.now();
}

export function getSession() {
   if (typeof window === "undefined") {
      return null;
   }

   try {
      const rawSession = JSON.parse(window.localStorage.getItem(SESSION_KEY));
      const session = normalizeSession(rawSession);

      if (isSessionExpired(session)) {
         signOut();
         return null;
      }

      if (session && JSON.stringify(rawSession) !== JSON.stringify(session)) {
         persistSession(session, false);
      }

      return session;
   } catch {
      return null;
   }
}

export function touchSessionActivity(force = false) {
   if (typeof window === "undefined") {
      return null;
   }

   const session = getSession();

   if (!session) {
      return null;
   }

   const normalizedSession = normalizeSession(session);
   const lastActivityAtTime = new Date(normalizedSession.lastActivityAt).getTime();

   if (
      !force &&
      Date.now() - lastActivityAtTime < SESSION_ACTIVITY_WRITE_INTERVAL_MS
   ) {
      return normalizedSession;
   }

   const nextSession = {
      ...normalizedSession,
      lastActivityAt: new Date().toISOString(),
   };

   persistSession(nextSession, false);
   return nextSession;
}

export function getUserSessionPolicy() {
   return {
      idleTimeoutMs: USER_IDLE_SESSION_TTL_MS,
      maxLifetimeMs: USER_MAX_SESSION_TTL_MS,
   };
}

export function getAdminSession() {
   if (typeof window === "undefined") {
      return null;
   }

   try {
      return JSON.parse(window.localStorage.getItem(ADMIN_SESSION_KEY));
   } catch {
      return null;
   }
}

export function validatePassword(password) {
   return PASSWORD_REGEX.test(password);
}

export async function checkLoginIdAvailability(loginId) {
   const normalizedLoginId = loginId.trim();

   if (!normalizedLoginId) {
      throw new Error("아이디를 입력해주세요.");
   }

   const response = await fetch(
      `${API_BASE_URL}/user/check-id?loginId=${encodeURIComponent(normalizedLoginId)}`,
      {
         cache: "no-store",
      },
   );

   return parseApiResponse(response);
}

export async function checkNicknameAvailability(customId) {
   const normalizedCustomId = customId.trim();

   if (!normalizedCustomId) {
      throw new Error("닉네임을 입력해주세요.");
   }

   const response = await fetch(
      `${API_BASE_URL}/user/check-nickname?customId=${encodeURIComponent(normalizedCustomId)}`,
      {
         cache: "no-store",
      },
   );

   return parseApiResponse(response);
}

export async function signUp({ name, loginId, password, customId, phone, email }) {
   const normalizedName = name.trim();
   const normalizedLoginId = loginId.trim();
   const normalizedCustomId = customId.trim();
   const normalizedPhone = formatPhoneNumber(phone);
   const normalizedEmail = email.trim().toLowerCase();

   if (
      !normalizedName ||
      !normalizedLoginId ||
      !password ||
      !normalizedCustomId ||
      !normalizedPhone
   ) {
      throw new Error("이름, 아이디, 비밀번호, 닉네임, 연락처를 입력해주세요.");
   }

   if (isReservedAdminLoginId(normalizedLoginId)) {
      throw new Error("admin이 포함된 아이디는 사용할 수 없습니다.");
   }

   if (!/^\d{3}-\d{4}-\d{4}$/.test(normalizedPhone)) {
      throw new Error("연락처 형식이 올바르지 않습니다.");
   }

   if (!validatePassword(password)) {
      throw new Error(
         "비밀번호는 영문, 숫자, 특수문자를 포함한 8자리 이상이어야 합니다.",
      );
   }

   const response = await fetch(`${API_BASE_URL}/user/register`, {
      method: "POST",
      headers: {
         "Content-Type": "application/json",
      },
      body: JSON.stringify({
         name: normalizedName,
         loginId: normalizedLoginId,
         password,
         customId: normalizedCustomId,
         phone: normalizedPhone,
         email: normalizedEmail || undefined,
      }),
   });

   const data = await parseApiResponse(response);

   if (data.success === false) {
      throw new Error(data.message || "회원가입을 완료하지 못했습니다.");
   }

   return data;
}

export async function signIn({ loginId, password }) {
   const normalizedLoginId = loginId.trim();

   if (!normalizedLoginId || !password) {
      throw new Error("아이디와 비밀번호를 입력해주세요.");
   }

   if (isReservedAdminLoginId(normalizedLoginId)) {
      throw new Error("admin이 포함된 아이디는 이 페이지에서 사용할 수 없습니다.");
   }

   const response = await fetch(`${API_BASE_URL}/user/login`, {
      method: "POST",
      headers: {
         "Content-Type": "application/json",
      },
      body: JSON.stringify({
         id: normalizedLoginId,
         password,
      }),
   });

   const data = await parseApiResponse(response);

   if (data.success === false) {
      throw new Error(data.message || "로그인에 실패했습니다.");
   }

   const session = buildSession({
      loginId: normalizedLoginId,
      customId: data.customId,
      name: data.name || data.customId || normalizedLoginId,
      email: data.email || "",
      role: data.role || "user",
      plan: data.plan || DEFAULT_PLAN,
      subscriptionStartAt: data.subscriptionStartAt || null,
      subscriptionEndAt: data.subscriptionEndAt || null,
      sites: Array.isArray(data.sites) ? data.sites : [],
      accessToken: data.accessToken || data.userToken || data.token || "",
      accessTokenExpiresAt:
         data.accessTokenExpiresAt || data.tokenExpiresAt || data.expiresAt || null,
   });

   saveSession(session);

   return session;
}

export async function signInAdmin({ loginId, password }) {
   const normalizedLoginId = loginId.trim();

   if (!normalizedLoginId || !password) {
      throw new Error("아이디와 비밀번호를 입력해주세요.");
   }

   const response = await fetch(`${API_BASE_URL}/user/admin/login`, {
      method: "POST",
      headers: {
         "Content-Type": "application/json",
      },
      body: JSON.stringify({
         id: normalizedLoginId,
         password,
      }),
   });

   const data = await parseApiResponse(response);

   if (data.success === false) {
      throw new Error(data.message || "로그인에 실패했습니다.");
   }

   if (data.role !== "admin") {
      throw new Error("관리자 권한이 없는 계정입니다.");
   }

   const session = buildSession({
      loginId: normalizedLoginId,
      customId: data.customId || "admin",
      name: data.name || "관리자",
      email: data.email || "",
      role: data.role,
      plan: data.plan || DEFAULT_PLAN,
      subscriptionStartAt: data.subscriptionStartAt || null,
      subscriptionEndAt: data.subscriptionEndAt || null,
      sites: Array.isArray(data.sites) ? data.sites : [],
      accessToken: data.adminToken || "",
   });

   if (!session.accessToken) {
      throw new Error("관리자 인증 정보를 받지 못했습니다.");
   }

   saveAdminSession(session);
   return session;
}

export async function changePassword({
   loginId,
   currentPassword,
   newPassword,
   newPasswordConfirm,
}) {
   const normalizedLoginId = loginId.trim();

   if (!normalizedLoginId || !currentPassword || !newPassword || !newPasswordConfirm) {
      throw new Error("아이디, 현재 비밀번호, 새 비밀번호를 입력해주세요.");
   }

   if (newPassword !== newPasswordConfirm) {
      throw new Error("새 비밀번호가 일치하지 않습니다.");
   }

   if (!validatePassword(newPassword)) {
      throw new Error(
         "비밀번호는 영문, 숫자, 특수문자를 포함한 8자리 이상이어야 합니다.",
      );
   }

   const response = await fetch(`${API_BASE_URL}/user/change-password`, {
      method: "POST",
      headers: getUserAuthHeaders({
         "Content-Type": "application/json",
      }),
      body: JSON.stringify({
         loginId: normalizedLoginId,
         currentPassword,
         newPassword,
      }),
   });

   return parseApiResponse(response, { signOutOnUnauthorized: true });
}

export async function fetchUserProfile(customId) {
   const normalizedCustomId = customId.trim();

   if (!normalizedCustomId) {
      throw new Error("사용자 정보를 찾을 수 없습니다.");
   }

   const response = await fetch(
      `${API_BASE_URL}/user/profile?customId=${encodeURIComponent(normalizedCustomId)}`,
      {
         headers: getUserAuthHeaders(),
         cache: "no-store",
      },
   );

   return parseApiResponse(response, { signOutOnUnauthorized: true });
}

export async function fetchHostingAccounts(customId) {
   const normalizedCustomId = customId.trim();

   if (!normalizedCustomId) {
      throw new Error("사용자 정보를 찾을 수 없습니다.");
   }

   const response = await fetch(
      `${API_BASE_URL}/hosting/accounts?customId=${encodeURIComponent(normalizedCustomId)}`,
      {
         headers: getUserAuthHeaders(),
         cache: "no-store",
      },
   );

   return parseApiResponse(response, { signOutOnUnauthorized: true });
}

export async function saveUserSites({ customId, sites }) {
   const normalizedCustomId = customId.trim();

   if (!normalizedCustomId) {
      throw new Error("사용자 정보를 찾을 수 없습니다.");
   }

   const response = await fetch(`${API_BASE_URL}/user/sites`, {
      method: "POST",
      headers: getUserAuthHeaders({
         "Content-Type": "application/json",
      }),
      body: JSON.stringify({
         customId: normalizedCustomId,
         sites,
      }),
   });

   return parseApiResponse(response, { signOutOnUnauthorized: true });
}

export function updateSessionData(patch) {
   if (typeof window === "undefined") {
      return null;
   }

   const currentSession = getSession();

   if (!currentSession) {
      return null;
   }

   const nextSession = normalizeSession({
      ...currentSession,
      ...patch,
   });

   if (JSON.stringify(currentSession) === JSON.stringify(nextSession)) {
      return currentSession;
   }

   saveSession(nextSession);
   return nextSession;
}

export function signOut() {
   if (typeof window === "undefined") {
      return;
   }

   window.localStorage.removeItem(SESSION_KEY);
   window.dispatchEvent(new Event("flowmerce-auth"));
}

export function signOutAdmin() {
   if (typeof window === "undefined") {
      return;
   }

   window.localStorage.removeItem(ADMIN_SESSION_KEY);
   window.dispatchEvent(new Event("flowmerce-admin-auth"));
}

export function getAdminAuthHeaders(additionalHeaders = {}) {
   const session = getAdminSession();
   const headers = {
      ...additionalHeaders,
   };

   if (session?.accessToken) {
      headers.Authorization = `Bearer ${session.accessToken}`;
   }

   return headers;
}

export function getUserAuthHeaders(additionalHeaders = {}) {
   const session = getSession();
   const headers = {
      ...additionalHeaders,
   };

   if (session?.accessToken) {
      headers.Authorization = `Bearer ${session.accessToken}`;
   }

   return headers;
}

export function getApiBaseUrl() {
   return API_BASE_URL;
}
