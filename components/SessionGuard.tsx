"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

/**
 * SessionGuard ensures that the session is bound only to the current
 * browser tab session (sessionStorage). If the user opens a new tab,
 * re-opens the browser, or swipes the app away on mobile, the sessionStorage 
 * is cleared.
 * 
 * In that case, SessionGuard automatically triggers signOut on Supabase 
 * to wipe any persistent cookies and forces a redirect back to the /login page,
 * ensuring biometrics / password must be verified again.
 */
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

    const checkSession = async () => {
      const isSessionActive = sessionStorage.getItem("di_veo_session_active") === "true";
      
      if (!isSessionActive) {
        // Wipe local storage refresh tokens and sign out of Supabase (clears cookies)
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
      } else {
        setChecking(false);
      }
    };

    checkSession();
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
