"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { X, Keyboard } from "lucide-react";
import { useRouter } from "next/navigation";

export interface ShortcutDefinition {
  keys: string;
  description: string;
  category: "Global" | "Page Actions";
}

interface ShortcutContextType {
  registerShortcut: (def: ShortcutDefinition) => void;
  unregisterShortcut: (keys: string, description?: string) => void;
  shortcuts: ShortcutDefinition[];
  isHelpOpen: boolean;
  setIsHelpOpen: (open: boolean) => void;
}

const ShortcutContext = createContext<ShortcutContextType | undefined>(undefined);

export const useShortcutContext = () => {
  const context = useContext(ShortcutContext);
  if (!context) throw new Error("useShortcutContext must be used within ShortcutProvider");
  return context;
};

/** "Alt+A" -> "alt+a", so a claim can be matched against a live KeyboardEvent. */
const normalizeKeys = (keys?: string) =>
  typeof keys === "string"
    ? keys.toLowerCase().split("+").map((p) => p.trim()).sort().join("+")
    : "";

/** Alt-key navigation targets owned by the provider. */
const ALT_ROUTES: Record<string, string> = {
  g: "/groups",
  n: "/groups",
  o: "/groups",
  l: "/ledgers",
  a: "/reports/balance-sheet",
  s: "/inventory?tab=items",
  u: "/inventory?tab=units",
  v: "/vouchers",
  b: "/billing",
  c: "/reports/cash-bank",
  d: "/reports/day-book",
  p: "/reports/profit-loss",
  t: "/reports/trial-balance",
  i: "/inventory",
  r: "/reports/stock-summary",
  k: "/reports/stock-summary",
  h: "/dashboard",
};

export const ShortcutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [shortcuts, setShortcuts] = useState<ShortcutDefinition[]>([
    { keys: "Alt+H", description: "Navigate Home", category: "Global" },
    { keys: "Alt+L", description: "Ledgers Directory", category: "Global" },
    { keys: "Alt+N / Alt+O", description: "Account Groups Directory (Alt+G is used by Gemini)", category: "Global" },
    { keys: "Alt+I", description: "Inventory Dashboard", category: "Global" },
    { keys: "Alt+S", description: "Stock Items Directory", category: "Global" },
    { keys: "Alt+U", description: "Units Directory", category: "Global" },
    { keys: "Alt+V", description: "Voucher Entry Portal", category: "Global" },
    { keys: "Alt+B", description: "Billing Register", category: "Global" },
    { keys: "Alt+C", description: "Cash/Bank Book Register", category: "Global" },
    { keys: "Alt+D", description: "Day Book Register", category: "Global" },
    { keys: "Alt+A", description: "Balance Sheet Report", category: "Global" },
    { keys: "Alt+P", description: "Profit & Loss Statement", category: "Global" },
    { keys: "Alt+T", description: "Trial Balance Sheet", category: "Global" },
    { keys: "Alt+K / Alt+R", description: "Stock Summary Valuation", category: "Global" },
    { keys: "F1", description: "Change Active Company", category: "Global" },
    { keys: "F2", description: "Change Financial Period", category: "Global" },
    { keys: "F3", description: "View Company Details", category: "Global" },
    { keys: "F4", description: "Toggle Calculator Widget", category: "Global" },
    { keys: "F8", description: "Sales Voucher Entry", category: "Global" },
    { keys: "F9", description: "Purchase Voucher Entry", category: "Global" },
    { keys: "Ctrl+K", description: "Toggle Command Search Panel", category: "Global" },
    { keys: "Ctrl+Q", description: "Logout Session", category: "Global" },
    { keys: "?", description: "Toggle Keyboard Shortcuts Help", category: "Global" },
  ]);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Refcounted set of combos the *current page* has claimed. The global Alt
  // navigator below defers to these, so e.g. Alt+A on /billing/create adds an
  // invoice line instead of also navigating away and discarding the draft.
  const claimed = useRef<Map<string, number>>(new Map());

  const registerShortcut = useCallback((def: ShortcutDefinition) => {
    if (def.category === "Page Actions") {
      const k = normalizeKeys(def.keys);
      claimed.current.set(k, (claimed.current.get(k) || 0) + 1);
    }
    setShortcuts((prev) => {
      const exists = prev.some((item) => item.keys === def.keys && item.description === def.description);
      if (exists) return prev;
      return [...prev, def];
    });
  }, []);

  const unregisterShortcut = useCallback((keys: string, description?: string) => {
    const k = normalizeKeys(keys);
    const count = claimed.current.get(k);
    if (count !== undefined) {
      if (count <= 1) claimed.current.delete(k);
      else claimed.current.set(k, count - 1);
    }
    // Match on description too: several pages register "Escape", and dropping
    // them all because one unmounted left the cheat sheet wrong.
    setShortcuts((prev) =>
      prev.filter((item) =>
        description === undefined ? item.keys !== keys : !(item.keys === keys && item.description === description)
      )
    );
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!e || typeof e.key !== "string") return;

      const el = document.activeElement;
      const isTyping =
        el?.tagName === "INPUT" ||
        el?.tagName === "SELECT" ||
        el?.tagName === "TEXTAREA" ||
        el?.getAttribute("contenteditable") === "true";

      if (isTyping) return;

      if (e.key === "?") {
        e.preventDefault();
        setIsHelpOpen((prev) => !prev);
        return;
      }

      if (e.key === "Escape" && isHelpOpen) {
        e.preventDefault();
        setIsHelpOpen(false);
        return;
      }

      // Global navigation: Alt + key.
      // Ctrl/Meta must be clear — AltGr reports as Ctrl+Alt on Indian and
      // European layouts, so typing an AltGr character used to navigate away.
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const key = e.key.toLowerCase();
        const target = ALT_ROUTES[key];
        if (!target) return;
        if (claimed.current.has(normalizeKeys(`alt+${key}`))) return; // page owns this combo
        e.preventDefault();
        router.push(target);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isHelpOpen, router]);

  const globalShortcuts = shortcuts.filter((s) => s.category === "Global");
  const pageShortcuts = shortcuts.filter((s) => s.category === "Page Actions");

  return (
    <ShortcutContext.Provider
      value={{ registerShortcut, unregisterShortcut, shortcuts, isHelpOpen, setIsHelpOpen }}
    >
      {children}

      {isHelpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-[2px] animate-fade-in"
          onClick={() => setIsHelpOpen(false)}
        >
          <div
            className="panel animate-pop-in w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
          >
            <div className="panel-head">
              <span className="flex items-center gap-2">
                <Keyboard className="w-4 h-4" style={{ color: "var(--accent)" }} />
                Keyboard Shortcuts
              </span>
              <button onClick={() => setIsHelpOpen(false)} className="btn btn-ghost btn-sm" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="panel-body grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 max-h-[60vh] overflow-y-auto">
              <section className="space-y-1">
                <h3 className="label doodle-underline mb-3">Global System Keys</h3>
                {globalShortcuts.map((s, idx) => (
                  <div key={`g${idx}`} className="flex justify-between items-center gap-4 py-1">
                    <span className="text-[0.78rem]" style={{ color: "var(--ink-1)" }}>{s.description}</span>
                    <kbd className="kbd">{s.keys}</kbd>
                  </div>
                ))}
              </section>

              <section className="space-y-1">
                <h3 className="label doodle-underline mb-3">This Screen</h3>
                {pageShortcuts.length === 0 ? (
                  <p className="text-[0.75rem] italic" style={{ color: "var(--ink-3)" }}>
                    No page hotkeys on this screen.
                  </p>
                ) : (
                  pageShortcuts.map((s, idx) => (
                    <div key={`p${idx}`} className="flex justify-between items-center gap-4 py-1">
                      <span className="text-[0.78rem]" style={{ color: "var(--ink-1)" }}>{s.description}</span>
                      <kbd className="kbd kbd-hot">{s.keys}</kbd>
                    </div>
                  ))
                )}
              </section>
            </div>

            <div
              className="flex justify-between items-center px-4 py-2.5 text-[0.66rem] font-mono border-t"
              style={{ borderColor: "var(--mat-edge)", color: "var(--ink-3)" }}
            >
              <span>
                <kbd className="kbd">?</kbd> or <kbd className="kbd">Esc</kbd> to close
              </span>
              <span className="font-display font-bold" style={{ color: "var(--accent)" }}>KEYbooks</span>
            </div>
          </div>
        </div>
      )}
    </ShortcutContext.Provider>
  );
};
