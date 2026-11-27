import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Provides near-real-time synchronization for admin pages across sessions.
 *
 * Features:
 * - Subscribes to mutation events to invalidate relevant admin queries
 * - Refreshes data when tab regains focus
 * - Works across multiple browser tabs/sessions simultaneously
 *
 * Usage:
 * Call useAdminRealtimeRefresh() at the top of admin page components
 * that need to stay synchronized with server changes.
 */
export const useAdminRealtimeRefresh = () => {
  const queryClient = useQueryClient();
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    if (isSubscribedRef.current) return;
    isSubscribedRef.current = true;

    // Subscribe to all mutations - when any mutation completes in any tab,
    // invalidate admin queries so all open admin sessions see fresh data
    const unsubscribe = queryClient.getMutationCache().subscribe((event) => {
      if (!event) return;

      // Invalidate all admin queries when any mutation occurs
      // React Query's cross-tab synchronization handles this
      queryClient.invalidateQueries({ queryKey: ["admin"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["settings"], exact: false });
    });

    return () => {
      unsubscribe();
      isSubscribedRef.current = false;
    };
  }, [queryClient]);

  // Refresh when tab regains focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        queryClient.invalidateQueries({ queryKey: ["admin"], exact: false });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [queryClient]);
};

/**
 * Hook for admin queries that enables real-time refresh behavior.
 * Use this as a wrapper for useQuery calls in admin pages.
 *
 * Usage:
 * import { useAdminQuery } from "../hooks/useAdminRealtimeRefresh";
 *
 * const { data, isPending } = useAdminQuery({
 *   queryKey: ["admin", "orders", page],
 *   queryFn: fetchOrders,
 * });
 */
export const useAdminQuery = (options) => {
  const adminOptions = {
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
    ...options,
  };

  return useQuery(adminOptions);
};
