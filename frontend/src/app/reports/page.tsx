"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "../utils/api";
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
  Boxes
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

  return (
    <div className="min-h-screen bg-brand-navy-dark text-slate-100 flex flex-col select-none relative overflow-hidden font-sans">
      {/* Header bar */}
      <header className="border-b border-brand-navy-light bg-brand-navy-dark/70 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-2 rounded-xl bg-slate-900 light:bg-slate-200/80 border border-slate-800 light:border-slate-200 text-slate-400 light:text-slate-600 hover:text-brand-lime light:text-lime-700 hover:border-brand-lime/40 transition duration-200"
              title="Return to Dashboard (ESC)"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/dashboard")}>
              <span className="text-xl font-extrabold text-white light:text-slate-900 tracking-wide">KEY</span>
              <span className="px-2 py-0.5 text-xs font-extrabold bg-brand-lime text-brand-navy-dark rounded font-mono">books</span>
            </div>
            <div className="h-6 w-[1px] bg-slate-800"></div>
            <div className="flex items-center gap-2 text-brand-lime light:text-lime-700 font-bold">
              <Building2 className="w-5 h-5" />
              <span>{company?.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <span className="text-xs font-mono bg-slate-900 light:bg-slate-200/80 border border-slate-800 light:border-slate-200 px-3 py-1 rounded text-slate-400 light:text-slate-600">
              Esc to Back
            </span>
          </div>
        </div>
      </header>

      {/* Main Reports list */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 w-full space-y-8 flex flex-col justify-center">
        <div>
          <h1 className="text-3xl font-black text-white light:text-slate-900 flex items-center gap-2">
            <FileText className="w-8 h-8 text-brand-lime light:text-lime-700" />
            Display Reports Menu
          </h1>
          <p className="text-xs text-slate-400 light:text-slate-600 mt-1">
            Analyze audited financial ledgers, transactional books, and physical inventory stock values.
          </p>
        </div>

        <div className="rounded-3xl bg-brand-navy-light/10 light:bg-white border border-slate-900 light:border-slate-200/60 light:border-slate-200 p-6 shadow-2xl backdrop-blur-xl space-y-4">
          <div className="space-y-2">
            {reportItems.map((item, idx) => {
              const isSelected = selectedRowIndex === idx;
              const IconComp = item.icon;
              
              // Highlight hotkey letter
              const labelParts = item.label.split("");
              const hotkeyIndex = item.label.toUpperCase().indexOf(item.hotkey);
              
              return (
                <div
                  key={item.label}
                  onClick={() => {
                    setSelectedRowIndex(idx);
                    item.action();
                  }}
                  className={`p-4 rounded-2xl border transition duration-150 cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? "bg-brand-lime/10 light:bg-lime-100/60 border-brand-lime/30 text-white light:text-slate-900 light:text-slate-900 font-bold"
                      : "bg-brand-navy-dark/40 border-slate-900 light:border-slate-200 text-slate-350 hover:text-white light:hover:text-slate-900 hover:bg-slate-900/60 light:hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl border transition ${
                      isSelected 
                        ? "bg-brand-lime/20 border-brand-lime/40 text-brand-lime light:text-lime-700" 
                        : "bg-slate-950 light:bg-slate-100/60 border-slate-800 light:border-slate-200 text-slate-400 light:text-slate-600"
                    }`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white light:text-slate-900 flex items-center gap-1">
                        {hotkeyIndex !== -1 ? (
                          <>
                            {item.label.slice(0, hotkeyIndex)}
                            <span className="text-brand-lime light:text-lime-700 underline font-black">{item.hotkey}</span>
                            {item.label.slice(hotkeyIndex + 1)}
                          </>
                        ) : (
                          item.label
                        )}
                      </h3>
                      <p className="text-[10px] text-slate-400 light:text-slate-600 mt-0.5 leading-relaxed font-semibold">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${isSelected ? "text-brand-lime light:text-lime-700" : "text-slate-650"}`} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-between items-center bg-slate-950 light:bg-slate-100/20 light:bg-slate-100 border border-slate-900 light:border-slate-200/60 light:border-slate-200 p-3 rounded-2xl text-[10px] text-slate-400 light:text-slate-600 font-mono">
          <span>Use ↑↓ keys to select, Enter to open, Esc to Exit</span>
          <span>Press hotkey letter directly to quick launch</span>
        </div>
      </main>

      {/* Floating Toast Notification Container */}
      <div className="fixed top-24 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="p-4 rounded-2xl bg-brand-navy-light/95 border border-slate-800 light:border-slate-200 text-xs font-semibold text-white light:text-slate-900 shadow-2xl backdrop-blur-md flex items-center gap-3 pointer-events-auto"
          >
            <div className="p-1 bg-brand-lime/10 light:bg-lime-100/60 border border-brand-lime/20 text-brand-lime light:text-lime-700 rounded-lg shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <span>{toast.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
