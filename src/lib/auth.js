const SESSION_KEY = "flowmerce_session";
const API_BASE_URL = (
   process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.flowmerce.co.kr"
).replace(/\/$/, "");
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const ADMIN_USER = {
   loginId: "admin",
   password: "admin1234",
   name: "관리자",
   customId: "admin",
   email: "",
   role: "admin",
};

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
   };
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
      throw new Error("비밀번호는 영문, 숫자, 특수문자를 포함한 8자리 이상이어야 합니다.");
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

   if (
      normalizedLoginId === ADMIN_USER.loginId &&
      password === ADMIN_USER.password
   ) {
      const session = buildSession(ADMIN_USER);
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      window.dispatchEvent(new Event("flowmerce-auth"));
      return session;
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
   });

   window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
   window.dispatchEvent(new Event("flowmerce-auth"));

   return session;
}

export function signOut() {
   if (typeof window === "undefined") {
      return;
   }

   window.localStorage.removeItem(SESSION_KEY);
   window.dispatchEvent(new Event("flowmerce-auth"));
}

export function getApiBaseUrl() {
   return API_BASE_URL;
}
