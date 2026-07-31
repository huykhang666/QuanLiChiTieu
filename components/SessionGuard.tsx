"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

// Banking-style timeout: If the app is inactive or backgrounded 
// for more than 30 seconds, force logout and require biometrics/password again.
const INACTIVITY_TIMEOUT_MS = 30 * 1000; 

export default function SessionGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Skip verification for the login page
    if (pathname === "/login") {
      setChecking(false);
      return;
    }

    const performSignOut = async () => {
      // Clear token and flags
      sessionStorage.removeItem("di_veo_session_active");
      localStorage.removeItem("di_veo_last_active");
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    };

    const verifyActiveSession = async () => {
      const isSessionActive = sessionStorage.getItem("di_veo_session_active") === "true";
      const lastActiveStr = localStorage.getItem("di_veo_last_active");

      // 1. If basic sessionStorage flag is missing (new tab/browser start)
      if (!isSessionActive) {
        await performSignOut();
        return;
      }

      // 2. If the last active timestamp exists, check if the inactivity window has passed
      if (lastActiveStr) {
        const elapsed = Date.now() - Number(lastActiveStr);
        if (elapsed > INACTIVITY_TIMEOUT_MS) {
          await performSignOut();
          return;
        }
      }

      // Session is still valid, let the user in
      setChecking(false);
      localStorage.setItem("di_veo_last_active", Date.now().toString());
    };

    // Initial check on mount/navigation
    verifyActiveSession();

    // Heartbeat: update the activity timestamp every 2 seconds while the user is active on the page
    const heartbeatInterval = setInterval(() => {
      if (sessionStorage.getItem("di_veo_session_active") === "true") {
        localStorage.setItem("di_veo_last_active", Date.now().toString());
      }
    }, 2000);

    // Visibility Listener: Check if user returned to the app after switching apps or locking phone
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        verifyActiveSession();
      }
    };

    // Window Focus Listener: Detect returning to app
    const handleFocus = () => {
      verifyActiveSession();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(heartbeatInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [pathname, router, supabase.auth]);

  if (checking && pathname !== "/login") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F7F6F3] dark:bg-slate-900 transition-colors">
        <div className="flex items-center gap-2.5">
          <svg className="animate-spin w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Xác thực phiên làm việc...</span>
        </div>
      </div>
    );
  }

  return null;
}
