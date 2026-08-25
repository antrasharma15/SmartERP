"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, logout, apiFetch } from "../utils/api";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useShortcutContext } from "../context/ShortcutContext";
import {
  Building2,
  Calendar,
  Calculator as CalcIcon,
  HelpCircle,
  LogOut,
  AlertCircle,
  FileText,
  Package,
  Users,
  TrendingUp,
  DollarSign,
  ArrowRight,
  ChevronRight,
  Percent,
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
}

export default function DashboardPage() {
  const router = useRouter();
  const { setIsHelpOpen } = useShortcutContext();
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<Company | null>(null);

  // Keyboard Navigation Menu State
  const [selectedMenuIndex, setSelectedMenuIndex] = useState(0);

  // Modals & Widgets State
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [isCompanyInfoOpen, setIsCompanyInfoOpen] = useState(false);
  const [isCommandSearchOpen, setIsCommandSearchOpen] = useState(false);
  const [commandSearchQuery, setCommandSearchQuery] = useState("");
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);

  // Toast notifications state
  const [toasts, setToasts] = useState<{ id: string; text: string }[]>([]);

  // Dynamic Dashboard Metrics State
  const [vouchersCount, setVouchersCount] = useState(0);
  const [stockItemsCount, setStockItemsCount] = useState(0);
  const [activeLedgersCount, setActiveLedgersCount] = useState(0);
  const [totalAssets, setTotalAssets] = useState(0);
  const [totalLiabilities, setTotalLiabilities] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);

  // Period state
  const [fyStart, setFyStart] = useState("");
  const [fyEnd, setFyEnd] = useState("");

  // Calculator State
  const [calcDisplay, setCalcDisplay] = useState("0");
  const [calcEquation, setCalcEquation] = useState("");
  const [shouldResetDisplay, setShouldResetDisplay] = useState(false);

  // Currency selector state
  const [currency, setCurrency] = useState("$");

  // Toast Trigger Helper
  const triggerToast = (text: string) => {
    const id = Math.random().toString();
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Menu items (Gateway of KEYbooks)
  // Expanded for all Day 5 / doc specifications
  const menuItems = [
    { label: "Masters", isHeader: true },
    { label: "Ledgers", hotkey: "L", action: () => router.push("/ledgers") },
    { label: "Groups", hotkey: "G", action: () => router.push("/groups") },
    { label: "Stock Items", hotkey: "S", action: () => router.push("/inventory?tab=items") },
    { label: "Units of Measure", hotkey: "U", action: () => router.push("/inventory?tab=units") },

    { label: "Transactions", isHeader: true },
    { label: "Vouchers Entry", hotkey: "V", action: () => router.push("/vouchers") },
    { label: "Purchase Voucher", hotkey: "F9", action: () => router.push("/vouchers/purchase") },
    { label: "Sales Voucher", hotkey: "F8", action: () => router.push("/vouchers/sales") },
    { label: "Billing & Invoices", hotkey: "B", action: () => router.push("/billing") },

    { label: "Inventory", isHeader: true },
    { label: "Inventory Dashboard", hotkey: "I", action: () => router.push("/inventory") },
    { label: "Stock Report", hotkey: "K", action: () => router.push("/reports/stock-summary") },

    { label: "Accounting", isHeader: true },
    { label: "Cash/Bank Book", hotkey: "C", action: () => router.push("/reports/cash-bank") },
    { label: "Day Book", hotkey: "D", action: () => router.push("/reports/day-book") },

    { label: "Reports", isHeader: true },
    { label: "Balance Sheet", hotkey: "A", action: () => router.push("/reports/balance-sheet") },
    { label: "Profit & Loss", hotkey: "P", action: () => router.push("/reports/profit-loss") },
    { label: "Trial Balance", hotkey: "T", action: () => router.push("/reports/trial-balance") },
    { label: "Stock Summary", hotkey: "R", action: () => router.push("/reports/stock-summary") },

    { label: "Utilities", isHeader: true },
    { label: "Calculator", hotkey: "Z", action: () => setIsCalculatorOpen((prev) => !prev) },
    { label: "Settings", hotkey: "Y", action: () => router.push("/settings") }
  ];

  // List of all command search palette items
  const commandsList = [
    // Menu items
    ...menuItems.filter(item => !item.isHeader).map(item => ({
      name: item.label,
      category: "Navigation",
      shortcut: item.hotkey,
      action: item.action
    })),
    // Global actions
    { name: "Company Selection Screen", category: "Global", shortcut: "F1", action: () => router.push("/companies") },
    { name: "Change Financial Year Period", category: "Global", shortcut: "F2", action: () => setIsPeriodModalOpen(true) },
    { name: "Show Company Information", category: "Global", shortcut: "F3", action: () => setIsCompanyInfoOpen(true) },
    { name: "Toggle Arithmetic Calculator", category: "Global", shortcut: "F4", action: () => setIsCalculatorOpen(prev => !prev) },
    { name: "Refresh Application Cache", category: "Global", shortcut: "F5", action: () => { triggerToast("Refreshing page..."); window.location.reload(); } },
    { name: "Global Command Search Palette", category: "Global", shortcut: "Ctrl+K", action: () => setIsCommandSearchOpen(prev => !prev) },
    { name: "Logout from Session", category: "Global", shortcut: "Ctrl+Q", action: () => handleLogout() }
  ];

  // Filter commands based on input
  const filteredCommands = commandsList.filter(cmd =>
    cmd.name.toLowerCase().includes(commandSearchQuery.toLowerCase()) ||
    cmd.category.toLowerCase().includes(commandSearchQuery.toLowerCase())
  );

  // Filter out headers for arrow key index mapping
  const navigableIndices = menuItems
    .map((item, idx) => (item.isHeader ? -1 : idx))
    .filter((idx) => idx !== -1);

  // Check auth and selected company
  useEffect(() => {
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
    setCurrency(activeCompany.currency || "$");
    setFyStart(activeCompany.financial_year_start ? activeCompany.financial_year_start.split("T")[0] : "2026-04-01");
    setFyEnd(activeCompany.financial_year_end ? activeCompany.financial_year_end.split("T")[0] : "2027-03-31");
  }, [router]);

  // Synchronize currency when changed globally
  useEffect(() => {
    const updateCurrency = () => {
      const activeCompanyStr = localStorage.getItem("activeCompany");
      if (activeCompanyStr) {
        try {
          const comp = JSON.parse(activeCompanyStr);
          setCurrency(comp.currency || "$");
          setCompany(comp);
        } catch (e) {}
      }
    };
    window.addEventListener("activeCompanyChanged", updateCurrency);
    return () => window.removeEventListener("activeCompanyChanged", updateCurrency);
  }, []);

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
        triggerToast(`Currency changed to ${newCurrency}`);

        // Persist to database silently
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

  // Load dynamic metrics when active company changes
  useEffect(() => {
    if (!company) return;

    const loadDashboardMetrics = async () => {
      console.log(`[Dashboard] Querying dynamic stats for company: ${company.name}`);
      try {
        // 1. Fetch ledgers count
        const ledgers = await apiFetch(`/ledgers?company_id=${company.id}`);
        setActiveLedgersCount(ledgers && ledgers.ledgers ? ledgers.ledgers.length : 0);

        // 2. Fetch Day Book (vouchers count)
        const dayBookData = await apiFetch(`/reports/day-book?company_id=${company.id}&start_date=2026-04-01&end_date=2027-03-31`);
        setVouchersCount(dayBookData.report ? dayBookData.report.length : 0);

        // 3. Fetch Stock Summary (items count)
        const stockData = await apiFetch(`/reports/stock-summary?company_id=${company.id}`);
        setStockItemsCount(stockData?.report?.items ? stockData.report.items.length : 0);

        // 4. Fetch Balance Sheet totals
        const bsData = await apiFetch(`/reports/balance-sheet?company_id=${company.id}&start_date=2026-04-01&end_date=2027-03-31`);
        if (bsData?.report?.totals) {
          setTotalAssets(parseFloat(bsData.report.totals.assets_total) || 0);
          setTotalLiabilities(parseFloat(bsData.report.totals.liabilities_total) || 0);
        }

        // 5. Fetch P&L totals
        const plData = await apiFetch(`/reports/profit-loss?company_id=${company.id}&start_date=2026-04-01&end_date=2027-03-31`);
        if (plData?.report?.totals) {
          setTotalIncome(parseFloat(plData.report.totals.revenue_total) || 0);
          setTotalExpenses(parseFloat(plData.report.totals.expense_total) || 0);
        }
      } catch (err) {
        console.error("[Dashboard] Failed to load dynamic metrics:", err);
      }
    };

    loadDashboardMetrics();
  }, [company]);

  // System shortcuts and modal listeners are initialized below.

  // Calculator Functions
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
      // Evaluate basic arithmetic expression safely
      // Replace safe characters only
      const sanitized = calcEquation.replace(/[^0-9.+\-*/]/g, "");
      // eslint-disable-next-line no-eval
      const result = eval(sanitized);
      setCalcDisplay(Number(result).toLocaleString("en-US", { maximumFractionDigits: 4 }));
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

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // Register System Keyboard Shortcuts
  useKeyboardShortcuts([
    { keys: "Ctrl+K", action: () => { setIsCommandSearchOpen(prev => !prev); setCommandSearchQuery(""); setSelectedCommandIndex(0); }, description: "Toggle Command Search", category: "Global" },
    { keys: "Ctrl+Q", action: () => handleLogout(), description: "Logout Session", category: "Global" },
    { keys: "Alt+H", action: () => router.push("/dashboard"), description: "Navigate Home", category: "Global" },
    { keys: "y", action: () => router.push("/settings"), description: "Open Settings Panel", category: "Global" },
    { keys: "h", action: () => router.push("/settings?tab=audit"), description: "Open Audit Logs", category: "Global" },
    { keys: "j", action: () => router.push("/settings?tab=users"), description: "Open User Controls Settings", category: "Global" },
    
    // Alt-key triggers
    { keys: "Alt+L", action: () => router.push("/ledgers"), description: "Ledgers Directory", category: "Global" },
    { keys: "Alt+A", action: () => router.push("/reports/balance-sheet"), description: "Balance Sheet Report", category: "Global" },
    { keys: "Alt+N", action: () => router.push("/groups"), description: "Account Groups Directory", category: "Global" },
    { keys: "Alt+O", action: () => router.push("/groups"), description: "Account Groups Directory", category: "Global" },
    { keys: "Alt+I", action: () => router.push("/inventory"), description: "Inventory Dashboard", category: "Global" },
    { keys: "Alt+S", action: () => router.push("/inventory?tab=items"), description: "Stock Items Directory", category: "Global" },
    { keys: "Alt+U", action: () => router.push("/inventory?tab=units"), description: "Units Directory", category: "Global" },
    { keys: "Alt+V", action: () => router.push("/vouchers"), description: "Voucher Entry Portal", category: "Global" },
    { keys: "Alt+B", action: () => router.push("/billing"), description: "Billing Register", category: "Global" },
    { keys: "Alt+C", action: () => router.push("/reports/cash-bank"), description: "Cash/Bank Book Register", category: "Global" },
    { keys: "Alt+D", action: () => router.push("/reports/day-book"), description: "Day Book Register", category: "Global" },
    { keys: "Alt+P", action: () => router.push("/reports/profit-loss"), description: "Profit & Loss Statement", category: "Global" },
    { keys: "Alt+T", action: () => router.push("/reports/trial-balance"), description: "Trial Balance Sheet", category: "Global" },
    { keys: "Alt+K", action: () => router.push("/reports/stock-summary"), description: "Stock Summary Report", category: "Global" },
    { keys: "Alt+R", action: () => router.push("/reports/stock-summary"), description: "Stock Summary Valuation", category: "Global" },

    // Function keys
    { keys: "F1", action: () => router.push("/companies"), description: "Change Active Company", category: "Global" },
    { keys: "F2", action: () => setIsPeriodModalOpen(true), description: "Change Financial Period", category: "Global" },
    { keys: "F3", action: () => setIsCompanyInfoOpen(true), description: "View Company Details", category: "Global" },
    { keys: "F4", action: () => setIsCalculatorOpen(prev => !prev), description: "Toggle Calculator", category: "Global" },
    { keys: "F8", action: () => router.push("/vouchers/sales"), description: "Sales Voucher Entry", category: "Global" },
    { keys: "F9", action: () => router.push("/vouchers/purchase"), description: "Purchase Voucher Entry", category: "Global" },

    // Menu Navigation Keys (active only when modals are closed)
    {
      keys: "ArrowDown",
      action: () => {
        if (!isCalculatorOpen && !isPeriodModalOpen && !isCompanyInfoOpen && !isCommandSearchOpen) {
          setSelectedMenuIndex((prev) => {
            const currentPos = navigableIndices.indexOf(prev);
            const nextPos = (currentPos + 1) % navigableIndices.length;
            return navigableIndices[nextPos];
          });
        }
      },
      description: "Next Menu Option",
      category: "Global"
    },
    {
      keys: "ArrowUp",
      action: () => {
        if (!isCalculatorOpen && !isPeriodModalOpen && !isCompanyInfoOpen && !isCommandSearchOpen) {
          setSelectedMenuIndex((prev) => {
            const currentPos = navigableIndices.indexOf(prev);
            const prevPos = (currentPos - 1 + navigableIndices.length) % navigableIndices.length;
            return navigableIndices[prevPos];
          });
        }
      },
      description: "Previous Menu Option",
      category: "Global"
    },
    {
      keys: "Enter",
      action: () => {
        if (!isCalculatorOpen && !isPeriodModalOpen && !isCompanyInfoOpen && !isCommandSearchOpen) {
          menuItems[selectedMenuIndex].action?.();
        }
      },
      description: "Execute Highlighted Menu",
      category: "Global"
    },
    {
      keys: "Escape",
      action: () => {
        if (isCalculatorOpen) setIsCalculatorOpen(false);
        else if (isPeriodModalOpen) setIsPeriodModalOpen(false);
        else if (isCompanyInfoOpen) setIsCompanyInfoOpen(false);
      },
      description: "Close Modal Overlay",
      category: "Global"
    }
  ]);

  // Modal Specific Key Handler Effect
  useEffect(() => {
    if (!isCommandSearchOpen && !isCalculatorOpen) return;

    const handleModalKeys = (e: KeyboardEvent) => {
      if (isCommandSearchOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedCommandIndex((prev) => (prev + 1) % filteredCommands.length);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedCommandIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (filteredCommands[selectedCommandIndex]) {
            filteredCommands[selectedCommandIndex].action?.();
            setIsCommandSearchOpen(false);
            setCommandSearchQuery("");
            setSelectedCommandIndex(0);
          }
        } else if (e.key === "Escape") {
          e.preventDefault();
          setIsCommandSearchOpen(false);
          setCommandSearchQuery("");
          setSelectedCommandIndex(0);
        }
      } else if (isCalculatorOpen) {
        if (/^[0-9.+\-*/]$/.test(e.key)) {
          e.preventDefault();
          handleCalcInput(e.key);
        } else if (e.key === "Enter" || e.key === "=") {
          e.preventDefault();
          handleCalcEvaluate();
        } else if (e.key === "Backspace") {
          e.preventDefault();
          handleCalcBackspace();
        } else if (e.key === "c" || e.key === "C") {
          e.preventDefault();
          handleCalcClear();
        } else if (e.key === "Escape") {
          e.preventDefault();
          setIsCalculatorOpen(false);
        }
      }
    };

    window.addEventListener("keydown", handleModalKeys);
    return () => window.removeEventListener("keydown", handleModalKeys);
  }, [isCommandSearchOpen, isCalculatorOpen, filteredCommands, selectedCommandIndex]);

  // Scroll selected Tally menu item into view
  useEffect(() => {
    const selectedItemEl = document.querySelector(`[data-menu-index="${selectedMenuIndex}"]`);
    if (selectedItemEl) {
      selectedItemEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedMenuIndex]);

  return (
    <div className="min-h-screen bg-brand-navy-dark text-slate-100 flex flex-col select-none relative overflow-hidden">
      {/* Header bar */}
      <header className="border-b border-brand-navy-light bg-brand-navy-dark/70 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
              <span className="text-xl font-extrabold text-white light:text-slate-900 tracking-wide">KEY</span>
              <span className="px-2 py-0.5 text-xs font-extrabold bg-brand-lime text-brand-navy-dark rounded font-mono">books</span>
            </div>

            {/* Active Company Name */}
            <div className="h-6 w-[1px] bg-slate-800"></div>
            <div className="flex items-center gap-2 text-brand-lime light:text-lime-700 font-bold">
              <Building2 className="w-5 h-5" />
              <span>{company?.name}</span>
            </div>
          </div>

          {/* FY Period info */}
          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-2 text-slate-400 light:text-slate-600 text-xs font-semibold">
              <Calendar className="w-4 h-4 text-sky-400" />
              <span>Period: {fyStart} to {fyEnd}</span>
            </div>

            {/* F-key indicators */}
            <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono font-bold text-slate-500 light:text-slate-500">
              <span className="px-2 py-0.5 bg-slate-900 light:bg-slate-200/80 border border-slate-800 light:border-slate-200 text-slate-300 light:text-slate-700 rounded cursor-pointer hover:border-brand-lime" onClick={() => router.push("/companies")}>F1 Select Comp</span>
              <span className="px-2 py-0.5 bg-slate-900 light:bg-slate-200/80 border border-slate-800 light:border-slate-200 text-slate-300 light:text-slate-700 rounded cursor-pointer hover:border-brand-lime" onClick={() => setIsPeriodModalOpen(true)}>F2 Period</span>
              <span className="px-2 py-0.5 bg-slate-900 light:bg-slate-200/80 border border-slate-800 light:border-slate-200 text-slate-300 light:text-slate-700 rounded cursor-pointer hover:border-brand-lime" onClick={() => setIsCompanyInfoOpen(true)}>F3 Info</span>
              <span className="px-2 py-0.5 bg-slate-900 light:bg-slate-200/80 border border-slate-800 light:border-slate-200 text-slate-300 light:text-slate-700 rounded cursor-pointer hover:border-brand-lime" onClick={() => setIsCalculatorOpen(!isCalculatorOpen)}>F4 Calc</span>
              <span className="px-2 py-0.5 bg-slate-900 light:bg-slate-200/80 border border border-slate-800 light:border-slate-200 text-brand-lime light:text-lime-700 rounded cursor-pointer hover:border-brand-lime flex items-center gap-1 font-sans font-bold" onClick={() => setIsHelpOpen(true)}>
                <span className="text-white light:text-slate-900 font-mono bg-brand-navy-dark px-1 py-0.2 rounded border border-slate-800 light:border-slate-200 font-black">?</span> Keyboard Help
              </span>
            </div>

            {/* Currency Selector Dropdown */}
            <div className="relative">
              <select
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="px-3 py-2 bg-slate-900 light:bg-slate-200/80 border border-slate-800 light:border-slate-200 rounded-xl text-xs font-bold text-slate-300 light:text-slate-700 outline-none cursor-pointer hover:border-brand-lime transition duration-200"
                title="Select Preferred Currency"
              >
                <option value="$">$ (USD)</option>
                <option value="₹">₹ (INR)</option>
                <option value="€">€ (EUR)</option>
                <option value="£">£ (GBP)</option>
                <option value="¥">¥ (JPY)</option>
              </select>
            </div>

            <button
              onClick={handleLogout}
              className="p-2.5 rounded-full bg-slate-900 light:bg-slate-200/80 border border-slate-800 light:border-slate-200 text-slate-400 light:text-slate-600 hover:text-brand-lime light:text-lime-700 hover:border-brand-lime/40 transition duration-200"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-[1400px] mx-auto px-6 py-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Navigation Menu (Gateway of Tally style) - 3 span */}
        <section className="lg:col-span-3 rounded-3xl bg-brand-navy-light/10 light:bg-white border border-slate-900 light:border-slate-200/60 light:border-slate-200 p-5 shadow-2xl backdrop-blur-xl">
          <div className="border-b border-slate-900 light:border-slate-200 pb-3 mb-4 flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 light:text-slate-600">
              Gateway of KEYbooks
            </h2>
            <span className="text-[9px] bg-slate-900 light:bg-slate-200/80 border border-slate-800 light:border-slate-200 px-1.5 py-0.5 rounded font-mono text-slate-500 light:text-slate-500">
              ↑↓ & Enter
            </span>
          </div>

          <nav className="flex flex-col gap-0.5 text-xs">
            {menuItems.map((item, idx) => {
              if (item.isHeader) {
                return (
                  <h3
                    key={idx}
                    className="text-[10px] font-black text-sky-400/80 uppercase tracking-wider pt-3 pb-1 select-none border-t border-slate-900 light:border-slate-200/40 light:border-slate-200 first:border-0 first:pt-1"
                  >
                    {item.label}
                  </h3>
                );
              }

              const isSelected = selectedMenuIndex === idx;
              // Format hotkey highlight: e.g. "Ledgers" -> find 'L' or append hotkey hint
              const formattedLabel = () => {
                const label = item.label;
                const hotkey = item.hotkey!;
                const firstChar = label[0];
                if (firstChar.toUpperCase() === hotkey) {
                  return (
                    <span>
                      <strong 
                        className={`underline font-black ${isSelected ? 'text-brand-navy-dark' : 'text-brand-lime light:text-lime-700'}`}
                      >
                        {firstChar}
                      </strong>
                      {label.slice(1)}
                    </span>
                  );
                }
                // Try finding index of hotkey inside label
                const index = label.toUpperCase().indexOf(hotkey);
                if (index !== -1) {
                  return (
                    <span>
                      {label.slice(0, index)}
                      <strong 
                        className={`underline font-black ${isSelected ? 'text-brand-navy-dark' : 'text-brand-lime light:text-lime-700'}`}
                      >
                        {label[index]}
                      </strong>
                      {label.slice(index + 1)}
                    </span>
                  );
                }
                // Fallback
                return (
                  <span>
                    {label}{" "}
                    <strong 
                      className={`font-mono font-bold ${isSelected ? 'text-brand-navy-dark' : 'text-brand-lime light:text-lime-700'}`}
                    >
                      [{hotkey}]
                    </strong>
                  </span>
                );
              };

              return (
                <button
                  key={idx}
                  data-menu-index={idx}
                  onClick={() => {
                    setSelectedMenuIndex(idx);
                    item.action?.();
                  }}
                  className={`w-full py-2 px-3 flex items-center justify-between rounded-lg transition-all duration-150 text-left ${
                    isSelected
                      ? "bg-brand-lime text-brand-navy-dark font-black shadow-lg shadow-brand-lime/10"
                      : "text-slate-300 light:text-slate-800 font-semibold hover:bg-brand-navy-light/40 hover:text-white light:hover:bg-slate-100 light:hover:text-black"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {isSelected && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                    {formattedLabel()}
                  </span>
                  {!isSelected && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 bg-slate-900 light:bg-slate-200/80 border border-slate-800 light:border-slate-200/60 text-slate-500 light:text-slate-500 rounded font-semibold group-hover:text-brand-lime light:text-lime-700">
                      {item.hotkey}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </section>

        {/* Middle Column: Key metrics / Charts & Live Overview - 9 span */}
        <section className="lg:col-span-9 space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-brand-navy-light/10 light:bg-white border border-slate-950 flex items-center gap-3">
              <div className="p-2.5 bg-brand-lime/10 light:bg-lime-100/60 border border-brand-lime/20 text-brand-lime light:text-lime-700 rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 light:text-slate-600 font-semibold uppercase tracking-wider">Voucher Count</p>
                <p className="text-xl font-black text-white light:text-slate-900 mt-0.5">{vouchersCount}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-brand-navy-light/10 light:bg-white border border-slate-950 flex items-center gap-3">
              <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 light:text-slate-600 font-semibold uppercase tracking-wider">Stock Items</p>
                <p className="text-xl font-black text-white light:text-slate-900 mt-0.5">{stockItemsCount}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-brand-navy-light/10 light:bg-white border border-slate-950 flex items-center gap-3">
              <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 light:text-slate-600 font-semibold uppercase tracking-wider">Active Ledgers</p>
                <p className="text-xl font-black text-white light:text-slate-900 mt-0.5">{activeLedgersCount}</p>
              </div>
            </div>
          </div>

          {/* Quick Stats overview panel */}
          <div className="p-6 rounded-3xl bg-brand-navy-light/10 light:bg-white border border-slate-900 light:border-slate-200/60 light:border-slate-200 space-y-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-900 light:border-slate-200 pb-4">
              <h3 className="text-base font-bold text-white light:text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-lime light:text-lime-700" />
                Financial Overview (FY 2026-27)
              </h3>
              <span className="text-[10px] text-slate-400 light:text-slate-600">Real-time ledger audit summary</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Asset & Liability chart card */}
              <div className="p-5 bg-brand-navy-dark border border-slate-900 light:border-slate-200 rounded-2xl space-y-4">
                <h4 className="text-xs font-bold text-slate-400 light:text-slate-600">Balance Sheet Ratios</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Assets (Total)</span>
                      <span className="font-bold text-brand-lime light:text-lime-700">{currency}{totalAssets.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="w-full bg-slate-900 light:bg-slate-200/80 h-2 rounded-full overflow-hidden">
                      <div className="bg-brand-lime h-full" style={{ width: `${totalAssets + totalLiabilities > 0 ? (totalAssets / (totalAssets + totalLiabilities)) * 100 : 0}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Liabilities (Total)</span>
                      <span className="font-bold text-sky-400">{currency}{totalLiabilities.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="w-full bg-slate-900 light:bg-slate-200/80 h-2 rounded-full overflow-hidden">
                      <div className="bg-sky-400 h-full" style={{ width: `${totalAssets + totalLiabilities > 0 ? (totalLiabilities / (totalAssets + totalLiabilities)) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profit & loss chart card */}
              <div className="p-5 bg-brand-navy-dark border border-slate-900 light:border-slate-200 rounded-2xl space-y-4">
                <h4 className="text-xs font-bold text-slate-400 light:text-slate-600">Income & Expense summary</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Direct Income</span>
                      <span className="font-bold text-red-400 light:text-lime-700">{currency}{totalIncome.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="w-full bg-slate-900 light:bg-slate-200/80 h-2 rounded-full overflow-hidden">
                      <div className="bg-red-400 h-full" style={{ width: `${totalIncome + totalExpenses > 0 ? (totalIncome / (totalIncome + totalExpenses)) * 100 : 0}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Operating Expenses</span>
                      <span className="font-bold text-rose-400">{currency}{totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="w-full bg-slate-900 light:bg-slate-200/80 h-2 rounded-full overflow-hidden">
                      <div className="bg-rose-400 h-full" style={{ width: `${totalIncome + totalExpenses > 0 ? (totalExpenses / (totalIncome + totalExpenses)) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>


      </main>

      {/* Floating Calculator Popover (F4 / Click) */}
      {isCalculatorOpen && (
        <div className="fixed bottom-6 right-6 z-30 w-72 bg-brand-navy-light border border-slate-800 light:border-slate-200 rounded-3xl p-4 shadow-2xl flex flex-col gap-3 backdrop-blur-xl animate-fade-in-up">
          <div className="flex items-center justify-between border-b border-slate-900 light:border-slate-200 pb-2">
            <span className="text-xs font-bold text-slate-400 light:text-slate-600 flex items-center gap-1.5">
              <CalcIcon className="w-4 h-4 text-brand-lime light:text-lime-700" />
              Calculator Panel
            </span>
            <button
              onClick={() => setIsCalculatorOpen(false)}
              className="text-slate-400 light:text-slate-600 hover:text-white light:text-slate-900 light:hover:text-black p-0.5 rounded-full hover:bg-slate-900 light:bg-slate-200/80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Calculator screen */}
          <div className="bg-brand-navy-dark border border-slate-900 light:border-slate-200 rounded-2xl p-3 text-right">
            <p className="text-xs text-slate-500 light:text-slate-500 font-mono h-4 truncate">
              {calcEquation || " "}
            </p>
            <p className="text-2xl font-black text-brand-lime light:text-lime-700 font-mono truncate select-all">
              {calcDisplay}
            </p>
          </div>

          {/* Calculator buttons grid */}
          <div className="grid grid-cols-4 gap-2 text-sm font-semibold font-mono">
            <button onClick={handleCalcClear} className="p-3 bg-slate-900 light:bg-slate-200/80 hover:bg-slate-850 text-brand-lime light:text-lime-700 rounded-xl">C</button>
            <button onClick={handleCalcBackspace} className="p-3 bg-slate-900 light:bg-slate-200/80 hover:bg-slate-850 text-slate-300 light:text-slate-700 rounded-xl">←</button>
            <button onClick={() => handleCalcInput("/")} className="p-3 bg-slate-900 light:bg-slate-200/80 hover:bg-slate-850 text-sky-400 rounded-xl">/</button>
            <button onClick={() => handleCalcInput("*")} className="p-3 bg-slate-900 light:bg-slate-200/80 hover:bg-slate-850 text-sky-400 rounded-xl">*</button>

            <button onClick={() => handleCalcInput("7")} className="p-3 bg-slate-900 light:bg-slate-200/80/40 light:bg-slate-100 hover:bg-slate-850 text-slate-200 light:text-slate-800 rounded-xl">7</button>
            <button onClick={() => handleCalcInput("8")} className="p-3 bg-slate-900 light:bg-slate-200/80/40 light:bg-slate-100 hover:bg-slate-850 text-slate-200 light:text-slate-800 rounded-xl">8</button>
            <button onClick={() => handleCalcInput("9")} className="p-3 bg-slate-900 light:bg-slate-200/80/40 light:bg-slate-100 hover:bg-slate-850 text-slate-200 light:text-slate-800 rounded-xl">9</button>
            <button onClick={() => handleCalcInput("-")} className="p-3 bg-slate-900 light:bg-slate-200/80 hover:bg-slate-850 text-sky-400 rounded-xl">-</button>

            <button onClick={() => handleCalcInput("4")} className="p-3 bg-slate-900 light:bg-slate-200/80/40 light:bg-slate-100 hover:bg-slate-850 text-slate-200 light:text-slate-800 rounded-xl">4</button>
            <button onClick={() => handleCalcInput("5")} className="p-3 bg-slate-900 light:bg-slate-200/80/40 light:bg-slate-100 hover:bg-slate-850 text-slate-200 light:text-slate-800 rounded-xl">5</button>
            <button onClick={() => handleCalcInput("6")} className="p-3 bg-slate-900 light:bg-slate-200/80/40 light:bg-slate-100 hover:bg-slate-850 text-slate-200 light:text-slate-800 rounded-xl">6</button>
            <button onClick={() => handleCalcInput("+")} className="p-3 bg-slate-900 light:bg-slate-200/80 hover:bg-slate-850 text-sky-400 rounded-xl">+</button>

            <button onClick={() => handleCalcInput("1")} className="p-3 bg-slate-900 light:bg-slate-200/80/40 light:bg-slate-100 hover:bg-slate-850 text-slate-200 light:text-slate-800 rounded-xl">1</button>
            <button onClick={() => handleCalcInput("2")} className="p-3 bg-slate-900 light:bg-slate-200/80/40 light:bg-slate-100 hover:bg-slate-850 text-slate-200 light:text-slate-800 rounded-xl">2</button>
            <button onClick={() => handleCalcInput("3")} className="p-3 bg-slate-900 light:bg-slate-200/80/40 light:bg-slate-100 hover:bg-slate-850 text-slate-200 light:text-slate-800 rounded-xl">3</button>
            <button onClick={handleCalcEvaluate} className="row-span-2 p-3 bg-brand-lime text-brand-navy-dark hover:bg-white rounded-xl flex items-center justify-center font-bold text-lg">=</button>

            <button onClick={() => handleCalcInput("0")} className="col-span-2 p-3 bg-slate-900 light:bg-slate-200/80/40 light:bg-slate-100 hover:bg-slate-850 text-slate-200 light:text-slate-800 rounded-xl text-left pl-6">0</button>
            <button onClick={() => handleCalcInput(".")} className="p-3 bg-slate-900 light:bg-slate-200/80/40 light:bg-slate-100 hover:bg-slate-850 text-slate-200 light:text-slate-800 rounded-xl">.</button>
          </div>
          <p className="text-[10px] text-center text-slate-500 light:text-slate-500 font-mono">
            Or type directly. Press ESC to close.
          </p>
        </div>
      )}

      {/* Period Modal (F2) */}
      {isPeriodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-brand-navy-dark border border-slate-800 light:border-slate-200 rounded-3xl p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-900 light:border-slate-200 pb-3">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand-lime light:text-lime-700" />
                Change Period
              </h3>
              <button onClick={() => setIsPeriodModalOpen(false)} className="text-slate-400 light:text-slate-600 hover:text-white light:text-slate-900 light:hover:text-black p-0.5 rounded-full hover:bg-slate-900 light:bg-slate-200/80">
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
                  className="w-full px-4 py-2.5 bg-brand-navy-light/10 light:bg-white border border-slate-800 light:border-slate-200 rounded-xl text-white light:text-slate-900 outline-none focus:border-brand-lime"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 light:text-slate-600">Financial Year End</label>
                <input
                  type="date"
                  required
                  value={fyEnd}
                  onChange={(e) => setFyEnd(e.target.value)}
                  className="w-full px-4 py-2.5 bg-brand-navy-light/10 light:bg-white border border-slate-800 light:border-slate-200 rounded-xl text-white light:text-slate-900 outline-none focus:border-brand-lime"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-900 light:border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsPeriodModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-800 light:border-slate-200 text-slate-400 light:text-slate-600 hover:text-white light:text-slate-900 light:hover:text-black"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-bold text-brand-navy-dark bg-brand-lime hover:bg-white"
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
          <div className="w-full max-w-lg bg-brand-navy-dark border border-slate-800 light:border-slate-200 rounded-3xl p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-900 light:border-slate-200 pb-3">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-lime light:text-lime-700" />
                Company Information
              </h3>
              <button onClick={() => setIsCompanyInfoOpen(false)} className="text-slate-400 light:text-slate-600 hover:text-white light:text-slate-900 light:hover:text-black p-0.5 rounded-full hover:bg-slate-900 light:bg-slate-200/80">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-300 light:text-slate-700">
              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-900 light:border-slate-200/50 light:border-slate-200">
                <span className="font-bold text-slate-500 light:text-slate-500">Name</span>
                <span className="col-span-2 text-white light:text-slate-900 light:text-slate-800 font-semibold">{company?.name}</span>
              </div>

              {company?.gst_number && (
                <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-900 light:border-slate-200/50 light:border-slate-200">
                  <span className="font-bold text-slate-500 light:text-slate-500">GSTIN</span>
                  <span className="col-span-2 font-mono text-brand-lime light:text-lime-700">{company.gst_number}</span>
                </div>
              )}

              {company?.contact_email && (
                <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-900 light:border-slate-200/50 light:border-slate-200">
                  <span className="font-bold text-slate-500 light:text-slate-500">Contact Email</span>
                  <span className="col-span-2">{company.contact_email}</span>
                </div>
              )}

              {company?.contact_phone && (
                <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-900 light:border-slate-200/50 light:border-slate-200">
                  <span className="font-bold text-slate-500 light:text-slate-500">Phone</span>
                  <span className="col-span-2">{company.contact_phone}</span>
                </div>
              )}

              {company?.state && (
                <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-900 light:border-slate-200/50 light:border-slate-200">
                  <span className="font-bold text-slate-500 light:text-slate-500">State</span>
                  <span className="col-span-2">{company.state}</span>
                </div>
              )}

              {company?.address && (
                <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-900 light:border-slate-200/50 light:border-slate-200">
                  <span className="font-bold text-slate-500 light:text-slate-500">Address</span>
                  <span className="col-span-2 text-xs leading-relaxed">{company.address}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-900 light:border-slate-200">
              <button
                onClick={() => setIsCompanyInfoOpen(false)}
                className="px-6 py-2 bg-brand-navy-light/40 border border-slate-800 light:border-slate-200 rounded-xl hover:text-white light:text-slate-900 light:hover:text-black"
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
          <div className="w-full max-w-2xl bg-brand-navy-light border border-slate-800 light:border-slate-200 rounded-3xl overflow-hidden shadow-2xl mt-12 flex flex-col max-h-[80vh] animate-fade-in">
            {/* Search Input */}
            <div className="p-4 border-b border-slate-900 light:border-slate-200 flex items-center gap-3">
              <span className="text-slate-400 light:text-slate-600 font-mono text-sm px-1.5 py-0.5 bg-slate-900 light:bg-slate-200/80 border border-slate-850 rounded">Ctrl+K</span>
              <input
                type="text"
                autoFocus
                placeholder="Search any menu, shortcut, report, or command..."
                value={commandSearchQuery}
                onChange={(e) => {
                  setCommandSearchQuery(e.target.value);
                  setSelectedCommandIndex(0);
                }}
                className="w-full bg-transparent text-white light:text-slate-900 placeholder-slate-500 outline-none text-base font-semibold"
              />
              <button
                onClick={() => {
                  setIsCommandSearchOpen(false);
                  setCommandSearchQuery("");
                }}
                className="p-1 rounded-full text-slate-400 light:text-slate-600 hover:text-white light:text-slate-900 light:hover:text-black hover:bg-slate-900 light:bg-slate-200/80"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Commands List */}
            <div className="flex-1 overflow-y-auto p-2 text-sm divide-y divide-slate-900/30">
              {filteredCommands.length === 0 ? (
                <div className="p-6 text-center text-slate-500 light:text-slate-500">
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
                          ? "bg-brand-lime text-brand-navy-dark font-extrabold shadow"
                          : "text-slate-300 light:text-slate-700 hover:bg-brand-navy-dark/40 hover:text-white light:text-slate-900 light:hover:text-black"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${
                          isSelected ? "bg-brand-navy-dark text-brand-lime light:text-lime-700" : "bg-slate-900 light:bg-slate-200/80 text-slate-400 light:text-slate-600"
                        }`}>
                          {cmd.category}
                        </span>
                        <span>{cmd.name}</span>
                      </div>
                      {cmd.shortcut && (
                        <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${
                          isSelected ? "bg-brand-navy-dark/20 light:bg-white text-brand-navy-dark" : "bg-slate-950 light:bg-slate-100/80 text-slate-500 light:text-slate-500"
                        }`}>
                          {cmd.shortcut}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-950 light:bg-slate-100/40 light:bg-slate-100 border-t border-slate-900 light:border-slate-200 flex items-center justify-between text-[10px] text-slate-500 light:text-slate-500 font-mono">
              <span>Use ↑↓ keys to navigate, Enter to select</span>
              <span>ESC to close</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification Container */}
      <div className="fixed top-24 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="p-4 rounded-2xl bg-brand-navy-light/90 border border-slate-800 light:border-slate-200 text-xs font-semibold text-white light:text-slate-900 shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in-left pointer-events-auto"
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
