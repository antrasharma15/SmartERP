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
  CheckCircle2
} from "lucide-react";

interface Ledger {
  id: string;
  name: string;
  ledger_type: string;
}

interface StockItem {
  id: string;
  name: string;
  purchase_price: number;
  gst_percentage: number;
  unit_symbol?: string;
}

interface VoucherItemRow {
  stock_item_id: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface VoucherTaxRow {
  ledger_id: string;
  amount: number;
}

export default function CreatePurchaseVoucherPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);

  // Master lists
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  
  // Page load states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Voucher state
  const [voucherDate, setVoucherDate] = useState("");
  const [reference, setReference] = useState("");
  const [narration, setNarration] = useState("");
  const [partyLedgerId, setPartyLedgerId] = useState("");
  const [purchaseLedgerId, setPurchaseLedgerId] = useState("");

  // Dynamic rows
  const [itemRows, setItemRows] = useState<VoucherItemRow[]>([
    { stock_item_id: "", quantity: 1, rate: 0, amount: 0 }
  ]);
  const [taxRows, setTaxRows] = useState<VoucherTaxRow[]>([
    { ledger_id: "", amount: 0 }
  ]);

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
    console.log("[PurchaseVoucher] Checking auth...");
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

    // Default to current date
    const today = new Date().toISOString().split("T")[0];
    setVoucherDate(today);

    try {
      const activeCompany = JSON.parse(activeCompanyStr);
      setCompany(activeCompany);
      fetchMasters(activeCompany.id);
    } catch (err) {
      console.error("[PurchaseVoucher Error] Parse active company failed:", err);
      localStorage.removeItem("activeCompany");
      router.push("/companies");
    }
  }, [router]);

  // Fetch ledgers and stock items
  const fetchMasters = async (companyId: string) => {
    setLoading(true);
    setError("");
    console.log(`[PurchaseVoucher] Fetching ledgers and stock items...`);
    try {
      const [ledgersData, itemsData] = await Promise.all([
        apiFetch(`/ledgers?company_id=${companyId}`),
        apiFetch(`/stock-items?company_id=${companyId}`)
      ]);

      const ledgerList = ledgersData.ledgers || [];
      const stockList = itemsData.items || [];

      setLedgers(ledgerList);
      setStockItems(stockList);

      // Auto select first expense ledger as purchase ledger if available
      const firstExpense = ledgerList.find((l: Ledger) => l.ledger_type === "expense");
      if (firstExpense) {
        setPurchaseLedgerId(firstExpense.id);
      }

      console.log(`[PurchaseVoucher] Loaded masters. Ledgers: ${ledgerList.length}, Stock Items: ${stockList.length}`);
    } catch (err: any) {
      console.error("[PurchaseVoucher Error] Master loading failed:", err);
      setError(err.message || "Failed to load master ledger/item records");
    } finally {
      setLoading(false);
    }
  };

  // Party ledgers filter: bank, cash, supplier
  const filteredPartyLedgers = ledgers.filter(l => 
    ["bank", "cash", "supplier"].includes(l.ledger_type)
  );

  // Purchase ledgers filter: expense
  const filteredPurchaseLedgers = ledgers.filter(l => 
    l.ledger_type === "expense"
  );

  // Dynamic Item row handlers
  const handleItemRowChange = (index: number, field: keyof VoucherItemRow, value: any) => {
    const updated = [...itemRows];
    const row = updated[index];

    if (field === "stock_item_id") {
      row.stock_item_id = value;
      // Auto pre-populate purchase rate from master
      const matched = stockItems.find(item => item.id === value);
      if (matched) {
        row.rate = Number(matched.purchase_price) || 0;
        triggerToast(`Loaded purchase price: $${row.rate} for ${matched.name}`);
      }
    } else if (field === "quantity") {
      row.quantity = parseFloat(value) || 0;
    } else if (field === "rate") {
      row.rate = parseFloat(value) || 0;
    }

    row.amount = row.quantity * row.rate;
    setItemRows(updated);
  };

  const addItemRow = () => {
    console.log("[PurchaseVoucher] Adding item row.");
    setItemRows([...itemRows, { stock_item_id: "", quantity: 1, rate: 0, amount: 0 }]);
  };

  const removeItemRow = (index: number) => {
    if (itemRows.length === 1) {
      triggerToast("Voucher must contain at least one stock item.");
      return;
    }
    console.log(`[PurchaseVoucher] Removing item row index: ${index}`);
    setItemRows(itemRows.filter((_, idx) => idx !== index));
  };

  // Dynamic Tax row handlers
  const handleTaxRowChange = (index: number, field: keyof VoucherTaxRow, value: any) => {
    const updated = [...taxRows];
    if (field === "ledger_id") {
      updated[index].ledger_id = value;
    } else if (field === "amount") {
      updated[index].amount = parseFloat(value) || 0;
    }
    setTaxRows(updated);
  };

  const addTaxRow = () => {
    console.log("[PurchaseVoucher] Adding tax row.");
    setTaxRows([...taxRows, { ledger_id: "", amount: 0 }]);
  };

  const removeTaxRow = (index: number) => {
    console.log(`[PurchaseVoucher] Removing tax row index: ${index}`);
    setTaxRows(taxRows.filter((_, idx) => idx !== index));
  };

  // Math totals
  const getTotals = () => {
    let itemsTotal = 0;
    itemRows.forEach(row => {
      itemsTotal += row.amount;
    });

    let taxesTotal = 0;
    taxRows.forEach(row => {
      taxesTotal += row.amount;
    });

    const grandTotal = itemsTotal + taxesTotal;

    return {
      itemsTotal,
      taxesTotal,
      grandTotal
    };
  };

  const totals = getTotals();

  // Auto tax calculator helper
  const handleAutoCalculateTax = () => {
    console.log("[PurchaseVoucher] Running auto GST tax calculator...");
    let cgstSum = 0;
    let sgstSum = 0;
    let igstSum = 0;

    itemRows.forEach(row => {
      const matched = stockItems.find(item => item.id === row.stock_item_id);
      if (matched) {
        const ratePct = Number(matched.gst_percentage) || 0;
        const gstVal = row.amount * (ratePct / 100);
        // Default: Split into CGST and SGST
        cgstSum += gstVal / 2;
        sgstSum += gstVal / 2;
      }
    });

    // Populate tax entries automatically if ledgers exist
    // Try to find Input CGST and Input SGST ledger by name match
    const cgstLedger = ledgers.find(l => l.name.toLowerCase().includes("cgst"));
    const sgstLedger = ledgers.find(l => l.name.toLowerCase().includes("sgst"));

    if (cgstLedger && sgstLedger) {
      const calculatedTaxRows = [
        { ledger_id: cgstLedger.id, amount: Number(cgstSum.toFixed(2)) },
        { ledger_id: sgstLedger.id, amount: Number(sgstSum.toFixed(2)) }
      ];
      setTaxRows(calculatedTaxRows);
      triggerToast(`Auto-calculated GST. CGST: $${cgstSum.toFixed(2)}, SGST: $${sgstSum.toFixed(2)}`);
    } else {
      triggerToast("GST Tax accounts not found. Please select them manually in the tax table.");
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTypingInText = 
        document.activeElement?.tagName === "INPUT" && 
        (document.activeElement as HTMLInputElement).type !== "number";

      // ALT + A: Add item row
      if (e.altKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        addItemRow();
        return;
      }

      // ALT + T: Add tax row
      if (e.altKey && (e.key === "t" || e.key === "T")) {
        e.preventDefault();
        addTaxRow();
        return;
      }

      // CTRL + Enter / ALT + C: Save Voucher
      if ((e.ctrlKey && e.key === "Enter") || (e.altKey && (e.key === "c" || e.key === "C"))) {
        e.preventDefault();
        submitVoucher();
        return;
      }

      // Escape: return to vouchers or dashboard
      if (e.key === "Escape") {
        e.preventDefault();
        router.push("/dashboard");
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [itemRows, taxRows, partyLedgerId, purchaseLedgerId, voucherDate, reference, narration]);

  // Submit Voucher
  const submitVoucher = async () => {
    if (submitting) return;

    if (!partyLedgerId) {
      alert("Party Account is required.");
      return;
    }
    if (!purchaseLedgerId) {
      alert("Purchase Ledger Account is required.");
      return;
    }
    if (itemRows.some(r => !r.stock_item_id)) {
      alert("Please select a stock item for all rows.");
      return;
    }

    setSubmitting(true);
    setError("");

    const payload = {
      company_id: company.id,
      voucher_type: "purchase",
      voucher_date: voucherDate,
      reference: reference || null,
      narration: narration || null,
      party_ledger_id: partyLedgerId,
      purchase_ledger_id: purchaseLedgerId,
      items: itemRows.map(r => ({
        stock_item_id: r.stock_item_id,
        quantity: r.quantity,
        rate: r.rate
      })),
      tax_entries: taxRows.filter(r => r.ledger_id && r.amount > 0).map(r => ({
        ledger_id: r.ledger_id,
        amount: r.amount
      }))
    };

    console.log("[PurchaseVoucher] Submitting voucher API payload:", payload);

    try {
      const response = await apiFetch("/vouchers", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      console.log("[PurchaseVoucher] Save response:", response);
      alert(`Voucher ${response.voucher_number} created successfully.`);
      router.push("/dashboard");
    } catch (err: any) {
      console.error("[PurchaseVoucher Error] Save voucher failed:", err);
      setError(err.message || "Failed to post purchase voucher. Check ledger balances.");
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
              onClick={() => router.push("/dashboard")}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-brand-lime hover:border-brand-lime/40 transition duration-200"
              title="Return to Dashboard (ESC)"
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
                Purchase Voucher Creation
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Record supplier inventory invoices, auto-increment stock values, and post ledger double-entries.
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
              <p className="text-xs font-medium">Loading ledger accounts...</p>
            </div>
          ) : (
            <div className="space-y-6 text-xs font-semibold">
              
              {/* Header Fields */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Voucher Date *</label>
                  <input
                    type="date"
                    required
                    value={voucherDate}
                    onChange={(e) => setVoucherDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-brand-navy-dark/60 border border-slate-850 rounded-xl text-white outline-none focus:border-brand-lime font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Supplier Reference Invoice #</label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full px-4 py-2.5 bg-brand-navy-dark/60 border border-slate-850 rounded-xl text-white outline-none focus:border-brand-lime"
                    placeholder="e.g. INV-2026-09"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Party Account (Credit) *</label>
                  <select
                    required
                    value={partyLedgerId}
                    onChange={(e) => setPartyLedgerId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-brand-navy-dark/60 border border-slate-850 rounded-xl text-white outline-none focus:border-brand-lime cursor-pointer"
                  >
                    <option value="">Select Supplier / Cash A/c</option>
                    {filteredPartyLedgers.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.ledger_type.toUpperCase()})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Purchase Ledger (Debit) *</label>
                  <select
                    required
                    value={purchaseLedgerId}
                    onChange={(e) => setPurchaseLedgerId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-brand-navy-dark/60 border border-slate-850 rounded-xl text-white outline-none focus:border-brand-lime cursor-pointer"
                  >
                    <option value="">Select Purchase A/c</option>
                    {filteredPurchaseLedgers.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items Table Section */}
              <div className="space-y-3.5 pt-4">
                <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    Stock Items Purchased
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
                        <th className="py-2.5 px-4">Select Stock Item</th>
                        <th className="py-2.5 px-4 w-28 text-right">Quantity</th>
                        <th className="py-2.5 px-4 w-36 text-right">Rate ($)</th>
                        <th className="py-2.5 px-4 w-36 text-right">Total ($)</th>
                        <th className="py-2.5 px-4 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemRows.map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-900/40">
                          <td className="py-2 px-4 text-slate-500 font-mono">{idx + 1}</td>
                          <td className="py-2 px-2">
                            <select
                              value={row.stock_item_id}
                              onChange={(e) => handleItemRowChange(idx, "stock_item_id", e.target.value)}
                              className="w-full px-3 py-2 bg-brand-navy-light/10 border border-slate-850 rounded-lg text-white outline-none focus:border-brand-lime"
                            >
                              <option value="">Select Item</option>
                              {stockItems.map(item => (
                                <option key={item.id} value={item.id}>
                                  {item.name} {item.gst_percentage > 0 ? `(${item.gst_percentage}% GST)` : ""}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={(e) => handleItemRowChange(idx, "quantity", e.target.value)}
                              className="w-full px-3 py-2 bg-brand-navy-light/10 border border-slate-850 rounded-lg text-white text-right font-mono"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={row.rate}
                              onChange={(e) => handleItemRowChange(idx, "rate", e.target.value)}
                              className="w-full px-3 py-2 bg-brand-navy-light/10 border border-slate-850 rounded-lg text-white text-right font-mono"
                            />
                          </td>
                          <td className="py-2 px-4 text-right font-mono text-slate-300">
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tax Ledgers Section */}
              <div className="space-y-3.5 pt-4">
                <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    GST Taxes / Additional Charges
                  </h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAutoCalculateTax}
                      className="flex items-center gap-1 px-3 py-1 bg-brand-lime/10 border border-brand-lime/30 text-brand-lime hover:bg-brand-lime hover:text-brand-navy-dark font-extrabold rounded-lg text-[10px] transition"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      Auto-Calculate GST
                    </button>
                    <button
                      type="button"
                      onClick={addTaxRow}
                      className="flex items-center gap-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 text-[10px]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Tax Row (Alt+T)
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-900 rounded-xl bg-brand-navy-dark/20">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                        <th className="py-2.5 px-4 w-12">#</th>
                        <th className="py-2.5 px-4">Select Tax Account Ledger</th>
                        <th className="py-2.5 px-4 w-48 text-right">Debit Amount ($)</th>
                        <th className="py-2.5 px-12 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {taxRows.map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-900/40">
                          <td className="py-2 px-4 text-slate-500 font-mono">{idx + 1}</td>
                          <td className="py-2 px-2">
                            <select
                              value={row.ledger_id}
                              onChange={(e) => handleTaxRowChange(idx, "ledger_id", e.target.value)}
                              className="w-full px-3 py-2 bg-brand-navy-light/10 border border-slate-850 rounded-lg text-white outline-none focus:border-brand-lime"
                            >
                              <option value="">Select Ledger</option>
                              {ledgers.map(l => (
                                <option key={l.id} value={l.id}>{l.name} ({l.ledger_type.toUpperCase()})</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={row.amount}
                              onChange={(e) => handleTaxRowChange(idx, "amount", e.target.value)}
                              className="w-full px-3 py-2 bg-brand-navy-light/10 border border-slate-850 rounded-lg text-white text-right font-mono"
                            />
                          </td>
                          <td className="py-2 px-12 text-center">
                            <button
                              type="button"
                              onClick={() => removeTaxRow(idx)}
                              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Narration */}
              <div className="space-y-1.5 pt-4">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Narration / Remarks</label>
                <textarea
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  className="w-full px-4 py-3 bg-brand-navy-dark/60 border border-slate-850 rounded-2xl text-white outline-none focus:border-brand-lime"
                  rows={2}
                  placeholder="Enter remarks or details about this purchase..."
                />
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3.5 border-t border-slate-900 pt-5">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitVoucher}
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-brand-navy-dark bg-brand-lime hover:bg-white disabled:bg-slate-800 transition shadow-lg shadow-brand-lime/10"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Post Voucher (Ctrl+Enter)
                    </>
                  )}
                </button>
              </div>

            </div>
          )}
        </section>

        {/* Right Column: Ledger balances & verification - 3 span */}
        <section className="lg:col-span-3 space-y-6">
          {/* Double entry preview */}
          <div className="rounded-3xl bg-brand-navy-light/10 border border-slate-900/60 p-5 shadow-2xl backdrop-blur-xl space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-brand-lime flex items-center gap-1.5 border-b border-slate-900 pb-2">
              <CheckCircle2 className="w-4 h-4" />
              Double-Entry Preview
            </h3>

            <div className="space-y-3 pt-1 text-xs">
              <div className="flex justify-between items-center border-b border-slate-900/40 pb-1.5">
                <span className="text-slate-400 font-bold">Party Credit:</span>
                <span className="font-mono font-bold text-white">${totals.grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-900/40 pb-1.5">
                <span className="text-slate-400 font-bold">Purchase Debit:</span>
                <span className="font-mono font-bold text-white">${totals.itemsTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-900/40 pb-1.5">
                <span className="text-slate-400 font-bold">Taxes Debit:</span>
                <span className="font-mono font-bold text-white">${totals.taxesTotal.toFixed(2)}</span>
              </div>
              
              <div className="pt-2 flex justify-between items-center">
                <span className="text-[10px] uppercase font-black text-slate-500">Status</span>
                <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono rounded text-[10px] uppercase font-black">
                  BALANCED
                </span>
              </div>
            </div>
          </div>

          {/* Shortcut guide card */}
          <div className="rounded-3xl bg-brand-navy-light/10 border border-slate-900/60 p-5 shadow-2xl backdrop-blur-xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-1.5 border-b border-slate-900 pb-2">
              <HelpCircle className="w-4 h-4 text-sky-400" />
              Keyboard Guides
            </h3>
            <div className="space-y-2.5 pt-3 text-[10px] font-mono text-slate-400">
              <div className="flex justify-between items-center">
                <span>Add Item Row</span>
                <span className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-brand-lime rounded">Alt + A</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Add Tax Row</span>
                <span className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-white rounded">Alt + T</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Post Voucher</span>
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
