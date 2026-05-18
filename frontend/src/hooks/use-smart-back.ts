/**
 * useSmartBack — Smart back navigation hook
 *
 * Priority order:
 *  1. `from` query param (explicit referrer, works across tabs, bookmarks, hard refresh)
 *  2. `document.referrer` on the same origin (soft navigation within the app)
 *  3. `fallback` prop (page-level default, e.g. the list page for a detail page)
 *
 * Why NOT router.back():
 *  - Breaks when user opens link in new tab (no history)
 *  - Breaks when user lands directly via URL / bookmark
 *  - Cannot be overridden declaratively
 */

import { useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"

interface UseSmartBackOptions {
  /** The default destination if no referrer is found. */
  fallback: string
  /**
   * Map of `from` param values to their resolved paths.
   * e.g. { tasks: "/production-management/tasks" }
   * The current page's parent list is always available as "list" → fallback.
   */
  fromMap?: Record<string, string>
}

export function useSmartBack({ fallback, fromMap = {} }: UseSmartBackOptions) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const resolveHref = useCallback((): string => {
    // 1. Explicit `from` query param — most reliable
    const fromParam = searchParams.get("from")
    if (fromParam) {
      const mapped = fromMap[fromParam]
      if (mapped) return mapped
      // If the param value looks like a path, use it directly (future-proof)
      if (fromParam.startsWith("/")) return fromParam
    }

    // 2. document.referrer on same origin — works for soft in-app navigation
    if (typeof document !== "undefined" && document.referrer) {
      try {
        const referrerUrl = new URL(document.referrer)
        if (referrerUrl.origin === window.location.origin) {
          const referrerPath = referrerUrl.pathname
          // Don't go back to the same page (login, error, same detail page)
          if (referrerPath !== window.location.pathname) {
            return referrerPath + referrerUrl.search
          }
        }
      } catch {
        // Ignore malformed referrer URLs
      }
    }

    // 3. Fallback — the canonical parent list page
    return fallback
  }, [searchParams, fromMap, fallback])

  const goBack = useCallback(() => {
    router.push(resolveHref())
  }, [router, resolveHref])

  const backHref = resolveHref()

  return { goBack, backHref }
}
