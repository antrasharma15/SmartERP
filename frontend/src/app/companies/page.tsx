"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, logout, getCurrentUser } from "../utils/api";
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
  role: string;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);
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
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }
    setUser(currentUser);
    fetchCompanies();
  }, [router]);

  const fetchCompanies = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/companies");
      const list = data.companies || [];
      setCompanies(list);
      
      // Auto-select and redirect to dashboard if there is exactly 1 company
      if (list.length === 1) {
        localStorage.setItem("activeCompany", JSON.stringify(list[0]));
        router.push("/dashboard");
      }
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
    setFinancialYearStart("2026-04-01");
    setFinancialYearEnd("2027-03-31");
    setContactEmail("");
    setContactPhone("");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (company: Company) => {
    setModalMode("edit");
    setEditingId(company.id);
    setName(company.name);
    setAddress(company.address || "");
    setGstNumber(company.gst_number || "");
    setState(company.state || "");
    // Format dates to YYYY-MM-DD
    setFinancialYearStart(company.financial_year_start ? company.financial_year_start.split("T")[0] : "2026-04-01");
    setFinancialYearEnd(company.financial_year_end ? company.financial_year_end.split("T")[0] : "2027-03-31");
    setContactEmail(company.contact_email || "");
    setContactPhone(company.contact_phone || "");
    setFormError("");
    setIsModalOpen(true);
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

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent company selection
    if (!confirm("Are you sure you want to delete this company? All associated records will be lost.")) {
      return;
    }

    try {
      await apiFetch(`/companies/${id}`, {
        method: "DELETE",
      });
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
    <div className="relative min-h-screen bg-brand-navy-dark select-none flex flex-col text-slate-100">
      {/* Header */}
      <header className="border-b border-brand-navy-light/40 bg-brand-navy-dark/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold text-white tracking-wide">
              My smart
            </span>
            <span className="px-2 py-0.5 text-xs font-extrabold bg-brand-lime text-brand-navy-dark rounded font-mono">
              ERP
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-400">Signed in as</p>
              <p className="text-sm font-semibold text-white">{user?.name}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-brand-lime hover:border-brand-lime/40 transition duration-200"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Select Company
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Choose an active company portal to manage accounts, inventory, and vouchers.
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            disabled={companies.length >= 5}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-brand-navy-dark bg-brand-lime hover:bg-white disabled:bg-slate-800 disabled:text-slate-500 transition duration-300 shadow-xl shadow-brand-lime/10"
          >
            <Plus className="w-5 h-5" />
            Create Company ({companies.length}/5)
          </button>
        </div>

        {/* Limit Warning */}
        {companies.length >= 5 && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-sm text-amber-400">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">5-Company Limit Reached</p>
              <p className="text-xs text-slate-400 mt-1">
                You have reached the maximum allowed limit of 5 companies per account. Delete an existing company to register a new one.
              </p>
            </div>
          </div>
        )}

        {/* Loading / Error States */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin text-brand-lime" />
            <p className="text-sm font-medium">Fetching companies...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center space-y-4">
            <div className="inline-flex p-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertCircle className="w-8 h-8" />
            </div>
            <p className="text-slate-300 text-base">{error}</p>
            <button
              onClick={fetchCompanies}
              className="px-6 py-2 bg-brand-navy-light/40 border border-slate-800 rounded-xl hover:text-white"
            >
              Retry
            </button>
          </div>
        ) : companies.length === 0 ? (
          <div className="py-24 border-2 border-dashed border-slate-800 rounded-3xl text-center space-y-6">
            <div className="inline-flex p-4 rounded-full bg-brand-navy-light/40 border border-slate-800 text-slate-400">
              <Building2 className="w-10 h-10" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-xl font-bold text-white">No Companies Found</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                You haven't registered any business yet. Let's create your first company to access the Gateway dashboard modules.
              </p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="px-6 py-3 rounded-xl font-bold text-brand-navy-dark bg-brand-lime hover:bg-white transition"
            >
              Create First Company
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <div
                key={company.id}
                onClick={() => handleSelectCompany(company)}
                className="group relative p-6 rounded-3xl bg-brand-navy-light/20 hover:bg-brand-navy-light/40 border border-slate-900/60 hover:border-brand-lime/20 cursor-pointer transition-all duration-300 flex flex-col justify-between min-h-[220px] shadow-lg transform hover:-translate-y-1"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="p-3 rounded-2xl bg-brand-navy-accent/50 border border-slate-800 text-brand-lime">
                      <Building2 className="w-6 h-6" />
                    </div>
                    {/* Owner/Collab Badge */}
                    <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-slate-900 border border-slate-800 rounded-md text-slate-400">
                      {company.role}
                    </span>
                  </div>

                  {/* Company Name */}
                  <h3 className="text-xl font-extrabold text-white mt-4 group-hover:text-brand-lime transition-colors truncate">
                    {company.name}
                  </h3>

                  {/* Details summary */}
                  <div className="mt-4 space-y-2 text-xs text-slate-400">
                    {company.gst_number && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-500">GST:</span>
                        <span>{company.gst_number}</span>
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
                <div className="mt-6 pt-4 border-t border-slate-900/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1">
                    {company.role === "owner" && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(company);
                          }}
                          className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-900 transition"
                          title="Alter Details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, company.id)}
                          className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-900 transition"
                          title="Delete Company"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>

                  <span className="text-xs font-bold text-slate-500 group-hover:text-brand-lime flex items-center gap-1 transition-colors">
                    Select
                    <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-brand-navy-dark border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-900 pb-4">
              <h2 className="text-2xl font-bold text-white">
                {modalMode === "create" ? "Register New Company" : "Alter Company Details"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-900"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {formError && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Company Name */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-brand-navy-light/10 border border-slate-850 rounded-xl text-white outline-none focus:border-brand-lime transition"
                    placeholder="Acme Corporation"
                  />
                </div>

                {/* GST Number */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    GSTIN / GST Number
                  </label>
                  <input
                    type="text"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    className="w-full px-4 py-3 bg-brand-navy-light/10 border border-slate-850 rounded-xl text-white outline-none focus:border-brand-lime transition"
                    placeholder="22AAAAA0000A1Z5"
                  />
                </div>

                {/* Contact Email */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-brand-navy-light/10 border border-slate-850 rounded-xl text-white outline-none focus:border-brand-lime transition"
                    placeholder="billing@company.com"
                  />
                </div>

                {/* Contact Phone */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-brand-navy-light/10 border border-slate-850 rounded-xl text-white outline-none focus:border-brand-lime transition"
                    placeholder="+91 99999 88888"
                  />
                </div>

                {/* State */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    State
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-4 py-3 bg-brand-navy-light/10 border border-slate-850 rounded-xl text-white outline-none focus:border-brand-lime transition"
                    placeholder="California"
                  />
                </div>

                {/* Address */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Business Address
                  </label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 bg-brand-navy-light/10 border border-slate-850 rounded-xl text-white outline-none focus:border-brand-lime transition resize-none"
                    placeholder="123 Business Lane, Suite A"
                  />
                </div>

                {/* FY Start */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Financial Year Start
                  </label>
                  <input
                    type="date"
                    required
                    value={financialYearStart}
                    onChange={(e) => setFinancialYearStart(e.target.value)}
                    className="w-full px-4 py-3 bg-brand-navy-light/10 border border-slate-850 rounded-xl text-white outline-none focus:border-brand-lime transition"
                  />
                </div>

                {/* FY End */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Financial Year End
                  </label>
                  <input
                    type="date"
                    required
                    value={financialYearEnd}
                    onChange={(e) => setFinancialYearEnd(e.target.value)}
                    className="w-full px-4 py-3 bg-brand-navy-light/10 border border-slate-850 rounded-xl text-white outline-none focus:border-brand-lime transition"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 border-t border-slate-900 pt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 rounded-xl border border-slate-800 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold text-brand-navy-dark bg-brand-lime hover:bg-white disabled:bg-slate-800 transition"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Company"
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
