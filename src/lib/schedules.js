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

export async function fetchHostingAccounts(customId) {
   const normalizedCustomId = customId.trim();

   if (!normalizedCustomId) {
      throw new Error("customId를 입력해주세요.");
   }

   const response = await fetch(
      `${API_BASE_URL}/hosting/accounts?customId=${encodeURIComponent(
         normalizedCustomId,
      )}`,
      {
         cache: "no-store",
      },
   );

   const data = await parseApiResponse(response, { adminBypass: true });

   if (Array.isArray(data)) {
      return data;
   }

   return [];
}

export async function fetchScheduledCustomIds(status = "active") {
   const response = await fetch(
      `${API_BASE_URL}/schedule/custom-ids?status=${encodeURIComponent(status)}`,
      {
         headers: getAdminAuthHeaders(),
         cache: "no-store",
      },
   );

   const data = await parseApiResponse(response);

   if (Array.isArray(data)) {
      return data;
   }

   if (Array.isArray(data.customIds)) {
      return data.customIds;
   }

   return [];
}

export async function fetchScheduledAccountPlatforms(
   customId,
   status = "active",
) {
   const normalizedCustomId = customId.trim();

   if (!normalizedCustomId) {
      throw new Error("customId를 선택해주세요.");
   }

   const response = await fetch(
      `${API_BASE_URL}/schedule/account-platforms?customId=${encodeURIComponent(
         normalizedCustomId,
      )}&status=${encodeURIComponent(status)}`,
      {
         headers: getAdminAuthHeaders(),
         cache: "no-store",
      },
   );

   const data = await parseApiResponse(response);

   if (Array.isArray(data)) {
      return data;
   }

   if (Array.isArray(data.accountPlatforms)) {
      return data.accountPlatforms;
   }

   return [];
}

export async function fetchSchedules(
   customId,
   accountPlatform,
   status = "active",
) {
   const normalizedCustomId = customId.trim();
   const normalizedAccountPlatform = accountPlatform.trim();

   if (!normalizedCustomId || !normalizedAccountPlatform) {
      throw new Error("customId와 accountPlatform을 모두 입력해주세요.");
   }

   const response = await fetch(
      `${API_BASE_URL}/schedule?customId=${encodeURIComponent(
         normalizedCustomId,
      )}&accountPlatform=${encodeURIComponent(
         normalizedAccountPlatform,
      )}&status=${encodeURIComponent(status)}`,
      {
         headers: getAdminAuthHeaders(),
         cache: "no-store",
      },
   );

   const data = await parseApiResponse(response);
   return Array.isArray(data) ? data : [];
}

export async function runSchedules(scheduleIds) {
   if (!Array.isArray(scheduleIds) || scheduleIds.length === 0) {
      throw new Error("실행할 예약을 선택해주세요.");
   }

   const total = scheduleIds.length;
   const runGroup = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

   for (let index = 0; index < total; index += 1) {
      const id = scheduleIds[index];
      console.log("[runSchedules] request:start", {
         index: index + 1,
         total,
         scheduleId: id,
         runGroup,
      });

      try {
         const response = await fetch(
            `${API_BASE_URL}/schedule/run/${id}?index=${index + 1}&total=${total}&runGroup=${encodeURIComponent(
               runGroup,
            )}`,
            {
               method: "POST",
               headers: getAdminAuthHeaders(),
            },
         );

         await parseApiResponse(response);
         console.log("[runSchedules] request:done", {
            index: index + 1,
            total,
            scheduleId: id,
            runGroup,
         });
      } catch (error) {
         console.error("[runSchedules] request:error", {
            index: index + 1,
            total,
            scheduleId: id,
            runGroup,
            message: error.message || "",
         });
         throw new Error(
            `예약 실행이 ${index + 1}/${total}번째(scheduleId=${id})에서 멈췄습니다. ${error.message || ""}`.trim(),
         );
      }
   }

   return {
      success: true,
      count: total,
   };
}

export async function deleteSchedules(scheduleIds) {
   if (!Array.isArray(scheduleIds) || scheduleIds.length === 0) {
      throw new Error("삭제할 예약을 선택해주세요.");
   }

   const response = await fetch(`${API_BASE_URL}/schedule/delete`, {
      method: "POST",
      headers: getAdminAuthHeaders({
         "Content-Type": "application/json",
      }),
      body: JSON.stringify({
         ids: scheduleIds,
      }),
   });

   return parseApiResponse(response);
}
