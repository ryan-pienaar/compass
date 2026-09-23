import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export interface CapturePrefill {
  title?: string;
  roleId?: string | null;
  goalId?: string | null;
  scheduledDate?: string | null;
  /** Framing: "interruption" when something came up during the day. */
  mode?: "capture" | "interruption";
}

interface AppState {
  capture: { open: boolean; prefill: CapturePrefill };
  openCapture: (prefill?: CapturePrefill) => void;
  closeCapture: () => void;
  taskId: string | null;
  openTask: (id: string) => void;
  closeTask: () => void;
  focusId: string | null;
  openFocus: (id: string) => void;
  closeFocus: () => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [capture, setCapture] = useState<{ open: boolean; prefill: CapturePrefill }>({ open: false, prefill: {} });
  const [taskId, setTaskId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const openCapture = useCallback((prefill: CapturePrefill = {}) => setCapture({ open: true, prefill }), []);
  const closeCapture = useCallback(() => setCapture((c) => ({ ...c, open: false })), []);
  const openTask = useCallback((id: string) => setTaskId(id), []);
  const closeTask = useCallback(() => setTaskId(null), []);
  const openFocus = useCallback((id: string) => {
    setTaskId(null);
    setFocusId(id);
  }, []);
  const closeFocus = useCallback(() => setFocusId(null), []);

  const value = useMemo(
    () => ({ capture, openCapture, closeCapture, taskId, openTask, closeTask, focusId, openFocus, closeFocus, paletteOpen, setPaletteOpen }),
    [capture, openCapture, closeCapture, taskId, openTask, closeTask, focusId, openFocus, closeFocus, paletteOpen],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppState must be used inside AppStateProvider");
  return ctx;
}
