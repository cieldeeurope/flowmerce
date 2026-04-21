const USERS_KEY = "flowmerce_users";
const SESSION_KEY = "flowmerce_session";
const ADMIN_USER = {
   name: "관리자",
   email: "admin@flowmerce.local",
   password: "admin1234",
   role: "admin",
};

export function getUsers() {
   if (typeof window === "undefined") {
      return [];
   }

   try {
      const users = JSON.parse(window.localStorage.getItem(USERS_KEY)) || [];

      if (users.some((user) => user.email === ADMIN_USER.email)) {
         return users;
      }

      const seededUsers = [ADMIN_USER, ...users];
      window.localStorage.setItem(USERS_KEY, JSON.stringify(seededUsers));

      return seededUsers;
   } catch {
      return [ADMIN_USER];
   }
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

export function signUp({ name, email, password }) {
   const users = getUsers();
   const normalizedEmail = email.trim().toLowerCase();

   if (users.some((user) => user.email === normalizedEmail)) {
      throw new Error("이미 가입된 이메일입니다.");
   }

   const user = {
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: "user",
   };

   window.localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]));
   signIn({ email: normalizedEmail, password });

   return user;
}

export function signIn({ email, password }) {
   const normalizedEmail = email.trim().toLowerCase();
   const user = getUsers().find(
      (item) => item.email === normalizedEmail && item.password === password,
   );

   if (!user) {
      throw new Error("이메일 또는 비밀번호를 확인해주세요.");
   }

   const session = {
      name: user.name,
      email: user.email,
      role: user.role || "user",
   };

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
