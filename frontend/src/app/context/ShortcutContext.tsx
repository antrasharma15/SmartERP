"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { X, HelpCircle, Keyboard } from "lucide-react";

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
  const [shortcuts, setShortcuts] = useState<ShortcutDefinition[]>([]);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const registerShortcut = (def: ShortcutDefinition) => {
    setShortcuts((prev) => {
      // Avoid duplicate registrations
      const exists = prev.some((item) => item.keys === def.keys && item.description === def.description);
      if (exists) return prev;
      return [...prev, def];
    });
  };

  const unregisterShortcut = (keys: string) => {
    setShortcuts((prev) => prev.filter((item) => item.keys !== keys));
  };

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
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isHelpOpen]);

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
          <div className="w-full max-w-2xl bg-brand-navy-dark/95 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setIsHelpOpen(false)}
              className="absolute top-6 right-6 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-900 transition"
              title="Close Guide (ESC)"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-900 pb-4">
              <div className="p-2.5 bg-brand-lime/10 border border-brand-lime/20 text-brand-lime rounded-xl">
                <Keyboard className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-1.5">
                  SmartERP Keyboard Shortcuts Guide
                </h2>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Tally ERP-style keyboard operations. Navigate the system without mouse clicks.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start max-h-[50vh] overflow-y-auto pr-2">
              
              {/* Left Column: Global Navigation shortcuts */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-brand-lime border-b border-slate-900 pb-1.5">
                  Global System Keys
                </h3>
                {globalShortcuts.length === 0 ? (
                  <p className="text-slate-500 italic">No global shortcuts active.</p>
                ) : (
                  <div className="space-y-2">
                    {globalShortcuts.map((s, idx) => (
                      <div key={idx} className="flex justify-between items-center py-0.5 text-slate-300 font-semibold">
                        <span>{s.description}</span>
                        <kbd className="px-2 py-1 bg-slate-950 border border-slate-800 rounded font-mono text-[9px] text-white shadow-inner">
                          {s.keys}
                        </kbd>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Page Specific Actions shortcuts */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-red-400 border-b border-slate-900 pb-1.5">
                  Current Screen Actions
                </h3>
                {pageShortcuts.length === 0 ? (
                  <p className="text-slate-500 italic text-[10px]">No page action hotkeys active on this screen.</p>
                ) : (
                  <div className="space-y-2">
                    {pageShortcuts.map((s, idx) => (
                      <div key={idx} className="flex justify-between items-center py-0.5 text-slate-300 font-semibold">
                        <span>{s.description}</span>
                        <kbd className="px-2 py-1 bg-slate-950 border border-slate-800 rounded font-mono text-[9px] text-brand-lime shadow-inner">
                          {s.keys}
                        </kbd>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-900 text-[10px] text-slate-500 font-mono">
              <span>Press ? or ESC to toggle this guide</span>
              <span className="text-brand-lime font-bold">SmartERP BI Suite</span>
            </div>
          </div>
        </div>
      )}
    </ShortcutContext.Provider>
  );
};
