"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getCurrentUser, logout, apiFetch } from "../utils/api";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useShortcutContext } from "../context/ShortcutContext";
import Logo from "./Logo";
import Loader, { loaderKindFor } from "./Loader";
import {
  Building2,
  Calendar,
  Calculator as CalcIcon,
  HelpCircle,
  LogOut,
  FileText,
  Package,
  Users,
  TrendingUp,
  ArrowRight,
  ChevronRight,
  Sun,
  Moon,
  LayoutDashboard,
  BookOpen,
  Layers,
  Scale,
  ShoppingBag,
  Receipt,
  Warehouse,
  ClipboardList,
  Wallet,
  CalendarDays,
  PieChart,
  BarChart3,
  Boxes,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  X
} from "lucide-react";

interface Company {
  id: string;
  name: string;
  address?: string;
  gst_number?: string;
  state?: string;
  financial_year_start?: string;
  financial_year_end?: string;
  contact_email?: string;
  contact_phone?: string;
  logo_url?: string;
  currency?: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
}

export default function AppLayout({
  children,
  pageTitle,
  pageSubtitle
}: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { setIsHelpOpen } = useShortcutContext();
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<Company | null>(null);

  // Sidebar Collapse State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Modals
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [isCompanyInfoOpen, setIsCompanyInfoOpen] = useState(false);
  const [isCommandSearchOpen, setIsCommandSearchOpen] = useState(false);
  const [commandSearchQuery, setCommandSearchQuery] = useState("");
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);

  // FY Period state
  const [fyStart, setFyStart] = useState("");
  const [fyEnd, setFyEnd] = useState("");

  // Currency
  const [currency, setCurrency] = useState("₹");

  // Calculator State
  const [calcDisplay, setCalcDisplay] = useState("0");
  const [calcEquation, setCalcEquation] = useState("");
  const [shouldResetDisplay, setShouldResetDisplay] = useState(false);

  interface MenuItem {
    label: string;
    href?: string;
    hotkey?: string;
    icon?: React.ElementType;
    isHeader?: boolean;
    action?: () => void;
  }

  const menuItems: MenuItem[] = [
    { label: "Dashboard", href: "/dashboard", hotkey: "H", icon: LayoutDashboard },

    { label: "Masters", isHeader: true },
    { label: "Ledgers", href: "/ledgers", hotkey: "L", icon: BookOpen },
    { label: "Groups", href: "/groups", hotkey: "G", icon: Layers },
    { label: "Stock Items", href: "/inventory", hotkey: "S", icon: Package },

    { label: "Transactions", isHeader: true },
    { label: "Vouchers Entry", href: "/vouchers", hotkey: "V", icon: FileText },
    { label: "Purchase Voucher", href: "/vouchers/purchase", hotkey: "F9", icon: ShoppingBag },
    { label: "Sales Voucher", href: "/vouchers/sales", hotkey: "F8", icon: TrendingUp },
    { label: "Billing & Invoices", href: "/billing", hotkey: "B", icon: Receipt },

    { label: "Accounting & Books", isHeader: true },
    { label: "Cash/Bank Book", href: "/reports/cash-bank", hotkey: "C", icon: Wallet },
    { label: "Day Book", href: "/reports/day-book", hotkey: "D", icon: CalendarDays },
    { label: "Stock Valuation", href: "/reports/stock-summary", hotkey: "K", icon: ClipboardList },

    { label: "Reports", isHeader: true },
    { label: "Balance Sheet", href: "/reports/balance-sheet", hotkey: "A", icon: Scale },
    { label: "Profit & Loss", href: "/reports/profit-loss", hotkey: "P", icon: PieChart },
    { label: "Trial Balance", href: "/reports/trial-balance", hotkey: "T", icon: BarChart3 },

    { label: "System", isHeader: true },
    { label: "Settings", href: "/settings", hotkey: "Y", icon: Settings }
  ];

  const commandsList = [
    ...menuItems.filter(item => !item.isHeader).map(item => ({
      name: item.label,
      category: "Navigation",
      shortcut: item.hotkey,
      action: item.action || (() => item.href && router.push(item.href))
    })),
    { name: "Company Selection Portal", category: "Global", shortcut: "F1", action: () => router.push("/companies") },
    { name: "Change Financial Year Period", category: "Global", shortcut: "F2", action: () => setIsPeriodModalOpen(true) },
    { name: "Show Company Information", category: "Global", shortcut: "F3", action: () => setIsCompanyInfoOpen(true) },
    { name: "Toggle Arithmetic Calculator", category: "Global", shortcut: "F4", action: () => setIsCalculatorOpen(prev => !prev) },
    { name: "Toggle Sidebar Collapse", category: "Global", shortcut: "Ctrl+B", action: () => toggleSidebar() }
  ];

  const filteredCommands = commandsList.filter(cmd =>
    cmd.name.toLowerCase().includes(commandSearchQuery.toLowerCase()) ||
    cmd.category.toLowerCase().includes(commandSearchQuery.toLowerCase())
  );

  useEffect(() => {
    const savedSidebar = localStorage.getItem("sidebarCollapsed");
    if (savedSidebar === "true") setIsSidebarCollapsed(true);

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

    const activeCompany = JSON.parse(activeCompanyStr);
    setCompany(activeCompany);
    setCurrency(activeCompany.currency || "₹");
    setFyStart(activeCompany.financial_year_start ? activeCompany.financial_year_start.split("T")[0] : "2026-04-01");
    setFyEnd(activeCompany.financial_year_end ? activeCompany.financial_year_end.split("T")[0] : "2027-03-31");
  }, [router]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebarCollapsed", String(next));
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    const activeCompanyStr = localStorage.getItem("activeCompany");
    if (activeCompanyStr) {
      try {
        const comp = JSON.parse(activeCompanyStr);
        comp.currency = newCurrency;
        localStorage.setItem("activeCompany", JSON.stringify(comp));
        setCurrency(newCurrency);
        setCompany(comp);
        window.dispatchEvent(new Event("activeCompanyChanged"));

        await apiFetch("/settings/company", {
          method: "PUT",
          body: JSON.stringify({
            company_id: comp.id,
            name: comp.name,
            address: comp.address,
            contact_email: comp.contact_email,
            contact_phone: comp.contact_phone,
            currency: newCurrency,
            logo_url: comp.logo_url
          })
        });
      } catch (e) {
        console.error("Failed to persist currency to backend:", e);
      }
    }
  };

  const handleCalcInput = (val: string) => {
    if (shouldResetDisplay) {
      setCalcDisplay(val);
      setShouldResetDisplay(false);
    } else {
      setCalcDisplay((prev) => (prev === "0" ? val : prev + val));
    }
    setCalcEquation((prev) => prev + val);
  };

  const handleCalcClear = () => {
    setCalcDisplay("0");
    setCalcEquation("");
    setShouldResetDisplay(false);
  };

  const handleCalcBackspace = () => {
    setCalcDisplay((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0"));
    setCalcEquation((prev) => (prev.length > 0 ? prev.slice(0, -1) : ""));
  };

  const handleCalcEvaluate = () => {
    try {
      const sanitized = calcEquation.replace(/[^0-9.+\-*/]/g, "");
      // eslint-disable-next-line no-eval
      const result = eval(sanitized);
      setCalcDisplay(Number(result).toLocaleString("en-IN", { maximumFractionDigits: 4 }));
      setCalcEquation(String(result));
      setShouldResetDisplay(true);
    } catch {
      setCalcDisplay("Error");
      setCalcEquation("");
      setShouldResetDisplay(true);
    }
  };

  const handleSavePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (company) {
      const updatedCompany = {
        ...company,
        financial_year_start: fyStart,
        financial_year_end: fyEnd
      };
      setCompany(updatedCompany);
      localStorage.setItem("activeCompany", JSON.stringify(updatedCompany));
    }
    setIsPeriodModalOpen(false);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts([
    { keys: "Ctrl+K", action: () => { setIsCommandSearchOpen(prev => !prev); setCommandSearchQuery(""); setSelectedCommandIndex(0); }, description: "Toggle Command Search", category: "Global" },
    { keys: "Ctrl+B", action: () => toggleSidebar(), description: "Toggle Sidebar Minimize", category: "Global" },
    { keys: "Ctrl+Q", action: () => handleLogout(), description: "Logout Session", category: "Global" },
    { keys: "Alt+H", action: () => router.push("/dashboard"), description: "Navigate Home", category: "Global" },
    { keys: "F1", action: () => router.push("/companies"), description: "Change Active Company", category: "Global" },
    { keys: "Escape", action: () => {
        if (isCalculatorOpen) setIsCalculatorOpen(false);
        else if (isPeriodModalOpen) setIsPeriodModalOpen(false);
        else if (isCompanyInfoOpen) setIsCompanyInfoOpen(false);
        else if (isCommandSearchOpen) setIsCommandSearchOpen(false);
        else router.push("/companies");
      },
      description: "Return to Companies / Close Active Modal", category: "Global"
    },
    { keys: "F2", action: () => setIsPeriodModalOpen(true), description: "Change Financial Period", category: "Global" },
    { keys: "F3", action: () => setIsCompanyInfoOpen(true), description: "View Company Details", category: "Global" },
    { keys: "F4", action: () => setIsCalculatorOpen(prev => !prev), description: "Toggle Calculator", category: "Global" },
    { keys: "F8", action: () => router.push("/vouchers/sales"), description: "Sales Voucher Direct", category: "Global" },
    { keys: "F9", action: () => router.push("/vouchers/purchase"), description: "Purchase Voucher Direct", category: "Global" },
  ]);

  const userInitials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
    : "US";

  // The auth check runs in an effect, so without this gate a logged-out user
  // sees the full app shell for one frame before being pushed to /login.
  if (!user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center doodle-grid">
        <div className="panel animate-fade-in">
          <Loader kind={loaderKindFor(pathname)} label="Verifying session" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-slate-950 light:bg-[#f8fafc] text-slate-100 light:text-slate-900 select-none">
      {/* 1. PERSISTENT LEFT SIDEBAR: Independent Scrollable Container */}
      <aside
        className={`h-screen flex flex-col justify-between border-r border-slate-800 light:border-slate-200 bg-slate-900 light:bg-white shrink-0 z-30 transition-all duration-300 ${
          isSidebarCollapsed ? "w-20" : "w-72"
        }`}
      >
        {/* Sidebar Top: Logo + Toggle minimize */}
        <div className="h-20 border-b border-slate-800 light:border-slate-200 px-4 flex items-center justify-between shrink-0">
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-2">
              <Logo size="md" href="/dashboard" />
            </div>
          ) : (
            <div className="mx-auto">
              <Logo size="sm" showText={false} href="/dashboard" />
            </div>
          )}

          <button
            onClick={toggleSidebar}
            className="p-2 rounded-xl bg-slate-800 light:bg-slate-100 hover:bg-slate-700 light:hover:bg-slate-200 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-black transition"
            title={isSidebarCollapsed ? "Expand Sidebar (Ctrl+B)" : "Minimize Sidebar (Ctrl+B)"}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-red-500" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Sidebar Middle: Scrollable Menu Items (Scrolls independently of the page!) */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
          {menuItems.map((item, idx) => {
            if (item.isHeader) {
              if (isSidebarCollapsed) {
                return <div key={idx} className="my-2 border-t border-slate-800 light:border-slate-200" />;
              }
              return (
                <div key={idx} className="pt-4 pb-1.5 px-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 light:text-slate-500">
                    {item.label}
                  </span>
                </div>
              );
            }

            const IconComponent = item.icon || FileText;
            const isCurrentPage = item.href && (pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href.split("?")[0])));

            return (
              <button
                key={idx}
                onClick={() => {
                  if (item.action) item.action();
                  else if (item.href) router.push(item.href);
                }}
                title={isSidebarCollapsed ? `${item.label} [${item.hotkey}]` : undefined}
                className={`w-full py-2.5 px-3 flex items-center justify-between rounded-xl transition-colors text-left text-sm ${
                  isCurrentPage
                    ? "bg-red-600 text-white font-bold"
                    : "text-slate-300 light:text-slate-700 font-medium hover:bg-slate-800/60 light:hover:bg-slate-100 hover:text-white light:hover:text-black"
                } ${isSidebarCollapsed ? "justify-center px-0" : ""}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <IconComponent
                    className={`w-5 h-5 shrink-0 ${
                      isCurrentPage ? "text-white" : "text-slate-400 light:text-slate-500"
                    }`}
                  />
                  {!isSidebarCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </div>

                {!isSidebarCollapsed && item.hotkey && (
                  <span
                    className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      isCurrentPage
                        ? "bg-white/20 text-white"
                        : "bg-slate-800 light:bg-slate-100 border border-slate-700 light:border-slate-200 text-slate-400 light:text-slate-600"
                    }`}
                  >
                    {item.hotkey}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Bottom: User Profile Card & Settings & Logout */}
        <div className="p-3 border-t border-slate-800 light:border-slate-200 shrink-0 space-y-2 bg-slate-900/50 light:bg-slate-50">
          {!isSidebarCollapsed ? (
            <div className="p-2.5 rounded-2xl bg-slate-800/80 light:bg-white border border-slate-700 light:border-slate-200 flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-black text-xs flex items-center justify-center shrink-0">
                  {userInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white light:text-slate-900 truncate">{user?.name || "Administrator"}</p>
                  <p className="text-[10px] text-slate-400 light:text-slate-500 font-medium truncate capitalize">{user?.role || "Super Admin"}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center" title={`${user?.name || 'Admin'} (${user?.role || 'Super Admin'})`}>
              <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-black text-xs flex items-center justify-center shrink-0">
                {userInitials}
              </div>
            </div>
          )}

          <div className={`flex items-center gap-1.5 ${isSidebarCollapsed ? "flex-col" : "justify-between"}`}>
            <button
              onClick={() => router.push("/settings")}
              className={`flex items-center gap-2 text-xs font-semibold text-slate-400 light:text-slate-600 hover:text-white light:hover:text-black p-2 rounded-xl hover:bg-slate-800 light:hover:bg-slate-100 transition ${
                isSidebarCollapsed ? "w-full justify-center" : "flex-1"
              }`}
              title="Settings (Y)"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              {!isSidebarCollapsed && <span>Settings</span>}
            </button>

            <button
              onClick={handleLogout}
              className={`flex items-center gap-2 text-xs font-semibold text-red-400 hover:text-red-300 p-2 rounded-xl hover:bg-red-500/10 transition ${
                isSidebarCollapsed ? "w-full justify-center" : ""
              }`}
              title="Logout (Ctrl+Q)"
            >
              <LogOut className="w-4 h-4" />
              {!isSidebarCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* 2. RIGHT MAIN VIEWPORT: Header + Independent Scrollable Page Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Top Header bar */}
        <header className="h-20 border-b border-slate-800 light:border-slate-200 bg-slate-900/90 light:bg-white/90 backdrop-blur-md px-6 sm:px-10 flex items-center justify-between gap-4 shrink-0 z-20">
          {/* Left Breadcrumb / Company Info */}
          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={() => router.push("/companies")}
              className="px-3 py-2 rounded-xl bg-slate-800 light:bg-slate-100 border border-slate-700 light:border-slate-200 text-slate-300 light:text-slate-700 hover:text-red-500 hover:border-red-500/40 transition flex items-center gap-2 text-xs font-bold whitespace-nowrap shadow-sm"
              title="Return to Companies Directory (ESC)"
            >
              <ArrowRight className="w-4 h-4 rotate-180 text-red-500" />
              <span>Companies <kbd className="font-mono text-[10px] opacity-70">[ESC]</kbd></span>
            </button>

            <div className="h-6 w-[1px] bg-slate-800 light:bg-slate-200"></div>

            <div className="flex items-center gap-2 font-bold text-white light:text-slate-900 whitespace-nowrap">
              {company?.logo_url ? (
                <img src={company.logo_url} alt="" className="w-7 h-7 rounded-lg object-cover border border-slate-700 light:border-slate-300 shrink-0" />
              ) : (
                <Building2 className="w-5 h-5 text-red-500 shrink-0" />
              )}
              <span className="text-base font-extrabold">{company?.name}</span>
            </div>
          </div>

          {/* Right Controls: Period, Dedicated Calculator, F-Keys, Currency, Theme Toggle */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden xl:flex items-center gap-2 text-slate-400 light:text-slate-600 text-xs font-semibold whitespace-nowrap bg-slate-900/60 light:bg-slate-100 border border-slate-800 light:border-slate-200 px-3 py-1.5 rounded-xl">
              <Calendar className="w-4 h-4 text-sky-400" />
              <span>Period: {fyStart} to {fyEnd}</span>
            </div>

            {/* Dedicated Top Calculator Button: Accessible globally on every page */}
            <button
              onClick={() => setIsCalculatorOpen(prev => !prev)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition duration-150 border shadow-sm ${
                isCalculatorOpen
                  ? "bg-red-600 border-red-600 text-white"
                  : "bg-slate-900 light:bg-slate-100 border-slate-800 light:border-slate-300 text-slate-300 light:text-slate-700 hover:text-white light:hover:text-black hover:border-red-500/50"
              }`}
              title="Toggle Arithmetic Calculator (F4)"
            >
              <CalcIcon className={`w-4 h-4 ${isCalculatorOpen ? "text-white" : "text-red-500"}`} />
              <span className="hidden sm:inline">Calculator</span>
              <kbd className={`font-mono text-[10px] px-1 py-0.2 rounded border ${
                isCalculatorOpen
                  ? "bg-white/20 border-white/30 text-white"
                  : "bg-slate-800 light:bg-slate-200 border-slate-700 light:border-slate-300 text-slate-400 light:text-slate-600"
              }`}>F4</kbd>
            </button>

            {/* F-key indicators */}
            <div className="hidden lg:flex items-center gap-2 text-xs font-mono font-bold text-slate-300 light:text-slate-700">
              <button onClick={() => router.push("/companies")} className="px-2.5 py-1.5 bg-slate-900 light:bg-slate-200 border border-slate-800 light:border-slate-300 rounded-lg whitespace-nowrap hover:border-red-500 hover:text-red-500 transition">F1 Comp</button>
              <button onClick={() => setIsPeriodModalOpen(true)} className="px-2.5 py-1.5 bg-slate-900 light:bg-slate-200 border border-slate-800 light:border-slate-300 rounded-lg whitespace-nowrap hover:border-red-500 hover:text-red-500 transition">F2 Period</button>
              <button onClick={() => setIsCompanyInfoOpen(true)} className="px-2.5 py-1.5 bg-slate-900 light:bg-slate-200 border border-slate-800 light:border-slate-300 rounded-lg whitespace-nowrap hover:border-red-500 hover:text-red-500 transition">F3 Info</button>
              
              {/* High-visibility Help Button with clearly visible black ? mark */}
              <button
                onClick={() => setIsHelpOpen(true)}
                className="px-2.5 py-1.5 bg-slate-900 light:bg-slate-200 border border-slate-800 light:border-slate-300 text-red-500 rounded-lg whitespace-nowrap hover:border-red-500 flex items-center gap-1.5 font-sans font-bold transition"
              >
                <span className="text-black font-mono text-[11px] font-black bg-white light:bg-slate-200 px-1.5 py-0.2 rounded border border-slate-300 shadow-sm">?</span>
                Help
              </button>
            </div>

            {/* Currency Selector Dropdown */}
            <div className="relative shrink-0">
              <select
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="px-3 py-2 bg-slate-900 light:bg-slate-200 border border-slate-800 light:border-slate-300 rounded-xl text-xs font-bold text-slate-200 light:text-slate-800 outline-none cursor-pointer hover:border-red-500 transition"
                title="Select Preferred Currency"
              >
                <option value="₹">₹ (INR)</option>
                <option value="$">$ (USD)</option>
                <option value="€">€ (EUR)</option>
                <option value="£">£ (GBP)</option>
                <option value="¥">¥ (JPY)</option>
              </select>
            </div>

            {/* Theme Switcher Button */}
            <button
              onClick={() => {
                const nextTheme = document.documentElement.classList.contains("light") ? "dark" : "light";
                localStorage.setItem("theme", nextTheme);
                if (nextTheme === "light") {
                  document.documentElement.classList.add("light");
                } else {
                  document.documentElement.classList.remove("light");
                }
              }}
              className="p-2 rounded-xl bg-slate-900 light:bg-slate-200 border border-slate-800 light:border-slate-300 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-black transition"
              title="Toggle Theme"
            >
              <Sun className="w-4 h-4 hidden light:block" />
              <Moon className="w-4 h-4 block light:hidden" />
            </button>
          </div>
        </header>

        {/* 3. MAIN PAGE CONTENT: Independent Page Scrollable Container */}
        <main className="flex-1 overflow-y-auto px-6 sm:px-10 lg:px-12 py-8 space-y-8 custom-scrollbar">
          {pageTitle && (
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white light:text-slate-900 tracking-tight">
                {pageTitle}
              </h1>
              {pageSubtitle && (
                <p className="text-xs md:text-sm text-slate-400 light:text-slate-600 mt-1 font-medium leading-relaxed">
                  {pageSubtitle}
                </p>
              )}
            </div>
          )}

          {children}
        </main>
      </div>

      {/* Global Calculator Widget (F4) */}
      {isCalculatorOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-80 bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-3xl p-5 shadow-2xl space-y-4 backdrop-blur-xl animate-fade-in-up">
          <div className="flex items-center justify-between border-b border-slate-800 light:border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-white light:text-slate-900 flex items-center gap-2">
              <CalcIcon className="w-4 h-4 text-red-500" />
              Quick Calculator
            </h3>
            <button
              onClick={() => setIsCalculatorOpen(false)}
              className="p-1 rounded-full text-slate-400 hover:text-white light:hover:text-black hover:bg-slate-800 light:hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-200 p-3 rounded-2xl text-right">
            <div className="text-xs text-slate-500 font-mono h-4">{calcEquation}</div>
            <div className="text-2xl font-bold font-mono text-white light:text-slate-900 truncate">{calcDisplay}</div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-xs font-bold font-mono">
            <button onClick={handleCalcClear} className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 rounded-xl font-bold">C</button>
            <button onClick={handleCalcBackspace} className="p-3 bg-slate-800 light:bg-slate-100 hover:bg-slate-700 light:hover:bg-slate-200 text-slate-300 light:text-slate-700 rounded-xl">⌫</button>
            <button onClick={() => handleCalcInput("/")} className="p-3 bg-slate-800 light:bg-slate-100 hover:bg-slate-700 light:hover:bg-slate-200 text-red-500 rounded-xl">/</button>
            <button onClick={() => handleCalcInput("*")} className="p-3 bg-slate-800 light:bg-slate-100 hover:bg-slate-700 light:hover:bg-slate-200 text-red-500 rounded-xl">×</button>

            <button onClick={() => handleCalcInput("7")} className="p-3 bg-slate-950 light:bg-slate-50 border border-slate-800/80 light:border-slate-200 hover:bg-slate-800 light:hover:bg-slate-100 text-white light:text-slate-900 rounded-xl">7</button>
            <button onClick={() => handleCalcInput("8")} className="p-3 bg-slate-950 light:bg-slate-50 border border-slate-800/80 light:border-slate-200 hover:bg-slate-800 light:hover:bg-slate-100 text-white light:text-slate-900 rounded-xl">8</button>
            <button onClick={() => handleCalcInput("9")} className="p-3 bg-slate-950 light:bg-slate-50 border border-slate-800/80 light:border-slate-200 hover:bg-slate-800 light:hover:bg-slate-100 text-white light:text-slate-900 rounded-xl">9</button>
            <button onClick={() => handleCalcInput("-")} className="p-3 bg-slate-800 light:bg-slate-100 hover:bg-slate-700 light:hover:bg-slate-200 text-red-500 rounded-xl">-</button>

            <button onClick={() => handleCalcInput("4")} className="p-3 bg-slate-950 light:bg-slate-50 border border-slate-800/80 light:border-slate-200 hover:bg-slate-800 light:hover:bg-slate-100 text-white light:text-slate-900 rounded-xl">4</button>
            <button onClick={() => handleCalcInput("5")} className="p-3 bg-slate-950 light:bg-slate-50 border border-slate-800/80 light:border-slate-200 hover:bg-slate-800 light:hover:bg-slate-100 text-white light:text-slate-900 rounded-xl">5</button>
            <button onClick={() => handleCalcInput("6")} className="p-3 bg-slate-950 light:bg-slate-50 border border-slate-800/80 light:border-slate-200 hover:bg-slate-800 light:hover:bg-slate-100 text-white light:text-slate-900 rounded-xl">6</button>
            <button onClick={() => handleCalcInput("+")} className="p-3 bg-slate-800 light:bg-slate-100 hover:bg-slate-700 light:hover:bg-slate-200 text-red-500 rounded-xl">+</button>

            <button onClick={() => handleCalcInput("1")} className="p-3 bg-slate-950 light:bg-slate-50 border border-slate-800/80 light:border-slate-200 hover:bg-slate-800 light:hover:bg-slate-100 text-white light:text-slate-900 rounded-xl">1</button>
            <button onClick={() => handleCalcInput("2")} className="p-3 bg-slate-950 light:bg-slate-50 border border-slate-800/80 light:border-slate-200 hover:bg-slate-800 light:hover:bg-slate-100 text-white light:text-slate-900 rounded-xl">2</button>
            <button onClick={() => handleCalcInput("3")} className="p-3 bg-slate-950 light:bg-slate-50 border border-slate-800/80 light:border-slate-200 hover:bg-slate-800 light:hover:bg-slate-100 text-white light:text-slate-900 rounded-xl">3</button>
            <button onClick={handleCalcEvaluate} className="row-span-2 p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-sm">=</button>

            <button onClick={() => handleCalcInput("0")} className="col-span-2 p-3 bg-slate-950 light:bg-slate-50 border border-slate-800/80 light:border-slate-200 hover:bg-slate-800 light:hover:bg-slate-100 text-white light:text-slate-900 rounded-xl text-left pl-6">0</button>
            <button onClick={() => handleCalcInput(".")} className="p-3 bg-slate-950 light:bg-slate-50 border border-slate-800/80 light:border-slate-200 hover:bg-slate-800 light:hover:bg-slate-100 text-white light:text-slate-900 rounded-xl">.</button>
          </div>
        </div>
      )}

      {/* Period Modal (F2) */}
      {isPeriodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-3xl p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 light:border-slate-200 pb-3">
              <h3 className="text-xl font-bold text-white light:text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-red-500" />
                Change Period
              </h3>
              <button onClick={() => setIsPeriodModalOpen(false)} className="text-slate-400 hover:text-white light:hover:text-black p-0.5 rounded-full hover:bg-slate-800 light:hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePeriod} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 light:text-slate-600">Financial Year Start</label>
                <input
                  type="date"
                  required
                  value={fyStart}
                  onChange={(e) => setFyStart(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-white light:text-slate-900 outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 light:text-slate-600">Financial Year End</label>
                <input
                  type="date"
                  required
                  value={fyEnd}
                  onChange={(e) => setFyEnd(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-white light:text-slate-900 outline-none focus:border-red-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 light:border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsPeriodModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-800 light:border-slate-300 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-black"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm"
                >
                  Update Period
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Company Info Modal (F3) */}
      {isCompanyInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-3xl p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 light:border-slate-200 pb-3">
              <h3 className="text-xl font-bold text-white light:text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-red-500" />
                Company Information
              </h3>
              <button onClick={() => setIsCompanyInfoOpen(false)} className="text-slate-400 hover:text-white light:hover:text-black p-0.5 rounded-full hover:bg-slate-800 light:hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-300 light:text-slate-700">
              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-800/80 light:border-slate-200">
                <span className="font-bold text-slate-500">Name</span>
                <span className="col-span-2 text-white light:text-slate-900 font-semibold">{company?.name}</span>
              </div>

              {company?.gst_number && (
                <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-800/80 light:border-slate-200">
                  <span className="font-bold text-slate-500">GSTIN</span>
                  <span className="col-span-2 font-mono text-red-400 font-bold">{company.gst_number}</span>
                </div>
              )}

              {company?.contact_email && (
                <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-800/80 light:border-slate-200">
                  <span className="font-bold text-slate-500">Contact Email</span>
                  <span className="col-span-2">{company.contact_email}</span>
                </div>
              )}

              {company?.contact_phone && (
                <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-800/80 light:border-slate-200">
                  <span className="font-bold text-slate-500">Phone</span>
                  <span className="col-span-2">{company.contact_phone}</span>
                </div>
              )}

              {company?.state && (
                <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-800/80 light:border-slate-200">
                  <span className="font-bold text-slate-500">State</span>
                  <span className="col-span-2">{company.state}</span>
                </div>
              )}

              {company?.address && (
                <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-800/80 light:border-slate-200">
                  <span className="font-bold text-slate-500">Address</span>
                  <span className="col-span-2 text-xs leading-relaxed">{company.address}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800 light:border-slate-200">
              <button
                onClick={() => setIsCompanyInfoOpen(false)}
                className="px-6 py-2 bg-slate-800 light:bg-slate-100 border border-slate-700 light:border-slate-300 rounded-xl hover:text-white light:hover:text-black font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spotlight Command Search Modal (Ctrl + K) */}
      {isCommandSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 md:p-12 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-3xl overflow-hidden shadow-2xl mt-12 flex flex-col max-h-[80vh] animate-fade-in">
            <div className="p-4 border-b border-slate-800 light:border-slate-200 flex items-center gap-3">
              <span className="text-slate-400 font-mono text-xs font-bold px-2 py-1 bg-slate-950 light:bg-slate-100 border border-slate-800 light:border-slate-300 rounded-lg">Ctrl+K</span>
              <input
                type="text"
                autoFocus
                placeholder="Search any menu, shortcut, report, or command..."
                value={commandSearchQuery}
                onChange={(e) => {
                  setCommandSearchQuery(e.target.value);
                  setSelectedCommandIndex(0);
                }}
                className="w-full bg-transparent text-white light:text-slate-900 placeholder-slate-500 outline-none text-sm font-semibold"
              />
              <button
                onClick={() => {
                  setIsCommandSearchOpen(false);
                  setCommandSearchQuery("");
                }}
                className="p-1.5 rounded-full text-slate-400 hover:text-white light:hover:text-black hover:bg-slate-800 light:hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 text-sm divide-y divide-slate-800/40 light:divide-slate-100">
              {filteredCommands.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs font-medium">
                  No matching commands found.
                </div>
              ) : (
                filteredCommands.map((cmd, idx) => {
                  const isSelected = selectedCommandIndex === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        cmd.action?.();
                        setIsCommandSearchOpen(false);
                        setCommandSearchQuery("");
                      }}
                      className={`w-full p-3 flex items-center justify-between rounded-xl text-left transition-all ${
                        isSelected
                          ? "bg-red-600 text-white font-bold shadow"
                          : "text-slate-300 light:text-slate-700 hover:bg-slate-800/60 light:hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${
                          isSelected ? "bg-black/30 text-white" : "bg-slate-900 light:bg-slate-200 text-slate-400 light:text-slate-600"
                        }`}>
                          {cmd.category}
                        </span>
                        <span>{cmd.name}</span>
                      </div>
                      {cmd.shortcut && (
                        <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${
                          isSelected ? "bg-white/20 text-white" : "bg-slate-950 light:bg-slate-100 text-slate-400"
                        }`}>
                          {cmd.shortcut}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div className="p-3 bg-slate-950 light:bg-slate-100 border-t border-slate-800 light:border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>Use ↑↓ keys to navigate, Enter to select</span>
              <span>ESC to close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
