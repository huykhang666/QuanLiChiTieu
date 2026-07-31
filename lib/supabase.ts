import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase browser client configured for "banking-style" security:
 * - storageKey is set to sessionStorage so session is cleared when the
 *   browser tab / window is closed (no persistent login across sessions).
 * - autoRefreshToken is still enabled so the session stays alive while
 *   the user is actively using the app, but disappears the moment the
 *   tab is closed.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Use sessionStorage instead of localStorage
        // → session is wiped when the tab/browser closes
        storage: typeof window !== "undefined" ? window.sessionStorage : undefined,
        // Keep refreshing token while the tab is open
        autoRefreshToken: true,
        // Don't persist to localStorage at all
        persistSession: true,
        // Detect session from URL (needed for OAuth / magic link)
        detectSessionInUrl: true,
      },
    }
  );
}
