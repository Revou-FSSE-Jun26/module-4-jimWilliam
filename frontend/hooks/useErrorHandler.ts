"use client";

import { useCallback } from "react";

import { useAuth } from "@/context/AuthContext";
import { ApiError, messageForStatus } from "@/lib/errors";
import { notify } from "@/lib/toast";

/** Maps ApiError status codes to toasts; 401 also ends the session (R21.6, R21.7). */
export function useErrorHandler() {
  const { logout } = useAuth();

  return useCallback(
    (error: unknown) => {
      if (error instanceof ApiError) {
        notify.error(messageForStatus(error.statusCode, error.message));
        if (error.statusCode === 401) void logout();
        return;
      }
      notify.error(messageForStatus(500));
    },
    [logout],
  );
}
