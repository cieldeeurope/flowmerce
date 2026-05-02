const SESSION_KEY = "flowmerce_session";
const ADMIN_SESSION_KEY = "flowmerce_admin_session";
const API_BASE_URL = (
   process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.flowmerce.co.kr"
).replace(/\/$/, "");
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const DEFAULT_PLAN = "none";

async function parseApiResponse(response) {
   const data = await response.json().catch(() => ({}));

   if (!response.ok) {
      throw new Error(data.message || "잠시 후 다시 시도해주세요.");
   }

   return data;
}

function buildSession(user) {
   return {
      name: user.name || user.customId || user.loginId,
      email: user.email || "",
      loginId: user.loginId,
      customId: user.customId || "",
      role: user.role || "user",
      plan: user.plan || DEFAULT_PLAN,
      subscriptionStartAt: user.subscriptionStartAt || null,
      subscriptionEndAt: user.subscriptionEndAt || null,
      sites: Array.isArray(user.sites) ? user.sites : [],
   };
}

function saveSession(session) {
   window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
   window.dispatchEvent(new Event("flowmerce-auth"));
}

function saveAdminSession(session) {
   window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
   window.dispatchEvent(new Event("flowmerce-admin-auth"));
}

export function getSession() {
   if (typeof window === "undefined") {
      return null;
   }

   try {
      return JSON.parse(window.localStorage.getItem(SESSION_KEY));
   } catch {
      return null;
   }
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

export async function signUp({ name, loginId, password, customId, email }) {
   const normalizedName = name.trim();
   const normalizedLoginId = loginId.trim();
   const normalizedCustomId = customId.trim();
   const normalizedEmail = email.trim().toLowerCase();

   if (!normalizedName || !normalizedLoginId || !password || !normalizedCustomId) {
      throw new Error("이름, 아이디, 비밀번호, 닉네임은 모두 필수입니다.");
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
         email: normalizedEmail || undefined,
      }),
   });

   const data = await parseApiResponse(response);

   if (data.success === false) {
      throw new Error(data.message || "회원가입에 실패했습니다.");
   }

   return data;
}

export async function signIn({ loginId, password }) {
   const normalizedLoginId = loginId.trim();

   if (!normalizedLoginId || !password) {
      throw new Error("아이디와 비밀번호를 입력해주세요.");
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
      throw new Error(data.message || "정보를 확인해주세요.");
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
   });

   saveSession(session);

   return session;
}

export async function signInAdmin({ loginId, password }) {
   const normalizedLoginId = loginId.trim();

   if (!normalizedLoginId || !password) {
      throw new Error("아이디와 비밀번호를 입력해주세요.");
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
      throw new Error(data.message || "정보를 확인해주세요.");
   }

   if (data.role !== "admin") {
      throw new Error("관리자 계정만 접근할 수 있습니다.");
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
   });

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
      throw new Error("기존 비밀번호와 새 비밀번호 정보를 모두 입력해주세요.");
   }

   if (newPassword !== newPasswordConfirm) {
      throw new Error("새 비밀번호가 서로 일치하지 않습니다.");
   }

   if (!validatePassword(newPassword)) {
      throw new Error(
         "새 비밀번호는 영문, 숫자, 특수문자를 포함한 8자리 이상이어야 합니다.",
      );
   }

   const response = await fetch(`${API_BASE_URL}/user/change-password`, {
      method: "POST",
      headers: {
         "Content-Type": "application/json",
      },
      body: JSON.stringify({
         loginId: normalizedLoginId,
         currentPassword,
         newPassword,
      }),
   });

   return parseApiResponse(response);
}

export async function fetchUserProfile(customId) {
   const normalizedCustomId = customId.trim();

   if (!normalizedCustomId) {
      throw new Error("닉네임을 확인할 수 없습니다.");
   }

   const response = await fetch(
      `${API_BASE_URL}/user/profile?customId=${encodeURIComponent(normalizedCustomId)}`,
      {
         cache: "no-store",
      },
   );

   return parseApiResponse(response);
}

export async function fetchHostingAccounts(customId) {
   const normalizedCustomId = customId.trim();

   if (!normalizedCustomId) {
      throw new Error("닉네임을 확인할 수 없습니다.");
   }

   const response = await fetch(
      `${API_BASE_URL}/hosting/accounts?customId=${encodeURIComponent(normalizedCustomId)}`,
      {
         cache: "no-store",
      },
   );

   return parseApiResponse(response);
}

export async function saveUserSites({ customId, sites }) {
   const normalizedCustomId = customId.trim();

   if (!normalizedCustomId) {
      throw new Error("닉네임을 확인할 수 없습니다.");
   }

   const response = await fetch(`${API_BASE_URL}/user/sites`, {
      method: "POST",
      headers: {
         "Content-Type": "application/json",
      },
      body: JSON.stringify({
         customId: normalizedCustomId,
         sites,
      }),
   });

   return parseApiResponse(response);
}

export function updateSessionData(patch) {
   if (typeof window === "undefined") {
      return null;
   }

   const currentSession = getSession();

   if (!currentSession) {
      return null;
   }

   const nextSession = {
      ...currentSession,
      ...patch,
   };

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

export function getApiBaseUrl() {
   return API_BASE_URL;
}
