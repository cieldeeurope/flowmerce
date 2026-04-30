import { getApiBaseUrl } from "@/lib/auth";

const API_BASE_URL = getApiBaseUrl();

async function parseApiResponse(response) {
   const data = await response.json().catch(() => ({}));

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

   const data = await parseApiResponse(response);

   if (Array.isArray(data)) {
      return data;
   }

   return [];
}

export async function fetchScheduledCustomIds(status = "active") {
   const response = await fetch(
      `${API_BASE_URL}/schedule/custom-ids?status=${encodeURIComponent(status)}`,
      {
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

   for (let index = 0; index < total; index += 1) {
      const id = scheduleIds[index];
      const response = await fetch(
         `${API_BASE_URL}/schedule/run/${id}?index=${index + 1}&total=${total}`,
         {
            method: "POST",
         },
      );

      await parseApiResponse(response);
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
      headers: {
         "Content-Type": "application/json",
      },
      body: JSON.stringify({
         ids: scheduleIds,
      }),
   });

   return parseApiResponse(response);
}
