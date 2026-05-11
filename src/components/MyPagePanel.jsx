"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
   changePassword,
   fetchHostingAccounts,
   fetchUserProfile,
   getSession,
   saveUserSites,
   updateSessionData,
   validatePassword,
} from "@/lib/auth";
import { coreSourcingSites, highEndSites, plans } from "@/lib/pricingData";
import { CheckIcon } from "./icons/CheckIcon";

const boutiqueSites = ["Farfetch", "Cettire"];
const kakaoChatUrl = "https://pf.kakao.com/_hPdjX/chat";
const emptyPasswordForm = {
   currentPassword: "",
   newPassword: "",
   newPasswordConfirm: "",
};

const planMeta = {
   none: {
      label: "구독 없음",
      badgeClass: "border-zinc-200 bg-zinc-100 text-zinc-700",
      description:
         "현재 구독 중인 플랜이 없습니다. 가격 페이지에서 전체 플랜을 확인하고 바로 구독을 진행해주세요.",
   },
   boutique: {
      label: "Boutique",
      badgeClass: "border-amber-200 bg-[#fbf7ef] text-amber-900",
      description:
         "대형 플랫폼 대상 상품등록 및 재고관리를 위한 Boutique 플랜을 이용 중입니다.",
   },
   basic: {
      label: "Basic",
      badgeClass: "border-amber-200 bg-[#fbf7ef] text-amber-900",
      description:
         "기본 운영 흐름을 시작하기 좋은 Basic 플랜을 이용 중입니다.",
   },
   pro: {
      label: "Pro",
      badgeClass: "border-amber-200 bg-[#fbf7ef] text-amber-900",
      description:
         "다중 사이트 운영과 확장에 적합한 Pro 플랜을 이용 중입니다.",
   },
   enterprise: {
      label: "Enterprise",
      badgeClass: "border-amber-200 bg-[#fbf7ef] text-amber-900",
      description:
         "대규모 운영에 맞춘 Enterprise 플랜을 이용 중입니다.",
   },
};

const sitePlanConfig = {
   none: {
      coreLimit: 0,
      highEndLimit: 0,
      coreOptions: [],
      highEndEnabled: false,
   },
   boutique: {
      coreLimit: 1,
      highEndLimit: 0,
      coreOptions: boutiqueSites,
      highEndEnabled: false,
   },
   basic: {
      coreLimit: 2,
      highEndLimit: 0,
      coreOptions: coreSourcingSites,
      highEndEnabled: false,
   },
   pro: {
      coreLimit: 8,
      highEndLimit: 2,
      coreOptions: coreSourcingSites,
      highEndEnabled: true,
   },
   enterprise: {
      coreLimit: 0,
      highEndLimit: 0,
      coreOptions: [],
      highEndEnabled: false,
   },
};

const planLookup = {
   boutique: plans.find((plan) => plan.name === "Boutique"),
   basic: plans.find((plan) => plan.name === "Basic"),
   pro: plans.find((plan) => plan.name === "Pro"),
   enterprise: plans.find((plan) => plan.name === "Enterprise"),
};

const requestLimitByPlan = {
   none: null,
   boutique: 100000,
   basic: 5000,
   pro: 50000,
   enterprise: 200000,
};

function formatDate(value) {
   if (!value) {
      return "미정";
   }

   const parsedDate = new Date(value);

   if (Number.isNaN(parsedDate.getTime())) {
      return "미정";
   }

   return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
   }).format(parsedDate);
}

function formatDateTime(value) {
   if (!value) {
      return "미정";
   }

   const parsedDate = new Date(value);

   if (Number.isNaN(parsedDate.getTime())) {
      return "미정";
   }

   return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
   }).format(parsedDate);
}

function formatNumber(value) {
   if (value === null || value === undefined || value === "") {
      return "미정";
   }

   const parsed = Number(value);

   if (!Number.isFinite(parsed)) {
      return "미정";
   }

   return new Intl.NumberFormat("ko-KR").format(parsed);
}

function parseNullableNumber(value) {
   if (value === null || value === undefined || value === "") {
      return null;
   }

   const parsed = Number(value);
   return Number.isFinite(parsed) ? parsed : null;
}

function normalizeAccountPlatforms(value) {
   if (!Array.isArray(value)) {
      return [];
   }

   return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
}

function getUpgradePlanValues(currentPlan) {
   switch (currentPlan) {
      case "boutique":
         return ["basic", "pro", "enterprise"];
      case "basic":
         return ["pro", "enterprise"];
      case "pro":
         return ["enterprise"];
      default:
         return [];
   }
}

function getAdditionalPlanValues(currentPlan) {
   return ["basic", "pro", "enterprise"].includes(currentPlan)
      ? ["boutique"]
      : [];
}

function splitSitesByType(sites) {
   return {
      core: sites.filter((site) => coreSourcingSites.includes(site)),
      highEnd: sites.filter((site) => highEndSites.includes(site)),
   };
}

function DetailRow({ label, value }) {
   return (
      <div className="flex items-center justify-between gap-4 border-b border-zinc-100 py-3 last:border-b-0">
         <dt className="text-sm font-medium text-zinc-500">{label}</dt>
         <dd className="text-right text-sm font-medium text-zinc-950">{value}</dd>
      </div>
   );
}

function SiteBadge({ label, removable = false, onRemove }) {
   return (
      <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm">
         {label}
         {removable && (
            <button
               type="button"
               onClick={onRemove}
               className="text-zinc-400 transition hover:text-zinc-700"
               aria-label={`${label} 삭제`}
            >
               ×
            </button>
         )}
      </span>
   );
}

function PlanModal({ mode, options, onClose }) {
   const isUpgrade = mode === "upgrade";

   if (!mode || options.length === 0) {
      return null;
   }

   return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/45 px-5 py-8">
         <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="absolute inset-0"
         />

         <div className="relative z-10 w-full max-w-6xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-5 sm:px-8">
               <div>
                  <p className="text-sm font-semibold text-amber-900">
                     {isUpgrade ? "Upgrade Plan" : "Additional Plan"}
                  </p>
                  <h3 className="mt-1 text-2xl font-semibold text-zinc-950">
                     {isUpgrade ? "업그레이드 가능한 플랜" : "추가 가능한 플랜"}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                     {isUpgrade
                        ? "현재 플랜보다 상위 플랜만 정리했습니다. 자세한 금액과 조건은 가격 페이지에서 바로 확인하실 수 있습니다."
                        : "Boutique 플랜은 기존 운영 플랜과 별도로 추가할 수 있는 플랫폼 전용 플랜입니다."}
                  </p>
               </div>
               <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-950"
               >
                  닫기
               </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto px-6 py-6 sm:px-8">
               <div
                  className={clsx(
                     "grid gap-6",
                     options.length === 1 ? "lg:grid-cols-1" : "lg:grid-cols-2",
                  )}
               >
                  {options.map((plan) => (
                     <div
                        key={plan.name}
                        className={clsx(
                           plan.recommended
                              ? "border-[#8c6333]"
                              : "border-zinc-200",
                           "relative flex h-full flex-col rounded-lg border bg-white p-7 shadow-sm",
                        )}
                     >
                        <div className="space-y-3">
                           <h4 className="flex min-h-[36px] items-start gap-2 text-2xl font-semibold">
                              <span>{plan.name}</span>
                              {plan.recommended && (
                                 <span className="rounded border border-zinc-950 bg-zinc-950 px-2 py-1 text-xs font-semibold text-white shadow-sm">
                                    추천
                                 </span>
                              )}
                           </h4>
                           <p className="min-h-[72px] text-sm leading-6 text-zinc-600">
                              {plan.description}
                           </p>
                        </div>

                        <div className="mt-2 flex min-h-[88px] flex-col justify-center">
                           <p className="text-3xl font-semibold text-zinc-950">
                              {plan.price}
                           </p>
                           <p className="mt-1 text-sm font-medium text-zinc-500">
                              {plan.priceNote}
                           </p>
                        </div>

                        <ul className="mt-7 flex-1 space-y-3.5">
                           {plan.features.map((feature) => (
                              <li
                                 key={feature}
                                 className="flex items-center gap-x-2 text-sm text-zinc-600"
                              >
                                 <CheckIcon className="h-5 w-5 shrink-0 text-amber-900" />
                                 {feature}
                              </li>
                           ))}
                        </ul>

                        <Link
                           href="/pricing"
                           className="mt-7 inline-flex w-full justify-center rounded-lg border border-zinc-950 bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#8c6333]"
                        >
                           플랜 자세히 보기
                        </Link>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
   );
}

function SiteConfirmModal({ open, onConfirm, onCancel, loading }) {
   if (!open) {
      return null;
   }

   return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/45 px-5 py-8">
         <button
            type="button"
            aria-label="닫기"
            onClick={onCancel}
            className="absolute inset-0"
         />
         <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-zinc-950">
               사이트를 확정하시겠습니까?
            </h3>
            <p className="mt-3 text-sm leading-7 text-zinc-600">
               사이트 결정 시 이후 변경이 어렵습니다. 저장 후에는 관리자 문의를 통해서만
               변경할 수 있습니다.
            </p>
            <div className="mt-6 flex justify-end gap-3">
               <button
                  type="button"
                  onClick={onCancel}
                  className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
               >
                  아니요
               </button>
               <button
                  type="button"
                  onClick={onConfirm}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-lg border border-zinc-950 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#8c6333] disabled:cursor-not-allowed disabled:opacity-70"
               >
                  {loading ? "저장 중..." : "예"}
               </button>
            </div>
         </div>
      </div>
   );
}

export default function MyPagePanel() {
   const router = useRouter();
   const [session, setSession] = useState(null);
   const [profile, setProfile] = useState(null);
   const [linkedAccountPlatforms, setLinkedAccountPlatforms] = useState([]);
   const [isCheckingSession, setIsCheckingSession] = useState(true);
   const [isLoadingProfile, setIsLoadingProfile] = useState(false);
   const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
   const [passwordMessage, setPasswordMessage] = useState({
      tone: "neutral",
      text: "",
   });
   const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
   const [planNotice, setPlanNotice] = useState("");
   const [siteMessage, setSiteMessage] = useState({
      tone: "neutral",
      text: "",
   });
   const [modalMode, setModalMode] = useState(null);
   const [siteConfirmOpen, setSiteConfirmOpen] = useState(false);
   const [isSavingSites, setIsSavingSites] = useState(false);
   const [coreSelection, setCoreSelection] = useState("");
   const [highEndSelection, setHighEndSelection] = useState("");
   const [draftCoreSites, setDraftCoreSites] = useState([]);
   const [draftHighEndSites, setDraftHighEndSites] = useState([]);

   useEffect(() => {
      const syncSession = () => {
         const currentSession = getSession();

         if (!currentSession) {
            router.replace("/login?next=%2Fmypage");
            return;
         }

         setSession(currentSession);
         setIsCheckingSession(false);
      };

      syncSession();
      window.addEventListener("flowmerce-auth", syncSession);
      window.addEventListener("storage", syncSession);

      return () => {
         window.removeEventListener("flowmerce-auth", syncSession);
         window.removeEventListener("storage", syncSession);
      };
   }, [router]);

   const syncProfileState = (user) => {
      setProfile(user);
      updateSessionData({
         plan: user.plan || "none",
         subscriptionStartAt: user.subscriptionStartAt || null,
         subscriptionEndAt: user.subscriptionEndAt || null,
         sites: Array.isArray(user.sites) ? user.sites : [],
         email: user.email || "",
         name: user.name || user.customId || user.loginId,
         customId: user.customId || "",
         loginId: user.loginId || "",
      });
   };

   const loadLinkedAccounts = useCallback(async (customId) => {
      try {
         const result = await fetchHostingAccounts(customId);
         const nextAccounts = Array.isArray(result)
            ? result
            : Array.isArray(result?.accounts)
              ? result.accounts
              : Array.isArray(result?.accountPlatforms)
                ? result.accountPlatforms
                : [];

         setLinkedAccountPlatforms(normalizeAccountPlatforms(nextAccounts));
      } catch {
         setLinkedAccountPlatforms([]);
      }
   }, []);

   const handleRefreshProfile = useCallback(async () => {
      if (!session?.customId || session.role === "admin") {
         return;
      }

      setIsLoadingProfile(true);

      try {
         const result = await fetchUserProfile(session.customId);
         const user = result.user || result;

         if (!user) {
            setProfile(null);
            setLinkedAccountPlatforms([]);
            return;
         }

         syncProfileState(user);
         await loadLinkedAccounts(session.customId);
      } catch {
         setProfile(null);
         setLinkedAccountPlatforms([]);
      } finally {
         setIsLoadingProfile(false);
      }
   }, [loadLinkedAccounts, session?.customId, session?.role]);

   useEffect(() => {
      if (!session?.customId || session.role === "admin") {
         return;
      }

      let cancelled = false;

      async function loadProfile() {
         setIsLoadingProfile(true);

         try {
            const result = await fetchUserProfile(session.customId);
            const user = result.user || result;

            if (cancelled || !user) {
               return;
            }

            syncProfileState(user);
         } catch {
            if (!cancelled) {
               setProfile(null);
            }
         } finally {
            if (!cancelled) {
               setIsLoadingProfile(false);
            }
         }
      }

      loadProfile();

      return () => {
         cancelled = true;
      };
   }, [handleRefreshProfile, session?.customId, session?.role]);

   useEffect(() => {
      if (!session?.customId || session.role === "admin") {
         setLinkedAccountPlatforms([]);
         return;
      }

      void loadLinkedAccounts(session.customId);
   }, [loadLinkedAccounts, session?.customId, session?.role]);

   const account = profile
      ? {
           ...session,
           ...profile,
           sites: Array.isArray(profile.sites) ? profile.sites : [],
        }
      : session;

   const currentPlan = (account?.plan || "none").toLowerCase();
   const hasPaidPlan = currentPlan !== "none";
   const currentPlanMeta = planMeta[currentPlan] || planMeta.none;
   const currentSiteConfig = sitePlanConfig[currentPlan] || sitePlanConfig.none;
   const currentSites = Array.isArray(account?.sites) ? account.sites : [];
   const allSitesApplied = currentSites.includes("ALL");
   const existingSiteGroups = splitSitesByType(currentSites);
   const siteSelectionLocked =
      currentPlan !== "enterprise" && currentSites.length > 0;

   const upgradePlanOptions = useMemo(
      () =>
         getUpgradePlanValues(currentPlan)
            .map((planValue) => planLookup[planValue])
            .filter(Boolean),
      [currentPlan],
   );

   const additionalPlanOptions = useMemo(
      () =>
         getAdditionalPlanValues(currentPlan)
            .map((planValue) => planLookup[planValue])
            .filter(Boolean),
      [currentPlan],
   );

   const activeModalOptions =
      modalMode === "upgrade"
         ? upgradePlanOptions
         : modalMode === "add"
           ? additionalPlanOptions
           : [];
   const requestUsageSource = account?.requestUsage || null;
   const planRequestLimit = parseNullableNumber(
      requestUsageSource?.planLimit ??
         requestUsageSource?.limit ??
         account?.planRequestLimit ??
         requestLimitByPlan[currentPlan],
   );
   const currentRequestCount = parseNullableNumber(
      requestUsageSource?.used ??
         account?.requestUsedCount ??
         account?.currentRequestCount,
   );
   const availableRequestCount = parseNullableNumber(
      requestUsageSource?.remaining ??
         account?.availableRequestCount ??
         (planRequestLimit !== null && currentRequestCount !== null
            ? Math.max(0, planRequestLimit - currentRequestCount)
            : null),
   );
   const requestCycleStartAt =
      requestUsageSource?.cycleStartAt || account?.requestCycleStartAt || null;
   const requestCycleEndAt =
      requestUsageSource?.cycleEndAt || account?.requestCycleEndAt || null;
   const requestUsagePercent =
      parseNullableNumber(requestUsageSource?.percent) ??
      (planRequestLimit !== null &&
      currentRequestCount !== null &&
      planRequestLimit > 0
         ? Math.max(
              0,
              Math.min(100, Math.round((currentRequestCount / planRequestLimit) * 100)),
           )
         : null);
   const requestUsageBlocks =
      requestUsagePercent === null ? 0 : Math.min(5, Math.ceil(requestUsagePercent / 20));
   const requestUsageReady =
      hasPaidPlan &&
      (currentRequestCount !== null ||
         availableRequestCount !== null ||
         requestCycleStartAt ||
         requestCycleEndAt ||
         requestUsageSource);
   const requestUsageStatus =
      requestUsagePercent === null
         ? "pending"
         : availableRequestCount !== null && availableRequestCount <= 0
           ? "exhausted"
           : requestUsagePercent >= 80
             ? "warning"
             : "normal";
   const requestUsageStatusLabel =
      requestUsageStatus === "exhausted"
         ? "요청 수 소진"
         : requestUsageStatus === "warning"
           ? "요청 수 거의 소진"
           : requestUsageStatus === "normal"
             ? "정상 이용 중"
             : "연동 예정";
   const collectionProgressSource = account?.collectionProgress || null;
   const collectionProgressStatus = String(
      collectionProgressSource?.status ||
         account?.collectionStatus ||
         account?.runStatus ||
         "",
   ).toLowerCase();
   const collectionProgressCurrent = parseNullableNumber(
      collectionProgressSource?.current ??
         account?.collectionCurrentCount ??
         account?.runCurrentCount,
   );
   const collectionProgressTotal = parseNullableNumber(
      collectionProgressSource?.total ??
         account?.collectionTotalCount ??
         account?.runTotalCount,
   );
   const collectionProgressPercent =
      parseNullableNumber(
         collectionProgressSource?.percent ??
            account?.collectionProgressPercent ??
            account?.runProgressPercent,
      ) ??
      (collectionProgressCurrent !== null &&
      collectionProgressTotal !== null &&
      collectionProgressTotal > 0
         ? Math.max(
              0,
              Math.min(
                 100,
                 Math.round(
                    (collectionProgressCurrent / collectionProgressTotal) * 100,
                 ),
              ),
           )
         : null);
   const collectionProgressBlocks =
      collectionProgressPercent === null
         ? 0
         : Math.min(5, Math.ceil(collectionProgressPercent / 20));
   const collectionProgressStartedAt =
      collectionProgressSource?.startedAt ||
      account?.collectionStartedAt ||
      account?.runStartedAt ||
      null;
   const collectionProgressUpdatedAt =
      collectionProgressSource?.updatedAt ||
      account?.collectionUpdatedAt ||
      account?.runUpdatedAt ||
      null;
   const collectionProgressMessage =
      collectionProgressSource?.message ||
      account?.collectionMessage ||
      account?.runMessage ||
      "";
   const collectionProgressReady =
      hasPaidPlan &&
      (Boolean(collectionProgressStatus) ||
         collectionProgressCurrent !== null ||
         collectionProgressTotal !== null ||
         collectionProgressPercent !== null ||
         collectionProgressStartedAt ||
         collectionProgressUpdatedAt ||
         collectionProgressMessage);
   const collectionProgressIsRunning = [
      "running",
      "in_progress",
      "progress",
      "processing",
      "queued",
      "pending",
      "requested",
   ].includes(collectionProgressStatus);
   const collectionProgressTone =
      collectionProgressStatus === "error"
         ? "error"
         : collectionProgressStatus === "completed" ||
             collectionProgressStatus === "done" ||
             collectionProgressStatus === "success"
           ? "success"
         : collectionProgressStatus === "pending" ||
            collectionProgressStatus === "failed" ||
             collectionProgressStatus === "requested"
           ? "pending"
         : collectionProgressStatus === "not_requested"
           ? "not_requested"
         : collectionProgressIsRunning
           ? "running"
           : "idle";

   useEffect(() => {
      if (!collectionProgressIsRunning || !session?.customId || session.role === "admin") {
         return;
      }

      const timer = window.setInterval(() => {
         void handleRefreshProfile();
      }, 10000);

      return () => {
         window.clearInterval(timer);
      };
   }, [
      collectionProgressIsRunning,
      handleRefreshProfile,
      session?.customId,
      session?.role,
   ]);
   const collectionProgressStatusLabel =
      collectionProgressTone === "error"
         ? "수집 실패"
         : collectionProgressTone === "success"
           ? "수집 완료"
           : collectionProgressTone === "pending"
             ? "요청 대기 중"
           : collectionProgressTone === "not_requested"
             ? "요청 안함"
           : collectionProgressTone === "running"
             ? "수집 진행 중"
             : "대기 중";
   const collectionProgressSummary =
      collectionProgressTone === "not_requested"
         ? "아직 수집 요청이 없습니다."
         : collectionProgressTone === "pending"
           ? "수집 예약이 접수되어 대기 중입니다."
           : collectionProgressTone === "running"
             ? "현재 요청된 예약을 순차적으로 처리하고 있습니다."
             : collectionProgressTone === "success"
               ? "최근 수집 요청이 완료되었습니다."
               : collectionProgressTone === "error"
                 ? "최근 수집 요청 중 오류가 있었습니다."
                 : "현재 상태를 확인하고 있습니다.";

   const passwordGuide = useMemo(() => {
      if (!passwordForm.newPassword) {
         return "";
      }

      return validatePassword(passwordForm.newPassword)
         ? "사용 가능한 비밀번호 형식입니다."
         : "영문, 숫자, 특수문자를 포함한 8자리 이상으로 입력해주세요.";
   }, [passwordForm.newPassword]);

   const availableCoreOptions = currentSiteConfig.coreOptions.filter(
      (site) => !draftCoreSites.includes(site),
   );
   const availableHighEndOptions = highEndSites.filter(
      (site) => !draftHighEndSites.includes(site),
   );
   const canAddCore =
      currentPlan !== "none" &&
      currentPlan !== "enterprise" &&
      draftCoreSites.length < currentSiteConfig.coreLimit;
   const canAddHighEnd =
      currentSiteConfig.highEndEnabled &&
      draftHighEndSites.length < currentSiteConfig.highEndLimit;
   const draftSites = [...draftCoreSites, ...draftHighEndSites];
   const hasSelectedSites =
      currentPlan === "enterprise" ? true : currentSites.length > 0;
   const approvalComplete = Boolean(account?.isApproved);
   const normalizedSetupStatus = String(account?.setupStatus || "").toLowerCase();
   const serviceReady =
      Boolean(account?.serviceAvailable) ||
      ["completed", "done", "active", "available"].includes(
         normalizedSetupStatus,
      ) ||
      Boolean(account?.setupCompletedAt);
   const setupInProgress =
      Boolean(account?.setupInProgress) ||
      normalizedSetupStatus === "in_progress" ||
      normalizedSetupStatus === "progress" ||
      normalizedSetupStatus === "setting" ||
      normalizedSetupStatus === "setup" ||
      (approvalComplete && hasPaidPlan && hasSelectedSites);
   const setupStepStatus = serviceReady
      ? "complete"
      : setupInProgress
        ? "current"
        : "pending";
   const onboardingSteps = [
      { key: "signup", label: "회원가입 완료", status: "complete" },
      {
         key: "payment",
         label: "플랜 결제 완료",
         status: hasPaidPlan ? "complete" : "pending",
      },
      {
         key: "sites",
         label: "사이트 선택 완료",
         status: hasSelectedSites ? "complete" : "pending",
      },
      {
         key: "approval",
         label: "관리자 승인 완료",
         status: approvalComplete ? "complete" : "pending",
      },
      { key: "setup", label: "세팅 진행", status: setupStepStatus },
      {
         key: "active",
         label: "사용 가능",
         status: serviceReady ? "complete" : "pending",
      },
   ];
   const completedStepCount = onboardingSteps.filter(
      (step) => step.status === "complete",
   ).length;

   const handlePasswordFieldChange = (field, value) => {
      setPasswordForm((current) => ({
         ...current,
         [field]: value,
      }));
      setPasswordMessage({
         tone: "neutral",
         text: "",
      });
   };

   const handlePasswordSubmit = async (event) => {
      event.preventDefault();
      setPasswordMessage({
         tone: "neutral",
         text: "",
      });
      setIsSubmittingPassword(true);

      try {
         const result = await changePassword({
            loginId: account.loginId,
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword,
            newPasswordConfirm: passwordForm.newPasswordConfirm,
         });

         if (result.success === false) {
            throw new Error(result.message || "비밀번호 변경에 실패했습니다.");
         }

         setPasswordForm(emptyPasswordForm);
         setPasswordMessage({
            tone: "success",
            text:
               result.message ||
               "비밀번호가 변경되었습니다. 다음 로그인부터 새 비밀번호를 사용해주세요.",
         });
      } catch (error) {
         setPasswordMessage({
            tone: "error",
            text:
               error.message ||
               "비밀번호 변경 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
         });
      } finally {
         setIsSubmittingPassword(false);
      }
   };

   const handleExtendClick = () => {
      setPlanNotice(
         "연장 결제 기능은 준비 중입니다. 현재는 문의를 통해 연장 안내를 도와드리고 있습니다.",
      );
   };

   const handleAddCoreSite = () => {
      if (!coreSelection) {
         setSiteMessage({
            tone: "error",
            text: "핵심 소싱 사이트를 먼저 선택해주세요.",
         });
         return;
      }

      setDraftCoreSites((current) => [...current, coreSelection]);
      setCoreSelection("");
      setSiteMessage({
         tone: "neutral",
         text: "",
      });
   };

   const handleAddHighEndSite = () => {
      if (!highEndSelection) {
         setSiteMessage({
            tone: "error",
            text: "하이엔드 사이트를 먼저 선택해주세요.",
         });
         return;
      }

      setDraftHighEndSites((current) => [...current, highEndSelection]);
      setHighEndSelection("");
      setSiteMessage({
         tone: "neutral",
         text: "",
      });
   };

   const handleSaveSites = async () => {
      setIsSavingSites(true);

      try {
         const result = await saveUserSites({
            customId: account.customId,
            sites: draftSites,
         });

         const savedUser = result.user || {};
         const savedSites = Array.isArray(savedUser.sites) ? savedUser.sites : draftSites;

         setProfile((current) => ({
            ...(current || {}),
            ...savedUser,
            sites: savedSites,
         }));
         updateSessionData({
            sites: savedSites,
            plan: savedUser.plan || account.plan,
            subscriptionStartAt:
               savedUser.subscriptionStartAt || account.subscriptionStartAt || null,
            subscriptionEndAt:
               savedUser.subscriptionEndAt || account.subscriptionEndAt || null,
         });
         setDraftCoreSites([]);
         setDraftHighEndSites([]);
         setSiteMessage({
            tone: "success",
            text:
               result.message ||
               "사이트 선택이 저장되었습니다. 이후 변경은 관리자 문의를 통해 진행할 수 있습니다.",
         });
         setSiteConfirmOpen(false);
      } catch (error) {
         setSiteMessage({
            tone: "error",
            text:
               error.message ||
               "사이트 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
         });
      } finally {
         setIsSavingSites(false);
      }
   };

   const openSiteConfirm = () => {
      if (draftSites.length === 0) {
         setSiteMessage({
            tone: "error",
            text: "저장할 사이트를 먼저 선택해주세요.",
         });
         return;
      }

      setSiteConfirmOpen(true);
   };

   if (isCheckingSession) {
      return (
         <div className="rounded-lg border border-zinc-200 bg-white p-8 text-sm text-zinc-600 shadow-sm">
            마이페이지 정보를 불러오는 중입니다...
         </div>
      );
   }

   if (!account) {
      return null;
   }

   return (
      <>
         <div className="space-y-8">
            <div className="max-w-3xl">
               <span className="inline-flex rounded-md border border-amber-200 bg-[#fbf7ef] px-2.5 py-1.5 text-xs font-semibold text-amber-900 shadow-sm">
                  My Page
               </span>
               <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
                  내 계정과 플랜을 한 번에 관리하세요
               </h1>
               <p className="mt-5 text-lg leading-8 text-zinc-600">
                  회원가입 시 입력한 정보와 현재 플랜 상태를 확인하고, 사이트 확정과 비밀번호
                  변경도 바로 진행할 수 있습니다.
               </p>
               <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                     href="/flowmerce-studio"
                     className="inline-flex items-center justify-center rounded-lg border border-zinc-950 bg-zinc-950 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#8c6333]"
                  >
                     플로우머스 대시보드
                  </Link>
                  <p className="text-sm text-zinc-500">
                     호스팅, 매핑, 마진, 치환, 수집 예약을 한 화면에서 이어서 작업할 수 있어요.
                  </p>
               </div>
            </div>

            <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">
               <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                     <p className="text-sm font-semibold text-amber-900">
                        STEP GUIDE
                     </p>
                     <h2 className="mt-2 text-2xl font-semibold text-zinc-950">
                        이용 진행 단계
                     </h2>
                     <p className="mt-2 text-sm leading-6 text-zinc-600">
                        회원가입부터 세팅 완료까지 현재 진행 단계를 한눈에 확인할 수
                        있습니다.
                     </p>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-[#fbf7ef] px-3 py-1.5 text-sm font-semibold text-amber-900">
                     {completedStepCount}/6 완료
                  </span>
               </div>

               <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {onboardingSteps.map((step, index) => (
                     <div
                        key={step.key}
                        className={clsx(
                           "rounded-lg border p-4 transition",
                           step.status === "complete"
                              ? "border-amber-200 bg-[#fbf7ef]"
                              : step.status === "current"
                                ? "border-amber-200 bg-amber-50"
                                : "border-zinc-200 bg-zinc-50",
                        )}
                     >
                        <div className="flex items-start justify-between gap-3">
                           <span
                              className={clsx(
                                 "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                                 step.status === "complete"
                                    ? "bg-white text-amber-900 ring-1 ring-amber-200"
                                    : step.status === "current"
                                      ? "bg-white text-amber-700 ring-1 ring-amber-200"
                                      : "bg-white text-zinc-500 ring-1 ring-zinc-200",
                              )}
                           >
                              STEP {index + 1}
                           </span>
                           <span
                              className={clsx(
                                 "inline-flex items-center gap-1 text-xs font-semibold",
                                 step.status === "complete"
                                    ? "text-amber-900"
                                    : step.status === "current"
                                      ? "text-amber-700"
                                      : "text-zinc-500",
                              )}
                           >
                              {step.status === "complete" && (
                                 <CheckIcon className="h-4 w-4 text-amber-900" />
                              )}
                              {step.status === "complete"
                                 ? "완료"
                                 : step.status === "current"
                                   ? "진행중"
                                   : "대기중"}
                           </span>
                        </div>
                        <p className="mt-4 text-base font-semibold text-zinc-950">
                           {step.label}
                        </p>
                        {step.key === "sites" && step.status !== "complete" && (
                           <div className="mt-3 rounded-lg border border-zinc-200 bg-white/80 px-3 py-2 text-xs leading-5 text-zinc-600">
                              사이트 선택은 이 페이지 하단의{" "}
                              <a
                                 href="#site-settings"
                                 className="font-semibold text-amber-900 underline underline-offset-2"
                              >
                                 플랜별 사이트 설정
                              </a>
                              에서 진행할 수 있습니다.
                           </div>
                        )}
                     </div>
                  ))}
               </div>

               <p className="mt-4 text-sm leading-6 text-zinc-500">
                  플랜 결제와 사이트 선택이 완료되면 관리자 승인 및 세팅 진행 상태가
                  순차적으로 갱신됩니다.
               </p>
            </section>

            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
               <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">
                  <div>
                     <h2 className="text-2xl font-semibold text-zinc-950">내 정보</h2>
                     <p className="mt-2 text-sm leading-6 text-zinc-600">
                        회원가입 시 등록한 기본 정보를 확인할 수 있습니다.
                     </p>
                  </div>

                  <dl className="mt-6">
                     <DetailRow label="이름" value={account.name || "미입력"} />
                     <DetailRow label="아이디" value={account.loginId || "미입력"} />
                     <DetailRow label="닉네임" value={account.customId || "미입력"} />
                     <DetailRow
                        label="이메일"
                        value={account.email || "선택 입력 안 함"}
                     />
                  </dl>

                  <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-5">
                     <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                           <p className="text-sm font-semibold text-zinc-950">
                              연동된 쇼핑몰 계정
                           </p>
                           <p className="mt-2 text-sm leading-6 text-zinc-600">
                              연동한 전체 호스팅 계정 목록
                           </p>
                        </div>
                        <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-600">
                           총 {linkedAccountPlatforms.length}개
                        </span>
                     </div>

                     {linkedAccountPlatforms.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                           {linkedAccountPlatforms.map((accountPlatform) => (
                              <SiteBadge key={accountPlatform} label={accountPlatform} />
                           ))}
                        </div>
                     ) : (
                        <div className="mt-4 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
                           {isLoadingProfile
                              ? "연동된 쇼핑몰 계정을 확인하는 중입니다..."
                              : "아직 연동된 accountPlatform 계정이 없습니다."}
                        </div>
                     )}
                  </div>
               </section>

               <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                     <div className="flex flex-wrap items-center gap-3">
                     <h2 className="text-2xl font-semibold text-zinc-950">현재 플랜</h2>
                     <span
                        className={clsx(
                           currentPlanMeta.badgeClass,
                           "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                        )}
                     >
                        {currentPlanMeta.label}
                     </span>
                     </div>
                     {session?.customId && session.role !== "admin" && (
                        <button
                           type="button"
                           onClick={handleRefreshProfile}
                           disabled={isLoadingProfile}
                           className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                           {isLoadingProfile ? "확인 중.." : "새로고침"}
                        </button>
                     )}
                  </div>

                  <p className="mt-3 text-sm leading-7 text-zinc-600">
                     {currentPlanMeta.description}
                  </p>

                  {currentPlan !== "none" &&
                     (account.subscriptionStartAt || account.subscriptionEndAt) && (
                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                           <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                                 시작일
                              </p>
                              <p className="mt-2 text-sm font-medium text-zinc-950">
                                 {formatDate(account.subscriptionStartAt)}
                              </p>
                           </div>
                           <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                                 종료일
                              </p>
                              <p className="mt-2 text-sm font-medium text-zinc-950">
                                 {formatDate(account.subscriptionEndAt)}
                              </p>
                           </div>
                        </div>
                     )}

                  {currentPlan !== "none" && (
                     <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                           <div>
                              <p className="text-sm font-semibold text-zinc-950">
                                 이번 회차 요청수
                              </p>
                              <p className="mt-2 text-sm leading-6 text-zinc-600">
                                 상품 등록, 수정, 삭제는 모두 요청수 1회로 집계됩니다.
                              </p>
                           </div>
                           <span
                              className={clsx(
                                 "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
                                 requestUsageStatus === "exhausted"
                                    ? "border-red-200 bg-red-50 text-red-700"
                                    : requestUsageStatus === "warning"
                                      ? "border-amber-200 bg-amber-50 text-amber-700"
                                      : requestUsageStatus === "normal"
                                        ? "border-amber-200 bg-[#fbf7ef] text-amber-900"
                                        : "border-zinc-200 bg-white text-zinc-600",
                              )}
                           >
                              {requestUsageStatusLabel}
                           </span>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                           <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                                 플랜 요청수
                              </p>
                              <p className="mt-2 text-sm font-medium text-zinc-950">
                                 {formatNumber(planRequestLimit)}
                              </p>
                           </div>
                           <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                                 현재 요청수
                              </p>
                              <p className="mt-2 text-sm font-medium text-zinc-950">
                                 {formatNumber(currentRequestCount)}
                              </p>
                           </div>
                           <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                                 가능 요청수
                              </p>
                              <p className="mt-2 text-sm font-medium text-zinc-950">
                                 {formatNumber(availableRequestCount)}
                              </p>
                           </div>
                        </div>

                        <div className="mt-5">
                           <div className="flex items-center justify-between gap-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                                 사용량 진행도
                              </p>
                              <p className="text-sm font-semibold text-zinc-700">
                                 {requestUsagePercent === null
                                    ? "미정"
                                    : `${requestUsagePercent}%`}
                              </p>
                           </div>
                           <div className="mt-3 grid grid-cols-5 gap-2">
                              {Array.from({ length: 5 }).map((_, index) => (
                                 <span
                                    key={`request-usage-${index}`}
                                    className={clsx(
                                       "h-3 rounded-full border",
                                       index < requestUsageBlocks
                                          ? requestUsageStatus === "exhausted"
                                             ? "border-red-600 bg-red-500"
                                             : requestUsageStatus === "warning"
                                               ? "border-amber-500 bg-amber-400"
                                               : "border-[#8c6333] bg-[#8c6333]"
                                          : "border-zinc-200 bg-white",
                                    )}
                                 />
                              ))}
                           </div>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                           <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                                 집계 시작일
                              </p>
                              <p className="mt-2 text-sm font-medium text-zinc-950">
                                 {formatDate(requestCycleStartAt)}
                              </p>
                           </div>
                           <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                                 집계 종료일
                              </p>
                              <p className="mt-2 text-sm font-medium text-zinc-950">
                                 {formatDate(requestCycleEndAt)}
                              </p>
                           </div>
                        </div>

                        {!requestUsageReady && (
                           <div className="mt-5 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
                              요청수와 집계 기간 정보는 백엔드 연동 후 자동으로 채워집니다.
                           </div>
                        )}
                     </div>
                  )}

                  <div className="mt-6 flex flex-wrap gap-3">
                     {currentPlan === "none" ? (
                        <Link
                           href="/pricing"
                           className="inline-flex items-center justify-center rounded-lg border border-zinc-950 bg-zinc-950 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#8c6333]"
                        >
                           플랜 구독하기
                        </Link>
                     ) : (
                        <>
                           <button
                              type="button"
                              onClick={handleExtendClick}
                              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
                           >
                              연장
                           </button>

                           {upgradePlanOptions.length > 0 && (
                              <button
                                 type="button"
                                 onClick={() => setModalMode("upgrade")}
                                 className="inline-flex items-center justify-center rounded-lg border border-zinc-950 bg-zinc-950 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#8c6333]"
                              >
                                 업그레이드
                              </button>
                           )}

                           {additionalPlanOptions.length > 0 && (
                              <button
                                 type="button"
                                 onClick={() => setModalMode("add")}
                                 className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
                           >
                              플랜 추가하기
                           </button>
                          )}

                           <a
                              href={kakaoChatUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
                           >
                              요청 수 추가 문의
                           </a>
                        </>
                     )}
                  </div>

                  {planNotice && (
                     <p className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                        {planNotice}
                     </p>
                  )}
               </section>
            </div>

            <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">
               <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                     <p className="text-sm font-semibold text-amber-900">
                        RUN STATUS
                     </p>
                     <h2 className="mt-2 text-2xl font-semibold text-zinc-950">
                        자동 수집 진행 상황
                     </h2>
                     <p className="mt-2 text-sm leading-6 text-zinc-600">
                        사이트 또는 관리자 페이지에서 수집 요청이 실행되면 현재 회차 기준 진행률을 여기서 바로 확인할 수 있습니다.
                     </p>
                  </div>
                  <span
                     className={clsx(
                        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
                        collectionProgressTone === "error"
                           ? "border-red-200 bg-red-50 text-red-700"
                           : collectionProgressTone === "success"
                             ? "border-amber-200 bg-[#fbf7ef] text-amber-900"
                            : collectionProgressTone === "pending"
                              ? "border-sky-200 bg-sky-50 text-sky-700"
                            : collectionProgressTone === "running"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-zinc-200 bg-zinc-50 text-zinc-600",
                     )}
                  >
                     {collectionProgressStatusLabel}
                  </span>
               </div>

               {collectionProgressReady ? (
                  <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-5">
                     <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
                           <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                              현재 진행률
                           </p>
                           <p className="mt-2 text-sm font-medium text-zinc-950">
                              {collectionProgressPercent === null
                                 ? "미정"
                                 : `${collectionProgressPercent}%`}
                           </p>
                        </div>
                        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
                           <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                              처리 회차
                           </p>
                           <p className="mt-2 text-sm font-medium text-zinc-950">
                              {collectionProgressCurrent !== null &&
                              collectionProgressTotal !== null
                                 ? `${collectionProgressCurrent} / ${collectionProgressTotal}`
                                 : "미정"}
                           </p>
                        </div>
                        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
                           <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                              최근 갱신 시각
                           </p>
                           <p className="mt-2 text-sm font-medium text-zinc-950">
                              {formatDateTime(collectionProgressUpdatedAt)}
                           </p>
                        </div>
                     </div>

                     <div className="mt-5">
                        <div className="flex items-center justify-between gap-4">
                           <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                              진행 바
                           </p>
                           <p className="text-sm font-semibold text-zinc-700">
                              {collectionProgressSummary}
                           </p>
                        </div>
                        <div className="mt-3 grid grid-cols-5 gap-2">
                           {Array.from({ length: 5 }).map((_, index) => (
                              <span
                                 key={`collection-progress-${index}`}
                                 className={clsx(
                                    "h-3 rounded-full border",
                                    index < collectionProgressBlocks
                                       ? collectionProgressTone === "error"
                                          ? "border-red-600 bg-red-500"
                                          : collectionProgressTone === "success"
                                            ? "border-[#8c6333] bg-[#8c6333]"
                                            : collectionProgressTone === "pending"
                                              ? "border-sky-500 bg-sky-400"
                                            : "border-amber-500 bg-amber-400"
                                       : "border-zinc-200 bg-white",
                                 )}
                              />
                           ))}
                        </div>
                     </div>

                     {(collectionProgressMessage || collectionProgressStartedAt) && (
                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                           <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                                 수집 시작 시각
                              </p>
                              <p className="mt-2 text-sm font-medium text-zinc-950">
                                 {formatDateTime(collectionProgressStartedAt)}
                              </p>
                           </div>
                           <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                                 진행 메모
                              </p>
                              <p className="mt-2 text-sm font-medium text-zinc-950">
                                 {collectionProgressMessage ||
                                    (collectionProgressTone === "not_requested"
                                       ? "아직 수집 요청을 하지 않았습니다."
                                       : collectionProgressTone === "pending"
                                         ? "수집 예약 접수 후 대기 중입니다."
                                         : "진행 중")}
                              </p>
                           </div>
                        </div>
                     )}
                  </div>
               ) : (
                  <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm text-zinc-600">
                     아직 수집 요청을 하지 않았습니다. 수집 예약이 들어오면 이 영역에서 대기 중, 진행 중, 완료 상태를 자동으로 확인할 수 있습니다.
                  </div>
               )}
            </section>

            <section
               id="site-settings"
               className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm sm:p-7"
            >
               <div className="max-w-3xl">
                  <p className="text-sm font-semibold text-amber-900">
                     SETUP GUIDE
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-zinc-950">
                     세팅 준비 안내
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                     플랜 결제와 사이트 선택이 끝나면 연동할 쇼핑몰 계정을 플로우머스로 전달해주셔야 세팅이 이어집니다.
                  </p>
               </div>

               <div className="mt-6 grid gap-4 lg:grid-cols-3">
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5">
                     <p className="text-sm font-semibold text-zinc-950">
                        1. 쇼핑몰 관리자 정보 전달
                     </p>
                     <p className="mt-2 text-sm leading-6 text-zinc-600">
                        카카오톡으로 쇼핑몰 관리자 URL, 로그인 아이디, 비밀번호를 보내주시면 됩니다.
                     </p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5">
                     <p className="text-sm font-semibold text-zinc-950">
                        2. 개발자센터 API 키를 모르셔도 괜찮습니다.
                     </p>
                     <p className="mt-2 text-sm leading-6 text-zinc-600">
                        대부분 직접 찾기 어려우시니, 로그인 가능한 정보만 전달해주시면 필요한 키 확인 방법까지 안내드립니다.
                     </p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5">
                     <p className="text-sm font-semibold text-zinc-950">
                        3. 계정이 여러 개면 같이 알려주세요
                     </p>
                     <p className="mt-2 text-sm leading-6 text-zinc-600">
                        고도몰이나 스마트스토어 등 호스팅을 여러개 연동하실 경우 함께 전달해주시면 세팅이 빨라집니다.
                     </p>
                  </div>
               </div>

               <div className="mt-6 flex flex-wrap gap-3">
                  <a
                     href={kakaoChatUrl}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="inline-flex items-center justify-center rounded-lg border border-zinc-950 bg-zinc-950 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#8c6333]"
                  >
                     카카오톡으로 계정 전달하기
                  </a>
                  <Link
                     href="/inquiry?type=사이트 문의"
                     className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
                  >
                     문의로 먼저 남기기
                  </Link>
               </div>

               <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm leading-7 text-red-800">
                  1개월만 결제해서 상품만 등록한 뒤 상품 업로드를 유지하시는 방식은 불가능합니다. 구독이 종료되면 플로우머스가 관리하던 상품은 쇼핑몰과 데이터 저장소에서 전체 삭제가 원칙이오니, 종료 전에는 반드시 전환 방식이나 정리 일정을 먼저 상담해주세요.
               </div>
            </section>

            <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">
               <div className="max-w-3xl">
                  <h2 className="text-2xl font-semibold text-zinc-950">
                     플랜별 사이트 설정
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                     플랜에 맞는 사이트를 직접 선택하고 저장할 수 있습니다. 저장 후에는 직접
                     변경할 수 없고, 변경이 필요하면 관리자 문의를 통해서만 조정할 수 있습니다.
                  </p>
               </div>

               {isLoadingProfile && (
                  <p className="mt-4 text-sm text-zinc-500">
                     최신 플랜과 요청수 정보를 불러오는 중입니다...
                  </p>
               )}

               {currentPlan === "none" && (
                  <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm text-zinc-600">
                     현재는 구독 중인 플랜이 없어 사이트 설정을 진행할 수 없습니다. 먼저 플랜
                     구독 후 마이페이지에서 사이트를 확정해주세요.
                  </div>
               )}

               {currentPlan === "enterprise" && (
                  <div className="mt-6 rounded-lg border border-amber-200 bg-[#fbf7ef] px-5 py-4 text-sm text-amber-900">
                     Enterprise 플랜은 모든 사이트가 적용됩니다. 별도의 선택 없이 운영 범위가
                     전체로 처리됩니다.
                  </div>
               )}

               {currentPlan !== "none" && currentPlan !== "enterprise" && (
                  <div className="mt-6 space-y-6">
                     {siteSelectionLocked ? (
                        <div className="space-y-5 rounded-lg border border-zinc-200 bg-zinc-50 p-5">
                           <div>
                              <p className="text-sm font-semibold text-zinc-950">
                                 현재 확정된 사이트
                              </p>
                              <p className="mt-2 text-sm leading-6 text-zinc-600">
                                 사이트가 이미 확정되었습니다. 변경이 필요하면 관리자에게
                                 문의해주세요.
                              </p>
                           </div>

                           {existingSiteGroups.core.length > 0 && (
                              <div>
                                 <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                                    핵심 소싱 사이트
                                 </p>
                                 <div className="mt-3 flex flex-wrap gap-2">
                                    {existingSiteGroups.core.map((site) => (
                                       <SiteBadge key={site} label={site} />
                                    ))}
                                 </div>
                              </div>
                           )}

                           {existingSiteGroups.highEnd.length > 0 && (
                              <div>
                                 <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                                    하이엔드 사이트
                                 </p>
                                 <div className="mt-3 flex flex-wrap gap-2">
                                    {existingSiteGroups.highEnd.map((site) => (
                                       <SiteBadge key={site} label={site} />
                                    ))}
                                 </div>
                              </div>
                           )}
                        </div>
                     ) : (
                        <>
                           <div className="grid gap-6 lg:grid-cols-2">
                              <div className="rounded-lg border border-zinc-200 p-5">
                                 <div className="flex items-center justify-between gap-3">
                                    <div>
                                       <h3 className="text-lg font-semibold text-zinc-950">
                                          핵심 소싱 사이트
                                       </h3>
                                       <p className="mt-1 text-sm text-zinc-600">
                                          최대 {currentSiteConfig.coreLimit}개까지 선택할 수
                                          있습니다.
                                       </p>
                                    </div>
                                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600">
                                       {draftCoreSites.length}/{currentSiteConfig.coreLimit}
                                    </span>
                                 </div>

                                 <div className="mt-4 flex gap-2">
                                    <select
                                       value={coreSelection}
                                       onChange={(event) =>
                                          setCoreSelection(event.target.value)
                                       }
                                       disabled={!canAddCore}
                                       className="block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm focus:border-[#8c6333] focus:outline-none"
                                    >
                                       <option value="">사이트를 선택해주세요</option>
                                       {availableCoreOptions.map((site) => (
                                          <option key={site} value={site}>
                                             {site}
                                          </option>
                                       ))}
                                    </select>
                                    <button
                                       type="button"
                                       onClick={handleAddCoreSite}
                                       disabled={!canAddCore}
                                       className="inline-flex shrink-0 items-center justify-center rounded-lg border border-zinc-950 bg-zinc-950 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#8c6333] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                       선택
                                    </button>
                                 </div>

                                 <div className="mt-4 flex min-h-[52px] flex-wrap gap-2">
                                    {draftCoreSites.length > 0 ? (
                                       draftCoreSites.map((site) => (
                                          <SiteBadge
                                             key={site}
                                             label={site}
                                             removable
                                             onRemove={() =>
                                                setDraftCoreSites((current) =>
                                                   current.filter((item) => item !== site),
                                                )
                                             }
                                          />
                                       ))
                                    ) : (
                                       <p className="text-sm text-zinc-500">
                                          아직 선택한 사이트가 없습니다.
                                       </p>
                                    )}
                                 </div>
                              </div>

                              <div className="rounded-lg border border-zinc-200 p-5">
                                 <div className="flex items-center justify-between gap-3">
                                    <div>
                                       <h3 className="text-lg font-semibold text-zinc-950">
                                          하이엔드 사이트
                                       </h3>
                                       <p className="mt-1 text-sm text-zinc-600">
                                          {currentSiteConfig.highEndEnabled
                                             ? `최대 ${currentSiteConfig.highEndLimit}개까지 선택할 수 있습니다.`
                                             : "현재 플랜에서는 하이엔드 사이트를 선택할 수 없습니다."}
                                       </p>
                                    </div>
                                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600">
                                       {draftHighEndSites.length}/{currentSiteConfig.highEndLimit}
                                    </span>
                                 </div>

                                 <div className="mt-4 flex gap-2">
                                    <select
                                       value={highEndSelection}
                                       onChange={(event) =>
                                          setHighEndSelection(event.target.value)
                                       }
                                       disabled={!canAddHighEnd}
                                       className="block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm focus:border-[#8c6333] focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-400"
                                    >
                                       <option value="">사이트를 선택해주세요</option>
                                       {availableHighEndOptions.map((site) => (
                                          <option key={site} value={site}>
                                             {site}
                                          </option>
                                       ))}
                                    </select>
                                    <button
                                       type="button"
                                       onClick={handleAddHighEndSite}
                                       disabled={!canAddHighEnd}
                                       className="inline-flex shrink-0 items-center justify-center rounded-lg border border-zinc-950 bg-zinc-950 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#8c6333] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                       선택
                                    </button>
                                 </div>

                                 <div className="mt-4 flex min-h-[52px] flex-wrap gap-2">
                                    {draftHighEndSites.length > 0 ? (
                                       draftHighEndSites.map((site) => (
                                          <SiteBadge
                                             key={site}
                                             label={site}
                                             removable
                                             onRemove={() =>
                                                setDraftHighEndSites((current) =>
                                                   current.filter((item) => item !== site),
                                                )
                                             }
                                          />
                                       ))
                                    ) : (
                                       <p className="text-sm text-zinc-500">
                                          아직 선택한 사이트가 없습니다.
                                       </p>
                                    )}
                                 </div>
                              </div>
                           </div>

                           <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                 <div>
                                    <p className="text-sm font-semibold text-zinc-950">
                                       선택한 사이트 목록
                                    </p>
                                    <p className="mt-1 text-sm text-zinc-600">
                                       목록을 확인한 뒤 저장을 누르면 사이트가 최종 확정됩니다.
                                    </p>
                                 </div>
                                 <button
                                    type="button"
                                    onClick={openSiteConfirm}
                                    className="inline-flex items-center justify-center rounded-lg border border-zinc-950 bg-zinc-950 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#8c6333]"
                                 >
                                    저장
                                 </button>
                              </div>

                              <div className="mt-4 flex min-h-[52px] flex-wrap gap-2">
                                 {draftSites.length > 0 ? (
                                    draftSites.map((site) => (
                                       <SiteBadge key={site} label={site} />
                                    ))
                                 ) : (
                                    <p className="text-sm text-zinc-500">
                                       저장할 사이트를 먼저 선택해주세요.
                                    </p>
                                 )}
                              </div>
                           </div>
                        </>
                     )}

                     {siteMessage.text && (
                        <p
                           className={clsx(
                              "rounded-lg border px-4 py-3 text-sm font-medium",
                              siteMessage.tone === "success"
                                 ? "border-amber-200 bg-[#fbf7ef] text-amber-900"
                                 : "border-red-200 bg-red-50 text-red-700",
                           )}
                        >
                           {siteMessage.text}
                        </p>
                     )}
                  </div>
               )}
            </section>

            <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">
               <div className="max-w-2xl">
                  <h2 className="text-2xl font-semibold text-zinc-950">
                     비밀번호 변경
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                     현재 사용 중인 비밀번호를 확인한 뒤 새 비밀번호로 변경합니다.
                     관리자에게 임시 비밀번호를 받은 경우에도 기존 비밀번호 칸에 그대로 입력하면
                     됩니다.
                  </p>
               </div>

               <form
                  onSubmit={handlePasswordSubmit}
                  className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]"
               >
                  <label className="block">
                     <span className="text-sm font-medium text-zinc-600">
                        기존 비밀번호
                     </span>
                     <input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(event) =>
                           handlePasswordFieldChange(
                              "currentPassword",
                              event.target.value,
                           )
                        }
                        className="mt-1.5 block w-full rounded-lg border-0 bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-[#8c6333]"
                        placeholder="현재 비밀번호를 입력해주세요"
                        required
                     />
                  </label>

                  <label className="block">
                     <span className="text-sm font-medium text-zinc-600">
                        새 비밀번호
                     </span>
                     <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(event) =>
                           handlePasswordFieldChange("newPassword", event.target.value)
                        }
                        className="mt-1.5 block w-full rounded-lg border-0 bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-[#8c6333]"
                        placeholder="새 비밀번호를 입력해주세요"
                        required
                     />
                     {passwordGuide && (
                        <p
                           className={clsx(
                              "mt-2 text-xs font-medium",
                              validatePassword(passwordForm.newPassword)
                                 ? "text-amber-900"
                                 : "text-red-700",
                           )}
                        >
                           {passwordGuide}
                        </p>
                     )}
                  </label>

                  <label className="block lg:col-span-2">
                     <span className="text-sm font-medium text-zinc-600">
                        새 비밀번호 확인
                     </span>
                     <input
                        type="password"
                        value={passwordForm.newPasswordConfirm}
                        onChange={(event) =>
                           handlePasswordFieldChange(
                              "newPasswordConfirm",
                              event.target.value,
                           )
                        }
                        className="mt-1.5 block w-full rounded-lg border-0 bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-[#8c6333]"
                        placeholder="새 비밀번호를 한 번 더 입력해주세요"
                        required
                     />
                  </label>

                  {passwordMessage.text && (
                     <p
                        className={clsx(
                           "rounded-lg border px-4 py-3 text-sm font-medium lg:col-span-2",
                           passwordMessage.tone === "success"
                              ? "border-amber-200 bg-[#fbf7ef] text-amber-900"
                              : "border-red-200 bg-red-50 text-red-700",
                        )}
                     >
                        {passwordMessage.text}
                     </p>
                  )}

                  <div className="lg:col-span-2">
                     <button
                        type="submit"
                        disabled={isSubmittingPassword}
                        className="inline-flex items-center justify-center rounded-lg border border-zinc-950 bg-zinc-950 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#8c6333] disabled:cursor-not-allowed disabled:opacity-70"
                     >
                        {isSubmittingPassword ? "변경 중..." : "비밀번호 수정"}
                     </button>
                  </div>
               </form>
            </section>

            <section className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm sm:p-7">
               <div className="max-w-2xl">
                  <h2 className="text-2xl font-semibold text-zinc-950">
                     회원 탈퇴 문의
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-700">
                     회원 탈퇴는 문의 페이지의 <strong>계정 문의</strong>로 접수해주세요.
                     로그인 아이디와 닉네임, 연락처, 탈퇴 희망 내용을 남겨주시면
                     본인 확인 후 순차적으로 안내해드립니다.
                  </p>
                  <p className="mt-3 text-sm leading-6 text-red-700">
                     비밀번호는 문의글에 적지 말아주세요. 문의 내용은 접수 기록으로
                     보관되므로, 비밀번호 확인은 별도 본인 확인 절차로 진행합니다.
                  </p>
               </div>

               <div className="mt-6">
                  <Link
                     href={{
                        pathname: "/inquiry",
                        query: {
                           type: "계정 문의",
                           template: "withdrawal",
                        },
                     }}
                     className="inline-flex items-center justify-center rounded-lg border border-red-700 bg-red-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-red-700"
                  >
                     탈퇴 문의하러 가기
                  </Link>
               </div>
            </section>
         </div>

         <PlanModal
            mode={modalMode}
            options={activeModalOptions}
            onClose={() => setModalMode(null)}
         />

         <SiteConfirmModal
            open={siteConfirmOpen}
            onConfirm={handleSaveSites}
            onCancel={() => setSiteConfirmOpen(false)}
            loading={isSavingSites}
         />
      </>
   );
}
