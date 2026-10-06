"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "../utils/api";
import AppLayout from "../components/AppLayout";
import {
  Building2,
  ChevronRight,
  ArrowLeft,
  HelpCircle,
  FileText,
  BarChart3,
  Scale,
  TrendingUp,
  ClipboardList,
  Boxes,
  Wallet
} from "lucide-react";

interface ReportMenuItem {
  label: string;
  description: string;
  hotkey: string;
  icon: any;
  action: () => void;
}

export default function ReportsGatewayPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);

  const [selectedRowIndex, setSelectedRowIndex] = useState(0);

  // Toast notifications state
  const [toasts, setToasts] = useState<{ id: string; text: string }[]>([]);

  // Trigger Toast helper
  const triggerToast = (text: string) => {
    const id = Math.random().toString();
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    console.log("[ReportsGateway] Checking session...");
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }
    setUser(currentUser);

    const activeCompanyStr = localStorage.getItem("activeCompany");
    if (!activeCompanyStr) {
      router.push("/companies");
      return;
    }

    try {
      const activeCompany = JSON.parse(activeCompanyStr);
      setCompany(activeCompany);
    } catch (err) {
      console.error("[ReportsGateway Error] Active company failed:", err);
      router.push("/companies");
    }
  }, [router]);

  const reportItems: ReportMenuItem[] = [
    {
      label: "Trial Balance",
      description: "Verify debit and credit ledger posting balances for the selected financial year.",
      hotkey: "T",
      icon: Scale,
      action: () => router.push("/reports/trial-balance")
    },
    {
      label: "Profit & Loss Account",
      description: "Analyze direct operating margins, indirect expenses, and net profit margins.",
      hotkey: "P",
      icon: TrendingUp,
      action: () => router.push("/reports/profit-loss")
    },
    {
      label: "Balance Sheet",
      description: "Review company asset listings, long-term liabilities, equity and surplus.",
      hotkey: "B",
      icon: BarChart3,
      action: () => router.push("/reports/balance-sheet")
    },
    {
      label: "Day Book Register",
      description: "Inspect chronological audit trails of all vouchers posted across dates.",
      hotkey: "D",
      icon: ClipboardList,
      action: () => router.push("/reports/day-book")
    },
    {
      label: "Stock Valuation Summary",
      description: "Review current stock balances, SKU codes, and total inventory asset valuations.",
      hotkey: "S",
      icon: Boxes,
      action: () => router.push("/reports/stock-summary")
    },
    {
      label: "Cash & Bank Book Register",
      description: "Audit liquid inflows, operational payments, and real-time ledger cash/bank balances.",
      hotkey: "C",
      icon: Wallet,
      action: () => router.push("/reports/cash-bank")
    }
  ];

  // Keyboard Navigation hooks
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTyping = 
        document.activeElement?.tagName === "INPUT" || 
        document.activeElement?.tagName === "SELECT" || 
        document.activeElement?.tagName === "TEXTAREA";

      if (isTyping) return;

      // ESC: Return to dashboard
      if (e.key === "Escape") {
        e.preventDefault();
        router.push("/dashboard");
        return;
      }

      // Arrow keys
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedRowIndex((prev) => (prev + 1) % reportItems.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedRowIndex((prev) => (prev - 1 + reportItems.length) % reportItems.length);
      }

      // Enter key
      if (e.key === "Enter") {
        e.preventDefault();
        reportItems[selectedRowIndex].action();
        return;
      }

      // Hotkey listeners
      const keyUpper = e.key.toUpperCase();
      const matched = reportItems.find(item => item.hotkey === keyUpper);
      if (matched && !e.altKey && !e.ctrlKey) {
        e.preventDefault();
        matched.action();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedRowIndex, router]);

  // Scroll selected report item into view
  useEffect(() => {
    const selectedItemEl = document.querySelector(`[data-row-index="${selectedRowIndex}"]`);
    if (selectedItemEl) {
      selectedItemEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedRowIndex]);

  return (
    <AppLayout
      pageTitle="Display Reports Menu"
      pageSubtitle="Analyze audited financial ledgers, transactional books, and physical inventory stock values."
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="rounded-3xl bg-slate-900/30 light:bg-white border border-slate-800 light:border-slate-200 p-6 shadow-xl backdrop-blur-xl space-y-4">
          <div className="space-y-3">
            {reportItems.map((item, idx) => {
              const isSelected = selectedRowIndex === idx;
              const IconComp = item.icon;
              
              // Highlight hotkey letter
              const hotkeyIndex = item.label.toUpperCase().indexOf(item.hotkey);
              
              return (
                <div
                  key={item.label}
                  data-row-index={idx}
                  onClick={() => {
                    setSelectedRowIndex(idx);
                    item.action();
                  }}
                  className={`p-4 rounded-2xl border transition duration-150 cursor-pointer flex items-center justify-between scroll-mt-24 ${
                    isSelected
                      ? "bg-red-500/10 border-red-500/30 text-white light:text-slate-900 font-bold"
                      : "bg-slate-900/40 light:bg-slate-50/50 border-slate-800/80 light:border-slate-200 text-slate-300 light:text-slate-700 hover:text-white light:hover:text-black hover:bg-slate-800/60 light:hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl border transition ${
                      isSelected 
                        ? "bg-red-500/20 border-red-500/40 text-red-400" 
                        : "bg-slate-950 light:bg-white border-slate-800 light:border-slate-200 text-slate-400 light:text-slate-600"
                    }`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white light:text-slate-900 flex items-center gap-1">
                        {hotkeyIndex !== -1 ? (
                          <>
                            {item.label.slice(0, hotkeyIndex)}
                            <span className="text-red-500 underline font-extrabold">{item.hotkey}</span>
                            {item.label.slice(hotkeyIndex + 1)}
                          </>
                        ) : (
                          item.label
                        )}
                      </h3>
                      <p className="text-xs text-slate-400 light:text-slate-600 mt-1 leading-relaxed font-medium">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${isSelected ? "text-red-500" : "text-slate-600"}`} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-between items-center bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-200 p-3 rounded-2xl text-[10px] text-slate-400 light:text-slate-600 font-mono">
          <span>Use ↑↓ keys to select, Enter to open, Esc to Exit</span>
          <span>Press hotkey letter directly to quick launch</span>
        </div>
      </div>

      {/* Floating Toast Notification Container */}
      <div className="fixed top-24 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="p-4 rounded-2xl bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 text-xs font-semibold text-white light:text-slate-900 shadow-2xl backdrop-blur-md flex items-center gap-3 pointer-events-auto"
          >
            <div className="p-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <span>{toast.text}</span>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
