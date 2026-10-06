"use client";

import Loader from "../components/Loader";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getCurrentUser, logout } from "../utils/api";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import AppLayout from "../components/AppLayout";
import Logo from "../components/Logo";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Users,
  FileText,
  Percent,
  Bell,
  KeyRound,
  History,
  Download,
  Check,
  Loader2,
  Lock,
  Unlock,
  Settings,
  Sun,
  Moon,
  Trash2,
  Plus,
  ShieldCheck,
  UserPlus
} from "lucide-react";

type TabType = "company" | "users" | "invoice" | "taxes" | "security" | "lock" | "audit" | "export";

interface Company {
  id: string;
  name: string;
  address: string | null;
  gst_number: string | null;
  state: string | null;
  financial_year_start: string | null;
  financial_year_end: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  currency: string;
  logo_url: string | null;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
}

interface InvoiceSettings {
  auto_numbering_prefix: string;
  auto_numbering_start: number;
  template_preset: string;
  default_payment_terms: string;
}

interface TaxRate {
  id: string;
  name: string;
  percentage: number;
  is_default: boolean;
}

interface NotificationSettings {
  invoice_sent: boolean;
  payment_received: boolean;
  overdue_reminder: boolean;
}

interface AuditLog {
  id: string;
  action: string;
  table_name: string;
  created_at: string;
  user_name: string;
  user_email: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("company");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);

  // Register Escape key to route back to dashboard
  useKeyboardShortcuts([
    {
      keys: "Escape",
      action: () => router.push("/dashboard"),
      description: "Return to Dashboard",
      category: "Global"
    }
  ]);

  // Load States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; text: string }[]>([]);

  // Theme State
  const [theme, setTheme] = useState("dark");

  // Currency State
  const [currency, setCurrency] = useState("₹");

  useEffect(() => {
    const updateCurrency = () => {
      const activeCompanyStr = localStorage.getItem("activeCompany");
      if (activeCompanyStr) {
        try {
          const comp = JSON.parse(activeCompanyStr);
          setCurrency(comp.currency || "₹");
          setCompanyFields(prev => ({ ...prev, currency: comp.currency || "₹" }));
        } catch (e) {}
      }
    };
    updateCurrency();
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
        setCompanyFields(prev => ({ ...prev, currency: newCurrency }));
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

  // Form Fields: Company Info
  const [companyFields, setCompanyFields] = useState({
    name: "",
    address: "",
    contact_email: "",
    contact_phone: "",
    currency: "₹",
    logo_url: ""
  });

  // Form Fields: Users Management
  const [users, setUsers] = useState<User[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("accountant");

  // Form Fields: Invoice Presets
  const [invoiceFields, setInvoiceFields] = useState<InvoiceSettings>({
    auto_numbering_prefix: "INV-",
    auto_numbering_start: 1,
    template_preset: "classic",
    default_payment_terms: "net_30"
  });

  // Form Fields: Taxes
  const [taxes, setTaxes] = useState<TaxRate[]>([]);
  const [taxName, setTaxName] = useState("");
  const [taxPercent, setTaxPercent] = useState("");
  const [taxIsDefault, setTaxIsDefault] = useState(false);



  // Form Fields: Security Password Change
  const [passwordFields, setPasswordFields] = useState({
    old_password: "",
    new_password: "",
    confirm_password: ""
  });

  // System Lock Status
  const [lockStatus, setLockStatus] = useState<any>({ locked: false });
  const [lockCountdown, setLockCountdown] = useState<number>(0);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);

  // Trigger Toast notifications
  const triggerToast = (text: string) => {
    const id = Math.random().toString();
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Auth, Active Company details fetch
  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setCurrentUser(user);

    const companyStr = localStorage.getItem("activeCompany");
    if (!companyStr) {
      router.push("/companies");
      return;
    }

    try {
      const companyObj = JSON.parse(companyStr);
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (companyObj && companyObj.id && uuidRegex.test(companyObj.id)) {
        setActiveCompany(companyObj);
        loadAllSettings(companyObj.id);
      } else {
        router.push("/companies");
      }
    } catch (e) {
      router.push("/companies");
    }

    // Load theme setting
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
    if (savedTheme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }

    // Parse tab query parameter
    try {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam && ["company", "users", "invoice", "taxes", "notifications", "security", "lock", "audit", "export"].includes(tabParam)) {
        setActiveTab(tabParam as TabType);
      }
    } catch (e) {}
  }, [router]);

  // Lock status check interval
  useEffect(() => {
    if (!activeCompany || !activeCompany.id) return;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(activeCompany.id)) return;

    const fetchLock = async () => {
      try {
        const data = await apiFetch(`/settings/lock-status?company_id=${activeCompany.id}`);
        setLockStatus(data);
        if (data.locked && data.expires_at) {
          const timeLeft = Math.max(0, Math.floor((new Date(data.expires_at).getTime() - Date.now()) / 1000));
          setLockCountdown(timeLeft);
        }
      } catch (err) {
        console.error("Failed to check lock status:", err);
      }
    };

    fetchLock();
    const interval = setInterval(fetchLock, 30000); // Check lock status every 30s
    return () => clearInterval(interval);
  }, [activeCompany]);

  // Lock countdown timer
  useEffect(() => {
    if (lockCountdown <= 0) return;
    const timer = setTimeout(() => {
      setLockCountdown(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [lockCountdown]);

  // Listen for arrow keys to switch settings tabs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTyping = 
        document.activeElement?.tagName === "INPUT" || 
        document.activeElement?.tagName === "SELECT" || 
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.getAttribute("contenteditable") === "true";

      if (isTyping) return;

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const tabs: TabType[] = ["company", "users", "invoice", "taxes", "security", "lock", "audit", "export"];
        const currentIdx = tabs.indexOf(activeTab);
        if (currentIdx === -1) return;

        let nextIdx = currentIdx;
        if (e.key === "ArrowDown") {
          nextIdx = (currentIdx + 1) % tabs.length;
        } else if (e.key === "ArrowUp") {
          nextIdx = (currentIdx - 1 + tabs.length) % tabs.length;
        }
        setActiveTab(tabs[nextIdx]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab]);

  // Scroll selected settings tab into view
  useEffect(() => {
    const activeBtn = document.querySelector(`[data-tab-id="${activeTab}"]`);
    if (activeBtn) {
      activeBtn.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeTab]);

  // Fetch all configuration lists
  const loadAllSettings = async (companyId: string) => {
    setLoading(true);
    try {
      // 1. Fetch Company details
      const companyRes = await apiFetch(`/companies`);
      const currentComp = companyRes.find((c: any) => c.id === companyId);
      if (currentComp) {
        setCompanyFields({
          name: currentComp.name,
          address: currentComp.address || "",
          contact_email: currentComp.contact_email || "",
          contact_phone: currentComp.contact_phone || "",
          currency: currentComp.currency || "₹",
          logo_url: currentComp.logo_url || ""
        });
      }

      // 2. Fetch Users lists
      const usersRes = await apiFetch(`/settings/users?company_id=${companyId}`);
      setUsers(usersRes.users || []);

      // 3. Fetch Invoice settings
      const invoiceRes = await apiFetch(`/settings/invoice?company_id=${companyId}`);
      if (invoiceRes.settings) {
        setInvoiceFields(invoiceRes.settings);
      }

      // 4. Fetch Taxes list
      const taxesRes = await apiFetch(`/settings/taxes?company_id=${companyId}`);
      setTaxes(taxesRes.taxes || []);



      // 6. Fetch Audit Logs
      fetchAuditLogs(companyId, 1);

    } catch (err: any) {
      triggerToast(err.message || "Failed to load system settings");
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async (companyId: string, page: number) => {
    try {
      const auditRes = await apiFetch(`/settings/audit-logs?company_id=${companyId}&page=${page}&limit=10`);
      setAuditLogs(auditRes.logs || []);
      setAuditPage(auditRes.page);
      setAuditTotalPages(auditRes.totalPages);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    }
  };

  // Toggle Theme helper
  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  };

  // Submit profile forms
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany) return;
    setSubmitting(true);
    try {
      await apiFetch("/settings/company", {
        method: "PUT",
        body: JSON.stringify({
          company_id: activeCompany.id,
          ...companyFields
        })
      });
      triggerToast("Company profile saved successfully.");
      
      // Update local storage representation
      const updatedCompany = { ...activeCompany, ...companyFields };
      localStorage.setItem("activeCompany", JSON.stringify(updatedCompany));
      setActiveCompany(updatedCompany);
    } catch (err: any) {
      triggerToast(err.message || "Failed to update profile settings");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit User invitation
  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany) return;
    if (!inviteEmail.trim()) return;

    setSubmitting(true);
    try {
      await apiFetch("/settings/users/invite", {
        method: "POST",
        body: JSON.stringify({
          company_id: activeCompany.id,
          email: inviteEmail.trim(),
          role: inviteRole
        })
      });
      triggerToast("User added to company successfully.");
      setInviteEmail("");
      
      // Refresh user list
      const usersRes = await apiFetch(`/settings/users?company_id=${activeCompany.id}`);
      setUsers(usersRes.users || []);
    } catch (err: any) {
      triggerToast(err.message || "Failed to add user");
    } finally {
      setSubmitting(false);
    }
  };

  // Update member role
  const handleUpdateRole = async (targetUserId: string, newRole: string) => {
    if (!activeCompany) return;
    try {
      await apiFetch("/settings/users/role", {
        method: "PUT",
        body: JSON.stringify({
          company_id: activeCompany.id,
          target_user_id: targetUserId,
          role: newRole
        })
      });
      triggerToast("User role updated successfully.");
      setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, role: newRole } : u));
    } catch (err: any) {
      triggerToast(err.message || "Failed to update role");
    }
  };

  // Toggle user status
  const handleToggleUserStatus = async (targetUserId: string, currentStatus: boolean) => {
    if (!activeCompany) return;
    try {
      const nextStatus = !currentStatus;
      await apiFetch("/settings/users/status", {
        method: "PUT",
        body: JSON.stringify({
          company_id: activeCompany.id,
          target_user_id: targetUserId,
          is_active: nextStatus
        })
      });
      triggerToast(`User status set to ${nextStatus ? 'active' : 'inactive'}.`);
      setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, is_active: nextStatus } : u));
    } catch (err: any) {
      triggerToast(err.message || "Failed to update member status");
    }
  };

  // Save invoice document presets
  const handleSaveInvoiceSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany) return;
    setSubmitting(true);
    try {
      await apiFetch("/settings/invoice", {
        method: "PUT",
        body: JSON.stringify({
          company_id: activeCompany.id,
          ...invoiceFields
        })
      });
      triggerToast("Invoice layout settings saved.");
    } catch (err: any) {
      triggerToast(err.message || "Save invoice settings failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Tax rates CRUD: Add rate
  const handleAddTaxRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany) return;
    if (!taxName.trim() || !taxPercent.trim()) return;

    setSubmitting(true);
    try {
      const res = await apiFetch("/settings/taxes", {
        method: "POST",
        body: JSON.stringify({
          company_id: activeCompany.id,
          name: taxName.trim(),
          percentage: parseFloat(taxPercent),
          is_default: taxIsDefault
        })
      });
      triggerToast("Tax rate registered successfully.");
      setTaxName("");
      setTaxPercent("");
      setTaxIsDefault(false);
      
      // Refresh tax list
      const taxesRes = await apiFetch(`/settings/taxes?company_id=${activeCompany.id}`);
      setTaxes(taxesRes.taxes || []);
    } catch (err: any) {
      triggerToast(err.message || "Tax rate addition failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete tax rate
  const handleDeleteTaxRate = async (id: string) => {
    if (!activeCompany) return;
    if (!confirm("Are you sure you want to delete this tax rate?")) return;
    try {
      await apiFetch(`/settings/taxes/${id}?company_id=${activeCompany.id}`, {
        method: "DELETE"
      });
      triggerToast("Tax rate deleted successfully.");
      setTaxes(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      triggerToast(err.message || "Tax deletion failed");
    }
  };



  // Security: Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordFields.new_password !== passwordFields.confirm_password) {
      triggerToast("New passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch("/settings/change-password", {
        method: "PUT",
        body: JSON.stringify({
          old_password: passwordFields.old_password,
          new_password: passwordFields.new_password
        })
      });
      triggerToast("Password changed successfully.");
      setPasswordFields({ old_password: "", new_password: "", confirm_password: "" });
    } catch (err: any) {
      triggerToast(err.message || "Password update failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Mutex: Force Release Lock (Owner only)
  const handleForceReleaseLock = async () => {
    if (!activeCompany) return;
    if (!confirm("Caution: Releasing the lock manually allows other users to edit data concurrently. Continue?")) return;

    setSubmitting(true);
    try {
      await apiFetch("/settings/lock/release", {
        method: "POST",
        body: JSON.stringify({ company_id: activeCompany.id })
      });
      triggerToast("System lock released.");
      setLockStatus({ locked: false });
      setLockCountdown(0);
    } catch (err: any) {
      triggerToast(err.message || "Failed to release lock");
    } finally {
      setSubmitting(false);
    }
  };

  // Exporter: Trigger download CSV
  const handleExportCSV = async () => {
    if (!activeCompany) return;
    try {
      triggerToast("Generating CSV transaction export...");
      const link = document.createElement("a");
      const apiHost = typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.hostname}:5000`
        : "http://localhost:5000";
      link.href = `${apiHost}/api/settings/export/csv?company_id=${activeCompany.id}`;
      // In Next.js/Browser fetch we authenticate with credentials cookies automatically
      link.setAttribute("target", "_blank");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      triggerToast("Failed to initiate CSV download");
    }
  };

  // Format Lock Time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <AppLayout
      pageTitle="System Settings & Administration"
      pageSubtitle="Configure enterprise company profile, team user controls, security, tax preferences, invoice formatting, and audit trails."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Tab Selector - 3 span */}
        <section className="lg:col-span-3 rounded-3xl bg-slate-900/30 light:bg-white border border-slate-800 light:border-slate-200 p-5 shadow-xl backdrop-blur-xl space-y-4">
          <div className="border-b border-slate-800 light:border-slate-200 pb-3 flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-red-500 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              System Settings
            </h2>
          </div>

          <nav className="flex flex-col gap-1 text-xs">
            <button
              onClick={() => setActiveTab("company")}
              data-tab-id="company"
              className={`w-full py-2.5 px-3 flex items-center gap-2.5 rounded-xl text-left transition font-bold scroll-mt-24 ${
                activeTab === "company" ? "bg-red-600 text-white shadow-sm" : "text-slate-400 light:text-slate-600 hover:bg-slate-800/60 light:hover:bg-slate-100 hover:text-white light:hover:text-black focus:outline-none"
              }`}
            >
              <Building2 className="w-4 h-4" />
              Company Profile
            </button>

            <button
              onClick={() => setActiveTab("users")}
              data-tab-id="users"
              className={`w-full py-2.5 px-3 flex items-center gap-2.5 rounded-xl text-left transition font-bold scroll-mt-24 ${
                activeTab === "users" ? "bg-red-600 text-white shadow-sm" : "text-slate-400 light:text-slate-600 hover:bg-slate-800/60 light:hover:bg-slate-100 hover:text-white light:hover:text-black focus:outline-none"
              }`}
            >
              <Users className="w-4 h-4" />
              User Management
            </button>

            <button
              onClick={() => setActiveTab("invoice")}
              data-tab-id="invoice"
              className={`w-full py-2.5 px-3 flex items-center gap-2.5 rounded-xl text-left transition font-bold scroll-mt-24 ${
                activeTab === "invoice" ? "bg-red-600 text-white shadow-sm" : "text-slate-400 light:text-slate-600 hover:bg-slate-800/60 light:hover:bg-slate-100 hover:text-white light:hover:text-black focus:outline-none"
              }`}
            >
              <FileText className="w-4 h-4" />
              Invoice Formats
            </button>

            <button
              onClick={() => setActiveTab("taxes")}
              data-tab-id="taxes"
              className={`w-full py-2.5 px-3 flex items-center gap-2.5 rounded-xl text-left transition font-bold scroll-mt-24 ${
                activeTab === "taxes" ? "bg-red-600 text-white shadow-sm" : "text-slate-400 light:text-slate-600 hover:bg-slate-800/60 light:hover:bg-slate-100 hover:text-white light:hover:text-black focus:outline-none"
              }`}
            >
              <Percent className="w-4 h-4" />
              Tax Settings
            </button>

            <button
              onClick={() => setActiveTab("security")}
              data-tab-id="security"
              className={`w-full py-2.5 px-3 flex items-center gap-2.5 rounded-xl text-left transition font-bold scroll-mt-24 ${
                activeTab === "security" ? "bg-red-600 text-white shadow-sm" : "text-slate-400 light:text-slate-600 hover:bg-slate-800/60 light:hover:bg-slate-100 hover:text-white light:hover:text-black focus:outline-none"
              }`}
            >
              <KeyRound className="w-4 h-4" />
              Password Security
            </button>

            <button
              onClick={() => setActiveTab("lock")}
              data-tab-id="lock"
              className={`w-full py-2.5 px-3 flex items-center justify-between rounded-xl text-left transition font-bold scroll-mt-24 ${
                activeTab === "lock" ? "bg-red-600 text-white shadow-sm" : "text-slate-400 light:text-slate-600 hover:bg-slate-800/60 light:hover:bg-slate-100 hover:text-white light:hover:text-black focus:outline-none"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Lock className="w-4 h-4" />
                Concurrency Lock
              </span>
              {lockStatus.locked ? (
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
              ) : (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("audit")}
              data-tab-id="audit"
              className={`w-full py-2.5 px-3 flex items-center gap-2.5 rounded-xl text-left transition font-bold scroll-mt-24 ${
                activeTab === "audit" ? "bg-red-600 text-white shadow-sm" : "text-slate-400 light:text-slate-600 hover:bg-slate-800/60 light:hover:bg-slate-100 hover:text-white light:hover:text-black focus:outline-none"
              }`}
            >
              <History className="w-4 h-4" />
              System Audit Log
            </button>

            <div className="h-[1px] bg-slate-800 light:border-slate-200 my-2"></div>

            <button
              onClick={() => {
                setActiveTab("export");
              }}
              data-tab-id="export"
              className={`w-full py-2.5 px-3 flex items-center gap-2.5 rounded-xl text-left transition font-semibold scroll-mt-24 ${
                activeTab === "export"
                  ? "bg-red-600 text-white font-black"
                  : "text-slate-400 light:text-slate-600 hover:bg-red-500/10 hover:text-red-400 light:hover:text-red-750 focus:outline-none"
              }`}
            >
              <Download className="w-4 h-4" />
              Export Transactions
            </button>
          </nav>
        </section>

        {/* Right Column: Tab View Panels - 9 span */}
        <section className="lg:col-span-9 rounded-3xl bg-slate-900/30 light:bg-white border border-slate-800 light:border-slate-200 p-6 shadow-xl backdrop-blur-xl">
          {loading ? (
            <Loader kind="vault" label="Loading configuration datasets" />
          ) : (
            <div className="space-y-6">
              {/* Tab 1: Company Profile */}
              {activeTab === "company" && (
                <form onSubmit={handleSaveCompany} className="space-y-5">
                  <div>
                    <h3 className="text-base font-bold text-white light:text-slate-900 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-red-500" />
                      Company Profile Settings
                    </h3>
                    <p className="text-[11px] text-slate-400 light:text-slate-600 mt-0.5">Manage legal name, logo configuration, and organization contact profiles.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 light:text-slate-600 uppercase font-bold tracking-wider">Company Name</label>
                      <input
                        type="text"
                        required
                        value={companyFields.name}
                        onChange={(e) => setCompanyFields({ ...companyFields, name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-slate-200 light:text-slate-800 outline-none focus:border-red-500 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 light:text-slate-600 uppercase font-bold tracking-wider">Logo URL / Image Link</label>
                      <input
                        type="text"
                        placeholder="Logo image URL"
                        value={companyFields.logo_url}
                        onChange={(e) => setCompanyFields({ ...companyFields, logo_url: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-slate-200 light:text-slate-800 outline-none focus:border-red-500 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 light:text-slate-600 uppercase font-bold tracking-wider">Contact Email</label>
                      <input
                        type="email"
                        value={companyFields.contact_email}
                        onChange={(e) => setCompanyFields({ ...companyFields, contact_email: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-slate-200 light:text-slate-800 outline-none focus:border-red-500 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 light:text-slate-600 uppercase font-bold tracking-wider">Contact Phone</label>
                      <input
                        type="text"
                        value={companyFields.contact_phone}
                        onChange={(e) => setCompanyFields({ ...companyFields, contact_phone: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-slate-200 light:text-slate-800 outline-none focus:border-red-500 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 light:text-slate-600 uppercase font-bold tracking-wider">Currency Symbol</label>
                      <input
                        type="text"
                        required
                        maxLength={5}
                        value={companyFields.currency}
                        onChange={(e) => setCompanyFields({ ...companyFields, currency: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-slate-200 light:text-slate-800 outline-none focus:border-red-500 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 light:text-slate-600 uppercase font-bold tracking-wider">Mailing Address</label>
                      <textarea
                        value={companyFields.address}
                        onChange={(e) => setCompanyFields({ ...companyFields, address: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-slate-200 light:text-slate-800 outline-none focus:border-red-500 text-xs resize-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Save Organization Settings
                  </button>
                </form>
              )}

              {/* Tab 2: User Management */}
              {activeTab === "users" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-white light:text-slate-900 flex items-center gap-2">
                      <Users className="w-5 h-5 text-red-500" />
                      User Authorization Management
                    </h3>
                    <p className="text-[11px] text-slate-400 light:text-slate-600 mt-0.5">Invite team members to collaborate and edit ledger states with specific roles.</p>
                  </div>

                  {/* Invite Form */}
                  <form onSubmit={handleInviteUser} className="p-4 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-end gap-3">
                    <div className="flex-1 space-y-1">
                      <label className="text-[9px] text-slate-400 light:text-slate-600 uppercase font-bold tracking-wider">Associate User by Registered Email</label>
                      <input
                        type="email"
                        required
                        placeholder="Email address"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 light:bg-white border border-slate-800 light:border-slate-300 rounded-xl text-slate-200 light:text-slate-800 outline-none focus:border-red-500 text-xs font-semibold"
                      />
                    </div>

                    <div className="w-full md:w-48 space-y-1">
                      <label className="text-[9px] text-slate-400 light:text-slate-600 uppercase font-bold tracking-wider">Access Role</label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 light:bg-white border border-slate-800 light:border-slate-300 rounded-xl text-slate-300 light:text-slate-700 outline-none focus:border-red-500 text-xs font-bold"
                      >
                        <option value="admin">Administrator</option>
                        <option value="accountant">Accountant</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition h-9 shrink-0 justify-center"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Add Member
                    </button>
                  </form>

                  {/* Users List Grid */}
                  <div className="overflow-hidden border border-slate-800 light:border-slate-200 rounded-2xl bg-slate-900/30 light:bg-white">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 light:border-slate-200 bg-slate-950 light:bg-slate-100 text-slate-400 light:text-slate-600 uppercase font-black tracking-wider text-[9px]">
                          <th className="py-2.5 px-4">Name</th>
                          <th className="py-2.5 px-4">Email</th>
                          <th className="py-2.5 px-4">Company Role</th>
                          <th className="py-2.5 px-4 text-center">Active Status</th>
                          <th className="py-2.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((item) => (
                          <tr key={item.id} className="border-b border-slate-800/50 light:border-slate-100 text-slate-300 light:text-slate-700">
                            <td className="py-3 px-4 font-bold text-white light:text-slate-900">{item.name}</td>
                            <td className="py-3 px-4 font-mono text-slate-500">{item.email}</td>
                            <td className="py-3 px-4">
                              {item.role === 'owner' ? (
                                <span className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-400 rounded font-bold uppercase">Owner</span>
                              ) : (
                                <select
                                  value={item.role}
                                  onChange={(e) => handleUpdateRole(item.id, e.target.value)}
                                  className="bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded px-2 py-0.5 text-xs text-slate-300 light:text-slate-700 font-bold outline-none"
                                >
                                  <option value="admin">Admin</option>
                                  <option value="accountant">Accountant</option>
                                  <option value="viewer">Viewer</option>
                                </select>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {item.role === 'owner' ? (
                                <span className="text-[10px] text-emerald-400 light:text-emerald-700 font-bold">Active</span>
                              ) : (
                                <button
                                  onClick={() => handleToggleUserStatus(item.id, item.is_active)}
                                  className={`px-3 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                    item.is_active
                                      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 light:text-emerald-700"
                                      : "bg-red-500/10 border-red-500/25 text-red-400"
                                  }`}
                                >
                                  {item.is_active ? "Active" : "Deactivated"}
                                </button>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-[10px]">
                              {item.role === 'owner' ? 'System root' : 'Manageable'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 3: Invoice Formats */}
              {activeTab === "invoice" && (
                <form onSubmit={handleSaveInvoiceSettings} className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-white light:text-slate-900 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-red-500" />
                      Document & Invoice Layout Settings
                    </h3>
                    <p className="text-[11px] text-slate-400 light:text-slate-600 mt-0.5">Control billing template designs, invoice numbering sequencing, and default rules.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 light:text-slate-600 uppercase font-bold tracking-wider">Invoice Auto-Numbering Prefix</label>
                      <input
                        type="text"
                        required
                        value={invoiceFields.auto_numbering_prefix}
                        onChange={(e) => setInvoiceFields({ ...invoiceFields, auto_numbering_prefix: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-slate-200 light:text-slate-800 outline-none focus:border-red-500 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 light:text-slate-600 uppercase font-bold tracking-wider">Starting Voucher Sequence Number</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={invoiceFields.auto_numbering_start}
                        onChange={(e) => setInvoiceFields({ ...invoiceFields, auto_numbering_start: parseInt(e.target.value, 10) })}
                        className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-slate-200 light:text-slate-800 outline-none focus:border-red-500 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 light:text-slate-600 uppercase font-bold tracking-wider">Default Payment Terms</label>
                      <select
                        value={invoiceFields.default_payment_terms}
                        onChange={(e) => setInvoiceFields({ ...invoiceFields, default_payment_terms: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-slate-300 light:text-slate-700 outline-none focus:border-red-500 text-xs font-bold"
                      >
                        <option value="due_on_receipt">Due on Receipt</option>
                        <option value="net_15">Net 15 Days</option>
                        <option value="net_30">Net 30 Days</option>
                        <option value="net_45">Net 45 Days</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 light:text-slate-600 uppercase font-bold tracking-wider">Invoice Style Template Preset</label>
                      <select
                        value={invoiceFields.template_preset}
                        onChange={(e) => setInvoiceFields({ ...invoiceFields, template_preset: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-slate-300 light:text-slate-700 outline-none focus:border-red-500 text-xs font-bold"
                      >
                        <option value="classic">Classic Clean Template</option>
                        <option value="modern">Modern Professional Template</option>
                        <option value="minimal">Minimalist Grid Template</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Save Invoice Layout Rules
                  </button>
                </form>
              )}

              {/* Tab 4: Tax Settings */}
              {activeTab === "taxes" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-white light:text-slate-900 flex items-center gap-2">
                      <Percent className="w-5 h-5 text-red-500" />
                      Tax Rules & Rates Directory
                    </h3>
                    <p className="text-[11px] text-slate-400 light:text-slate-600 mt-0.5">Register tax rates (like GST 18%, Service Tax) to apply to billing products.</p>
                  </div>

                  {/* Add Tax Form */}
                  <form onSubmit={handleAddTaxRate} className="p-4 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-200 rounded-2xl flex flex-wrap md:items-end gap-3">
                    <div className="flex-1 min-w-[200px] space-y-1">
                      <label className="text-[9px] text-slate-400 light:text-slate-600 uppercase font-bold tracking-wider">Tax Rule Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Tax name (e.g. GST)"
                        value={taxName}
                        onChange={(e) => setTaxName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 light:bg-white border border-slate-800 light:border-slate-300 rounded-xl text-slate-200 light:text-slate-800 outline-none focus:border-red-500 text-xs font-semibold"
                      />
                    </div>

                    <div className="w-full md:w-32 space-y-1">
                      <label className="text-[9px] text-slate-400 light:text-slate-600 uppercase font-bold tracking-wider">Percentage (%)</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        placeholder="Rate percentage"
                        value={taxPercent}
                        onChange={(e) => setTaxPercent(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 light:bg-white border border-slate-800 light:border-slate-300 rounded-xl text-slate-200 light:text-slate-800 outline-none focus:border-red-500 text-xs font-mono font-bold"
                      />
                    </div>

                    <div className="w-full md:w-40 flex items-center gap-2 pb-2">
                      <input
                        type="checkbox"
                        id="taxIsDefault"
                        checked={taxIsDefault}
                        onChange={(e) => setTaxIsDefault(e.target.checked)}
                        className="rounded accent-red-600"
                      />
                      <label htmlFor="taxIsDefault" className="text-xs text-slate-300 light:text-slate-700 font-bold select-none cursor-pointer">Default rate</label>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition h-9 shrink-0 justify-center ml-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Tax Rate
                    </button>
                  </form>

                  {/* Taxes Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {taxes.map((t) => (
                      <div key={t.id} className="p-4 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-200 rounded-2xl flex items-center justify-between shadow-sm">
                        <div>
                          <p className="text-xs font-bold text-white light:text-slate-900 flex items-center gap-1.5">
                            {t.name}
                            {t.is_default && (
                              <span className="text-[9px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded font-bold border border-red-500/20">DEFAULT</span>
                            )}
                          </p>
                          <p className="text-xl font-bold text-slate-400 light:text-slate-600 mt-1">{t.percentage}%</p>
                        </div>
                        <button
                          onClick={() => handleDeleteTaxRate(t.id)}
                          className="p-2 bg-slate-900 light:bg-slate-100 border border-slate-800 light:border-slate-200 text-slate-400 light:text-slate-600 hover:text-red-400 rounded-xl transition"
                          title="Delete Tax Rate"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 6: Security Change Password */}
              {activeTab === "security" && (
                <form onSubmit={handleChangePassword} className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-white light:text-slate-900 flex items-center gap-2">
                      <KeyRound className="w-5 h-5 text-red-500" />
                      Session & Password Settings
                    </h3>
                    <p className="text-[11px] text-slate-400 light:text-slate-600 mt-0.5">Modify account verification credentials to secure access logs.</p>
                  </div>

                  <div className="space-y-4 max-w-md">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 light:text-slate-600 uppercase font-bold tracking-wider">Current Password</label>
                      <input
                        type="password"
                        required
                        value={passwordFields.old_password}
                        onChange={(e) => setPasswordFields({ ...passwordFields, old_password: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-slate-200 light:text-slate-800 outline-none focus:border-red-500 text-xs font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 light:text-slate-600 uppercase font-bold tracking-wider">New Password</label>
                      <input
                        type="password"
                        required
                        value={passwordFields.new_password}
                        onChange={(e) => setPasswordFields({ ...passwordFields, new_password: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-slate-200 light:text-slate-800 outline-none focus:border-red-500 text-xs font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 light:text-slate-600 uppercase font-bold tracking-wider">Confirm New Password</label>
                      <input
                        type="password"
                        required
                        value={passwordFields.confirm_password}
                        onChange={(e) => setPasswordFields({ ...passwordFields, confirm_password: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-slate-200 light:text-slate-800 outline-none focus:border-red-500 text-xs font-bold"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Update Password Verification
                  </button>
                </form>
              )}

              {/* Tab 7: Concurrency Lock Mutex */}
              {activeTab === "lock" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-white light:text-slate-900 flex items-center gap-2">
                      <Lock className="w-5 h-5 text-red-500" />
                      Single-User Concurrency Lock
                    </h3>
                    <p className="text-[11px] text-slate-400 light:text-slate-600 mt-0.5">Enforces data consistency by restricting system writes to one user session at a time.</p>
                  </div>

                  <div className="p-6 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-200 rounded-3xl flex flex-col md:flex-row items-center gap-6 shadow-sm">
                    <div className={`p-4 rounded-full border ${
                      lockStatus.locked
                        ? "bg-red-500/10 border-red-500/30 text-red-400"
                        : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 light:text-emerald-700"
                    }`}>
                      {lockStatus.locked ? <Lock className="w-10 h-10 animate-bounce" /> : <Unlock className="w-10 h-10" />}
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-1.5">
                      <p className="text-lg font-bold text-white light:text-slate-900">
                        {lockStatus.locked
                          ? `System is Locked by ${lockStatus.is_current_user ? "You" : lockStatus.user_name}`
                          : "System is Free to Edit"}
                      </p>
                      
                      {lockStatus.locked && (
                        <div className="text-xs text-slate-400 light:text-slate-600 space-y-0.5">
                          <p>Holder Email: <span className="font-mono font-semibold text-slate-300 light:text-slate-700">{lockStatus.user_email}</span></p>
                          <p>Lock acquired: <span className="font-semibold text-slate-300 light:text-slate-700">{new Date(lockStatus.locked_at).toLocaleString()}</span></p>
                          <p>Lock Session Expiration: <span className="font-mono font-bold text-red-400">{formatTime(lockCountdown)}</span></p>
                        </div>
                      )}

                      {!lockStatus.locked && (
                        <p className="text-xs text-slate-400 light:text-slate-600">The concurrency mutex will automatically claim lock status for your session upon your next write operation (invoice creation, ledger edit, vouchers entry).</p>
                      )}
                    </div>

                    {lockStatus.locked && (
                      <button
                        onClick={handleForceReleaseLock}
                        disabled={submitting}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition"
                      >
                        Force Release Lock
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 8: System Audit Logs */}
              {activeTab === "audit" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-white light:text-slate-900 flex items-center gap-2">
                      <History className="w-5 h-5 text-red-500" />
                      Security Audit & Activity Logs
                    </h3>
                    <p className="text-[11px] text-slate-400 light:text-slate-600 mt-0.5">Verify double-entry transactions audit trail tracking who performed modifications, when.</p>
                  </div>

                  <div className="overflow-hidden border border-slate-800 light:border-slate-200 rounded-2xl bg-slate-900/30 light:bg-white">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 light:border-slate-200 bg-slate-950 light:bg-slate-100 text-slate-400 light:text-slate-600 uppercase font-black tracking-wider text-[9px]">
                          <th className="py-2.5 px-4">Operator</th>
                          <th className="py-2.5 px-4">Action Context</th>
                          <th className="py-2.5 px-4">Module Target</th>
                          <th className="py-2.5 px-4">Audit Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="border-b border-slate-800/50 light:border-slate-100 text-slate-300 light:text-slate-700">
                            <td className="py-3 px-4">
                              <p className="font-bold text-white light:text-slate-900">{log.user_name || "System"}</p>
                              <p className="text-[9px] font-mono text-slate-500">{log.user_email}</p>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-red-400 text-[10px]">{log.action}</td>
                            <td className="py-3 px-4 text-slate-400 light:text-slate-600 font-semibold">{log.table_name.toUpperCase()}</td>
                            <td className="py-3 px-4 text-slate-500 font-mono">{new Date(log.created_at).toLocaleString()}</td>
                          </tr>
                        ))}
                        {auditLogs.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-12 text-center text-slate-500 text-xs">No audit events recorded.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination control */}
                  {auditTotalPages > 1 && (
                    <div className="flex justify-between items-center text-xs">
                      <button
                        onClick={() => {
                          if (auditPage > 1) {
                            fetchAuditLogs(activeCompany!.id, auditPage - 1);
                          }
                        }}
                        disabled={auditPage === 1}
                        className="px-3 py-1.5 bg-slate-900 light:bg-slate-100 border border-slate-800 light:border-slate-200 rounded-xl hover:text-white light:hover:text-black disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <span className="text-slate-400 light:text-slate-600">Page {auditPage} of {auditTotalPages}</span>
                      <button
                        onClick={() => {
                          if (auditPage < auditTotalPages) {
                            fetchAuditLogs(activeCompany!.id, auditPage + 1);
                          }
                        }}
                        disabled={auditPage === auditTotalPages}
                        className="px-3 py-1.5 bg-slate-900 light:bg-slate-100 border border-slate-800 light:border-slate-200 rounded-xl hover:text-white light:hover:text-black disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "export" && (
                <div className="flex flex-col gap-6 text-slate-200 light:text-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-white light:text-slate-900 uppercase tracking-wide">Export Transaction Ledger Data</h3>
                    <p className="text-[11px] text-slate-400 light:text-slate-600 mt-0.5">Generate and download a comma-separated values (.csv) spreadsheet file of all your double-entry vouchers.</p>
                  </div>

                  <div className="border border-slate-800 light:border-slate-200 rounded-2xl bg-slate-900/30 light:bg-white p-8 text-center flex flex-col items-center gap-4">
                    <Download className="w-12 h-12 text-red-500" />
                    <div>
                      <p className="text-xs font-bold text-white light:text-slate-900">Your CSV export is ready to generate.</p>
                      <p className="text-[10px] text-slate-500 mt-1">This export contains all journal vouchers, ledger postings, accounts balances, and transaction details matching the current company workspace.</p>
                    </div>
                    <button
                      onClick={handleExportCSV}
                      className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm transition duration-200 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download CSV Database
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Floating Toast Notification Wrapper */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="px-4 py-3 bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 text-slate-200 light:text-slate-800 font-bold rounded-2xl shadow-xl flex items-center gap-2 border-l-4 border-l-red-500 text-xs">
            <ShieldCheck className="w-4 h-4 text-red-500" />
            {t.text}
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
