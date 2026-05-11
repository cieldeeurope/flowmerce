"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchUserProfile, getSession, updateSessionData } from "@/lib/auth";
import { coreSourcingSites, highEndSites } from "@/lib/pricingData";
import {
   createWorkspaceSchedule,
   deleteWorkspaceMapping,
   deleteWorkspaceMargin,
   deleteWorkspaceReplacement,
   fetchWorkspaceCafe24AuthorizeUrl,
   fetchWorkspaceCollectionMappings,
   fetchWorkspaceDesignerOptions,
   fetchWorkspaceHostingAccounts,
   fetchWorkspaceHostingCategories,
   fetchWorkspaceMappedCategories,
   fetchWorkspaceMargins,
   fetchWorkspaceReplacements,
   fetchWorkspaceSourceCategories,
   loadWorkspaceSelectedDesigners,
   processWorkspaceCettireFilter,
   refetchWorkspaceHostingCategories,
   refreshWorkspaceSourceCategories,
   saveWorkspaceHostingAccount,
   saveWorkspaceMapping,
   saveWorkspaceMargin,
   saveWorkspaceReplacement,
   saveWorkspaceSelectedDesigners,
} from "@/lib/workspace";

const TABS = [
   { id: "collection", label: "상품수집" },
   { id: "margin", label: "마진" },
   { id: "replacement", label: "치환" },
];

const PLATFORM_OPTIONS = ["smartstore", "godomall", "cafe24", "makeshop"];
const CAFE24_OAUTH_STATE_KEY = "flowmerce_cafe24_oauth_state";

const SITE_LABELS = {
   Farfetch: "파페치",
   Cettire: "세타이어",
   YSL: "생로랑",
   Prada: "프라다",
   Lv: "루이비통",
   Dior: "디올",
   Burberry: "버버리",
   Celine: "셀린느",
   Balenciaga: "발렌시아가",
   Miumiu: "미우미우",
   Bottega: "보테가",
   Fendi: "펜디",
   Loropiana: "로로피아나",
   Maisonmargiela: "메종마르지엘라",
   Loewe: "로에베",
   Stone: "스톤아일랜드",
   Lemaire: "르메르",
   Ferragamo: "페라가모",
   Dolce: "돌체앤가바나",
   Therow: "더로우",
   Maxmara: "막스마라",
   Moncler: "몽클레어",
   Alexander: "알렉산더맥퀸",
   Givenchy: "지방시",
   Sandro: "산드로",
   Tods: "토즈",
   Valentino: "발렌티노",
   Acne: "아크네",
   Brunello: "브루넬로",
   Herno: "에르노",
   Thombrowne: "톰브라운",
   Tomford: "톰포드",
   Hermes: "에르메스",
   Ami: "아미",
   Jacquemus: "자크뮈스",
   Jilsander: "질샌더",
   Ourlegacy: "아워레가시",
   Polene: "폴렌",
   Rickowens: "릭오웬스",
   Apc: "아페쎄",
   Chloe: "끌로에",
   Gucci: "구찌",
   Isabelmarant: "이자벨마랑",
   Longchamp: "롱샴",
   Maisonkitsune: "메종키츠네",
   Maje: "마쥬",
};

const PROGRAM_SITE_ORDER = [
   "Gucci",
   "Chloe",
   "Therow",
   "Dolce",
   "Loropiana",
   "Loewe",
   "Stone",
   "Lv",
   "Lemaire",
   "Rickowens",
   "Maje",
   "Maxmara",
   "Maisonmargiela",
   "Maisonkitsune",
   "Moncler",
   "Miumiu",
   "Balenciaga",
   "Valentino",
   "Burberry",
   "Bottega",
   "Brunello",
   "Sandro",
   "Cettire",
   "Celine",
   "Ami",
   "Ourlegacy",
   "Acne",
   "Apc",
   "Alexander",
   "Herno",
   "Hermes",
   "Isabelmarant",
   "Jacquemus",
   "Givenchy",
   "Jilsander",
   "Tods",
   "Thombrowne",
   "Tomford",
   "Farfetch",
   "Ferragamo",
   "Fendi",
   "Polene",
   "Prada",
   "YSL",
   "Dior",
];

const ALL_SITES = [...new Set([...coreSourcingSites, ...highEndSites])];

function encodeCafe24State(payload) {
   const serialized = JSON.stringify(payload);
   return btoa(serialized).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
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

function parseListText(value) {
   if (!String(value || "").trim()) {
      return [];
   }

   return String(value)
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
}

function stringifyList(value) {
   if (!Array.isArray(value) || value.length === 0) {
      return "";
   }

   return value.join("\n");
}

function createEmptyHostingForm(customId = "") {
   return {
      id: "",
      customId,
      platform: "smartstore",
      accountPlatform: "",
      partnerKey: "",
      apiKey: "",
      refreshToken: "",
      tokenExpiresAt: "",
      refreshTokenExpiresAt: "",
      topImages: "",
      bottomImages: "",
      createdAt: "",
      updatedAt: "",
   };
}

function createEmptyMarginForm(site = "") {
   return {
      id: "",
      minAmount: "",
      maxAmount: "",
      minMargin: "",
      marginValue: "",
      exchangeRate: "",
      discountRate: "",
      site,
   };
}

function createEmptyReplacementForm() {
   return {
      id: "",
      beforeWord: "",
      afterWord: "",
   };
}

function normalizeCategoryName(value) {
   return String(value || "").trim();
}

function normalizeDesignerItem(item) {
   const name = String(item?.designerName || item?.designer_name || item?.name || "").trim();
   const code = String(item?.designerCode || item?.designer_code || name).trim();

   return {
      key: code || name,
      name,
      code,
   };
}

function normalizeSourceItem(item) {
   const categoryName = normalizeCategoryName(item?.categoryName || item?.category_name);
   const url = String(item?.url || item?.siteUrl || "").trim();
   const categoryNumbers = String(item?.categoryNumbers || item?.category_numbers || "").trim();
   const meta = String(item?.meta || "").trim();

   return {
      key: categoryName || url,
      categoryName,
      url,
      categoryNumbers,
      meta,
   };
}

function normalizeMallCategory(item) {
   const categoryName = normalizeCategoryName(
      item?.categoryName || item?.fullCategoryName || item?.full_category_name,
   );
   const categoryCode = String(item?.categoryCode || item?.category_no || "").trim();

   return {
      key: categoryCode || categoryName,
      categoryName,
      categoryCode,
   };
}

function normalizeMappedCategory(item) {
   const godoMallCategoryName = normalizeCategoryName(item?.godoMallCategoryName);
   const categoryName = normalizeCategoryName(item?.categoryName);
   const siteUrl = String(item?.siteUrl || "").trim();
   const godoMallCategoryCode = String(item?.godoMallCategoryCode || "").trim();
   const site = String(item?.site || "").trim();
   const customId = String(item?.customId || "").trim();
   const accountPlatform = String(item?.accountPlatform || "").trim();

   return {
      key: [siteUrl, godoMallCategoryCode, categoryName].filter(Boolean).join("::"),
      label: `${godoMallCategoryName} | ${categoryName}`,
      godoMallCategoryName,
      godoMallCategoryCode,
      categoryName,
      siteUrl,
      site,
      customId,
      accountPlatform,
   };
}

function getCafe24TokenStatus(account) {
   if (!account || account.platform !== "cafe24") {
      return null;
   }

   if (!account.refreshTokenExpiresAt) {
      return {
         tone: "neutral",
         label: "미확인",
         expiresAt: "-",
      };
   }

   const expiresAt = new Date(account.refreshTokenExpiresAt);
   if (Number.isNaN(expiresAt.getTime())) {
      return {
         tone: "neutral",
         label: "미확인",
         expiresAt: "-",
      };
   }

   const diffMs = expiresAt.getTime() - Date.now();
   if (diffMs <= 0) {
      return {
         tone: "danger",
         label: "만료",
         expiresAt: formatMonthDay(expiresAt),
      };
   }

   const remainingDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
   if (remainingDays <= 3) {
      return {
         tone: "warning",
         label: "갱신 필요",
         expiresAt: formatMonthDay(expiresAt),
      };
   }

   return {
      tone: "success",
      label: "정상",
      expiresAt: formatMonthDay(expiresAt),
   };
}

function getSiteLabel(site) {
   return SITE_LABELS[site] || site;
}

function PrimaryButton({ children, className, ...props }) {
   return (
      <button
         type="button"
         className={clsx(
            "rounded-md border border-zinc-950 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#8c6333] disabled:cursor-not-allowed disabled:opacity-60",
            className,
         )}
         {...props}
      >
         {children}
      </button>
   );
}

function SecondaryButton({ children, className, ...props }) {
   return (
      <button
         type="button"
         className={clsx(
            "rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60",
            className,
         )}
         {...props}
      >
         {children}
      </button>
   );
}

function StatusMessage({ message }) {
   if (!message?.text) {
      return null;
   }

   return (
      <div
         className={clsx(
            "rounded-md border px-4 py-3 text-sm font-medium",
            message.tone === "error" && "border-red-200 bg-red-50 text-red-700",
            message.tone === "success" && "border-amber-200 bg-[#fbf7ef] text-amber-900",
            message.tone !== "error" &&
               message.tone !== "success" &&
               "border-zinc-200 bg-zinc-50 text-zinc-700",
         )}
      >
         {message.text}
      </div>
   );
}

function ProgramListView({
   title,
   items,
   selectedKeys,
   onToggle,
   emptyText,
   multi = true,
   secondaryText,
}) {
   return (
      <div className="border border-zinc-300 bg-white">
         <div className="border-b border-zinc-300 px-3 py-2">
            <p className="text-sm font-medium text-zinc-900">{title}</p>
         </div>
         <div className="h-[360px] overflow-x-auto overflow-y-auto">
            {items.length === 0 ? (
               <div className="px-3 py-6 text-sm text-zinc-500">{emptyText}</div>
            ) : (
               <ul className="divide-y divide-zinc-200">
                  {items.map((item) => {
                     const selected = selectedKeys.includes(item.key);

                     return (
                        <li key={item.key}>
                           <button
                              type="button"
                              onClick={() => onToggle(item, multi)}
                              className={clsx(
                                 "flex w-full min-w-max flex-col items-start gap-1 px-3 py-2 text-left text-sm transition",
                                 selected ? "bg-[#fbf7ef] text-zinc-950" : "hover:bg-zinc-50",
                              )}
                           >
                              <span className="whitespace-nowrap leading-5">
                                 {item.label || item.name || item.categoryName || item.categoryCode}
                              </span>
                              {secondaryText ? (
                                 <span className="whitespace-nowrap text-xs text-zinc-500">
                                    {secondaryText(item)}
                                 </span>
                              ) : null}
                           </button>
                        </li>
                     );
                  })}
               </ul>
            )}
         </div>
      </div>
   );
}

function TabButton({ active, children, onClick }) {
   return (
      <button
         type="button"
         onClick={onClick}
         className={clsx(
            "rounded-md border px-4 py-2.5 text-sm font-medium transition",
            active
               ? "border-zinc-950 bg-zinc-950 text-white shadow-sm"
               : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50",
         )}
      >
         {children}
      </button>
   );
}

function HostingAccountRow({ account, selected, onClick }) {
   const cafe24TokenStatus = getCafe24TokenStatus(account);

   return (
      <button
         type="button"
         onClick={onClick}
         className={clsx(
            "flex w-full flex-col items-start gap-1 border-b border-zinc-200 px-3 py-3 text-left text-sm transition last:border-b-0",
            selected ? "bg-[#fbf7ef]" : "hover:bg-zinc-50",
         )}
      >
         <div className="flex w-full items-center justify-between gap-3">
            <span className="font-medium text-zinc-900">{account.accountPlatform}</span>
            <span className="text-xs text-zinc-500">{account.platform}</span>
         </div>
         {account.platform === "cafe24" && cafe24TokenStatus ? (
            <span
               className={clsx(
                  "inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                  cafe24TokenStatus.tone === "success" &&
                     "border-amber-200 bg-[#fbf7ef] text-amber-900",
                  cafe24TokenStatus.tone === "warning" &&
                     "border-amber-200 bg-amber-50 text-amber-700",
                  cafe24TokenStatus.tone === "danger" &&
                     "border-red-200 bg-red-50 text-red-700",
                  cafe24TokenStatus.tone === "neutral" &&
                     "border-zinc-200 bg-zinc-50 text-zinc-700",
               )}
            >
               <span>{cafe24TokenStatus.label}</span>
               <span>{cafe24TokenStatus.expiresAt}</span>
            </span>
         ) : null}
      </button>
   );
}

export default function FlowmerceStudioPanel() {
   const router = useRouter();

   const [session, setSession] = useState(null);
   const [profile, setProfile] = useState(null);
   const [checkingSession, setCheckingSession] = useState(true);
   const [activeTab, setActiveTab] = useState("collection");

   const [accounts, setAccounts] = useState([]);
   const [selectedAccountPlatform, setSelectedAccountPlatform] = useState("");
   const [hostingForm, setHostingForm] = useState(createEmptyHostingForm());
   const [showHostingPanel, setShowHostingPanel] = useState(false);
   const [loadingAccounts, setLoadingAccounts] = useState(false);
   const [savingHosting, setSavingHosting] = useState(false);
   const [connectingCafe24, setConnectingCafe24] = useState(false);
   const [hostingMessage, setHostingMessage] = useState({ tone: "neutral", text: "" });

   const [selectedBrand, setSelectedBrand] = useState("");
   const [designerItems, setDesignerItems] = useState([]);
   const [sourceCategories, setSourceCategories] = useState([]);
   const [mallCategories, setMallCategories] = useState([]);
   const [mappedCategories, setMappedCategories] = useState([]);
   const [collectionCategories, setCollectionCategories] = useState([]);

   const [selectedDesignerKeys, setSelectedDesignerKeys] = useState([]);
   const [selectedSourceKeys, setSelectedSourceKeys] = useState([]);
   const [selectedMallKey, setSelectedMallKey] = useState("");
   const [selectedMappedKeys, setSelectedMappedKeys] = useState([]);
   const [selectedCollectionKeys, setSelectedCollectionKeys] = useState([]);

   const [loadingCollection, setLoadingCollection] = useState(false);
   const [collectionMessage, setCollectionMessage] = useState({ tone: "neutral", text: "" });

   const [margins, setMargins] = useState([]);
   const [selectedMarginId, setSelectedMarginId] = useState("");
   const [marginForm, setMarginForm] = useState(createEmptyMarginForm());
   const [loadingMargins, setLoadingMargins] = useState(false);
   const [marginMessage, setMarginMessage] = useState({ tone: "neutral", text: "" });

   const [replacements, setReplacements] = useState([]);
   const [selectedReplacementId, setSelectedReplacementId] = useState("");
   const [replacementForm, setReplacementForm] = useState(createEmptyReplacementForm());
   const [loadingReplacements, setLoadingReplacements] = useState(false);
   const [replacementMessage, setReplacementMessage] = useState({
      tone: "neutral",
      text: "",
   });

   useEffect(() => {
      const syncSession = () => {
         const currentSession = getSession();

         if (!currentSession) {
            router.replace("/login?next=%2Fflowmerce-studio");
            return;
         }

         setSession(currentSession);
         setCheckingSession(false);
      };

      syncSession();
      window.addEventListener("flowmerce-auth", syncSession);
      window.addEventListener("storage", syncSession);

      return () => {
         window.removeEventListener("flowmerce-auth", syncSession);
         window.removeEventListener("storage", syncSession);
      };
   }, [router]);

   const subscribedSites = useMemo(() => {
      const rawSites = Array.isArray(session?.sites) ? session.sites.filter(Boolean) : [];
      const allowedSites = rawSites.includes("ALL") ? ALL_SITES : rawSites.filter((site) => site !== "ALL");

      return PROGRAM_SITE_ORDER.filter((site) => allowedSites.includes(site));
   }, [session?.sites]);

   const activeAccount = useMemo(
      () => accounts.find((account) => account.accountPlatform === selectedAccountPlatform) || null,
      [accounts, selectedAccountPlatform],
   );

   const hasAll = useMemo(() => Array.isArray(session?.sites) && session.sites.includes("ALL"), [session?.sites]);
   const hasFarfetch = hasAll || subscribedSites.includes("Farfetch");
   const hasCettire = hasAll || subscribedSites.includes("Cettire");

   const canSaveAndLoadDesigners = hasFarfetch || hasCettire;
   const canFilter = hasCettire;

   const selectedMallCategory = useMemo(
      () => mallCategories.find((item) => item.key === selectedMallKey) || null,
      [mallCategories, selectedMallKey],
   );

   const selectedMappedItems = useMemo(
      () => mappedCategories.filter((item) => selectedMappedKeys.includes(item.key)),
      [mappedCategories, selectedMappedKeys],
   );

   const selectedCollectionItems = useMemo(
      () => collectionCategories.filter((item) => selectedCollectionKeys.includes(item.key)),
      [collectionCategories, selectedCollectionKeys],
   );

   const loadProfile = useCallback(async () => {
      if (!session?.customId) {
         return;
      }

      try {
         const result = await fetchUserProfile(session.customId);
         const user = result?.user || result;

         if (!user) {
            return;
         }

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
      } catch {
         // Keep the page usable even if profile refresh fails.
      }
   }, [session?.customId]);

   const loadAccounts = useCallback(async () => {
      if (!session?.customId) {
         return;
      }

      setLoadingAccounts(true);

      try {
         const nextAccounts = await fetchWorkspaceHostingAccounts(session.customId);
         setAccounts(nextAccounts);

         if (!selectedAccountPlatform && nextAccounts.length > 0) {
            setSelectedAccountPlatform(nextAccounts[0].accountPlatform);
         }
      } catch (error) {
         setHostingMessage({
            tone: "error",
            text: error.message || "호스팅 계정을 불러오지 못했습니다.",
         });
      } finally {
         setLoadingAccounts(false);
      }
   }, [selectedAccountPlatform, session?.customId]);

   const loadReplacements = useCallback(async () => {
      if (!session?.customId) {
         return;
      }

      setLoadingReplacements(true);

      try {
         const items = await fetchWorkspaceReplacements(session.customId);
         setReplacements(items);
      } catch (error) {
         setReplacementMessage({
            tone: "error",
            text: error.message || "치환 목록을 불러오지 못했습니다.",
         });
      } finally {
         setLoadingReplacements(false);
      }
   }, [session?.customId]);

   const loadMargins = useCallback(async () => {
      if (!session?.customId || !selectedAccountPlatform) {
         return;
      }

      setLoadingMargins(true);

      try {
         const items = await fetchWorkspaceMargins(session.customId, selectedAccountPlatform);
         setMargins(items);
      } catch (error) {
         setMarginMessage({
            tone: "error",
            text: error.message || "마진 목록을 불러오지 못했습니다.",
         });
      } finally {
         setLoadingMargins(false);
      }
   }, [selectedAccountPlatform, session?.customId]);

   useEffect(() => {
      if (!session?.customId) {
         return;
      }

      void loadProfile();
      void loadAccounts();
      void loadReplacements();
      setHostingForm(createEmptyHostingForm(session.customId));
   }, [loadAccounts, loadProfile, loadReplacements, session?.customId]);

   useEffect(() => {
      if (!selectedBrand && subscribedSites.length > 0) {
         setSelectedBrand(subscribedSites[0]);
      }
   }, [selectedBrand, subscribedSites]);

   useEffect(() => {
      if (!selectedBrand) {
         return;
      }

      setMarginForm((current) => ({
         ...current,
         site: current.site || selectedBrand,
      }));
   }, [selectedBrand]);

   useEffect(() => {
      if (!selectedAccountPlatform || !session?.customId) {
         return;
      }

      void loadMargins();
   }, [loadMargins, selectedAccountPlatform, session?.customId]);

   useEffect(() => {
      if (!activeAccount) {
         return;
      }

      setHostingForm((current) => ({
         ...current,
         id: String(activeAccount.id || ""),
         customId: activeAccount.customId || session?.customId || current.customId,
         platform: activeAccount.platform || current.platform,
         accountPlatform: activeAccount.accountPlatform || current.accountPlatform,
         partnerKey: activeAccount.partnerKey || current.partnerKey,
         apiKey: activeAccount.apiKey || current.apiKey,
         refreshToken: activeAccount.refreshToken || current.refreshToken,
         tokenExpiresAt:
            toDateTimeLocalValue(activeAccount.tokenExpiresAt) || current.tokenExpiresAt,
         refreshTokenExpiresAt:
            toDateTimeLocalValue(activeAccount.refreshTokenExpiresAt) ||
            current.refreshTokenExpiresAt,
         topImages: stringifyList(activeAccount.topImages) || current.topImages,
         bottomImages: stringifyList(activeAccount.bottomImages) || current.bottomImages,
         createdAt: activeAccount.createdAt || current.createdAt,
         updatedAt: activeAccount.updatedAt || current.updatedAt,
      }));
   }, [activeAccount, session?.customId]);

   const syncHostingAccountDetail = useCallback(
      (detail) => {
         if (!detail) {
            return;
         }

         setMallCategories(
            Array.isArray(detail.categories)
               ? detail.categories.map(normalizeMallCategory).filter((item) => item.key)
               : [],
         );

         setAccounts((current) =>
            current.map((account) =>
               account.accountPlatform === selectedAccountPlatform
                  ? {
                       ...account,
                       partnerKey: detail.partnerKey || account.partnerKey || "",
                       apiKey: detail.apiKey || account.apiKey || "",
                    }
                  : account,
            ),
         );

         setHostingForm((current) => ({
            ...current,
            customId: current.customId || session?.customId || "",
            platform: activeAccount?.platform || current.platform,
            accountPlatform: selectedAccountPlatform || current.accountPlatform,
            partnerKey: detail.partnerKey || current.partnerKey || "",
            apiKey: detail.apiKey || current.apiKey || "",
         }));
      },
      [activeAccount?.platform, selectedAccountPlatform, session?.customId],
   );

   const loadCollectionWorkspace = useCallback(
      async (options = {}) => {
         if (!session?.customId || !selectedAccountPlatform || !selectedBrand) {
            return;
         }

         const { keepCollection = false } = options;

         setLoadingCollection(true);

         try {
            const requests = [
               fetchWorkspaceHostingCategories(session.customId, selectedAccountPlatform),
               fetchWorkspaceSourceCategories(selectedBrand),
               fetchWorkspaceMappedCategories(
                  selectedBrand,
                  session.customId,
                  selectedAccountPlatform,
               ),
            ];

            if (selectedBrand === "Farfetch" || selectedBrand === "Cettire") {
               requests.push(fetchWorkspaceDesignerOptions(selectedBrand));
            } else {
               requests.push(Promise.resolve([]));
            }

            const [hostingDetail, nextSourceCategories, nextMappedCategories, nextDesignerItems] =
               await Promise.all(requests);

            syncHostingAccountDetail(hostingDetail);
            setSourceCategories(
               Array.isArray(nextSourceCategories)
                  ? nextSourceCategories.map(normalizeSourceItem).filter((item) => item.key)
                  : [],
            );
            setMappedCategories(
               Array.isArray(nextMappedCategories)
                  ? nextMappedCategories.map(normalizeMappedCategory).filter((item) => item.key)
                  : [],
            );
            setDesignerItems(
               Array.isArray(nextDesignerItems)
                  ? nextDesignerItems.map(normalizeDesignerItem).filter((item) => item.key)
                  : [],
            );

            if (!keepCollection) {
               setCollectionCategories([]);
               setSelectedCollectionKeys([]);
            }
         } catch (error) {
            setCollectionMessage({
               tone: "error",
               text: error.message || "상품수집 화면 데이터를 불러오지 못했습니다.",
            });
         } finally {
            setLoadingCollection(false);
         }
      },
      [selectedAccountPlatform, selectedBrand, session?.customId, syncHostingAccountDetail],
   );

   useEffect(() => {
      if (!session?.customId || !selectedAccountPlatform || !selectedBrand) {
         return;
      }

      setSelectedDesignerKeys([]);
      setSelectedSourceKeys([]);
      setSelectedMallKey("");
      setSelectedMappedKeys([]);
      void loadCollectionWorkspace();
   }, [loadCollectionWorkspace, selectedAccountPlatform, selectedBrand, session?.customId]);

   useEffect(() => {
      const handleMessage = (event) => {
         if (event.origin !== window.location.origin) {
            return;
         }

         if (event.data?.type !== "flowmerce-cafe24-connected") {
            return;
         }

         setHostingMessage({
            tone: "success",
            text: "Cafe24 연동이 완료되었습니다. 최신 토큰 정보를 다시 불러왔습니다.",
         });
         setConnectingCafe24(false);
         void loadAccounts();
         void loadCollectionWorkspace({ keepCollection: true });
      };

      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
   }, [loadAccounts, loadCollectionWorkspace]);

   const toggleSelection = useCallback((setter) => {
      return (item, multi = true) => {
         setter((current) => {
            if (!multi) {
               return current[0] === item.key ? [] : [item.key];
            }

            return current.includes(item.key)
               ? current.filter((key) => key !== item.key)
               : [...current, item.key];
         });
      };
   }, []);

   const handleSelectMallCategory = useCallback((item) => {
      setSelectedMallKey((current) => (current === item.key ? "" : item.key));
   }, []);

   const handleSelectHostingAccount = useCallback(
      (account) => {
         setSelectedAccountPlatform(account.accountPlatform || "");
         setShowHostingPanel(true);

         setHostingForm({
            id: String(account.id || ""),
            customId: account.customId || session?.customId || "",
            platform: account.platform || "smartstore",
            accountPlatform: account.accountPlatform || "",
            partnerKey: account.partnerKey || "",
            apiKey: account.apiKey || "",
            refreshToken: account.refreshToken || "",
            tokenExpiresAt: toDateTimeLocalValue(account.tokenExpiresAt),
            refreshTokenExpiresAt: toDateTimeLocalValue(account.refreshTokenExpiresAt),
            topImages: stringifyList(account.topImages),
            bottomImages: stringifyList(account.bottomImages),
            createdAt: account.createdAt || "",
            updatedAt: account.updatedAt || "",
         });
      },
      [session?.customId],
   );

   const handleHostingFieldChange = useCallback((field, value) => {
      setHostingForm((current) => ({
         ...current,
         [field]: value,
      }));
   }, []);

   const handleSaveHosting = useCallback(async () => {
      if (!session?.customId) {
         return;
      }

      setSavingHosting(true);
      setHostingMessage({ tone: "neutral", text: "" });

      try {
         const payload = {
            id: hostingForm.id || undefined,
            customId: session.customId,
            platform: hostingForm.platform,
            accountPlatform: hostingForm.accountPlatform.trim(),
            partnerKey: hostingForm.partnerKey.trim(),
            apiKey: hostingForm.apiKey.trim(),
            refreshToken: hostingForm.refreshToken.trim(),
            tokenExpiresAt: parseDateTimeLocalValue(hostingForm.tokenExpiresAt),
            refreshTokenExpiresAt: parseDateTimeLocalValue(
               hostingForm.refreshTokenExpiresAt,
            ),
            topImages: parseListText(hostingForm.topImages),
            bottomImages: parseListText(hostingForm.bottomImages),
         };

         await saveWorkspaceHostingAccount(payload);

         setHostingMessage({
            tone: "success",
            text: "호스팅 계정을 저장했습니다.",
         });
         await loadAccounts();
      } catch (error) {
         setHostingMessage({
            tone: "error",
            text: error.message || "호스팅 계정을 저장하지 못했습니다.",
         });
      } finally {
         setSavingHosting(false);
      }
   }, [hostingForm, loadAccounts, session?.customId]);

   const handleConnectCafe24 = useCallback(async () => {
      if (!session?.customId || !hostingForm.accountPlatform.trim()) {
         setHostingMessage({
            tone: "error",
            text: "Cafe24 연동 전에 accountPlatform을 먼저 입력해 주세요.",
         });
         return;
      }

      if (!hostingForm.partnerKey.trim()) {
         setHostingMessage({
            tone: "error",
            text: "Cafe24 mallId를 먼저 입력해 주세요.",
         });
         return;
      }

      setConnectingCafe24(true);
      setHostingMessage({ tone: "neutral", text: "" });

      try {
         const state = encodeCafe24State({
            customId: session.customId,
            accountPlatform: hostingForm.accountPlatform.trim(),
            mallId: hostingForm.partnerKey.trim(),
            ts: Date.now(),
         });

         window.localStorage.setItem(
            CAFE24_OAUTH_STATE_KEY,
            JSON.stringify({
               state,
               customId: session.customId,
               accountPlatform: hostingForm.accountPlatform.trim(),
               origin: window.location.origin,
               targetOrigin: window.location.origin,
               targetPath: "/flowmerce-studio",
            }),
         );

         const { url } = await fetchWorkspaceCafe24AuthorizeUrl({
            mallId: hostingForm.partnerKey.trim(),
            state,
         });

         if (!url) {
            throw new Error("Cafe24 연동 URL을 만들지 못했습니다.");
         }

         const popup = window.open(
            url,
            "flowmerce-cafe24-connect",
            "width=520,height=720,noopener,noreferrer",
         );

         if (!popup) {
            throw new Error("팝업이 차단되었습니다. 팝업 허용 후 다시 시도해 주세요.");
         }

         setHostingMessage({
            tone: "success",
            text: "Cafe24 연동 창을 열었습니다. 승인이 끝나면 자동으로 최신 토큰을 반영합니다.",
         });
      } catch (error) {
         setConnectingCafe24(false);
         setHostingMessage({
            tone: "error",
            text: error.message || "Cafe24 연동을 시작하지 못했습니다.",
         });
      }
   }, [hostingForm.accountPlatform, hostingForm.partnerKey, session?.customId]);

   const handleRefreshHostingCategories = useCallback(async () => {
      if (!session?.customId || !selectedAccountPlatform) {
         return;
      }

      setCollectionMessage({ tone: "neutral", text: "" });

      try {
         await refetchWorkspaceHostingCategories(session.customId, selectedAccountPlatform);
         await loadCollectionWorkspace({ keepCollection: true });
         setCollectionMessage({
            tone: "success",
            text: "호스팅 카테고리를 다시 가져왔습니다.",
         });
      } catch (error) {
         setCollectionMessage({
            tone: "error",
            text: error.message || "호스팅 카테고리를 새로고침하지 못했습니다.",
         });
      }
   }, [loadCollectionWorkspace, selectedAccountPlatform, session?.customId]);

   const handleRefreshSourceCategories = useCallback(async () => {
      if (!selectedBrand) {
         return;
      }

      try {
         await refreshWorkspaceSourceCategories(selectedBrand);
         await loadCollectionWorkspace({ keepCollection: true });
         setCollectionMessage({
            tone: "success",
            text: `${getSiteLabel(selectedBrand)} 카테고리를 새로 가져왔습니다.`,
         });
      } catch (error) {
         setCollectionMessage({
            tone: "error",
            text: error.message || "브랜드 카테고리를 새로고침하지 못했습니다.",
         });
      }
   }, [loadCollectionWorkspace, selectedBrand]);

   const handleFetchCollectionCategories = useCallback(async () => {
      if (!session?.customId || !selectedAccountPlatform || !selectedBrand) {
         return;
      }

      try {
         const items = await fetchWorkspaceCollectionMappings(
            selectedBrand,
            session.customId,
            selectedAccountPlatform,
         );

         setCollectionCategories(
            Array.isArray(items)
               ? items.map(normalizeMappedCategory).filter((item) => item.key)
               : [],
         );
         setSelectedCollectionKeys([]);
         setCollectionMessage({
            tone: "success",
            text: "수집 카테고리를 불러왔습니다.",
         });
      } catch (error) {
         setCollectionMessage({
            tone: "error",
            text: error.message || "수집 카테고리를 불러오지 못했습니다.",
         });
      }
   }, [selectedAccountPlatform, selectedBrand, session?.customId]);

   const handleSaveDesigners = useCallback(async () => {
      if (!session?.customId || !selectedAccountPlatform || !selectedBrand) {
         return;
      }

      if (selectedBrand !== "Farfetch" && selectedBrand !== "Cettire") {
         setCollectionMessage({
            tone: "error",
            text: "디자이너 저장은 Farfetch 또는 Cettire에서만 사용할 수 있습니다.",
         });
         return;
      }

      const selectedItems = designerItems.filter((item) => selectedDesignerKeys.includes(item.key));
      const designerNames =
         selectedBrand === "Farfetch"
            ? selectedItems.map((item) => item.code)
            : selectedItems.map((item) => item.name);

      try {
         await saveWorkspaceSelectedDesigners({
            designerNames,
            site: selectedBrand,
            customId: session.customId,
            accountPlatform: selectedAccountPlatform,
         });

         setCollectionMessage({
            tone: "success",
            text: "선택한 디자이너를 저장했습니다.",
         });
      } catch (error) {
         setCollectionMessage({
            tone: "error",
            text: error.message || "디자이너를 저장하지 못했습니다.",
         });
      }
   }, [
      designerItems,
      selectedAccountPlatform,
      selectedBrand,
      selectedDesignerKeys,
      session?.customId,
   ]);

   const handleLoadDesigners = useCallback(async () => {
      if (!session?.customId || !selectedAccountPlatform || !selectedBrand) {
         return;
      }

      try {
         const savedValues = await loadWorkspaceSelectedDesigners(
            selectedBrand,
            session.customId,
            selectedAccountPlatform,
         );

         const savedSet = new Set(savedValues);
         const nextSelectedKeys = designerItems
            .filter((item) =>
               selectedBrand === "Farfetch"
                  ? savedSet.has(item.code)
                  : savedSet.has(item.name),
            )
            .map((item) => item.key);

         setSelectedDesignerKeys(nextSelectedKeys);
         setCollectionMessage({
            tone: "success",
            text: "저장된 디자이너 선택을 불러왔습니다.",
         });
      } catch (error) {
         setCollectionMessage({
            tone: "error",
            text: error.message || "저장된 디자이너를 불러오지 못했습니다.",
         });
      }
   }, [
      designerItems,
      selectedAccountPlatform,
      selectedBrand,
      session?.customId,
   ]);

   const handleFilterCettire = useCallback(async () => {
      if (!session?.customId || !selectedAccountPlatform) {
         return;
      }

      try {
         await processWorkspaceCettireFilter(session.customId, selectedAccountPlatform);
         setCollectionMessage({
            tone: "success",
            text: "Cettire 필터링 작업을 실행했습니다.",
         });
      } catch (error) {
         setCollectionMessage({
            tone: "error",
            text: error.message || "Cettire 필터링을 실행하지 못했습니다.",
         });
      }
   }, [selectedAccountPlatform, session?.customId]);

   const handleSaveMapping = useCallback(async () => {
      if (!session?.customId || !selectedAccountPlatform || !selectedBrand) {
         return;
      }

      if (!selectedMallCategory) {
         setCollectionMessage({
            tone: "error",
            text: "쇼핑몰 카테고리를 먼저 선택해 주세요.",
         });
         return;
      }

      try {
         if (selectedBrand === "Farfetch") {
            const selectedCategories = sourceCategories.filter((item) =>
               selectedSourceKeys.includes(item.key),
            );
            const selectedDesigners = designerItems.filter((item) =>
               selectedDesignerKeys.includes(item.key),
            );

            if (selectedCategories.length === 0 || selectedDesigners.length === 0) {
               throw new Error("Farfetch는 디자이너와 카테고리를 함께 선택해야 합니다.");
            }

            const baseUrl = selectedCategories[0]?.url;
            const categoryPart = selectedCategories
               .map((item) => item.categoryNumbers)
               .filter(Boolean)
               .join("%7C");
            const designerPart = selectedDesigners
               .map((item) => item.code)
               .filter(Boolean)
               .join("%7C");

            const siteUrl = `${baseUrl}?page=1&category=${categoryPart}&designer=${designerPart}`;

            await saveWorkspaceMapping(selectedBrand, {
               siteUrl,
               categoryName: selectedCategories.map((item) => item.categoryName).join(","),
               categoryTitle: selectedDesigners.map((item) => item.name).join(","),
               godoMallCategoryCode: selectedMallCategory.categoryCode,
               godoMallCategoryName: selectedMallCategory.categoryName,
               designers: selectedDesigners.map((item) => item.code),
               customId: session.customId,
               accountPlatform: selectedAccountPlatform,
            });
         } else if (selectedBrand === "Cettire") {
            const source = sourceCategories.find((item) => selectedSourceKeys.includes(item.key));
            const selectedDesigners = designerItems.filter((item) =>
               selectedDesignerKeys.includes(item.key),
            );

            if (!source) {
               throw new Error("Cettire 카테고리를 먼저 선택해 주세요.");
            }

            await saveWorkspaceMapping(selectedBrand, {
               siteUrl: source.url,
               categoryName: source.categoryName,
               godoMallCategoryCode: selectedMallCategory.categoryCode,
               godoMallCategoryName: selectedMallCategory.categoryName,
               designers: selectedDesigners.map((item) => item.name),
               customId: session.customId,
               accountPlatform: selectedAccountPlatform,
            });
         } else {
            const source = sourceCategories.find((item) => selectedSourceKeys.includes(item.key));

            if (!source) {
               throw new Error("브랜드 카테고리를 먼저 선택해 주세요.");
            }

            await saveWorkspaceMapping(selectedBrand, {
               siteUrl: source.url,
               categoryName: source.categoryName,
               godoMallCategoryCode: selectedMallCategory.categoryCode,
               godoMallCategoryName: selectedMallCategory.categoryName,
               customId: session.customId,
               accountPlatform: selectedAccountPlatform,
            });
         }

         const [nextMapped, nextCollection] = await Promise.all([
            fetchWorkspaceMappedCategories(selectedBrand, session.customId, selectedAccountPlatform),
            fetchWorkspaceCollectionMappings(
               selectedBrand,
               session.customId,
               selectedAccountPlatform,
            ),
         ]);

         setMappedCategories(
            Array.isArray(nextMapped)
               ? nextMapped.map(normalizeMappedCategory).filter((item) => item.key)
               : [],
         );
         setCollectionCategories(
            Array.isArray(nextCollection)
               ? nextCollection.map(normalizeMappedCategory).filter((item) => item.key)
               : [],
         );
         setCollectionMessage({
            tone: "success",
            text: "카테고리 매핑을 저장했습니다.",
         });
      } catch (error) {
         setCollectionMessage({
            tone: "error",
            text: error.message || "카테고리 매핑을 저장하지 못했습니다.",
         });
      }
   }, [
      designerItems,
      selectedAccountPlatform,
      selectedBrand,
      selectedDesignerKeys,
      selectedMallCategory,
      selectedSourceKeys,
      session?.customId,
      sourceCategories,
   ]);

   const handleDeleteMapping = useCallback(async () => {
      if (selectedMappedItems.length === 0) {
         setCollectionMessage({
            tone: "error",
            text: "삭제할 매핑을 먼저 선택해 주세요.",
         });
         return;
      }

      try {
         await Promise.all(
            selectedMappedItems.map((item) =>
               deleteWorkspaceMapping({
                  site: item.site || selectedBrand,
                  siteUrl: item.siteUrl,
                  customId: item.customId || session?.customId,
                  accountPlatform: item.accountPlatform || selectedAccountPlatform,
               }),
            ),
         );

         const [nextMapped, nextCollection] = await Promise.all([
            fetchWorkspaceMappedCategories(selectedBrand, session.customId, selectedAccountPlatform),
            fetchWorkspaceCollectionMappings(
               selectedBrand,
               session.customId,
               selectedAccountPlatform,
            ),
         ]);

         setMappedCategories(
            Array.isArray(nextMapped)
               ? nextMapped.map(normalizeMappedCategory).filter((item) => item.key)
               : [],
         );
         setCollectionCategories(
            Array.isArray(nextCollection)
               ? nextCollection.map(normalizeMappedCategory).filter((item) => item.key)
               : [],
         );
         setSelectedMappedKeys([]);
         setCollectionMessage({
            tone: "success",
            text: "선택한 매핑을 삭제했습니다.",
         });
      } catch (error) {
         setCollectionMessage({
            tone: "error",
            text: error.message || "매핑을 삭제하지 못했습니다.",
         });
      }
   }, [
      selectedMappedItems,
      selectedBrand,
      selectedAccountPlatform,
      session?.customId,
   ]);

   const handleCreateSchedule = useCallback(async () => {
      if (!session?.customId || !selectedAccountPlatform || !selectedBrand) {
         return;
      }

      if (!activeAccount?.partnerKey && !hostingForm.partnerKey.trim()) {
         setCollectionMessage({
            tone: "error",
            text: "선택한 호스팅 계정의 partnerKey를 먼저 확인해 주세요.",
         });
         return;
      }

      if (selectedCollectionItems.length === 0) {
         setCollectionMessage({
            tone: "error",
            text: "수집예약할 카테고리를 먼저 선택해 주세요.",
         });
         return;
      }

      try {
         const partnerKey = activeAccount?.partnerKey || hostingForm.partnerKey.trim();
         const apiKey = activeAccount?.apiKey || hostingForm.apiKey.trim();

         const results = await Promise.allSettled(
            selectedCollectionItems.map((item) =>
               createWorkspaceSchedule({
                  site: selectedBrand,
                  siteUrls: item.siteUrl,
                  godoMallCategoryCode: item.godoMallCategoryCode,
                  godoMallCategoryName: item.godoMallCategoryName,
                  categoryName: item.categoryName,
                  partnerKey,
                  apiKey,
                  customId: session.customId,
                  accountPlatform: selectedAccountPlatform,
                  notifyCustomerReservation: true,
               }),
            ),
         );

         let successCount = 0;
         let duplicateCount = 0;
         let failedCount = 0;
         const failedMessages = [];

         results.forEach((result) => {
            if (result.status === "fulfilled") {
               const duplicated =
                  result.value?.duplicated === true ||
                  String(result.value?.message || "").includes("이미 예약된 작업입니다");

               if (duplicated) {
                  duplicateCount += 1;
               } else {
                  successCount += 1;
               }
               return;
            }

            failedCount += 1;
            failedMessages.push(result.reason?.message || "알 수 없는 오류");
         });

         const summaryText = `예약 성공 ${successCount}건 · 중복 ${duplicateCount}건 · 실패 ${failedCount}건`;

         setCollectionMessage({
            tone: failedCount > 0 ? (successCount > 0 || duplicateCount > 0 ? "neutral" : "error") : "success",
            text: summaryText,
         });
         setSelectedCollectionKeys([]);
         await loadProfile();

         const alertText =
            failedCount > 0 && failedMessages[0]
               ? `${summaryText}\n\n첫 번째 실패 사유: ${failedMessages[0]}`
               : summaryText;

         window.alert(alertText);
      } catch (error) {
         setCollectionMessage({
            tone: "error",
            text: error.message || "수집예약을 등록하지 못했습니다.",
         });
         window.alert(error.message || "수집예약 중 오류가 발생했습니다.");
      }
   }, [
      activeAccount?.apiKey,
      activeAccount?.partnerKey,
      hostingForm.apiKey,
      hostingForm.partnerKey,
      loadProfile,
      selectedAccountPlatform,
      selectedBrand,
      selectedCollectionItems,
      session?.customId,
   ]);

   const handleSaveMargin = useCallback(async () => {
      if (!session?.customId || !selectedAccountPlatform) {
         return;
      }

      try {
         await saveWorkspaceMargin({
            id: marginForm.id ? Number(marginForm.id) : undefined,
            minAmount: Number(marginForm.minAmount),
            maxAmount: Number(marginForm.maxAmount),
            minMargin: Number(marginForm.minMargin),
            marginValue: Number(marginForm.marginValue),
            exchangeRate: Number(marginForm.exchangeRate),
            discountRate: Number(marginForm.discountRate),
            site: marginForm.site,
            customId: session.customId,
            accountPlatform: selectedAccountPlatform,
         });

         setMarginMessage({
            tone: "success",
            text: "마진 규칙을 저장했습니다.",
         });
         setMarginForm(createEmptyMarginForm(selectedBrand));
         setSelectedMarginId("");
         await loadMargins();
      } catch (error) {
         setMarginMessage({
            tone: "error",
            text: error.message || "마진 규칙을 저장하지 못했습니다.",
         });
      }
   }, [loadMargins, marginForm, selectedAccountPlatform, selectedBrand, session?.customId]);

   const handleDeleteMargin = useCallback(async () => {
      if (!selectedMarginId) {
         return;
      }

      try {
         await deleteWorkspaceMargin(selectedMarginId);
         setMarginMessage({
            tone: "success",
            text: "선택한 마진 규칙을 삭제했습니다.",
         });
         setMarginForm(createEmptyMarginForm(selectedBrand));
         setSelectedMarginId("");
         await loadMargins();
      } catch (error) {
         setMarginMessage({
            tone: "error",
            text: error.message || "마진 규칙을 삭제하지 못했습니다.",
         });
      }
   }, [loadMargins, selectedMarginId, selectedBrand]);

   const handleSaveReplacement = useCallback(async () => {
      if (!session?.customId) {
         return;
      }

      try {
         await saveWorkspaceReplacement({
            id: replacementForm.id ? Number(replacementForm.id) : undefined,
            beforeWord: replacementForm.beforeWord.trim(),
            afterWord: replacementForm.afterWord.trim(),
            customId: session.customId,
         });

         setReplacementMessage({
            tone: "success",
            text: "단어 치환 규칙을 저장했습니다.",
         });
         setReplacementForm(createEmptyReplacementForm());
         setSelectedReplacementId("");
         await loadReplacements();
      } catch (error) {
         setReplacementMessage({
            tone: "error",
            text: error.message || "단어 치환 규칙을 저장하지 못했습니다.",
         });
      }
   }, [loadReplacements, replacementForm, session?.customId]);

   const handleDeleteReplacement = useCallback(async () => {
      if (!selectedReplacementId) {
         return;
      }

      try {
         await deleteWorkspaceReplacement(selectedReplacementId);
         setReplacementMessage({
            tone: "success",
            text: "선택한 치환 규칙을 삭제했습니다.",
         });
         setReplacementForm(createEmptyReplacementForm());
         setSelectedReplacementId("");
         await loadReplacements();
      } catch (error) {
         setReplacementMessage({
            tone: "error",
            text: error.message || "치환 규칙을 삭제하지 못했습니다.",
         });
      }
   }, [loadReplacements, selectedReplacementId]);

   if (checkingSession) {
      return (
         <section className="border border-zinc-200 bg-white px-6 py-16 text-center">
            <p className="text-sm text-zinc-600">로그인 정보를 확인하고 있습니다.</p>
         </section>
      );
   }

   return (
      <div className="space-y-6">
         <section className="border border-zinc-200 bg-white px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
               <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-900">
                     Flowmerce Studio
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold text-zinc-950">
                     수집 작업 공간
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                     프로그램에서 하던 수집, 매핑, 마진, 치환 작업을 웹에서 바로 이어갈 수 있게
                     옮겨둔 화면입니다.
                  </p>
               </div>

               <div className="min-w-[320px] space-y-2">
                  <p className="text-sm font-medium text-zinc-800">
                     로그인 된 계정 :{" "}
                     <span className="font-semibold text-zinc-950">
                        {session?.customId || "-"}
                     </span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                     <label className="text-sm font-medium text-zinc-800">
                        선택 된 호스팅 :
                     </label>
                     <select
                        value={selectedAccountPlatform}
                        onChange={(event) => setSelectedAccountPlatform(event.target.value)}
                        className="min-w-[220px] rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                     >
                        <option value="">계정 선택</option>
                        {accounts.map((account) => (
                           <option key={account.accountPlatform} value={account.accountPlatform}>
                              {account.accountPlatform}
                           </option>
                        ))}
                     </select>
                     <Link
                        href="/mypage"
                        className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
                     >
                        마이페이지
                     </Link>
                  </div>
               </div>
            </div>
         </section>

         <section className="border border-zinc-200 bg-white px-5 py-4 sm:px-6">
            <div className="flex flex-wrap gap-2">
               {TABS.map((tab) => (
                  <TabButton
                     key={tab.id}
                     active={activeTab === tab.id}
                     onClick={() => setActiveTab(tab.id)}
                  >
                     {tab.label}
                  </TabButton>
               ))}
            </div>
         </section>

         {activeTab === "collection" ? (
            <section className="border border-zinc-200 bg-white px-4 py-4 sm:px-5">
               <div className="space-y-5">
                  <div className="flex flex-wrap gap-2">
                     {subscribedSites.map((site) => (
                        <SecondaryButton
                           key={site}
                           onClick={() => setSelectedBrand(site)}
                           className={clsx(
                              "px-3 py-2 text-xs sm:text-sm",
                              selectedBrand === site &&
                                 "border-zinc-950 bg-zinc-950 text-white hover:bg-[#8c6333]",
                           )}
                        >
                           {getSiteLabel(site)}
                        </SecondaryButton>
                     ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                     <SecondaryButton onClick={handleFetchCollectionCategories}>
                        수집
                     </SecondaryButton>
                     <SecondaryButton
                        onClick={handleRefreshHostingCategories}
                        disabled={!selectedAccountPlatform}
                     >
                        호스팅 카테고리
                     </SecondaryButton>
                     <SecondaryButton onClick={() => setShowHostingPanel((current) => !current)}>
                        호스팅 로그인
                     </SecondaryButton>
                     {canSaveAndLoadDesigners ? (
                        <>
                           <SecondaryButton
                              onClick={handleSaveDesigners}
                              disabled={selectedBrand !== "Farfetch" && selectedBrand !== "Cettire"}
                           >
                              저장
                           </SecondaryButton>
                           <SecondaryButton
                              onClick={handleLoadDesigners}
                              disabled={selectedBrand !== "Farfetch" && selectedBrand !== "Cettire"}
                           >
                              불러오기
                           </SecondaryButton>
                        </>
                     ) : null}
                     {canFilter ? (
                        <SecondaryButton
                           onClick={handleFilterCettire}
                           disabled={selectedBrand !== "Cettire"}
                        >
                           필터링
                        </SecondaryButton>
                     ) : null}

                  </div>

                  {showHostingPanel ? (
                     <div className="grid gap-4 border border-zinc-200 bg-zinc-50 p-4 lg:grid-cols-[280px,1fr]">
                        <div className="border border-zinc-300 bg-white">
                           <div className="border-b border-zinc-300 px-3 py-2">
                              <p className="text-sm font-medium text-zinc-900">호스팅 계정</p>
                           </div>
                           <div className="max-h-[420px] overflow-auto">
                              {loadingAccounts ? (
                                 <div className="px-3 py-6 text-sm text-zinc-500">
                                    계정 목록을 불러오는 중입니다.
                                 </div>
                              ) : accounts.length === 0 ? (
                                 <div className="px-3 py-6 text-sm text-zinc-500">
                                    등록된 호스팅 계정이 없습니다.
                                 </div>
                              ) : (
                                 accounts.map((account) => (
                                    <HostingAccountRow
                                       key={account.accountPlatform}
                                       account={account}
                                       selected={selectedAccountPlatform === account.accountPlatform}
                                       onClick={() => handleSelectHostingAccount(account)}
                                    />
                                 ))
                              )}
                           </div>
                        </div>

                        <div className="space-y-4 border border-zinc-300 bg-white p-4">
                           <StatusMessage message={hostingMessage} />

                           <div className="grid gap-4 md:grid-cols-2">
                              <label className="block">
                                 <span className="text-sm font-medium text-zinc-600">
                                    platform
                                 </span>
                                 <select
                                    value={hostingForm.platform}
                                    onChange={(event) =>
                                       handleHostingFieldChange("platform", event.target.value)
                                    }
                                    className="mt-1.5 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm"
                                 >
                                    {PLATFORM_OPTIONS.map((platform) => (
                                       <option key={platform} value={platform}>
                                          {platform}
                                       </option>
                                    ))}
                                 </select>
                              </label>

                              <label className="block">
                                 <span className="text-sm font-medium text-zinc-600">
                                    accountPlatform
                                 </span>
                                 <input
                                    value={hostingForm.accountPlatform}
                                    onChange={(event) =>
                                       handleHostingFieldChange(
                                          "accountPlatform",
                                          event.target.value,
                                       )
                                    }
                                    className="mt-1.5 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm"
                                 />
                              </label>

                              <label className="block">
                                 <span className="text-sm font-medium text-zinc-600">
                                    {hostingForm.platform === "cafe24"
                                       ? "mallId (partnerKey)"
                                       : "partnerKey"}
                                 </span>
                                 <input
                                    value={hostingForm.partnerKey}
                                    onChange={(event) =>
                                       handleHostingFieldChange("partnerKey", event.target.value)
                                    }
                                    className="mt-1.5 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm"
                                 />
                              </label>

                              <label className="block">
                                 <span className="text-sm font-medium text-zinc-600">apiKey</span>
                                 <input
                                    value={hostingForm.apiKey}
                                    onChange={(event) =>
                                       handleHostingFieldChange("apiKey", event.target.value)
                                    }
                                    className="mt-1.5 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm"
                                 />
                              </label>

                              {hostingForm.platform === "cafe24" ? (
                                 <>
                                    <label className="block">
                                       <span className="text-sm font-medium text-zinc-600">
                                          refreshToken
                                       </span>
                                       <input
                                          value={hostingForm.refreshToken}
                                          onChange={(event) =>
                                             handleHostingFieldChange(
                                                "refreshToken",
                                                event.target.value,
                                             )
                                          }
                                          className="mt-1.5 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm"
                                       />
                                    </label>
                                    <label className="block">
                                       <span className="text-sm font-medium text-zinc-600">
                                          accessToken 만료
                                       </span>
                                       <input
                                          type="datetime-local"
                                          value={hostingForm.tokenExpiresAt}
                                          onChange={(event) =>
                                             handleHostingFieldChange(
                                                "tokenExpiresAt",
                                                event.target.value,
                                             )
                                          }
                                          className="mt-1.5 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm"
                                       />
                                    </label>
                                    <label className="block">
                                       <span className="text-sm font-medium text-zinc-600">
                                          refreshToken 만료
                                       </span>
                                       <input
                                          type="datetime-local"
                                          value={hostingForm.refreshTokenExpiresAt}
                                          onChange={(event) =>
                                             handleHostingFieldChange(
                                                "refreshTokenExpiresAt",
                                                event.target.value,
                                             )
                                          }
                                          className="mt-1.5 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm"
                                       />
                                    </label>
                                 </>
                              ) : null}
                           </div>

                           <div className="grid gap-4 md:grid-cols-2">
                              <label className="block">
                                 <span className="text-sm font-medium text-zinc-600">
                                    topImages
                                 </span>
                                 <textarea
                                    rows={5}
                                    value={hostingForm.topImages}
                                    onChange={(event) =>
                                       handleHostingFieldChange("topImages", event.target.value)
                                    }
                                    className="mt-1.5 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm"
                                 />
                              </label>
                              <label className="block">
                                 <span className="text-sm font-medium text-zinc-600">
                                    bottomImages
                                 </span>
                                 <textarea
                                    rows={5}
                                    value={hostingForm.bottomImages}
                                    onChange={(event) =>
                                       handleHostingFieldChange(
                                          "bottomImages",
                                          event.target.value,
                                       )
                                    }
                                    className="mt-1.5 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm"
                                 />
                              </label>
                           </div>

                           <div className="flex flex-wrap gap-2">
                              <PrimaryButton onClick={handleSaveHosting} disabled={savingHosting}>
                                 {savingHosting ? "저장 중..." : "저장"}
                              </PrimaryButton>
                              {hostingForm.platform === "cafe24" ? (
                                 <SecondaryButton
                                    onClick={handleConnectCafe24}
                                    disabled={savingHosting || connectingCafe24}
                                 >
                                    {connectingCafe24 ? "Cafe24 연동 중..." : "Cafe24 연동"}
                                 </SecondaryButton>
                              ) : null}
                           </div>
                        </div>
                     </div>
                  ) : null}

                  <StatusMessage message={collectionMessage} />

                  <div>
                     <div className="grid grid-cols-5 gap-3">
                        <ProgramListView
                           title={`${getSiteLabel(selectedBrand) || "브랜드"} 브랜드`}
                           items={designerItems.map((item) => ({
                              key: item.key,
                              label: item.name,
                              name: item.name,
                           }))}
                           selectedKeys={selectedDesignerKeys}
                           onToggle={toggleSelection(setSelectedDesignerKeys)}
                           emptyText={
                              selectedBrand === "Farfetch" || selectedBrand === "Cettire"
                                 ? "디자이너 목록이 아직 없습니다."
                                 : "부티끄 쇼핑몰 전용 입니다."
                           }
                        />

                        <ProgramListView
                           title={`${getSiteLabel(selectedBrand) || "브랜드"} 카테고리`}
                           items={sourceCategories.map((item) => ({
                              key: item.key,
                              label: item.categoryName,
                              categoryName: item.categoryName,
                              url: item.url,
                              categoryNumbers: item.categoryNumbers,
                           }))}
                           selectedKeys={selectedSourceKeys}
                           onToggle={toggleSelection(setSelectedSourceKeys)}
                           emptyText={
                              loadingCollection
                                 ? "카테고리를 불러오는 중입니다."
                                 : "브랜드 카테고리가 없습니다."
                           }
                        />

                        <ProgramListView
                           title="쇼핑몰 카테고리"
                           items={mallCategories.map((item) => ({
                              key: item.key,
                              label: item.categoryName,
                              categoryName: item.categoryName,
                              categoryCode: item.categoryCode,
                           }))}
                           selectedKeys={selectedMallKey ? [selectedMallKey] : []}
                           onToggle={handleSelectMallCategory}
                           emptyText="호스팅 카테고리를 먼저 가져와 주세요."
                           multi={false}
                        />

                        <ProgramListView
                           title="매핑한 카테고리"
                           items={mappedCategories.map((item) => ({
                              key: item.key,
                              label: item.label,
                           }))}
                           selectedKeys={selectedMappedKeys}
                           onToggle={toggleSelection(setSelectedMappedKeys)}
                           emptyText="저장된 매핑이 없습니다."
                        />

                        <ProgramListView
                           title="수집 카테고리"
                           items={collectionCategories.map((item) => ({
                              key: item.key,
                              label: item.label,
                           }))}
                           selectedKeys={selectedCollectionKeys}
                           onToggle={toggleSelection(setSelectedCollectionKeys)}
                           emptyText="수집 버튼을 눌러 매핑된 카테고리를 불러와 주세요."
                        />
                     </div>
                  </div>

                  <div className="flex flex-wrap justify-center gap-3">
                     <SecondaryButton onClick={handleRefreshSourceCategories}>
                        쇼핑몰 카테고리
                     </SecondaryButton>
                     <SecondaryButton onClick={handleSaveMapping}>매핑</SecondaryButton>
                     <SecondaryButton onClick={handleDeleteMapping}>매핑 삭제</SecondaryButton>
                     <SecondaryButton onClick={() => setActiveTab("margin")}>
                        마진설정
                     </SecondaryButton>
                     <SecondaryButton onClick={() => setActiveTab("replacement")}>
                        단어치환
                     </SecondaryButton>
                  </div>

                  <div className="border border-zinc-300 bg-zinc-50 px-4 py-4">
                     <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                           <p className="text-sm font-medium text-zinc-900">
                              수집 현황: {profile?.collectionMessage || "대기 중"}
                           </p>
                           <p className="mt-1 text-xs text-zinc-500">
                              {profile?.collectionCurrentCount ?? 0} /{" "}
                              {profile?.collectionTotalCount ?? 0} 완료
                              {profile?.collectionCurrentCategoryName
                                 ? ` · ${profile.collectionCurrentCategoryName}`
                                 : ""}
                           </p>
                        </div>
                        <SecondaryButton onClick={loadProfile}>새로고침</SecondaryButton>
                     </div>

                     <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                        <div
                           className="h-full rounded-full bg-[#8c6333] transition-all"
                           style={{
                              width: `${Math.max(
                                 0,
                                 Math.min(100, Number(profile?.collectionProgressPercent || 0)),
                              )}%`,
                           }}
                        />
                     </div>
                  </div>

                  <PrimaryButton
                     onClick={handleCreateSchedule}
                     className="w-full py-4 text-base"
                  >
                     수집예약
                  </PrimaryButton>
               </div>
            </section>
         ) : null}

         {activeTab === "margin" ? (
            <section className="border border-zinc-200 bg-white px-4 py-4 sm:px-5">
               <div className="space-y-4">
                  <StatusMessage message={marginMessage} />

                  <div className="border border-zinc-300 bg-white">
                     <div className="border-b border-zinc-300 px-3 py-2">
                        <p className="text-sm font-medium text-zinc-900">현재 설정중인 마진</p>
                     </div>
                     <div className="h-[220px] overflow-auto">
                        {loadingMargins ? (
                           <div className="px-3 py-6 text-sm text-zinc-500">
                              마진 목록을 불러오는 중입니다.
                           </div>
                        ) : margins.length === 0 ? (
                           <div className="px-3 py-6 text-sm text-zinc-500">
                              저장된 마진 규칙이 없습니다.
                           </div>
                        ) : (
                           <ul className="divide-y divide-zinc-200">
                              {margins.map((item) => {
                                 const selected = String(item.id) === String(selectedMarginId);

                                 return (
                                    <li key={item.id}>
                                       <button
                                          type="button"
                                          onClick={() => {
                                             setSelectedMarginId(String(item.id));
                                             setMarginForm({
                                                id: String(item.id || ""),
                                                minAmount: String(item.minAmount ?? ""),
                                                maxAmount: String(item.maxAmount ?? ""),
                                                minMargin: String(item.minMargin ?? ""),
                                                marginValue: String(item.marginValue ?? ""),
                                                exchangeRate: String(item.exchangeRate ?? ""),
                                                discountRate: String(item.discountRate ?? ""),
                                                site: item.site || selectedBrand || "",
                                             });
                                          }}
                                          className={clsx(
                                             "flex w-full flex-col items-start gap-1 px-3 py-2 text-left text-sm transition",
                                             selected
                                                ? "bg-[#fbf7ef] text-zinc-950"
                                                : "hover:bg-zinc-50",
                                          )}
                                       >
                                          <span className="font-medium">
                                             {getSiteLabel(item.site || "공통")}
                                          </span>
                                          <span className="text-xs text-zinc-500">
                                             {item.minAmount} ~ {item.maxAmount} / 마진 {item.marginValue}%
                                          </span>
                                       </button>
                                    </li>
                                 );
                              })}
                           </ul>
                        )}
                     </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[100px,1fr] md:items-center">
                     <label className="text-sm text-zinc-700">최소 금액:</label>
                     <input
                        value={marginForm.minAmount}
                        onChange={(event) =>
                           setMarginForm((current) => ({
                              ...current,
                              minAmount: event.target.value,
                           }))
                        }
                        placeholder="최소 금액 입력"
                        className="rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm"
                     />

                     <label className="text-sm text-zinc-700">최대 금액:</label>
                     <input
                        value={marginForm.maxAmount}
                        onChange={(event) =>
                           setMarginForm((current) => ({
                              ...current,
                              maxAmount: event.target.value,
                           }))
                        }
                        placeholder="최대 금액 입력"
                        className="rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm"
                     />

                     <label className="text-sm text-zinc-700">최소 마진:</label>
                     <input
                        value={marginForm.minMargin}
                        onChange={(event) =>
                           setMarginForm((current) => ({
                              ...current,
                              minMargin: event.target.value,
                           }))
                        }
                        placeholder="최소 마진 입력"
                        className="rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm"
                     />

                     <label className="text-sm text-zinc-700">마진 값 (%):</label>
                     <input
                        value={marginForm.marginValue}
                        onChange={(event) =>
                           setMarginForm((current) => ({
                              ...current,
                              marginValue: event.target.value,
                           }))
                        }
                        placeholder="마진 값 입력"
                        className="rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm"
                     />

                     <label className="text-sm text-zinc-700">환율:</label>
                     <input
                        value={marginForm.exchangeRate}
                        onChange={(event) =>
                           setMarginForm((current) => ({
                              ...current,
                              exchangeRate: event.target.value,
                           }))
                        }
                        placeholder="환율 입력"
                        className="rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm"
                     />

                     <label className="text-sm text-zinc-700">거래처 할인율 (%):</label>
                     <input
                        value={marginForm.discountRate}
                        onChange={(event) =>
                           setMarginForm((current) => ({
                              ...current,
                              discountRate: event.target.value,
                           }))
                        }
                        placeholder="거래처 할인율 입력"
                        className="rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm"
                     />

                     <label className="text-sm text-zinc-700">사이트:</label>
                     <select
                        value={marginForm.site}
                        onChange={(event) =>
                           setMarginForm((current) => ({
                              ...current,
                              site: event.target.value,
                           }))
                        }
                        className="rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm"
                     >
                        <option value="">사이트 선택</option>
                        {subscribedSites.map((site) => (
                           <option key={site} value={site}>
                              {getSiteLabel(site)}
                           </option>
                        ))}
                     </select>
                  </div>

                  <div className="flex flex-wrap gap-2">
                     <PrimaryButton onClick={handleSaveMargin}>저장</PrimaryButton>
                     <SecondaryButton onClick={handleDeleteMargin} disabled={!selectedMarginId}>
                        삭제
                     </SecondaryButton>
                  </div>
               </div>
            </section>
         ) : null}

         {activeTab === "replacement" ? (
            <section className="border border-zinc-200 bg-white px-4 py-4 sm:px-5">
               <div className="space-y-4">
                  <StatusMessage message={replacementMessage} />

                  <div className="border border-zinc-300 bg-white">
                     <div className="border-b border-zinc-300 px-3 py-2">
                        <p className="text-sm font-medium text-zinc-900">현재 설정중인 단어 치환</p>
                     </div>
                     <div className="h-[220px] overflow-auto">
                        {loadingReplacements ? (
                           <div className="px-3 py-6 text-sm text-zinc-500">
                              치환 목록을 불러오는 중입니다.
                           </div>
                        ) : replacements.length === 0 ? (
                           <div className="px-3 py-6 text-sm text-zinc-500">
                              저장된 치환 규칙이 없습니다.
                           </div>
                        ) : (
                           <ul className="divide-y divide-zinc-200">
                              {replacements.map((item) => {
                                 const selected =
                                    String(item.id) === String(selectedReplacementId);

                                 return (
                                    <li key={item.id}>
                                       <button
                                          type="button"
                                          onClick={() => {
                                             setSelectedReplacementId(String(item.id));
                                             setReplacementForm({
                                                id: String(item.id || ""),
                                                beforeWord: item.beforeWord || "",
                                                afterWord: item.afterWord || "",
                                             });
                                          }}
                                          className={clsx(
                                             "flex w-full flex-col items-start gap-1 px-3 py-2 text-left text-sm transition",
                                             selected
                                                ? "bg-[#fbf7ef] text-zinc-950"
                                                : "hover:bg-zinc-50",
                                          )}
                                       >
                                          <span className="font-medium">{item.beforeWord}</span>
                                          <span className="text-xs text-zinc-500">
                                             {item.afterWord}
                                          </span>
                                       </button>
                                    </li>
                                 );
                              })}
                           </ul>
                        )}
                     </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[120px,1fr] md:items-center">
                     <label className="text-sm text-zinc-700">치환할 단어:</label>
                     <input
                        value={replacementForm.beforeWord}
                        onChange={(event) =>
                           setReplacementForm((current) => ({
                              ...current,
                              beforeWord: event.target.value,
                           }))
                        }
                        placeholder="치환할 단어 입력"
                        className="rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm"
                     />

                     <label className="text-sm text-zinc-700">치환된 단어:</label>
                     <input
                        value={replacementForm.afterWord}
                        onChange={(event) =>
                           setReplacementForm((current) => ({
                              ...current,
                              afterWord: event.target.value,
                           }))
                        }
                        placeholder="치환된 단어 입력"
                        className="rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm"
                     />
                  </div>

                  <div className="flex flex-wrap gap-2">
                     <PrimaryButton onClick={handleSaveReplacement}>저장</PrimaryButton>
                     <SecondaryButton
                        onClick={handleDeleteReplacement}
                        disabled={!selectedReplacementId}
                     >
                        삭제
                     </SecondaryButton>
                  </div>
               </div>
            </section>
         ) : null}
      </div>
   );
}
