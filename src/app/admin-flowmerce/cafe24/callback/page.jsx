"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { exchangeCafe24AccessToken } from "@/lib/admin";
import { exchangeWorkspaceCafe24AccessToken } from "@/lib/workspace";

const OAUTH_STATE_KEY = "flowmerce_cafe24_oauth_state";

function decodeStateValue(value) {
   const normalized = String(value || "")
      .replace(/-/g, "+")
      .replace(/_/g, "/");
   const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
   return JSON.parse(atob(padded));
}

export default function Cafe24CallbackPage() {
   const searchParams = useSearchParams();
   const [message, setMessage] = useState(
      "Cafe24 연동을 처리하고 있습니다...",
   );
   const [isError, setIsError] = useState(false);

   useEffect(() => {
      let cancelled = false;

      async function run() {
         try {
            const code = searchParams.get("code");
            const state = searchParams.get("state");
            const error = searchParams.get("error");

            if (error) {
               throw new Error(`Cafe24 OAuth error: ${error}`);
            }

            if (!code || !state) {
               throw new Error(
                  "Cafe24 연동 정보가 누락되었습니다.",
               );
            }

            const savedState =
               typeof window !== "undefined"
                  ? window.sessionStorage.getItem(OAUTH_STATE_KEY)
                  : null;

            if (!savedState || savedState !== state) {
               throw new Error(
                  "Cafe24 연동 state 값이 일치하지 않습니다.",
               );
            }

            const parsedState = decodeStateValue(state);
            const appOrigin =
               String(parsedState?.appOrigin || "").trim() ||
               window.location.origin;
            const returnPath =
               String(parsedState?.returnPath || "").trim() ||
               "/admin-flowmerce";
            const accessScope =
               String(parsedState?.accessScope || "admin").trim() || "admin";

            const exchangeToken =
               accessScope === "user"
                  ? exchangeWorkspaceCafe24AccessToken
                  : exchangeCafe24AccessToken;

            const result = await exchangeToken({
               customId: parsedState.customId,
               accountPlatform: parsedState.accountPlatform,
               mallId: parsedState.mallId,
               code,
            });

            if (typeof window !== "undefined") {
               window.sessionStorage.removeItem(OAUTH_STATE_KEY);

               if (window.opener && !window.opener.closed) {
                  window.opener.postMessage(
                     {
                        type: "flowmerce-cafe24-connected",
                        account: result.account || null,
                     },
                     appOrigin,
                  );
               }
            }

            if (!cancelled) {
               setMessage(
                  "Cafe24 연동이 완료되었습니다. 잠시 후 창을 닫습니다.",
               );
            }

            window.setTimeout(() => {
               if (
                  typeof window !== "undefined" &&
                  window.opener &&
                  !window.opener.closed
               ) {
                  window.close();
               } else if (typeof window !== "undefined") {
                  window.location.href = `${appOrigin}${returnPath}`;
               }
            }, 900);
         } catch (loadError) {
            if (cancelled) {
               return;
            }

            setIsError(true);
            setMessage(
               loadError?.message ||
                  "Cafe24 연동 처리에 실패했습니다.",
            );
         }
      }

      void run();

      return () => {
         cancelled = true;
      };
   }, [searchParams]);

   return (
      <main className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-6 py-16">
         <div
            className={`w-full rounded-lg border px-6 py-8 shadow-sm ${
               isError
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-zinc-200 bg-white text-zinc-900"
            }`}
         >
            <h1 className="text-xl font-semibold">
               {"Cafe24 연동"}
            </h1>
            <p className="mt-3 text-sm leading-6">{message}</p>
         </div>
      </main>
   );
}
