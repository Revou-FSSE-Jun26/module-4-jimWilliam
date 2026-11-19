"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/apiClient";
import { ApiError } from "@/lib/errors";
import type { Notification, NotificationPage } from "@/lib/types";

export const POLL_INTERVAL_MS = 30_000;

/**
 * Polls GET /api/notifications every 30 seconds while signed in (R19.2) and stops on unmount
 * or sign-out (R19.5). Errors are silent: a missed poll is retried on the next tick.
 */
export function useNotifications() {
  const { token, logout } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const page = await apiClient<NotificationPage>("/api/notifications?page=1&per_page=10", { token });
      setItems(page.items);
      setUnreadCount(page.unread_count);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) void logout();
    }
  }, [token, logout]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const poll = () =>
      apiClient<NotificationPage>("/api/notifications?page=1&per_page=10", { token })
        .then((page) => {
          if (cancelled) return;
          setItems(page.items);
          setUnreadCount(page.unread_count);
        })
        .catch((err) => {
          if (!cancelled && err instanceof ApiError && err.statusCode === 401) void logout();
        });
    void poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token, logout]);

  const markRead = useCallback(
    async (id: string) => {
      const target = items.find((n) => n.id === id);
      if (!token || !target || target.read) return;
      setItems((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((n) => Math.max(0, n - 1)); // R19.3
      try {
        await apiClient(`/api/notifications/${id}/read`, { method: "PATCH", token });
      } catch {
        void refresh();
      }
    },
    [items, token, refresh],
  );

  return { items, unreadCount, markRead, refresh };
}
