"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { X, HelpCircle, Keyboard } from "lucide-react";
import { useRouter } from "next/navigation";

export interface ShortcutDefinition {
  keys: string;
  description: string;
  category: "Global" | "Page Actions";
}

interface ShortcutContextType {
  registerShortcut: (def: ShortcutDefinition) => void;
  unregisterShortcut: (keys: string) => void;
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
    { keys: "?", description: "Toggle Keyboard Shortcuts Help", category: "Global" }
  ]);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const registerShortcut = useCallback((def: ShortcutDefinition) => {
    setShortcuts((prev) => {
      // Avoid duplicate registrations
      const exists = prev.some((item) => item.keys === def.keys && item.description === def.description);
      if (exists) return prev;
      return [...prev, def];
    });
  }, []);

  const unregisterShortcut = useCallback((keys: string) => {
    setShortcuts((prev) => prev.filter((item) => item.keys !== keys));
  }, []);

  // Register "?" key globally (except when typing in form controls)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isTyping = 
        document.activeElement?.tagName === "INPUT" || 
        document.activeElement?.tagName === "SELECT" || 
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.getAttribute("contenteditable") === "true";

      if (isTyping) return;

      if (e.key === "?") {
        e.preventDefault();
        setIsHelpOpen((prev) => !prev);
      }

      if (e.key === "Escape" && isHelpOpen) {
        e.preventDefault();
        setIsHelpOpen(false);
      }

      // Global Navigation Triggers: Alt + Key
      if (e.altKey) {
        const key = e.key.toLowerCase();
        if (key === "g" || key === "n" || key === "o") {
          e.preventDefault();
          router.push("/groups");
        } else if (key === "l") {
          e.preventDefault();
          router.push("/ledgers");
        } else if (key === "a") {
          e.preventDefault();
          router.push("/reports/balance-sheet");
        } else if (key === "s") {
          e.preventDefault();
          router.push("/inventory?tab=items");
        } else if (key === "u") {
          e.preventDefault();
          router.push("/inventory?tab=units");
        } else if (key === "v") {
          e.preventDefault();
          router.push("/vouchers");
        } else if (key === "b") {
          e.preventDefault();
          router.push("/billing");
        } else if (key === "c") {
          e.preventDefault();
          router.push("/reports/cash-bank");
        } else if (key === "d") {
          e.preventDefault();
          router.push("/reports/day-book");
        } else if (key === "p") {
          e.preventDefault();
          router.push("/reports/profit-loss");
        } else if (key === "t") {
          e.preventDefault();
          router.push("/reports/trial-balance");
        } else if (key === "i") {
          e.preventDefault();
          router.push("/inventory");
        } else if (key === "r" || key === "k") {
          e.preventDefault();
          router.push("/reports/stock-summary");
        } else if (key === "h") {
          e.preventDefault();
          router.push("/dashboard");
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isHelpOpen, router]);

  // Group shortcuts by category
  const globalShortcuts = shortcuts.filter((s) => s.category === "Global");
  const pageShortcuts = shortcuts.filter((s) => s.category === "Page Actions");

  return (
    <ShortcutContext.Provider
      value={{
        registerShortcut,
        unregisterShortcut,
        shortcuts,
        isHelpOpen,
        setIsHelpOpen
      }}
    >
      {children}

      {/* Glassmorphic Help Cheat Sheet Overlay */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-sans text-xs">
          <div className="w-full max-w-2xl bg-brand-navy-dark/95 border border-slate-800 light:border-slate-200 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setIsHelpOpen(false)}
              className="absolute top-6 right-6 p-1.5 rounded-full text-slate-400 light:text-slate-600 hover:text-white light:text-slate-900 light:hover:text-black hover:bg-slate-900 light:bg-slate-200/80 transition"
              title="Close Guide (ESC)"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-900 light:border-slate-200 pb-4">
              <div className="p-2.5 bg-brand-lime/10 light:bg-lime-100/60 border border-brand-lime/20 text-brand-lime light:text-lime-700 rounded-xl">
                <Keyboard className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white light:text-slate-900 flex items-center gap-1.5">
                  KEYbooks Keyboard Shortcuts Guide
                </h2>
                <p className="text-[10px] text-slate-400 light:text-slate-600 mt-0.5">
                  Tally ERP-style keyboard operations. Navigate the system without mouse clicks.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start max-h-[50vh] overflow-y-auto pr-2">
              
              {/* Left Column: Global Navigation shortcuts */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-brand-lime light:text-lime-700 border-b border-slate-900 light:border-slate-200 pb-1.5">
                  Global System Keys
                </h3>
                {globalShortcuts.length === 0 ? (
                  <p className="text-slate-500 light:text-slate-500 italic">No global shortcuts active.</p>
                ) : (
                  <div className="space-y-2">
                    {globalShortcuts.map((s, idx) => (
                      <div key={idx} className="flex justify-between items-center py-0.5 text-slate-300 light:text-slate-700 font-semibold">
                        <span>{s.description}</span>
                        <kbd className="px-2 py-1 bg-slate-950 light:bg-slate-100 border border-slate-800 light:border-slate-200 rounded font-mono text-[9px] text-white light:text-slate-900 shadow-inner">
                          {s.keys}
                        </kbd>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Page Specific Actions shortcuts */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-red-400 border-b border-slate-900 light:border-slate-200 pb-1.5">
                  Current Screen Actions
                </h3>
                {pageShortcuts.length === 0 ? (
                  <p className="text-slate-500 light:text-slate-500 italic text-[10px]">No page action hotkeys active on this screen.</p>
                ) : (
                  <div className="space-y-2">
                    {pageShortcuts.map((s, idx) => (
                      <div key={idx} className="flex justify-between items-center py-0.5 text-slate-300 light:text-slate-700 font-semibold">
                        <span>{s.description}</span>
                        <kbd className="px-2 py-1 bg-slate-950 light:bg-slate-100 border border-slate-800 light:border-slate-200 rounded font-mono text-[9px] text-brand-lime light:text-lime-700 shadow-inner">
                          {s.keys}
                        </kbd>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-900 light:border-slate-200 text-[10px] text-slate-500 light:text-slate-500 font-mono">
              <span>Press ? or ESC to toggle this guide</span>
              <span className="text-brand-lime light:text-lime-700 font-bold">KEYbooks BI Suite</span>
            </div>
          </div>
        </div>
      )}
    </ShortcutContext.Provider>
  );
};
