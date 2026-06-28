"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getCurrentUser } from "../../utils/api";
import {
  Building2,
  Calendar,
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  FileText,
  Calculator,
  Save,
  CheckCircle2,
  UserPlus,
  X
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  mobile?: string;
  gst_number?: string;
}

interface StockItem {
  id: string;
  name: string;
  selling_price: number;
  gst_percentage: number;
  quantity: number;
  unit_symbol?: string;
}

interface InvoiceItemRow {
  stock_item_id: string;
  description: string;
  quantity: number;
  rate: number;
  gst_percentage: number;
  amount: number;
}

export default function CreateInvoicePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);

  // Master lists
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  
  // Page load states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Invoice state
  const [customerId, setCustomerId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [invoiceType, setInvoiceType] = useState("gst");

  // Dynamic rows
  const [itemRows, setItemRows] = useState<InvoiceItemRow[]>([
    { stock_item_id: "", description: "", quantity: 1, rate: 0, gst_percentage: 0, amount: 0 }
  ]);

  // Customer Creator Modal Overlay
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustMobile, setNewCustMobile] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustGst, setNewCustGst] = useState("");
  const [newCustAddr, setNewCustAddr] = useState("");
  const [custCreating, setCustCreating] = useState(false);

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

  // Auth and master data fetching
  useEffect(() => {
    console.log("[CreateInvoice] Checking session...");
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

    const today = new Date().toISOString().split("T")[0];
    setInvoiceDate(today);

    try {
      const activeCompany = JSON.parse(activeCompanyStr);
      setCompany(activeCompany);
      fetchMasters(activeCompany.id);
    } catch (err) {
      console.error("[CreateInvoice Error] Parse active company failed:", err);
      localStorage.removeItem("activeCompany");
      router.push("/companies");
    }
  }, [router]);

  // Fetch customers and stock items
  const fetchMasters = async (companyId: string) => {
    setLoading(true);
    setError("");
    console.log(`[CreateInvoice] Fetching customers and stock items...`);
    try {
      const [customersData, itemsData] = await Promise.all([
        apiFetch(`/customers?company_id=${companyId}`),
        apiFetch(`/stock-items?company_id=${companyId}`)
      ]);

      setCustomers(customersData.customers || []);
      setStockItems(itemsData.items || []);
      console.log(`[CreateInvoice] Loaded masters. Customers: ${customersData.customers?.length}, Items: ${itemsData.items?.length}`);
    } catch (err: any) {
      console.error("[CreateInvoice Error] Masters load failed:", err);
      setError(err.message || "Failed to load master customers/items");
    } finally {
      setLoading(false);
    }
  };

  // Dynamic Item row handlers
  const handleItemRowChange = (index: number, field: keyof InvoiceItemRow, value: any) => {
    const updated = [...itemRows];
    const row = updated[index];

    if (field === "stock_item_id") {
      row.stock_item_id = value;
      // Auto pre-populate selling rate and GST percentage from master
      const matched = stockItems.find(item => item.id === value);
      if (matched) {
        row.rate = Number(matched.selling_price) || 0;
        row.gst_percentage = Number(matched.gst_percentage) || 0;
        row.description = `Selling ${matched.name}`;
        triggerToast(`Loaded unit rate: $${row.rate} for ${matched.name}`);
      }
    } else if (field === "quantity") {
      row.quantity = parseFloat(value) || 0;
    } else if (field === "rate") {
      row.rate = parseFloat(value) || 0;
    } else if (field === "gst_percentage") {
      row.gst_percentage = parseFloat(value) || 0;
    } else if (field === "description") {
      row.description = value;
    }

    row.amount = row.quantity * row.rate;
    setItemRows(updated);
  };

  const addItemRow = () => {
    console.log("[CreateInvoice] Adding invoice item row.");
    setItemRows([...itemRows, { stock_item_id: "", description: "", quantity: 1, rate: 0, gst_percentage: 0, amount: 0 }]);
  };

  const removeItemRow = (index: number) => {
    if (itemRows.length === 1) {
      triggerToast("Invoice must contain at least one line item.");
      return;
    }
    console.log(`[CreateInvoice] Removing item row index: ${index}`);
    setItemRows(itemRows.filter((_, idx) => idx !== index));
  };

  // Math totals
  const getTotals = () => {
    let subtotal = 0;
    let taxTotal = 0;

    itemRows.forEach(row => {
      subtotal += row.amount;
      taxTotal += row.amount * (row.gst_percentage / 100);
    });

    const grandTotal = subtotal + taxTotal;

    return {
      subtotal,
      taxTotal,
      grandTotal
    };
  };

  const totals = getTotals();

  // Check stock alerts for GST invoices
  const checkStockAlerts = () => {
    if (invoiceType !== "gst") return false;
    return itemRows.some(row => {
      const matched = stockItems.find(item => item.id === row.stock_item_id);
      return matched && row.quantity > (Number(matched.quantity) || 0);
    });
  };

  const hasStockAlert = checkStockAlerts();

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTypingInText = 
        document.activeElement?.tagName === "INPUT" && 
        (document.activeElement as HTMLInputElement).type !== "number";

      if (isCustomerModalOpen) {
        if (e.key === "Escape") {
          e.preventDefault();
          setIsCustomerModalOpen(false);
        }
        return;
      }

      // ALT + A: Add item row
      if (e.altKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        addItemRow();
        return;
      }

      // ALT + N: Open Customer Modal
      if (e.altKey && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        setIsCustomerModalOpen(true);
        return;
      }

      // CTRL + Enter / ALT + C: Save Invoice
      if ((e.ctrlKey && e.key === "Enter") || (e.altKey && (e.key === "c" || e.key === "C"))) {
        e.preventDefault();
        submitInvoice();
        return;
      }

      // Escape: return to list
      if (e.key === "Escape") {
        e.preventDefault();
        router.push("/billing");
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [itemRows, customerId, invoiceDate, invoiceType, isCustomerModalOpen]);

  // Create Customer on the fly
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName) return;

    setCustCreating(true);
    console.log(`[CreateInvoice] Registering new customer on-the-fly: ${newCustName}`);
    try {
      const response = await apiFetch("/customers", {
        method: "POST",
        body: JSON.stringify({
          company_id: company.id,
          name: newCustName,
          mobile: newCustMobile,
          email: newCustEmail,
          gst_number: newCustGst,
          address: newCustAddr
        })
      });
      console.log("[CreateInvoice] Customer created:", response);
      triggerToast(`Customer ${newCustName} registered.`);
      
      // Refresh list and auto select
      const refreshData = await apiFetch(`/customers?company_id=${company.id}`);
      setCustomers(refreshData.customers || []);
      setCustomerId(response.customer.id);
      
      // Reset form & Close modal
      setNewCustName("");
      setNewCustMobile("");
      setNewCustEmail("");
      setNewCustGst("");
      setNewCustAddr("");
      setIsCustomerModalOpen(false);
    } catch (err: any) {
      console.error("[CreateInvoice Error] Failed to create customer on the fly:", err);
      alert(`Failed to add customer: ${err.message}`);
    } finally {
      setCustCreating(false);
    }
  };

  // Submit Invoice
  const submitInvoice = async () => {
    if (submitting) return;

    if (!customerId) {
      alert("Customer Account selection is required.");
      return;
    }
    if (itemRows.some(r => !r.stock_item_id)) {
      alert("Please select a stock product for all items.");
      return;
    }
    if (hasStockAlert) {
      alert("Cannot save invoice: Insufficient stock level.");
      return;
    }

    setSubmitting(true);
    setError("");

    const payload = {
      company_id: company.id,
      customer_id: customerId,
      invoice_type: invoiceType,
      invoice_date: invoiceDate,
      items: itemRows.map(r => ({
        stock_item_id: r.stock_item_id,
        description: r.description,
        quantity: r.quantity,
        rate: r.rate,
        gst_percentage: r.gst_percentage
      }))
    };

    console.log("[CreateInvoice] Submitting invoice API payload:", payload);

    try {
      const response = await apiFetch("/invoices", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      console.log("[CreateInvoice] Invoice created:", response);
      alert(`Invoice ${response.invoice_number} created successfully.`);
      router.push("/billing");
    } catch (err: any) {
      console.error("[CreateInvoice Error] Post invoice failed:", err);
      setError(err.message || "Failed to create invoice document. Verify parameters.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-navy-dark text-slate-100 flex flex-col select-none relative overflow-hidden font-sans">
      {/* Header bar */}
      <header className="border-b border-brand-navy-light bg-brand-navy-dark/70 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.push("/billing")}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-brand-lime hover:border-brand-lime/40 transition duration-200"
              title="Return to Invoices Day Book (ESC)"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/dashboard")}>
              <span className="text-xl font-extrabold text-white tracking-wide">My smart</span>
              <span className="px-2 py-0.5 text-xs font-extrabold bg-brand-lime text-brand-navy-dark rounded font-mono">ERP</span>
            </div>
            <div className="h-6 w-[1px] bg-slate-800"></div>
            <div className="flex items-center gap-2 text-brand-lime font-bold">
              <Building2 className="w-5 h-5" />
              <span>{company?.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <span className="text-xs font-mono bg-slate-900 border border-slate-800 px-3 py-1 rounded text-slate-400">
              Esc to Exit
            </span>
          </div>
        </div>
      </header>

      {/* Main Form content */}
      <main className="flex-1 max-w-[1450px] mx-auto px-6 py-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Editors - 9 span */}
        <section className="lg:col-span-9 rounded-3xl bg-brand-navy-light/10 border border-slate-900/60 p-6 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-900 pb-4">
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-2">
                <FileText className="w-6 h-6 text-brand-lime" />
                Invoice & Billing Creator
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Record customer billing transactions, print dynamic tax invoices, and post auto-reconciled ledgers.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-brand-lime" />
              <p className="text-xs font-medium">Loading customer directories...</p>
            </div>
          ) : (
            <div className="space-y-6 text-xs font-semibold">
              
              {/* Header Fields */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-brand-navy-dark/60 border border-slate-850 rounded-xl text-white outline-none focus:border-brand-lime font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Billing Type *</label>
                  <select
                    required
                    value={invoiceType}
                    onChange={(e) => setInvoiceType(e.target.value)}
                    className="w-full px-4 py-2.5 bg-brand-navy-dark/60 border border-slate-850 rounded-xl text-white outline-none focus:border-brand-lime cursor-pointer"
                  >
                    <option value="gst">GST Tax Invoice</option>
                    <option value="proforma">Proforma Invoice</option>
                    <option value="quotation">Quotation Proposal</option>
                    <option value="estimate">Estimate Sheet</option>
                  </select>
                </div>

                <div className="space-y-1.5 col-span-2 flex gap-2 items-center">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer Account *</label>
                    <select
                      required
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-brand-navy-dark/60 border border-slate-850 rounded-xl text-white outline-none focus:border-brand-lime cursor-pointer"
                    >
                      <option value="">Select Customer</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCustomerModalOpen(true)}
                    className="p-3 bg-brand-lime text-brand-navy-dark rounded-xl hover:bg-white font-bold transition flex items-center justify-center shrink-0 mt-6"
                    title="Register New Customer Profile (Alt+N)"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Items Table Section */}
              <div className="space-y-3.5 pt-4">
                <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    Line Items Detail
                  </h3>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="flex items-center gap-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 text-[10px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Item Row (Alt+A)
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-900 rounded-xl bg-brand-navy-dark/20">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                        <th className="py-2.5 px-4 w-12">#</th>
                        <th className="py-2.5 px-4 w-[280px]">Select Product</th>
                        <th className="py-2.5 px-4">Description</th>
                        <th className="py-2.5 px-4 w-24 text-right">Qty</th>
                        <th className="py-2.5 px-4 w-28 text-right">Rate ($)</th>
                        <th className="py-2.5 px-4 w-20 text-right">GST%</th>
                        <th className="py-2.5 px-4 w-28 text-right">Amount ($)</th>
                        <th className="py-2.5 px-4 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemRows.map((row, idx) => {
                        const matched = stockItems.find(item => item.id === row.stock_item_id);
                        const isOverStock = invoiceType === "gst" && matched && row.quantity > (Number(matched.quantity) || 0);
                        return (
                          <tr key={idx} className="border-b border-slate-900/40">
                            <td className="py-2 px-4 text-slate-500 font-mono">{idx + 1}</td>
                            <td className="py-2 px-2">
                              <select
                                value={row.stock_item_id}
                                onChange={(e) => handleItemRowChange(idx, "stock_item_id", e.target.value)}
                                className="w-full px-3 py-2 bg-brand-navy-light/10 border border-slate-850 rounded-lg text-white outline-none focus:border-brand-lime text-xs"
                              >
                                <option value="">Select Product</option>
                                {stockItems.map(item => (
                                  <option key={item.id} value={item.id}>
                                    {item.name} {invoiceType === "gst" ? `(Stock: ${item.quantity})` : ""}
                                  </option>
                                ))}
                              </select>
                              {invoiceType === "gst" && matched && (
                                <p className={`text-[9px] mt-1 italic font-semibold ${isOverStock ? "text-red-400" : "text-slate-500"}`}>
                                  Stock balance: {matched.quantity} {matched.unit_symbol || "PCS"}
                                </p>
                              )}
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={row.description}
                                onChange={(e) => handleItemRowChange(idx, "description", e.target.value)}
                                className="w-full px-3 py-2 bg-brand-navy-light/10 border border-slate-850 rounded-lg text-white text-xs outline-none focus:border-brand-lime"
                                placeholder="Details..."
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                min="1"
                                value={row.quantity}
                                onChange={(e) => handleItemRowChange(idx, "quantity", e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg text-white text-right font-mono outline-none text-xs ${
                                  isOverStock 
                                    ? "bg-red-500/10 border-red-500/30 text-red-300" 
                                    : "bg-brand-navy-light/10 border-slate-850 focus:border-brand-lime"
                                }`}
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={row.rate}
                                onChange={(e) => handleItemRowChange(idx, "rate", e.target.value)}
                                className="w-full px-3 py-2 bg-brand-navy-light/10 border border-slate-850 rounded-lg text-white text-right font-mono text-xs"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                min="0"
                                value={row.gst_percentage}
                                onChange={(e) => handleItemRowChange(idx, "gst_percentage", e.target.value)}
                                className="w-full px-3 py-2 bg-brand-navy-light/10 border border-slate-850 rounded-lg text-white text-right font-mono text-xs"
                              />
                            </td>
                            <td className="py-2 px-4 text-right font-mono text-slate-300 text-xs">
                              ${row.amount.toFixed(2)}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeItemRow(idx)}
                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Save & Cancel */}
              <div className="flex justify-end gap-3.5 border-t border-slate-900 pt-5">
                <button
                  type="button"
                  onClick={() => router.push("/billing")}
                  className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitInvoice}
                  disabled={submitting || hasStockAlert}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-brand-navy-dark bg-brand-lime hover:bg-white disabled:bg-slate-800 disabled:text-slate-500 transition shadow-lg shadow-brand-lime/10"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Post Invoice (Ctrl+Enter)
                    </>
                  )}
                </button>
              </div>

            </div>
          )}
        </section>

        {/* Right Column: Ledger Splits - 3 span */}
        <section className="lg:col-span-3 space-y-6">
          {/* Summary Preview */}
          <div className="rounded-3xl bg-brand-navy-light/10 border border-slate-900/60 p-5 shadow-2xl backdrop-blur-xl space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-brand-lime flex items-center gap-1.5 border-b border-slate-900 pb-2">
              <CheckCircle2 className="w-4 h-4" />
              Invoice Summary
            </h3>

            <div className="space-y-3 pt-1 text-xs">
              <div className="flex justify-between items-center border-b border-slate-900/40 pb-1.5">
                <span className="text-slate-400 font-bold">Taxable Base:</span>
                <span className="font-mono font-bold text-white">${totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-900/40 pb-1.5">
                <span className="text-slate-400 font-bold">Tax Total (GST):</span>
                <span className="font-mono font-bold text-white">${totals.taxTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-900/40 pb-1.5">
                <span className="text-slate-400 font-bold">Invoice Total:</span>
                <span className="font-mono font-bold text-white text-sm">${totals.grandTotal.toFixed(2)}</span>
              </div>
              
              <div className="pt-2 flex justify-between items-center">
                <span className="text-[10px] uppercase font-black text-slate-500">Status</span>
                <span className={`px-2 py-0.5 border font-mono rounded text-[10px] uppercase font-black ${
                  invoiceType !== "gst"
                    ? "bg-slate-800 border-slate-700 text-slate-400"
                    : hasStockAlert 
                    ? "bg-red-500/10 border-red-500/20 text-red-400" 
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                }`}>
                  {invoiceType !== "gst" ? "DRAFT MODE" : hasStockAlert ? "OUT OF STOCK" : "APPROVED"}
                </span>
              </div>
            </div>
          </div>

          {/* Shortcuts Guide */}
          <div className="rounded-3xl bg-brand-navy-light/10 border border-slate-900/60 p-5 shadow-2xl backdrop-blur-xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-1.5 border-b border-slate-900 pb-2">
              Keyboard Guides
            </h3>
            <div className="space-y-2.5 pt-3 text-[10px] font-mono text-slate-400">
              <div className="flex justify-between items-center">
                <span>Add Item Row</span>
                <span className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-brand-lime rounded">Alt + A</span>
              </div>
              <div className="flex justify-between items-center">
                <span>New Customer</span>
                <span className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-white rounded">Alt + N</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Post Invoice</span>
                <span className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-white rounded">Ctrl + Enter</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Cancel / Exit</span>
                <span className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-white rounded">ESC</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* On-the-fly Customer Creation Modal Overlay */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <form
            onSubmit={handleCreateCustomer}
            className="w-full max-w-md bg-brand-navy-dark border border-slate-800 rounded-3xl p-6 md:p-8 space-y-4 shadow-2xl text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-brand-lime" />
                Register New Customer Profile
              </h3>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-brand-navy-light/10 border border-slate-850 rounded-xl text-white outline-none focus:border-brand-lime"
                  placeholder="e.g. Zenith Distributors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mobile Phone</label>
                  <input
                    type="text"
                    value={newCustMobile}
                    onChange={(e) => setNewCustMobile(e.target.value)}
                    className="w-full px-4 py-2.5 bg-brand-navy-light/10 border border-slate-850 rounded-xl text-white outline-none focus:border-brand-lime font-mono"
                    placeholder="9876543210"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">GST Number</label>
                  <input
                    type="text"
                    value={newCustGst}
                    onChange={(e) => setNewCustGst(e.target.value)}
                    className="w-full px-4 py-2.5 bg-brand-navy-light/10 border border-slate-850 rounded-xl text-white outline-none focus:border-brand-lime font-mono"
                    placeholder="27ABCDE1234F1Z1"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Address</label>
                <input
                  type="email"
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-brand-navy-light/10 border border-slate-850 rounded-xl text-white outline-none focus:border-brand-lime"
                  placeholder="name@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Billing Address</label>
                <textarea
                  value={newCustAddr}
                  onChange={(e) => setNewCustAddr(e.target.value)}
                  className="w-full px-4 py-2.5 bg-brand-navy-light/10 border border-slate-850 rounded-xl text-white outline-none focus:border-brand-lime"
                  rows={2}
                  placeholder="Enter full address..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-900">
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-white rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={custCreating}
                className="px-5 py-2 bg-brand-lime text-brand-navy-dark hover:bg-white font-bold rounded-xl transition flex items-center gap-1.5"
              >
                {custCreating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    Create Customer
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating Toast Notification Container */}
      <div className="fixed top-24 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="p-4 rounded-2xl bg-brand-navy-light/95 border border-slate-800 text-xs font-semibold text-white shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in-left pointer-events-auto"
          >
            <div className="p-1 bg-brand-lime/10 border border-brand-lime/20 text-brand-lime rounded-lg shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <span>{toast.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
