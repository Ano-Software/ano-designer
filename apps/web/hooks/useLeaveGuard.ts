"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type LeaveAction = () => void;

type LeaveGuardResult = {
  isDialogOpen: boolean;
  requestLeave: (action?: LeaveAction) => void;
  confirmLeave: () => void;
  cancelLeave: () => void;
};

export function useLeaveGuard(enabled: boolean): LeaveGuardResult {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const pendingActionRef = useRef<LeaveAction | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled]);

  const requestLeave = useCallback(
    (action?: LeaveAction) => {
      if (!enabled) {
        action?.();
        return;
      }

      pendingActionRef.current = action ?? null;
      setDialogOpen(true);
    },
    [enabled]
  );

  const confirmLeave = useCallback(() => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    setDialogOpen(false);
    action?.();
  }, []);

  const cancelLeave = useCallback(() => {
    pendingActionRef.current = null;
    setDialogOpen(false);
  }, []);

  return {
    isDialogOpen,
    requestLeave,
    confirmLeave,
    cancelLeave,
  };
}
