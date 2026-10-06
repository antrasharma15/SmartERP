"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, logout, getCurrentUser } from "../utils/api";
import Logo from "../components/Logo";
import {
  Building2,
  Plus,
  Trash2,
  Edit2,
  LogOut,
  Loader2,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  X,
  Sun,
  Moon,
  Image as ImageIcon,
  Upload,
  Search,
  Check,
  Keyboard,
  CornerDownLeft
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
  role: string;
}

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry"
];

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const router = useRouter();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [state, setState] = useState("");
  const [financialYearStart, setFinancialYearStart] = useState("2026-04-01");
  const [financialYearEnd, setFinancialYearEnd] = useState("2027-03-31");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // State Searchable Dropdown State
  const [stateSearch, setStateSearch] = useState("");
  const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);
  const [highlightedStateIndex, setHighlightedStateIndex] = useState(0);

  // Field Navigation Refs
  const nameInputRef = useRef<HTMLInputElement>(null);
  const logoUrlInputRef = useRef<HTMLInputElement>(null);
  const gstInputRef = useRef<HTMLInputElement>(null);
  const stateInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLTextAreaElement>(null);
  const fyStartInputRef = useRef<HTMLInputElement>(null);
  const fyEndInputRef = useRef<HTMLInputElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  const stateDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredStates = INDIAN_STATES.filter((s) =>
    s.toLowerCase().includes(stateSearch.toLowerCase())
  );

  useEffect(() => {
    const isLight = document.documentElement.classList.contains("light");
    setTheme(isLight ? "light" : "dark");

    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }
    setUser(currentUser);
    fetchCompanies();
  }, [router]);

  // Click outside to close state dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        stateDropdownRef.current &&
        !stateDropdownRef.current.contains(e.target as Node)
      ) {
        setIsStateDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Global Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e || typeof e.key !== "string") return;

      // If modal is open
      if (isModalOpen) {
        if (e.key === "Escape" && !isStateDropdownOpen) {
          setIsModalOpen(false);
        } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          const form = document.getElementById("company-form") as HTMLFormElement;
          if (form) form.requestSubmit();
        }
        return;
      }

      // If typing in any input outside modal
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      // Shortcut: Alt+C or N or C -> Create company
      if ((e.altKey && e.key.toLowerCase() === "c") || e.key.toLowerCase() === "n" || (e.key.toLowerCase() === "c" && !e.ctrlKey && !e.metaKey)) {
        e.preventDefault();
        if (companies.length < 5) handleOpenCreateModal();
        return;
      }

      // Shortcuts: 1 to 5 to select company
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= companies.length) {
        e.preventDefault();
        handleSelectCompany(companies[num - 1]);
        return;
      }

      // Arrow navigation
      if (companies.length > 0) {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          setFocusedIndex((prev) => (prev + 1) % companies.length);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          setFocusedIndex((prev) => (prev - 1 + companies.length) % companies.length);
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (companies[focusedIndex]) {
            handleSelectCompany(companies[focusedIndex]);
          }
        } else if (e.key.toLowerCase() === "e") {
          e.preventDefault();
          if (companies[focusedIndex] && companies[focusedIndex].role === "owner") {
            handleOpenEditModal(companies[focusedIndex]);
          }
        } else if (e.key === "Delete" || e.key.toLowerCase() === "d") {
          e.preventDefault();
          if (companies[focusedIndex] && companies[focusedIndex].role === "owner") {
            handleDelete(null, companies[focusedIndex].id);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, isStateDropdownOpen, companies, focusedIndex]);

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

  const fetchCompanies = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/companies");
      const list = data.companies || [];
      setCompanies(list);
    } catch (err: any) {
      setError(err.message || "Failed to load companies");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setModalMode("create");
    setEditingId(null);
    setName("");
    setAddress("");
    setGstNumber("");
    setState("");
    setStateSearch("");
    setFinancialYearStart("2026-04-01");
    setFinancialYearEnd("2027-03-31");
    setContactEmail("");
    setContactPhone("");
    setLogoUrl("");
    setFormError("");
    setIsModalOpen(true);
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const handleOpenEditModal = (company: Company) => {
    setModalMode("edit");
    setEditingId(company.id);
    setName(company.name);
    setAddress(company.address || "");
    setGstNumber(company.gst_number || "");
    setState(company.state || "");
    setStateSearch(company.state || "");
    setFinancialYearStart(company.financial_year_start ? company.financial_year_start.split("T")[0] : "2026-04-01");
    setFinancialYearEnd(company.financial_year_end ? company.financial_year_end.split("T")[0] : "2027-03-31");
    setContactEmail(company.contact_email || "");
    setContactPhone(company.contact_phone || "");
    setLogoUrl(company.logo_url || "");
    setFormError("");
    setIsModalOpen(true);
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  // Image Upload Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setFormError("Logo image size must be under 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Helper for sequential keyboard navigation across fields
  const handleFieldKeyDown = (
    e: React.KeyboardEvent,
    nextRef?: React.RefObject<any>,
    prevRef?: React.RefObject<any>
  ) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      const form = document.getElementById("company-form") as HTMLFormElement;
      if (form) form.requestSubmit();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      nextRef?.current?.focus();
    } else if (e.key === "ArrowDown" && (e.target as HTMLElement).tagName !== "SELECT") {
      e.preventDefault();
      nextRef?.current?.focus();
    } else if (e.key === "ArrowUp" && (e.target as HTMLElement).tagName !== "SELECT") {
      e.preventDefault();
      prevRef?.current?.focus();
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    if (!name.trim()) {
      setFormError("Company name is required");
      setFormLoading(false);
      return;
    }

    const payload = {
      name,
      address,
      gst_number: gstNumber,
      state,
      financial_year_start: financialYearStart,
      financial_year_end: financialYearEnd,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      logo_url: logoUrl,
    };

    try {
      if (modalMode === "create") {
        await apiFetch("/companies", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch(`/companies/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }
      setIsModalOpen(false);
      fetchCompanies();
    } catch (err: any) {
      setFormError(err.message || "Operation failed");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent | null, id: string) => {
    if (e) e.stopPropagation();
    if (!confirm("Are you sure you want to delete this company? All associated records will be lost.")) {
      return;
    }

    try {
      await apiFetch(`/companies/${id}`, {
        method: "DELETE",
      });

      const activeCompanyStr = localStorage.getItem("activeCompany");
      if (activeCompanyStr) {
        try {
          const activeCompany = JSON.parse(activeCompanyStr);
          if (activeCompany.id === id) {
            localStorage.removeItem("activeCompany");
          }
        } catch (e) {
          localStorage.removeItem("activeCompany");
        }
      }

      fetchCompanies();
    } catch (err: any) {
      alert(err.message || "Failed to delete company");
    }
  };

  const handleSelectCompany = (company: Company) => {
    localStorage.setItem("activeCompany", JSON.stringify(company));
    router.push("/dashboard");
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="relative min-h-screen bg-brand-navy-dark light:bg-[#f8fafc] select-none flex flex-col text-slate-100 light:text-slate-900 transition-colors duration-300">
      {/* Navigation Header */}
      <header className="border-b border-[#0b1528] light:border-slate-200 bg-[#020617]/80 light:bg-white/80 backdrop-blur-md sticky top-0 z-20 transition-colors duration-300">
        <div className="w-full max-w-[1700px] mx-auto px-6 sm:px-10 lg:px-16 h-20 flex items-center justify-between">
          <Logo size="md" href="/companies" />

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-900 light:bg-slate-200 border border-slate-800 light:border-slate-300 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-black transition duration-200"
              title="Toggle Theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-400 light:text-slate-500">Signed in as</p>
              <p className="text-sm font-bold text-white light:text-slate-900">{user?.name}</p>
            </div>

            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl bg-slate-900 light:bg-slate-200 border border-slate-800 light:border-slate-300 text-slate-400 light:text-slate-600 hover:text-brand-red hover:border-brand-red/40 transition duration-200"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1700px] mx-auto px-6 sm:px-10 lg:px-16 py-12 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-extrabold text-white light:text-slate-900 tracking-tight">
                Select Company
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/90 light:bg-slate-200 text-xs font-mono text-slate-300 light:text-slate-700 border border-slate-800 light:border-slate-300">
                <Keyboard className="w-3.5 h-3.5 text-brand-red" />
                <span className="font-bold">Keys [1-5]</span> or <span className="font-bold">Arrows+Enter</span>
              </span>
            </div>
            <p className="text-slate-400 light:text-slate-600 text-sm mt-1">
              Choose an active company portal to manage accounts, inventory, and vouchers.
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            disabled={companies.length >= 5}
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-white bg-brand-red hover:bg-red-600 active:bg-red-700 disabled:opacity-50 transition duration-200 shadow-lg shadow-red-500/25"
          >
            <Plus className="w-5 h-5" />
            Create Company ({companies.length}/5)
            <span className="hidden md:inline text-[11px] font-mono opacity-80 bg-black/30 px-1.5 py-0.5 rounded">Alt+C</span>
          </button>
        </div>

        {/* Limit Warning */}
        {companies.length >= 5 && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-sm text-amber-400">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">5-Company Limit Reached</p>
              <p className="text-xs text-slate-400 light:text-slate-600 mt-1">
                You have reached the maximum allowed limit of 5 companies per account. Delete an existing company to register a new one.
              </p>
            </div>
          </div>
        )}

        {/* Loading / Error / Empty States */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4 text-slate-400 light:text-slate-600">
            <Loader2 className="w-10 h-10 animate-spin text-brand-red" />
            <p className="text-sm font-medium">Fetching companies...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center space-y-4">
            <div className="inline-flex p-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertCircle className="w-8 h-8" />
            </div>
            <p className="text-slate-300 light:text-slate-700 text-base">{error}</p>
            <button
              onClick={fetchCompanies}
              className="px-6 py-2.5 bg-brand-red text-white font-bold rounded-xl hover:bg-red-600 shadow-md shadow-red-500/20 transition"
            >
              Retry
            </button>
          </div>
        ) : companies.length === 0 ? (
          <div className="py-24 border-2 border-dashed border-slate-800 light:border-slate-300 rounded-3xl text-center space-y-6 bg-[#0b1528]/20 light:bg-white">
            <div className="inline-flex p-4 rounded-full bg-slate-900 light:bg-slate-100 border border-slate-800 light:border-slate-200 text-slate-400">
              <Building2 className="w-10 h-10" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-xl font-bold text-white light:text-slate-900">No Companies Found</h3>
              <p className="text-sm text-slate-400 light:text-slate-600 leading-relaxed">
                You haven't registered any business yet. Let's create your first company to access the accounting modules and reports.
              </p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="px-8 py-3.5 rounded-xl font-bold text-white bg-brand-red hover:bg-red-600 shadow-xl shadow-red-500/25 transition"
            >
              Create First Company [Alt+C]
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company, index) => {
              const initials = company.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              const isFocused = focusedIndex === index;

              return (
                <div
                  key={company.id}
                  onClick={() => handleSelectCompany(company)}
                  className={`relative p-6 rounded-3xl bg-[#0b1528]/60 light:bg-white border cursor-pointer transition-colors duration-200 flex flex-col justify-between min-h-[240px] shadow-md ${
                    isFocused
                      ? "border-brand-red light:border-brand-red ring-2 ring-brand-red/40 light:ring-brand-red/40 bg-[#0b1528]/90 light:bg-slate-50"
                      : "border-slate-800/90 light:border-slate-200 hover:border-slate-700 light:hover:border-slate-300"
                  }`}
                >
                  <div>
                    {/* Card Header: Custom Logo / Avatar & Role */}
                    <div className="flex items-start justify-between gap-4">
                      {company.logo_url ? (
                        <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-700 light:border-slate-200 bg-slate-900 light:bg-slate-100 flex items-center justify-center shrink-0">
                          <img
                            src={company.logo_url}
                            alt={company.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-red/20 to-sky-500/20 border border-brand-red/30 light:border-slate-200 flex items-center justify-center text-brand-red font-extrabold text-lg tracking-wider shrink-0">
                          {initials || <Building2 className="w-6 h-6" />}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {/* Keyboard shortcut index badge */}
                        <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-slate-900 light:bg-slate-200 border border-slate-800 light:border-slate-300 rounded text-slate-300 light:text-slate-700">
                          [{index + 1}]
                        </span>
                        {/* Owner/Collab Badge */}
                        <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-slate-900/80 light:bg-slate-100 border border-slate-800 light:border-slate-200 rounded-lg text-slate-400 light:text-slate-600">
                          {company.role}
                        </span>
                      </div>
                    </div>

                    {/* Company Name */}
                    <h3 className="text-xl font-extrabold text-white light:text-slate-900 mt-4 truncate">
                      {company.name}
                    </h3>

                    {/* Details summary */}
                    <div className="mt-3 space-y-1.5 text-xs text-slate-400 light:text-slate-600">
                      {company.gst_number && (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-500">GST:</span>
                          <span className="font-mono">{company.gst_number}</span>
                        </div>
                      )}
                      {company.state && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          <span>{company.state}</span>
                        </div>
                      )}
                      {company.financial_year_start && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            FY: {company.financial_year_start.split("T")[0].split("-")[0]} -{" "}
                            {company.financial_year_end ? company.financial_year_end.split("T")[0].split("-")[0] : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="mt-6 pt-4 border-t border-slate-800/80 light:border-slate-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {company.role === "owner" && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal(company);
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-slate-300 light:text-slate-700 hover:text-white light:hover:text-black bg-slate-900/80 light:bg-slate-100 hover:bg-slate-800 border border-slate-800 light:border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
                            title="Edit Details (Press E)"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit <kbd className="font-mono text-[10px] opacity-70">[E]</kbd></span>
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, company.id)}
                            className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-red-400 bg-slate-900/80 light:bg-slate-100 hover:bg-red-500/10 border border-slate-800 light:border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
                            title="Delete Company (Press Del)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Del <kbd className="font-mono text-[10px] opacity-70">[Del]</kbd></span>
                          </button>
                        </>
                      )}
                    </div>

                    <span className="text-xs font-bold text-brand-red flex items-center gap-1">
                      Enter to Select
                      <CornerDownLeft className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#0b1528] light:bg-white border border-slate-800 light:border-slate-200 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[92vh]">
            <div className="flex items-center justify-between border-b border-slate-800 light:border-slate-200 pb-4">
              <div>
                <h2 className="text-2xl font-extrabold text-white light:text-slate-900">
                  {modalMode === "create" ? "Register New Company" : "Alter Company Details"}
                </h2>
                <p className="text-xs text-slate-400 light:text-slate-500 mt-1">
                  Use <kbd className="px-1.5 py-0.5 rounded bg-slate-900 light:bg-slate-200 font-mono text-[10px]">Enter / Tab</kbd> to move fields, <kbd className="px-1.5 py-0.5 rounded bg-slate-900 light:bg-slate-200 font-mono text-[10px]">Ctrl+Enter</kbd> to submit, <kbd className="px-1.5 py-0.5 rounded bg-slate-900 light:bg-slate-200 font-mono text-[10px]">Esc</kbd> to cancel.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full text-slate-400 hover:text-white light:hover:text-black hover:bg-slate-800 light:hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {formError}
              </div>
            )}

            <form id="company-form" onSubmit={handleFormSubmit} className="space-y-5">
              {/* Logo Upload Section */}
              <div className="p-4 rounded-2xl bg-slate-900/60 light:bg-slate-50 border border-slate-800 light:border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-16 h-16 rounded-2xl bg-slate-950 light:bg-white border border-slate-700 light:border-slate-300 overflow-hidden flex items-center justify-center shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-8 h-8 text-slate-500" />
                  )}
                </div>

                <div className="flex-1 space-y-1.5 text-center sm:text-left w-full">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700">
                      Company Logo / Avatar
                    </label>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl("")}
                        className="text-[11px] text-red-400 hover:underline font-medium"
                      >
                        Remove Logo
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/webp, image/svg+xml"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-lg bg-brand-red/15 hover:bg-brand-red/25 border border-brand-red/40 text-brand-red text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload Logo Image
                    </button>
                    <span className="text-[11px] text-slate-400 light:text-slate-500">
                      or paste image URL below
                    </span>
                  </div>

                  <input
                    ref={logoUrlInputRef}
                    type="url"
                    value={logoUrl.startsWith("data:") ? "" : logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    onKeyDown={(e) => handleFieldKeyDown(e, gstInputRef, nameInputRef)}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3 py-1.5 bg-slate-900 light:bg-white border border-slate-700 light:border-slate-300 rounded-lg text-xs text-white light:text-slate-900 placeholder-slate-500 focus:outline-none focus:border-brand-red"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Company Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700">
                    Company Name *
                  </label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => handleFieldKeyDown(e, logoUrlInputRef)}
                    className="w-full px-4 py-3 bg-slate-900/80 light:bg-slate-50 border border-slate-700/80 light:border-slate-300 rounded-xl text-white light:text-slate-900 text-sm focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition"
                    placeholder="Acme Corporation"
                  />
                </div>

                {/* GST Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700">
                    GSTIN / GST Number
                  </label>
                  <input
                    ref={gstInputRef}
                    type="text"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    onKeyDown={(e) => handleFieldKeyDown(e, stateInputRef, logoUrlInputRef)}
                    className="w-full px-4 py-3 bg-slate-900/80 light:bg-slate-50 border border-slate-700/80 light:border-slate-300 rounded-xl text-white light:text-slate-900 text-sm focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition font-mono uppercase"
                    placeholder="22AAAAA0000A1Z5"
                  />
                </div>

                {/* State / Region (Indian States Searchable Dropdown with Keyboard Nav) */}
                <div className="space-y-1.5 relative" ref={stateDropdownRef}>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700 flex items-center justify-between">
                    <span>State / Union Territory</span>
                    <span className="text-[10px] font-normal text-slate-400 font-mono">India States</span>
                  </label>

                  <div className="relative">
                    <input
                      ref={stateInputRef}
                      type="text"
                      value={isStateDropdownOpen ? stateSearch : state || stateSearch}
                      onFocus={() => {
                        setIsStateDropdownOpen(true);
                        setStateSearch("");
                        setHighlightedStateIndex(0);
                      }}
                      onChange={(e) => {
                        setStateSearch(e.target.value);
                        setIsStateDropdownOpen(true);
                        setHighlightedStateIndex(0);
                      }}
                      onKeyDown={(e) => {
                        if (!isStateDropdownOpen) {
                          if (e.key === "ArrowDown" || e.key === "Enter") {
                            setIsStateDropdownOpen(true);
                            e.preventDefault();
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            gstInputRef.current?.focus();
                          }
                          return;
                        }

                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setHighlightedStateIndex((prev) =>
                            prev < filteredStates.length - 1 ? prev + 1 : 0
                          );
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setHighlightedStateIndex((prev) =>
                            prev > 0 ? prev - 1 : filteredStates.length - 1
                          );
                        } else if (e.key === "Enter" || e.key === "Tab") {
                          if (filteredStates[highlightedStateIndex]) {
                            e.preventDefault();
                            setState(filteredStates[highlightedStateIndex]);
                            setStateSearch(filteredStates[highlightedStateIndex]);
                            setIsStateDropdownOpen(false);
                            emailInputRef.current?.focus();
                          }
                        } else if (e.key === "Escape") {
                          setIsStateDropdownOpen(false);
                        }
                      }}
                      placeholder="Type state name (e.g. Maharashtra, Delhi)..."
                      className="w-full px-4 py-3 bg-slate-900/80 light:bg-slate-50 border border-slate-700/80 light:border-slate-300 rounded-xl text-white light:text-slate-900 text-sm focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition"
                    />

                    <div className="absolute right-3 top-3.5 pointer-events-none text-slate-400">
                      <Search className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Dropdown Menu */}
                  {isStateDropdownOpen && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto rounded-xl bg-[#0b1528] light:bg-white border border-slate-700 light:border-slate-300 shadow-2xl py-1 divide-y divide-slate-800/40 light:divide-slate-100">
                      {filteredStates.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-400">
                          No matching state found
                        </div>
                      ) : (
                        filteredStates.map((st, idx) => {
                          const isSelected = state === st;
                          const isHighlighted = highlightedStateIndex === idx;

                          return (
                            <button
                              key={st}
                              type="button"
                              onClick={() => {
                                setState(st);
                                setStateSearch(st);
                                setIsStateDropdownOpen(false);
                                emailInputRef.current?.focus();
                              }}
                              onMouseEnter={() => setHighlightedStateIndex(idx)}
                              className={`w-full px-4 py-2 text-left text-xs font-medium flex items-center justify-between transition-colors ${
                                isHighlighted
                                  ? "bg-brand-red text-white"
                                  : isSelected
                                  ? "bg-slate-800 light:bg-slate-100 text-white light:text-slate-900"
                                  : "text-slate-300 light:text-slate-700 hover:bg-slate-800/80 light:hover:bg-slate-100"
                              }`}
                            >
                              <span>{st}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-sky-400" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Contact Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700">
                    Contact Email
                  </label>
                  <input
                    ref={emailInputRef}
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    onKeyDown={(e) => handleFieldKeyDown(e, phoneInputRef, stateInputRef)}
                    className="w-full px-4 py-3 bg-slate-900/80 light:bg-slate-50 border border-slate-700/80 light:border-slate-300 rounded-xl text-white light:text-slate-900 text-sm focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition"
                    placeholder="billing@company.com"
                  />
                </div>

                {/* Contact Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700">
                    Contact Phone
                  </label>
                  <input
                    ref={phoneInputRef}
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    onKeyDown={(e) => handleFieldKeyDown(e, addressInputRef, emailInputRef)}
                    className="w-full px-4 py-3 bg-slate-900/80 light:bg-slate-50 border border-slate-700/80 light:border-slate-300 rounded-xl text-white light:text-slate-900 text-sm focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition"
                    placeholder="+91 99999 88888"
                  />
                </div>

                {/* Business Address */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700">
                    Business Address
                  </label>
                  <textarea
                    ref={addressInputRef}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                        e.preventDefault();
                        const form = document.getElementById("company-form") as HTMLFormElement;
                        if (form) form.requestSubmit();
                      } else if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        fyStartInputRef.current?.focus();
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        phoneInputRef.current?.focus();
                      }
                    }}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-slate-900/80 light:bg-slate-50 border border-slate-700/80 light:border-slate-300 rounded-xl text-white light:text-slate-900 text-sm focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition resize-none"
                    placeholder="123 Industrial Area, Sector 5"
                  />
                </div>

                {/* FY Start */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Financial Year Start
                  </label>
                  <input
                    ref={fyStartInputRef}
                    type="date"
                    required
                    value={financialYearStart}
                    onChange={(e) => setFinancialYearStart(e.target.value)}
                    onKeyDown={(e) => handleFieldKeyDown(e, fyEndInputRef, addressInputRef)}
                    className="w-full px-4 py-3 bg-slate-900/80 light:bg-slate-50 border border-slate-700/80 light:border-slate-300 rounded-xl text-white light:text-slate-900 text-sm focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition"
                  />
                </div>

                {/* FY End */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Financial Year End
                  </label>
                  <input
                    ref={fyEndInputRef}
                    type="date"
                    required
                    value={financialYearEnd}
                    onChange={(e) => setFinancialYearEnd(e.target.value)}
                    onKeyDown={(e) => handleFieldKeyDown(e, submitBtnRef, fyStartInputRef)}
                    className="w-full px-4 py-3 bg-slate-900/80 light:bg-slate-50 border border-slate-700/80 light:border-slate-300 rounded-xl text-white light:text-slate-900 text-sm focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 border-t border-slate-800 light:border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 rounded-xl border border-slate-800 light:border-slate-300 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-black hover:bg-slate-800 light:hover:bg-slate-100 transition"
                >
                  Cancel [Esc]
                </button>
                <button
                  ref={submitBtnRef}
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold text-white bg-brand-red hover:bg-red-600 active:bg-red-700 disabled:opacity-50 transition shadow-lg shadow-red-500/25"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Company [Ctrl+Enter]"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
