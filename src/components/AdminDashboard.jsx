"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAdminContacts } from "@/lib/requests";
import {
   createAdminHostingAccount,
   createAdminUser,
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
const platformOptions = ["smartstore", "godomall", "cafe24"];
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

function createEmptyUserForm() {
   return {
      id: "",
      name: "",
      loginId: "",
      password: "",
      customId: "",
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
                  <p className="font-medium text-zinc-500">현재 사용률</p>
                  <p className="mt-1 text-lg font-semibold text-zinc-950">
                     {requestPercent === null ? "-" : `${requestPercent}%`}
                  </p>
               </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
               <ReadOnlyField
                  label="플랜 요청수 (자동)"
                  value={formatNumber(requestLimitByPlan[form.plan] ?? null)}
               />
               <ReadOnlyField
                  label="가능 요청수 (자동)"
                  value={formatNumber(requestRemainingCount)}
               />
               <label className="block">
                  <span className="text-sm font-medium text-zinc-600">
                     현재 요청수 (선택)
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
                     요청수 오버라이드 (선택)
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
                     요청수 집계 시작일 (선택)
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
                     요청수 집계 종료일 (선택)
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

function HostingForm({ form, onChange, onSave, onReset, saving }) {
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
                  onChange={(event) =>
                     onChange("accountPlatform", event.target.value)
                  }
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  partnerKey (필수)
               </span>
               <input
                  value={form.partnerKey}
                  onChange={(event) => onChange("partnerKey", event.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
            <label className="block md:col-span-2">
               <span className="text-sm font-medium text-zinc-600">
                  apiKey (필수)
               </span>
               <input
                  value={form.apiKey}
                  onChange={(event) => onChange("apiKey", event.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
            <ReadOnlyField label="createdAt (자동)" value={form.createdAt || "-"} />
            <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
               <span className="font-medium text-zinc-700">사용 가능 상태</span>
               <p className="mt-2 leading-6">
                  partnerKey 와 apiKey 가 둘 다 들어가면 마이페이지에서 사용 가능으로
                  계산할 수 있습니다.
               </p>
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
                  onChange={(event) =>
                     onChange("bottomImages", event.target.value)
                  }
                  placeholder="한 줄에 하나씩 입력하거나 쉼표로 구분하세요."
                  rows={5}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
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
   const [runningSchedules, setRunningSchedules] = useState(false);
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

   const scheduleStatus = activeScheduleSubtab === "completed" ? "done" : "active";

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
                     "예약에 걸린 accountPlatform 목록을 불러오지 못했습니다.",
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

   const handleRunSchedules = async () => {
      setScheduleMessage({ tone: "neutral", text: "" });
      setRunningSchedules(true);

      try {
         await runSchedules(selectedScheduleIds);
         setScheduleMessage({
            tone: "success",
            text: "선택한 예약 실행 요청을 보냈습니다.",
         });
      } catch (error) {
         setScheduleMessage({
            tone: "error",
            text:
               error.message ||
               "예약 실행 요청에 실패했습니다. 서버 상태를 확인해주세요.",
         });
      } finally {
         setRunningSchedules(false);
      }
   };

   const handleDeleteSchedules = async () => {
      setScheduleMessage({ tone: "neutral", text: "" });
      setDeletingSchedules(true);

      try {
         await deleteSchedules(selectedScheduleIds);
         setScheduleMessage({
            tone: "success",
            text: "선택한 완료 예약이 삭제되었습니다.",
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
      setUserForm((current) => ({
         ...current,
         [field]: value,
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
         const payload = {
            name: userForm.name.trim(),
            loginId: userForm.loginId.trim(),
            password: userForm.password || undefined,
            customId: userForm.customId.trim(),
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

   const handleSaveHostingAccount = async () => {
      setSavingHostingAccount(true);
      setHostingMessage({ tone: "neutral", text: "" });

      try {
         if (!hostingForm.customId.trim()) {
            throw new Error("customId는 필수입니다.");
         }

         const payload = {
            customId: hostingForm.customId.trim(),
            platform: hostingForm.platform,
            accountPlatform: hostingForm.accountPlatform.trim(),
            partnerKey: hostingForm.partnerKey.trim(),
            apiKey: hostingForm.apiKey.trim(),
            topImages: parseListText(hostingForm.topImages),
            bottomImages: parseListText(hostingForm.bottomImages),
         };

         if (hostingForm.id) {
            await updateAdminHostingAccount(hostingForm.id, payload);
            setHostingMessage({
               tone: "success",
               text: "Hosting 정보가 수정되었습니다.",
            });
         } else {
            await createAdminHostingAccount(payload);
            setHostingMessage({
               tone: "success",
               text: "새 Hosting 계정이 추가되었습니다.",
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
                     description="서버 DB에 저장된 문의를 관리자 전용으로 확인합니다. 긴 문의는 상세보기에서 전체 내용을 바로 읽을 수 있게 분리해두었습니다."
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
                     description="실행 대상 예약과 완료된 예약을 분리해서 보고, 완료 목록에서는 선택 삭제까지 할 수 있도록 준비해두었습니다."
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
                              disabled={
                                 runningSchedules || selectedScheduleIds.length === 0
                              }
                              className="inline-flex items-center justify-center rounded-lg border border-emerald-700 bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                           >
                              {runningSchedules
                                 ? "실행 요청 중..."
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
                     title="User 엔티티 관리"
                     description="customId 기준으로 목록을 보고, 해당 user를 누르면 오른쪽 폼에 값이 그대로 들어갑니다. 수정 후 저장하면 덮어쓰기, 새로 작성 상태에서 저장하면 새 User 추가로 동작하게 잡아뒀습니다."
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
                                          {user.plan || "none"}
                                       </td>
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          {user.isApproved ? "승인" : "대기"}
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
                     title="HostingAccount 엔티티 관리"
                     description="목록은 customId 기준으로 보고, 해당 계정을 누르면 오른쪽 폼에 값이 그대로 들어갑니다. 수정 후 저장하면 덮어쓰기, 새로 작성 상태에서 저장하면 새 HostingAccount 추가로 동작합니다."
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
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          {account.partnerKey && account.apiKey
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
                           saving={savingHostingAccount}
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
