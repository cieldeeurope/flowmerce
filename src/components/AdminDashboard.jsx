"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAdminContacts } from "@/lib/requests";
import {
   createAdminHostingAccount,
   createAdminUser,
   fetchCafe24AuthorizeUrl,
   fetchAdminHostingAccounts,
   fetchAdminUsers,
   updateAdminHostingAccount,
   updateAdminUser,
} from "@/lib/admin";
import {
   deleteSchedules,
   fetchScheduledAccountPlatforms,
   fetchScheduledCustomIds,
   fetchSchedules,
   runSchedules,
} from "@/lib/schedules";

const tabs = [
   { id: "contacts", label: "문의" },
   { id: "schedules", label: "수집예약" },
   { id: "users", label: "User" },
   { id: "hosting", label: "Hosting" },
];

const scheduleSubtabs = [
   { id: "active", label: "실행 대상" },
   { id: "completed", label: "완료 목록" },
];

const planOptions = ["none", "boutique", "basic", "pro", "enterprise"];
const platformOptions = ["smartstore", "godomall", "cafe24", "makeshop"];
const CAFE24_OAUTH_STATE_KEY = "flowmerce_cafe24_oauth_state";
const CAFE24_REFRESH_WARNING_MS = 3 * 24 * 60 * 60 * 1000;
const requestLimitByPlan = {
   none: null,
   boutique: 100000,
   basic: 5000,
   pro: 50000,
   enterprise: 200000,
};

function formatDateTime(value) {
   if (!value) {
      return "-";
   }

   const parsed = new Date(value);

   if (Number.isNaN(parsed.getTime())) {
      return "-";
   }

   return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
   }).format(parsed);
}

function formatMonthDay(value) {
   if (!value) {
      return "-";
   }

   const parsed = new Date(value);

   if (Number.isNaN(parsed.getTime())) {
      return "-";
   }

   return new Intl.DateTimeFormat("ko-KR", {
      month: "2-digit",
      day: "2-digit",
   }).format(parsed);
}

function toDateTimeLocalValue(value) {
   if (!value) {
      return "";
   }

   const parsed = new Date(value);

   if (Number.isNaN(parsed.getTime())) {
      return "";
   }

   const offset = parsed.getTimezoneOffset();
   const local = new Date(parsed.getTime() - offset * 60 * 1000);
   return local.toISOString().slice(0, 16);
}

function parseDateTimeLocalValue(value) {
   if (!value) {
      return null;
   }

   const parsed = new Date(value);
   return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function stringifyList(value) {
   if (!Array.isArray(value) || value.length === 0) {
      return "";
   }

   return value.join("\n");
}

function parseListText(value) {
   if (!value.trim()) {
      return [];
   }

   return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
}

function parseNullableInteger(value) {
   if (value === "" || value === null || value === undefined) {
      return null;
   }

   const parsed = Number.parseInt(String(value), 10);
   return Number.isNaN(parsed) ? null : parsed;
}

function encodeCafe24State(payload) {
   const serialized = JSON.stringify(payload);
   return btoa(serialized).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function formatPhoneInput(value) {
   const digits = String(value || "")
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

function formatNumber(value) {
   if (value === null || value === undefined || value === "") {
      return "-";
   }

   const parsed = Number(value);
   if (!Number.isFinite(parsed)) {
      return "-";
   }

   return new Intl.NumberFormat("ko-KR").format(parsed);
}

function getEffectiveRequestLimit(plan, overrideValue) {
   const override = parseNullableInteger(overrideValue);

   if (override !== null) {
      return override;
   }

   return requestLimitByPlan[plan] ?? null;
}

function getUsagePercent(used, limit) {
   if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) {
      return null;
   }

   return Math.max(0, Math.min(100, Math.round((used / limit) * 100)));
}

function getScheduleDisplayName(schedule) {
   return (
      schedule.godoMallCategoryName ||
      schedule.smartStoreCategoryName ||
      schedule.categoryName ||
      schedule.name ||
      "-"
   );
}

function getCafe24RefreshStatus(account) {
   if (!account || account.platform !== "cafe24") {
      return null;
   }

   if (!account.refreshTokenExpiresAt) {
      return {
         level: "unknown",
         badge: "\uBBF8\uD655\uC778",
         summary: "\uBBF8\uD655\uC778",
         expiresAt: null,
      };
   }

   const expiresAt = new Date(account.refreshTokenExpiresAt);
   if (Number.isNaN(expiresAt.getTime())) {
      return {
         level: "unknown",
         badge: "\uBBF8\uD655\uC778",
         summary: "\uBBF8\uD655\uC778",
         expiresAt: null,
      };
   }

   const diffMs = expiresAt.getTime() - Date.now();
   if (diffMs <= 0) {
      return {
         level: "expired",
         badge: "\uB9CC\uB8CC",
         summary: "\uAC31\uC2E0 \uD544\uC694",
         expiresAt,
      };
   }

   if (diffMs <= CAFE24_REFRESH_WARNING_MS) {
      const remainingDays = Math.max(
         1,
         Math.ceil(diffMs / (24 * 60 * 60 * 1000)),
      );

      return {
         level: "warning",
         badge: `D-${remainingDays}`,
         summary: "\uAC31\uC2E0 \uD544\uC694",
         expiresAt,
      };
   }

   return {
      level: "ok",
      badge: "\uC815\uC0C1",
      summary: "\uC815\uC0C1",
      expiresAt,
   };
}

function Cafe24RefreshBadge({ status }) {
   if (!status) {
      return <span className="text-zinc-400">-</span>;
   }

   const toneClass =
      status.level === "expired"
         ? "border-red-200 bg-red-50 text-red-700"
         : status.level === "warning"
           ? "border-amber-200 bg-amber-50 text-amber-700"
           : status.level === "ok"
             ? "border-emerald-200 bg-emerald-50 text-emerald-700"
             : "border-zinc-200 bg-zinc-50 text-zinc-700";

   return (
      <span
         className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClass}`}
      >
         {status.badge}
      </span>
   );
}

function isHostingAccountReady(account) {
   if (!account) {
      return false;
   }

   if (account.platform === "cafe24") {
      return Boolean(account.partnerKey && account.apiKey && account.refreshToken);
   }

   return Boolean(account.partnerKey && account.apiKey);
}

function createEmptyUserForm() {
   return {
      id: "",
      name: "",
      loginId: "",
      password: "",
      customId: "",
      phone: "",
      isApproved: false,
      plan: "none",
      subscriptionStartAt: "",
      subscriptionEndAt: "",
      requestUsedCount: "",
      requestLimitOverride: "",
      requestCycleStartAt: "",
      requestCycleEndAt: "",
      sites: "",
      createdAt: "",
      updatedAt: "",
      email: "",
   };
}

function createEmptyHostingForm() {
   return {
      id: "",
      customId: "",
      platform: "smartstore",
      accountPlatform: "",
      partnerKey: "",
      apiKey: "",
      refreshToken: "",
      tokenExpiresAt: "",
      refreshTokenExpiresAt: "",
      createdAt: "",
      updatedAt: "",
      topImages: "",
      bottomImages: "",
   };
}

function StatusMessage({ message }) {
   if (!message?.text) {
      return null;
   }

   const toneClass =
      message.tone === "error"
         ? "border-red-200 bg-red-50 text-red-700"
         : message.tone === "success"
           ? "border-emerald-200 bg-emerald-50 text-emerald-700"
           : "border-zinc-200 bg-zinc-50 text-zinc-700";

   return (
      <p className={`rounded-lg border px-4 py-3 text-sm font-medium ${toneClass}`}>
         {message.text}
      </p>
   );
}

function TabButton({ label, active, onClick }) {
   return (
      <button
         type="button"
         onClick={onClick}
         className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${
            active
               ? "border border-emerald-700 bg-emerald-600 text-white shadow-sm"
               : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
         }`}
      >
         {label}
      </button>
   );
}

function SectionHeader({ title, description, action }) {
   return (
      <div className="flex flex-wrap items-center justify-between gap-4">
         <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold text-zinc-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>
         </div>
         {action}
      </div>
   );
}

function ReadOnlyField({ label, value }) {
   return (
      <label className="block">
         <span className="text-sm font-medium text-zinc-600">{label}</span>
         <input
            value={value}
            readOnly
            className="mt-1.5 block w-full rounded-lg border border-zinc-200 bg-zinc-100 px-4 py-3 text-sm text-zinc-600"
         />
      </label>
   );
}

function ContactDetailModal({ contact, onClose }) {
   if (!contact) {
      return null;
   }

   return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/45 px-5 py-8">
         <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="absolute inset-0"
         />
         <div className="relative z-10 w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
               <div>
                  <p className="text-sm font-semibold text-emerald-600">
                     {contact.type}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-zinc-950">
                     {contact.title || contact.type}
                  </h3>
               </div>
               <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
               >
                  닫기
               </button>
            </div>

            <dl className="mt-6 grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-5 sm:grid-cols-2">
               <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                     이름
                  </dt>
                  <dd className="mt-2 text-sm font-medium text-zinc-950">
                     {contact.name}
                  </dd>
               </div>
               <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                     연락처
                  </dt>
                  <dd className="mt-2 text-sm font-medium text-zinc-950">
                     {contact.phone}
                  </dd>
               </div>
               <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                     이메일
                  </dt>
                  <dd className="mt-2 text-sm font-medium text-zinc-950">
                     {contact.email || "-"}
                  </dd>
               </div>
               <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                     접수일시
                  </dt>
                  <dd className="mt-2 text-sm font-medium text-zinc-950">
                     {formatDateTime(contact.createdAt)}
                  </dd>
               </div>
            </dl>

            <div className="mt-6">
               <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  문의 내용
               </p>
               <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-5">
                  <p className="whitespace-pre-line text-sm leading-7 text-zinc-700">
                     {contact.content}
                  </p>
               </div>
            </div>
         </div>
      </div>
   );
}

function UserForm({ form, onChange, onSave, onReset, saving }) {
   const effectiveRequestLimit = getEffectiveRequestLimit(
      form.plan,
      form.requestLimitOverride,
   );
   const requestUsedCount = parseNullableInteger(form.requestUsedCount);
   const requestRemainingCount =
      Number.isFinite(effectiveRequestLimit) && Number.isFinite(requestUsedCount)
         ? Math.max(0, effectiveRequestLimit - requestUsedCount)
         : null;
   const requestPercent = getUsagePercent(
      requestUsedCount,
      effectiveRequestLimit,
   );

   return (
      <div className="space-y-4 rounded-lg border border-zinc-200 bg-zinc-50 p-5">
         <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-zinc-950">
               {form.id ? `User 수정 #${form.id}` : "User 추가"}
            </h3>
            <button
               type="button"
               onClick={onReset}
               className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
            >
               새로 작성
            </button>
         </div>

         <div className="grid gap-4 md:grid-cols-2">
            <ReadOnlyField label="id (자동)" value={form.id || "-"} />
            <ReadOnlyField label="updatedAt (자동)" value={form.updatedAt || "-"} />
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  name (필수)
               </span>
               <input
                  value={form.name}
                  onChange={(event) => onChange("name", event.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  loginId (필수)
               </span>
               <input
                  value={form.loginId}
                  onChange={(event) => onChange("loginId", event.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  password {form.id ? "(선택, 변경할 때만 입력)" : "(필수)"}
               </span>
               <input
                  type="password"
                  value={form.password}
                  onChange={(event) => onChange("password", event.target.value)}
                  placeholder={form.id ? "비워두면 기존 비밀번호 유지" : ""}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  customId (필수)
               </span>
               <input
                  value={form.customId}
                  onChange={(event) => onChange("customId", event.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  phone (필수)
               </span>
               <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={13}
                  value={form.phone}
                  onChange={(event) => onChange("phone", event.target.value)}
                  placeholder="010-0000-0000"
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  isApproved (필수)
               </span>
               <label className="mt-1.5 flex items-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-700">
                  <input
                     type="checkbox"
                     checked={form.isApproved}
                     onChange={(event) =>
                        onChange("isApproved", event.target.checked)
                     }
                     className="h-4 w-4 rounded border-zinc-300 text-emerald-600"
                  />
                  관리자 승인 완료
               </label>
            </label>
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  plan (필수)
               </span>
               <select
                  value={form.plan}
                  onChange={(event) => onChange("plan", event.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               >
                  {planOptions.map((plan) => (
                     <option key={plan} value={plan}>
                        {plan}
                     </option>
                  ))}
               </select>
            </label>
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  subscriptionStartAt (선택)
               </span>
               <input
                  type="datetime-local"
                  value={form.subscriptionStartAt}
                  onChange={(event) =>
                     onChange("subscriptionStartAt", event.target.value)
                  }
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  subscriptionEndAt (선택)
               </span>
               <input
                  type="datetime-local"
                  value={form.subscriptionEndAt}
                  onChange={(event) =>
                     onChange("subscriptionEndAt", event.target.value)
                  }
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
            <ReadOnlyField label="createdAt (자동)" value={form.createdAt || "-"} />
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  email (선택)
               </span>
               <input
                  value={form.email}
                  onChange={(event) => onChange("email", event.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
         </div>

         <label className="block">
            <span className="text-sm font-medium text-zinc-600">
               sites (선택)
            </span>
            <textarea
               value={form.sites}
               onChange={(event) => onChange("sites", event.target.value)}
               placeholder="한 줄에 하나씩 입력하거나 쉼표로 구분하세요."
               rows={5}
               className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
            />
         </label>

         <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
               <div>
                  <h4 className="text-base font-semibold text-zinc-950">
                     요청수 관리
                  </h4>
                  <p className="mt-1 text-sm leading-6 text-zinc-600">
                     플랜 기본 요청수와 현재 사용량, 집계 주기를 함께 관리합니다.
                  </p>
               </div>
               <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-right text-sm">
                  <p className="font-medium text-zinc-500">
                     {"현재 사용률"}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-zinc-950">
                     {requestPercent === null ? "-" : `${requestPercent}%`}
                  </p>
               </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
               <ReadOnlyField
                  label="플랜 요청수(자동)"
                  value={formatNumber(requestLimitByPlan[form.plan] ?? null)}
               />
               <ReadOnlyField
                  label="가능 요청수(자동)"
                  value={formatNumber(requestRemainingCount)}
               />
               <label className="block">
                  <span className="text-sm font-medium text-zinc-600">
                     현재 요청수(선택)
                  </span>
                  <input
                     type="number"
                     min="0"
                     value={form.requestUsedCount}
                     onChange={(event) =>
                        onChange("requestUsedCount", event.target.value)
                     }
                     className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
                  />
               </label>
               <label className="block">
                  <span className="text-sm font-medium text-zinc-600">
                     요청수 오버라이드(선택)
                  </span>
                  <input
                     type="number"
                     min="0"
                     value={form.requestLimitOverride}
                     onChange={(event) =>
                        onChange("requestLimitOverride", event.target.value)
                     }
                     className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
                  />
               </label>
               <label className="block">
                  <span className="text-sm font-medium text-zinc-600">
                     요청수 집계 시작일(선택)
                  </span>
                  <input
                     type="datetime-local"
                     value={form.requestCycleStartAt}
                     onChange={(event) =>
                        onChange("requestCycleStartAt", event.target.value)
                     }
                     className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
                  />
               </label>
               <label className="block">
                  <span className="text-sm font-medium text-zinc-600">
                     요청수 집계 종료일(선택)
                  </span>
                  <input
                     type="datetime-local"
                     value={form.requestCycleEndAt}
                     onChange={(event) =>
                        onChange("requestCycleEndAt", event.target.value)
                     }
                     className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
                  />
               </label>
            </div>
         </div>

         <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-lg border border-emerald-700 bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
         >
            {saving ? "저장 중..." : "저장"}
         </button>
      </div>
   );
}

function HostingForm({
   form,
   onChange,
   onSave,
   onReset,
   onConnectCafe24,
   saving,
   connectingCafe24,
}) {
   const isCafe24 = form.platform === "cafe24";
   const partnerKeyLabel = isCafe24
      ? "mallId (필수)"
      : "partnerKey (필수)";
   const apiKeyLabel = isCafe24
      ? "accessToken (자동)"
      : "apiKey (필수)";
   const availabilityText = isCafe24
      ? "mallId, accessToken, refreshToken이 채워지면 사용 가능으로 표시됩니다."
      : "partnerKey와 apiKey가 모두 채워지면 사용 가능으로 표시됩니다.";

   return (
      <div className="space-y-4 rounded-lg border border-zinc-200 bg-zinc-50 p-5">
         <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-zinc-950">
               {form.id ? `Hosting 수정 #${form.id}` : "Hosting 추가"}
            </h3>
            <button
               type="button"
               onClick={onReset}
               className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
            >
               새로 작성
            </button>
         </div>

         <div className="grid gap-4 md:grid-cols-2">
            <ReadOnlyField label="id (자동)" value={form.id || "-"} />
            <ReadOnlyField label="updatedAt (자동)" value={form.updatedAt || "-"} />
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  customId (필수)
               </span>
               <input
                  value={form.customId}
                  onChange={(event) => onChange("customId", event.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  platform (필수)
               </span>
               <select
                  value={form.platform}
                  onChange={(event) => onChange("platform", event.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               >
                  {platformOptions.map((platform) => (
                     <option key={platform} value={platform}>
                        {platform}
                     </option>
                  ))}
               </select>
            </label>
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  accountPlatform (필수)
               </span>
               <input
                  value={form.accountPlatform}
                  onChange={(event) => onChange("accountPlatform", event.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  {partnerKeyLabel}
               </span>
               <input
                  value={form.partnerKey}
                  onChange={(event) => onChange("partnerKey", event.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
            <label className="block md:col-span-2">
               <span className="text-sm font-medium text-zinc-600">
                  {apiKeyLabel}
               </span>
               <input
                  value={form.apiKey}
                  onChange={(event) => onChange("apiKey", event.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
            {isCafe24 ? (
               <>
                  <label className="block md:col-span-2">
                     <span className="text-sm font-medium text-zinc-600">
                        {"refreshToken (자동)"}
                     </span>
                     <input
                        value={form.refreshToken}
                        onChange={(event) => onChange("refreshToken", event.target.value)}
                        className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
                     />
                  </label>
                  <label className="block">
                     <span className="text-sm font-medium text-zinc-600">
                        {"accessToken 만료일 (자동)"}
                     </span>
                     <input
                        type="datetime-local"
                        value={form.tokenExpiresAt}
                        onChange={(event) => onChange("tokenExpiresAt", event.target.value)}
                        className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
                     />
                  </label>
                  <label className="block">
                     <span className="text-sm font-medium text-zinc-600">
                        {"refreshToken 만료일 (자동)"}
                     </span>
                     <input
                        type="datetime-local"
                        value={form.refreshTokenExpiresAt}
                        onChange={(event) => onChange("refreshTokenExpiresAt", event.target.value)}
                        className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
                     />
                  </label>
               </>
            ) : null}
            <ReadOnlyField label="createdAt (자동)" value={form.createdAt || "-"} />
            <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
               <span className="font-medium text-zinc-700">사용 가능 상태</span>
               <p className="mt-2 leading-6">{availabilityText}</p>
            </div>
         </div>

         <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  topImages (선택)
               </span>
               <textarea
                  value={form.topImages}
                  onChange={(event) => onChange("topImages", event.target.value)}
                  placeholder="한 줄에 하나씩 입력하거나 쉼표로 구분하세요."
                  rows={5}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  bottomImages (선택)
               </span>
               <textarea
                  value={form.bottomImages}
                  onChange={(event) => onChange("bottomImages", event.target.value)}
                  placeholder="한 줄에 하나씩 입력하거나 쉼표로 구분하세요."
                  rows={5}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
         </div>

         <div className="flex flex-wrap items-center gap-3">
            <button
               type="button"
               onClick={onSave}
               disabled={saving}
               className="inline-flex items-center justify-center rounded-lg border border-emerald-700 bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
               {saving ? "저장 중..." : "저장"}
            </button>
            {isCafe24 ? (
               <button
                  type="button"
                  onClick={onConnectCafe24}
                  disabled={saving || connectingCafe24}
                  className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70"
               >
                  {connectingCafe24
                     ? "Cafe24 연동 중..."
                     : "Cafe24 연동"}
               </button>
            ) : null}
         </div>
      </div>
   );
}
export default function AdminDashboard() {
   const [activeTab, setActiveTab] = useState("contacts");
   const [activeScheduleSubtab, setActiveScheduleSubtab] = useState("active");

   const [contacts, setContacts] = useState([]);
   const [selectedContact, setSelectedContact] = useState(null);
   const [loadingContacts, setLoadingContacts] = useState(true);
   const [contactError, setContactError] = useState("");

   const [availableCustomIds, setAvailableCustomIds] = useState([]);
   const [selectedCustomId, setSelectedCustomId] = useState("");
   const [availableAccountPlatforms, setAvailableAccountPlatforms] = useState([]);
   const [selectedAccountPlatform, setSelectedAccountPlatform] = useState("");
   const [schedules, setSchedules] = useState([]);
   const [selectedScheduleIds, setSelectedScheduleIds] = useState([]);
   const [loadingCustomIds, setLoadingCustomIds] = useState(true);
   const [loadingAccountPlatforms, setLoadingAccountPlatforms] = useState(false);
   const [loadingSchedules, setLoadingSchedules] = useState(false);
   const [activeRunRequestCount, setActiveRunRequestCount] = useState(0);
   const [deletingSchedules, setDeletingSchedules] = useState(false);
   const [scheduleMessage, setScheduleMessage] = useState({
      tone: "neutral",
      text: "",
   });

   const [usersLoaded, setUsersLoaded] = useState(false);
   const [users, setUsers] = useState([]);
   const [loadingUsers, setLoadingUsers] = useState(false);
   const [savingUser, setSavingUser] = useState(false);
   const [userMessage, setUserMessage] = useState({ tone: "neutral", text: "" });
   const [userForm, setUserForm] = useState(createEmptyUserForm());

   const [hostingLoaded, setHostingLoaded] = useState(false);
   const [hostingAccounts, setHostingAccounts] = useState([]);
   const [loadingHostingAccounts, setLoadingHostingAccounts] = useState(false);
   const [savingHostingAccount, setSavingHostingAccount] = useState(false);
   const [hostingMessage, setHostingMessage] = useState({
      tone: "neutral",
      text: "",
   });
   const [hostingForm, setHostingForm] = useState(createEmptyHostingForm());
   const [connectingCafe24, setConnectingCafe24] = useState(false);

   const scheduleStatus = activeScheduleSubtab === "completed" ? "done" : "active";
   const cafe24RefreshWatchAccounts = useMemo(() => {
      return hostingAccounts
         .map((account) => ({
            account,
            status: getCafe24RefreshStatus(account),
         }))
         .filter(
            ({ status }) =>
               status &&
               (status.level === "expired" || status.level === "warning"),
         )
         .sort((left, right) => {
            const leftTime = left.status?.expiresAt?.getTime?.() ?? Number.POSITIVE_INFINITY;
            const rightTime =
               right.status?.expiresAt?.getTime?.() ?? Number.POSITIVE_INFINITY;
            return leftTime - rightTime;
         });
   }, [hostingAccounts]);

   useEffect(() => {
      let cancelled = false;

      async function loadContacts() {
         try {
            const items = await fetchAdminContacts();

            if (!cancelled) {
               setContacts(items);
            }
         } catch (loadError) {
            if (!cancelled) {
               setContactError(
                  loadError.message ||
                     "문의 목록을 불러오지 못했습니다. 서버 연결을 확인해주세요.",
               );
            }
         } finally {
            if (!cancelled) {
               setLoadingContacts(false);
            }
         }
      }

      void loadContacts();

      return () => {
         cancelled = true;
      };
   }, []);

   useEffect(() => {
      let cancelled = false;

      async function loadScheduleCustomIds() {
         setLoadingCustomIds(true);
         setScheduleMessage({ tone: "neutral", text: "" });

         try {
            const items = await fetchScheduledCustomIds(scheduleStatus);

            if (!cancelled) {
               setAvailableCustomIds(items);
            }
         } catch (loadError) {
            if (!cancelled) {
               setScheduleMessage({
                  tone: "error",
                  text:
                     loadError.message ||
                     "수집 예약 customId 목록을 불러오지 못했습니다.",
               });
            }
         } finally {
            if (!cancelled) {
               setLoadingCustomIds(false);
            }
         }
      }

      setSelectedCustomId("");
      setAvailableAccountPlatforms([]);
      setSelectedAccountPlatform("");
      setSchedules([]);
      setSelectedScheduleIds([]);

      void loadScheduleCustomIds();

      return () => {
         cancelled = true;
      };
   }, [scheduleStatus]);

  useEffect(() => {
     if (activeTab === "users" && !usersLoaded && !loadingUsers) {
        void loadUsers();
     }

      if (activeTab === "hosting" && !hostingLoaded && !loadingHostingAccounts) {
         void loadHostingAccounts();
      }
   }, [
      activeTab,
      hostingLoaded,
      loadingHostingAccounts,
      loadingUsers,
      usersLoaded,
   ]);

   useEffect(() => {
      function handleCafe24Connected(event) {
         if (event.origin !== window.location.origin) {
            return;
         }

         if (event.data?.type !== "flowmerce-cafe24-connected") {
            return;
         }

         setConnectingCafe24(false);
         setHostingLoaded(false);
         setHostingMessage({
            tone: "success",
            text: "Cafe24 연동이 완료되었습니다.",
         });

         if (event.data?.account) {
            handleSelectHostingAccount(event.data.account);
         }

         void loadHostingAccounts();
      }

      window.addEventListener("message", handleCafe24Connected);
      return () => {
         window.removeEventListener("message", handleCafe24Connected);
      };
   }, []);

   useEffect(() => {
      if (activeTab !== "hosting") {
         return undefined;
      }

      const intervalId = window.setInterval(() => {
         if (document.visibilityState === "hidden") {
            return;
         }

         void fetchAdminHostingAccounts()
            .then((items) => {
               setHostingAccounts(items);
               setHostingLoaded(true);
            })
            .catch(() => {});
      }, 60 * 1000);

      return () => {
         window.clearInterval(intervalId);
      };
   }, [activeTab]);

   useEffect(() => {
      if (!selectedCustomId) {
         setAvailableAccountPlatforms([]);
         setSelectedAccountPlatform("");
         setSchedules([]);
         setSelectedScheduleIds([]);
         return;
      }

      let cancelled = false;

      async function loadAccountPlatforms() {
         setLoadingAccountPlatforms(true);
         setScheduleMessage({ tone: "neutral", text: "" });
         setAvailableAccountPlatforms([]);
         setSelectedAccountPlatform("");
         setSchedules([]);
         setSelectedScheduleIds([]);

         try {
            const items = await fetchScheduledAccountPlatforms(
               selectedCustomId,
               scheduleStatus,
            );

            if (!cancelled) {
               setAvailableAccountPlatforms(items);
               if (items.length === 1) {
                  setSelectedAccountPlatform(items[0]);
               }
            }
         } catch (loadError) {
            if (!cancelled) {
               setScheduleMessage({
                  tone: "error",
                  text:
                     loadError.message ||
                     "예약이 걸린 accountPlatform 목록을 불러오지 못했습니다.",
               });
            }
         } finally {
            if (!cancelled) {
               setLoadingAccountPlatforms(false);
            }
         }
      }

      void loadAccountPlatforms();

      return () => {
         cancelled = true;
      };
   }, [selectedCustomId, scheduleStatus]);

   async function loadUsers() {
      setLoadingUsers(true);
      setUserMessage({ tone: "neutral", text: "" });

      try {
         const items = await fetchAdminUsers();
         setUsers(items);
      } catch (error) {
         setUserMessage({
            tone: "error",
            text:
               error.message ||
               "User 목록을 불러오지 못했습니다. 관리자 API를 확인해주세요.",
         });
      } finally {
         setLoadingUsers(false);
         setUsersLoaded(true);
      }
   }

   async function loadHostingAccounts() {
      setLoadingHostingAccounts(true);
      setHostingMessage({ tone: "neutral", text: "" });

      try {
         const items = await fetchAdminHostingAccounts();
         setHostingAccounts(items);
      } catch (error) {
         setHostingMessage({
            tone: "error",
            text:
               error.message ||
               "Hosting 목록을 불러오지 못했습니다. 관리자 API를 확인해주세요.",
         });
      } finally {
         setLoadingHostingAccounts(false);
         setHostingLoaded(true);
      }
   }

   const allSchedulesChecked =
      schedules.length > 0 && selectedScheduleIds.length === schedules.length;

   const selectedSchedules = useMemo(
      () => schedules.filter((item) => selectedScheduleIds.includes(item.id)),
      [schedules, selectedScheduleIds],
   );

   const toggleScheduleSelection = (id) => {
      setSelectedScheduleIds((current) =>
         current.includes(id)
            ? current.filter((item) => item !== id)
            : [...current, id],
      );
   };

   const toggleAllSchedules = () => {
      setSelectedScheduleIds((current) =>
         current.length === schedules.length ? [] : schedules.map((item) => item.id),
      );
   };

   const handleFetchSchedules = async () => {
      setScheduleMessage({ tone: "neutral", text: "" });
      setLoadingSchedules(true);
      setSelectedScheduleIds([]);

      try {
         const items = await fetchSchedules(
            selectedCustomId,
            selectedAccountPlatform,
            scheduleStatus,
         );
         setSchedules(items);
         if (items.length === 0) {
            setScheduleMessage({
               tone: "success",
               text:
                  activeScheduleSubtab === "completed"
                     ? "현재 완료된 예약이 없습니다."
                     : "현재 실행 대상 예약이 없습니다.",
            });
         }
      } catch (error) {
         setSchedules([]);
         setScheduleMessage({
            tone: "error",
            text:
               error.message ||
               "예약 목록을 불러오지 못했습니다. customId와 accountPlatform을 확인해주세요.",
         });
      } finally {
         setLoadingSchedules(false);
      }
   };

   const handleRunSchedules = () => {
      const scheduleIds = [...selectedScheduleIds];
      const accountPlatformLabel = selectedAccountPlatform;

      setScheduleMessage({ tone: "neutral", text: "" });

      setActiveRunRequestCount((current) => current + 1);
      setScheduleMessage({
         tone: "success",
         text: `${accountPlatformLabel} 예약 ${scheduleIds.length}개 실행을 시작했습니다. 다른 accountPlatform 예약도 이어서 실행할 수 있습니다.`,
      });
      setSelectedScheduleIds([]);

      void runSchedules(scheduleIds)
         .then(() => {
            setScheduleMessage({
               tone: "success",
               text: `${accountPlatformLabel} 예약 ${scheduleIds.length}개 실행이 완료되었습니다.`,
            });
         })
         .catch((error) => {
            setScheduleMessage({
               tone: "error",
               text:
                  error.message ||
                  "예약 실행 요청에 실패했습니다. 서버 상태를 확인해주세요.",
            });
         })
         .finally(() => {
            setActiveRunRequestCount((current) => Math.max(0, current - 1));
         });
   };

   const handleDeleteSchedules = async () => {
      setScheduleMessage({ tone: "neutral", text: "" });
      setDeletingSchedules(true);

      try {
         await deleteSchedules(selectedScheduleIds);
         setScheduleMessage({
            tone: "success",
            text: "선택한 완료 예약을 삭제했습니다.",
         });
         setSelectedScheduleIds([]);
         const items = await fetchSchedules(
            selectedCustomId,
            selectedAccountPlatform,
            scheduleStatus,
         );
         setSchedules(items);
         const customIds = await fetchScheduledCustomIds(scheduleStatus);
         setAvailableCustomIds(customIds);
      } catch (error) {
         setScheduleMessage({
            tone: "error",
            text:
               error.message ||
               "완료 예약 삭제에 실패했습니다. 서버 상태를 확인해주세요.",
         });
      } finally {
         setDeletingSchedules(false);
      }
   };

   const handleUserFieldChange = (field, value) => {
      const nextValue =
         field === "phone"
            ? formatPhoneInput(value)
            : value;

      setUserForm((current) => ({
         ...current,
         [field]: nextValue,
      }));
   };

   const handleHostingFieldChange = (field, value) => {
      setHostingForm((current) => ({
         ...current,
         [field]: value,
      }));
   };

   const handleSelectUser = (user) => {
      const requestUsage = user.requestUsage || {};

      setUserForm({
         id: String(user.id ?? ""),
         name: user.name || "",
         loginId: user.loginId || "",
         password: "",
         customId: user.customId || "",
         phone: user.phone || "",
         isApproved: Boolean(user.isApproved),
         plan: user.plan || "none",
         subscriptionStartAt: toDateTimeLocalValue(user.subscriptionStartAt),
         subscriptionEndAt: toDateTimeLocalValue(user.subscriptionEndAt),
         requestUsedCount: String(
            requestUsage.used ??
               user.requestUsedCount ??
               user.currentRequestCount ??
               "",
         ),
         requestLimitOverride: String(
            requestUsage.limitOverride ?? user.requestLimitOverride ?? "",
         ),
         requestCycleStartAt: toDateTimeLocalValue(
            requestUsage.cycleStartAt ?? user.requestCycleStartAt,
         ),
         requestCycleEndAt: toDateTimeLocalValue(
            requestUsage.cycleEndAt ?? user.requestCycleEndAt,
         ),
         sites: stringifyList(user.sites),
         createdAt: formatDateTime(user.createdAt),
         updatedAt: formatDateTime(user.updatedAt),
         email: user.email || "",
      });
   };

   const handleSelectHostingAccount = (account) => {
      setHostingForm({
         id: String(account.id ?? ""),
         customId: account.customId || "",
         platform: account.platform || "smartstore",
         accountPlatform: account.accountPlatform || "",
         partnerKey: account.partnerKey || "",
         apiKey: account.apiKey || "",
         refreshToken: account.refreshToken || "",
         tokenExpiresAt: toDateTimeLocalValue(account.tokenExpiresAt),
         refreshTokenExpiresAt: toDateTimeLocalValue(
            account.refreshTokenExpiresAt,
         ),
         createdAt: formatDateTime(account.createdAt),
         updatedAt: formatDateTime(account.updatedAt),
         topImages: stringifyList(account.topImages),
         bottomImages: stringifyList(account.bottomImages),
      });
   };

   const handleSaveUser = async () => {
      setSavingUser(true);
      setUserMessage({ tone: "neutral", text: "" });

      try {
         const normalizedPhone = formatPhoneInput(userForm.phone || "");

         if (!/^\d{3}-\d{4}-\d{4}$/.test(normalizedPhone)) {
            throw new Error("연락처 형식이 올바르지 않습니다.");
         }

         const payload = {
            name: userForm.name.trim(),
            loginId: userForm.loginId.trim(),
            password: userForm.password || undefined,
            customId: userForm.customId.trim(),
            phone: normalizedPhone,
            isApproved: userForm.isApproved,
            plan: userForm.plan,
            subscriptionStartAt: parseDateTimeLocalValue(
               userForm.subscriptionStartAt,
            ),
            subscriptionEndAt: parseDateTimeLocalValue(userForm.subscriptionEndAt),
            requestUsedCount: parseNullableInteger(userForm.requestUsedCount),
            requestLimitOverride: parseNullableInteger(
               userForm.requestLimitOverride,
            ),
            requestCycleStartAt: parseDateTimeLocalValue(
               userForm.requestCycleStartAt,
            ),
            requestCycleEndAt: parseDateTimeLocalValue(
               userForm.requestCycleEndAt,
            ),
            sites: parseListText(userForm.sites),
            email: userForm.email.trim() || null,
         };

         if (userForm.id) {
            await updateAdminUser(userForm.id, payload);
            setUserMessage({
               tone: "success",
               text: "User 정보가 수정되었습니다.",
            });
         } else {
            await createAdminUser(payload);
            setUserMessage({
               tone: "success",
               text: "새 User가 추가되었습니다.",
            });
         }

         setUserForm(createEmptyUserForm());
         setUsersLoaded(false);
         await loadUsers();
      } catch (error) {
         setUserMessage({
            tone: "error",
            text:
               error.message ||
               "User 저장에 실패했습니다. 관리자 API를 확인해주세요.",
         });
      } finally {
         setSavingUser(false);
      }
   };

   const buildHostingPayload = () => ({
      customId: hostingForm.customId.trim(),
      platform: hostingForm.platform,
      accountPlatform: hostingForm.accountPlatform.trim(),
      partnerKey: hostingForm.partnerKey.trim(),
      apiKey: hostingForm.apiKey.trim(),
      refreshToken: hostingForm.refreshToken.trim() || null,
      tokenExpiresAt: parseDateTimeLocalValue(hostingForm.tokenExpiresAt),
      refreshTokenExpiresAt: parseDateTimeLocalValue(
         hostingForm.refreshTokenExpiresAt,
      ),
      topImages: parseListText(hostingForm.topImages),
      bottomImages: parseListText(hostingForm.bottomImages),
   });

   const handleSaveHostingAccount = async () => {
      setSavingHostingAccount(true);
      setHostingMessage({ tone: "neutral", text: "" });

      try {
         if (!hostingForm.customId.trim()) {
            throw new Error("customId는 필수입니다.");
         }

         const payload = buildHostingPayload();

         if (hostingForm.id) {
            const result = await updateAdminHostingAccount(hostingForm.id, payload);
            if (result?.success === false) {
               throw new Error(
                  result.message ||
                     "Hosting 정보를 저장하지 못했습니다.",
               );
            }
            setHostingMessage({
               tone: "success",
               text:
                  "Hosting 정보가 수정되었습니다.",
            });
         } else {
            const result = await createAdminHostingAccount(payload);
            if (result?.success === false) {
               throw new Error(
                  result.message ||
                     "Hosting 계정을 추가하지 못했습니다.",
               );
            }
            setHostingMessage({
               tone: "success",
               text:
                  "새 Hosting 계정이 추가되었습니다.",
            });
         }

         setHostingForm(createEmptyHostingForm());
         setHostingLoaded(false);
         await loadHostingAccounts();
      } catch (error) {
         setHostingMessage({
            tone: "error",
            text:
               error.message ||
               "Hosting 저장에 실패했습니다. 관리자 API를 확인해주세요.",
         });
      } finally {
         setSavingHostingAccount(false);
      }
   };

   const handleConnectCafe24 = async () => {
      setConnectingCafe24(true);
      setHostingMessage({ tone: "neutral", text: "" });

      try {
         if (hostingForm.platform !== "cafe24") {
            throw new Error(
               "Cafe24 계정에서만 연동할 수 있습니다.",
            );
         }

         if (!hostingForm.customId.trim()) {
            throw new Error("customId는 필수입니다.");
         }

         if (!hostingForm.accountPlatform.trim()) {
            throw new Error("accountPlatform은 필수입니다.");
         }

         if (!hostingForm.partnerKey.trim()) {
            throw new Error("mallId는 필수입니다.");
         }

         const payload = buildHostingPayload();
         let savedAccount = null;

         if (hostingForm.id) {
            const result = await updateAdminHostingAccount(hostingForm.id, payload);
            if (result?.success === false) {
               throw new Error(
                  result.message ||
                     "Cafe24 계정을 저장하지 못했습니다.",
               );
            }
            savedAccount = result?.account || null;
         } else {
            const result = await createAdminHostingAccount(payload);
            if (result?.success === false) {
               throw new Error(
                  result.message ||
                     "Cafe24 계정을 추가하지 못했습니다.",
               );
            }
            savedAccount = result?.account || null;
         }

         if (savedAccount) {
            handleSelectHostingAccount(savedAccount);
         }

         const state = encodeCafe24State({
            customId: payload.customId,
            accountPlatform: payload.accountPlatform,
            mallId: payload.partnerKey,
            appOrigin: window.location.origin,
            ts: Date.now(),
         });

         window.sessionStorage.setItem(CAFE24_OAUTH_STATE_KEY, state);

         const result = await fetchCafe24AuthorizeUrl({
            mallId: payload.partnerKey,
            state,
         });

         const popup = window.open(
            result.url,
            "flowmerce-cafe24-connect",
            "width=760,height=860,menubar=no,toolbar=no,location=yes,resizable=yes,scrollbars=yes,status=no",
         );

         if (!popup) {
            throw new Error(
               "브라우저 팝업이 차단되었습니다.",
            );
         }

         popup.focus();
         const popupWatcher = window.setInterval(() => {
            if (!popup.closed) {
               return;
            }

            window.clearInterval(popupWatcher);
            setConnectingCafe24(false);
         }, 700);
         setHostingMessage({
            tone: "neutral",
            text: "Cafe24 승인 화면이 열렸습니다.",
         });
      } catch (error) {
         setConnectingCafe24(false);
         setHostingMessage({
            tone: "error",
            text:
               error.message ||
               "Cafe24 연동을 시작하지 못했습니다.",
         });
      }
   };

   return (
      <>
         <div className="space-y-8">
            <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
               <div className="flex flex-wrap gap-2">
                  {tabs.map((tab) => (
                     <TabButton
                        key={tab.id}
                        label={tab.label}
                        active={activeTab === tab.id}
                        onClick={() => setActiveTab(tab.id)}
                     />
                  ))}
               </div>
            </div>

            {activeTab === "contacts" && (
               <section className="rounded-lg border border-zinc-200 bg-white p-7 shadow-sm">
                  <SectionHeader
                     title="전체 문의 관리"
                     description="서버 DB에 저장된 문의를 관리자 전용 화면에서 확인합니다. 각 문의는 상세보기에서 전체 내용을 바로 읽을 수 있습니다."
                  />

                  <div className="mt-7">
                     {loadingContacts ? (
                        <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600">
                           문의 목록을 불러오는 중입니다...
                        </p>
                     ) : contactError ? (
                        <p className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                           {contactError}
                        </p>
                     ) : contacts.length === 0 ? (
                        <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600">
                           아직 접수된 문의가 없습니다.
                        </p>
                     ) : (
                        <div className="overflow-x-auto">
                           <table className="min-w-full divide-y divide-zinc-200 text-sm">
                              <thead className="bg-zinc-50">
                                 <tr>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       문의 유형
                                    </th>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       이름
                                    </th>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       연락처
                                    </th>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       문의 요약
                                    </th>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       접수일시
                                    </th>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       보기
                                    </th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-200">
                                 {contacts.map((contact) => (
                                    <tr key={contact.id}>
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          {contact.type}
                                       </td>
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          {contact.name}
                                       </td>
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          {contact.phone}
                                       </td>
                                       <td className="min-w-72 px-5 py-4 text-zinc-600">
                                          <p className="line-clamp-2 leading-6">
                                             {contact.content}
                                          </p>
                                       </td>
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          {formatDateTime(contact.createdAt)}
                                       </td>
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          <button
                                             type="button"
                                             onClick={() => setSelectedContact(contact)}
                                             className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
                                          >
                                             상세보기
                                          </button>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     )}
                  </div>
               </section>
            )}

            {activeTab === "schedules" && (
               <section className="rounded-lg border border-zinc-200 bg-white p-7 shadow-sm">
                  <SectionHeader
                     title="수집 예약 실행"
                     description="실행 대상 예약과 완료된 예약을 분리해서 보고, 완료 목록에서는 선택 삭제까지 할 수 있습니다."
                  />

                  <div className="mt-6 flex flex-wrap gap-2">
                     {scheduleSubtabs.map((tab) => (
                        <TabButton
                           key={tab.id}
                           label={tab.label}
                           active={activeScheduleSubtab === tab.id}
                           onClick={() => setActiveScheduleSubtab(tab.id)}
                        />
                     ))}
                  </div>

                  <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
                     <label className="block">
                        <span className="text-sm font-medium text-zinc-600">
                           예약 customId
                        </span>
                        <select
                           value={selectedCustomId}
                           onChange={(event) => setSelectedCustomId(event.target.value)}
                           className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm focus:border-emerald-600 focus:outline-none"
                           disabled={loadingCustomIds}
                        >
                           <option value="">
                              {loadingCustomIds
                                 ? "customId 목록을 불러오는 중입니다"
                                 : "customId를 선택해주세요"}
                           </option>
                           {availableCustomIds.map((customId) => (
                              <option key={customId} value={customId}>
                                 {customId}
                              </option>
                           ))}
                        </select>
                     </label>

                     <label className="block">
                        <span className="text-sm font-medium text-zinc-600">
                           accountPlatform
                        </span>
                        <select
                           value={selectedAccountPlatform}
                           onChange={(event) =>
                              setSelectedAccountPlatform(event.target.value)
                           }
                           className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm focus:border-emerald-600 focus:outline-none"
                           disabled={
                              loadingAccountPlatforms ||
                              availableAccountPlatforms.length === 0
                           }
                        >
                           <option value="">
                              {loadingAccountPlatforms
                                 ? "accountPlatform 목록을 불러오는 중입니다"
                                 : "accountPlatform을 선택해주세요"}
                           </option>
                           {availableAccountPlatforms.map((accountPlatform) => (
                              <option key={accountPlatform} value={accountPlatform}>
                                 {accountPlatform}
                              </option>
                           ))}
                        </select>
                     </label>

                     <button
                        type="button"
                        onClick={handleFetchSchedules}
                        disabled={
                           loadingSchedules ||
                           !selectedCustomId ||
                           !selectedAccountPlatform
                        }
                        className="mt-6 inline-flex h-[46px] items-center justify-center rounded-lg border border-emerald-700 bg-emerald-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                     >
                        {loadingSchedules ? "예약 조회 중..." : "예약 조회"}
                     </button>
                  </div>

                  <div className="mt-4">
                     <StatusMessage message={scheduleMessage} />
                  </div>

                  <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200">
                     <table className="min-w-full divide-y divide-zinc-200 text-sm">
                        <thead className="bg-zinc-50">
                           <tr>
                              <th className="w-14 px-4 py-4 text-left font-semibold text-zinc-950">
                                 <input
                                    type="checkbox"
                                    checked={allSchedulesChecked}
                                    onChange={toggleAllSchedules}
                                    disabled={schedules.length === 0}
                                    className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                                 />
                              </th>
                              <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                 사이트
                              </th>
                              <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                 예약 카테고리
                              </th>
                              <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                 예약 ID
                              </th>
                              <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                 상태
                              </th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 bg-white">
                           {schedules.length === 0 ? (
                              <tr>
                                 <td
                                    colSpan={5}
                                    className="px-5 py-8 text-center text-sm text-zinc-500"
                                 >
                                    조회된 수집 예약이 없습니다.
                                 </td>
                              </tr>
                           ) : (
                              schedules.map((schedule) => (
                                 <tr key={schedule.id}>
                                    <td className="px-4 py-4">
                                       <input
                                          type="checkbox"
                                          checked={selectedScheduleIds.includes(
                                             schedule.id,
                                          )}
                                          onChange={() =>
                                             toggleScheduleSelection(schedule.id)
                                          }
                                          className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                                       />
                                    </td>
                                    <td className="px-5 py-4 text-zinc-600">
                                       {schedule.site || "-"}
                                    </td>
                                    <td className="px-5 py-4 text-zinc-600">
                                       {getScheduleDisplayName(schedule)}
                                    </td>
                                    <td className="px-5 py-4 text-zinc-600">
                                       {schedule.id}
                                    </td>
                                    <td className="px-5 py-4 text-zinc-600">
                                       {schedule.status || "-"}
                                    </td>
                                 </tr>
                              ))
                           )}
                        </tbody>
                     </table>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                     <p className="text-sm text-zinc-600">
                        현재 선택된 예약:{" "}
                        <span className="font-semibold text-zinc-950">
                           {selectedSchedules.length}개
                        </span>
                     </p>

                     <div className="flex flex-wrap items-center gap-3">
                        {activeScheduleSubtab === "active" ? (
                           <button
                              type="button"
                              onClick={handleRunSchedules}
                              disabled={selectedScheduleIds.length === 0}
                              className="inline-flex items-center justify-center rounded-lg border border-emerald-700 bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                           >
                              {activeRunRequestCount > 0
                                 ? `선택한 예약 실행 (진행 중 ${activeRunRequestCount}개)`
                                 : "선택한 예약 실행"}
                           </button>
                        ) : (
                           <button
                              type="button"
                              onClick={handleDeleteSchedules}
                              disabled={
                                 deletingSchedules || selectedScheduleIds.length === 0
                              }
                              className="inline-flex items-center justify-center rounded-lg border border-red-700 bg-red-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                           >
                              {deletingSchedules
                                 ? "삭제 요청 중..."
                                 : "선택한 완료 예약 삭제"}
                           </button>
                        )}
                     </div>
                  </div>
               </section>
            )}

            {activeTab === "users" && (
               <section className="rounded-lg border border-zinc-200 bg-white p-7 shadow-sm">
                  <SectionHeader
                     title="User 관리"
                     description="customId 기준으로 목록을 확인하고, 선택한 User 정보를 오른쪽 폼에서 수정하거나 새 User를 추가합니다."
                     action={
                        <button
                           type="button"
                           onClick={() => {
                              setUsersLoaded(false);
                              setUserForm(createEmptyUserForm());
                              void loadUsers();
                           }}
                           className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
                        >
                           목록 새로고침
                        </button>
                     }
                  />

                  <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_1fr]">
                     <div className="overflow-x-auto rounded-lg border border-zinc-200">
                        {loadingUsers ? (
                           <p className="p-5 text-sm text-zinc-600">
                              User 목록을 불러오는 중입니다...
                           </p>
                        ) : users.length === 0 ? (
                           <p className="p-5 text-sm text-zinc-600">
                              조회된 User가 없습니다.
                           </p>
                        ) : (
                           <table className="min-w-full divide-y divide-zinc-200 text-sm">
                              <thead className="bg-zinc-50">
                                 <tr>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       customId
                                    </th>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       이름
                                    </th>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       loginId
                                    </th>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       phone
                                    </th>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       플랜
                                    </th>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       승인
                                    </th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-200">
                                 {users.map((user) => (
                                    <tr
                                       key={user.id}
                                       onClick={() => handleSelectUser(user)}
                                       className="cursor-pointer transition hover:bg-zinc-50"
                                    >
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          {user.customId || "-"}
                                       </td>
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          {user.name || "-"}
                                       </td>
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          {user.loginId || "-"}
                                       </td>
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          {user.phone || "-"}
                                       </td>
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          {user.plan || "none"}
                                       </td>
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          {user.isApproved ? "확인" : "대기"}
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        )}
                     </div>

                     <div className="space-y-4">
                        <StatusMessage message={userMessage} />
                        <UserForm
                           form={userForm}
                           onChange={handleUserFieldChange}
                           onSave={handleSaveUser}
                           onReset={() => setUserForm(createEmptyUserForm())}
                           saving={savingUser}
                        />
                     </div>
                  </div>
               </section>
            )}

            {activeTab === "hosting" && (
               <section className="rounded-lg border border-zinc-200 bg-white p-7 shadow-sm">
                  <SectionHeader
                     title="HostingAccount 관리"
                     description="customId 기준으로 Hosting 계정을 확인하고, 선택한 계정 정보를 오른쪽 폼에서 수정하거나 새 HostingAccount를 추가합니다."
                     action={
                        <button
                           type="button"
                           onClick={() => {
                              setHostingLoaded(false);
                              setHostingForm(createEmptyHostingForm());
                              void loadHostingAccounts();
                           }}
                           className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
                        >
                           목록 새로고침
                        </button>
                     }
                  />

                  <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_1fr]">
                     <div className="overflow-x-auto rounded-lg border border-zinc-200">
                        {loadingHostingAccounts ? (
                           <p className="p-5 text-sm text-zinc-600">
                              Hosting 목록을 불러오는 중입니다...
                           </p>
                        ) : hostingAccounts.length === 0 ? (
                           <p className="p-5 text-sm text-zinc-600">
                              조회된 Hosting 계정이 없습니다.
                           </p>
                        ) : (
                           <table className="min-w-full divide-y divide-zinc-200 text-sm">
                              <thead className="bg-zinc-50">
                                 <tr>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       customId
                                    </th>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       platform
                                    </th>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       accountPlatform
                                    </th>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       {"CAFE24 \uD1A0\uD070"}
                                    </th>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       사용 가능
                                    </th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-200">
                                 {hostingAccounts.map((account) => (
                                    <tr
                                       key={account.id}
                                       onClick={() => handleSelectHostingAccount(account)}
                                       className="cursor-pointer transition hover:bg-zinc-50"
                                    >
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          {account.customId || "-"}
                                       </td>
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          {account.platform || "-"}
                                       </td>
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          {account.accountPlatform || "-"}
                                       </td>
                                       <td className="px-5 py-4 text-zinc-600">
                                          {account.platform === "cafe24" ? (
                                             <div className="flex items-center gap-2 whitespace-nowrap">
                                                <Cafe24RefreshBadge
                                                   status={getCafe24RefreshStatus(account)}
                                                />
                                                <span className="text-xs text-zinc-500">
                                                   {formatMonthDay(account.refreshTokenExpiresAt)}
                                                </span>
                                             </div>
                                          ) : (
                                             "-"
                                          )}
                                       </td>
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          {isHostingAccountReady(account)
                                             ? "가능"
                                             : "미완료"}
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        )}
                     </div>

                     <div className="space-y-4">
                        <StatusMessage message={hostingMessage} />
                        <HostingForm
                           form={hostingForm}
                           onChange={handleHostingFieldChange}
                           onSave={handleSaveHostingAccount}
                           onReset={() => setHostingForm(createEmptyHostingForm())}
                           onConnectCafe24={handleConnectCafe24}
                           saving={savingHostingAccount}
                           connectingCafe24={connectingCafe24}
                        />
                     </div>
                  </div>
               </section>
            )}
         </div>

         <ContactDetailModal
            contact={selectedContact}
            onClose={() => setSelectedContact(null)}
         />
      </>
   );
}

