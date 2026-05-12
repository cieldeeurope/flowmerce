"use client";

import { useEffect } from "react";
import { getSession, touchSessionActivity } from "@/lib/auth";

const ACTIVITY_EVENTS = [
   "pointerdown",
   "pointermove",
   "keydown",
   "scroll",
   "touchstart",
];
const SESSION_CHECK_INTERVAL_MS = 30 * 1000;

export default function UserSessionManager() {
   useEffect(() => {
      const syncSession = () => {
         getSession();
      };

      const handleActivity = () => {
         touchSessionActivity();
      };

      const handleVisibilityChange = () => {
         if (document.visibilityState === "visible") {
            touchSessionActivity(true);
         }
      };

      const handleFocus = () => {
         touchSessionActivity(true);
      };

      syncSession();

      if (getSession()) {
         touchSessionActivity(true);
      }

      const intervalId = window.setInterval(syncSession, SESSION_CHECK_INTERVAL_MS);

      ACTIVITY_EVENTS.forEach((eventName) => {
         window.addEventListener(eventName, handleActivity, { passive: true });
      });

      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("focus", handleFocus);

      return () => {
         window.clearInterval(intervalId);

         ACTIVITY_EVENTS.forEach((eventName) => {
            window.removeEventListener(eventName, handleActivity);
         });

         document.removeEventListener("visibilitychange", handleVisibilityChange);
         window.removeEventListener("focus", handleFocus);
      };
   }, []);

   return null;
}
