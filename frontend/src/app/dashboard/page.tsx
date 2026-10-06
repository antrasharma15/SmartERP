"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../utils/api";
import AppLayout from "../components/AppLayout";
import {
  FileText,
  Package,
  Users,
  TrendingUp,
  TrendingDown,
  Receipt,
  Wallet,
  Scale,
  AlertTriangle,
} from "lucide-react";

interface Company {
  id: string;
  name: string;
  currency?: string;
}

/** `{ name, amount }` rows as returned by the report endpoints. */
type NamedAmount = { name: string; amount: number };

type StockRow = {
  id: string;
  name: string;
  quantity: string;
  purchase_price: string;
  valuation: string;
};

type DayBookRow = {
  voucher_id: string;
  voucher_number: string;
  voucher_type: string;
  voucher_date: string;
  narration: string | null;
  total_amount: string;
};

type InvoiceRow = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: string;
  status: string;
  customer_name?: string;
};

/** The API sends numerics as strings; coerce once, never render NaN. */
const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

const MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

export default function DashboardPage() {
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [currency, setCurrency] = useState("₹");
  const [loadError, setLoadError] = useState("");

  // Everything below comes from the API. Nothing here is seeded with
  // placeholder figures — an empty company must render honest zeroes.
  const [revenue, setRevenue] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [revenueRows, setRevenueRows] = useState<NamedAmount[]>([]);
  const [expenseRows, setExpenseRows] = useState<NamedAmount[]>([]);

  const [assets, setAssets] = useState(0);
  const [liabilities, setLiabilities] = useState(0);

  const [stockRows, setStockRows] = useState<StockRow[]>([]);
  const [stockItemCount, setStockItemCount] = useState(0);
  const [stockQty, setStockQty] = useState(0);
  const [stockValuation, setStockValuation] = useState(0);

  const [vouchers, setVouchers] = useState<{ voucher_type: string }[]>([]);
  const [ledgerCount, setLedgerCount] = useState(0);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [dayBook, setDayBook] = useState<DayBookRow[]>([]);

  useEffect(() => {
    const activeCompanyStr = localStorage.getItem("activeCompany");
    if (!activeCompanyStr) {
      router.push("/companies");
      return;
    }
    const comp = JSON.parse(activeCompanyStr);
    setCompany(comp);
    setCurrency(comp.currency || "₹");
  }, [router]);

  useEffect(() => {
    if (!company) return;
    const q = `company_id=${company.id}`;

    (async () => {
      try {
        const [pl, bs, ss, vch, led, inv, db] = await Promise.all([
          apiFetch(`/reports/profit-loss?${q}`),
          apiFetch(`/reports/balance-sheet?${q}`),
          apiFetch(`/reports/stock-summary?${q}`),
          apiFetch(`/vouchers?${q}`),
          apiFetch(`/ledgers?${q}`),
          apiFetch(`/invoices?${q}`),
          apiFetch(`/reports/day-book?${q}`),
        ]);

        const plT = pl?.report?.totals ?? {};
        setRevenue(num(plT.revenue_total));
        setExpenses(num(plT.expense_total));
        setNetProfit(num(plT.net_profit));
        setRevenueRows(pl?.report?.revenue ?? []);
        setExpenseRows(pl?.report?.expenses ?? []);

        const bsT = bs?.report?.totals ?? {};
        setAssets(num(bsT.assets_total));
        setLiabilities(num(bsT.liabilities_total));

        const ssT = ss?.report?.totals ?? {};
        setStockRows(ss?.report?.items ?? []);
        setStockItemCount(num(ssT.total_items));
        setStockQty(num(ssT.total_quantity));
        setStockValuation(num(ssT.total_valuation));

        setVouchers(vch?.vouchers ?? []);
        setLedgerCount((led?.ledgers ?? []).length);
        setInvoices(inv?.invoices ?? []);
        setDayBook(db?.report ?? []);
      } catch (err: unknown) {
        setLoadError(err instanceof Error ? err.message : "Failed to load dashboard metrics");
      }
    })();
  }, [company]);

  const money = (n: number) =>
    `${currency}${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  /** Billed value per financial-year month, from the invoice register. */
  const monthly = useMemo(() => {
    const buckets = new Array(12).fill(0);
    for (const inv of invoices) {
      const d = new Date(inv.invoice_date);
      if (Number.isNaN(d.getTime())) continue;
      // The financial year opens in April, so April is bucket 0.
      buckets[(d.getMonth() - 3 + 12) % 12] += num(inv.total_amount);
    }
    return buckets;
  }, [invoices]);

  /** Voucher counts by type, largest first. */
  const voucherMix = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of vouchers) counts.set(v.voucher_type, (counts.get(v.voucher_type) ?? 0) + 1);
    return [...counts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [vouchers]);

  const topStock = useMemo(
    () => [...stockRows].sort((a, b) => num(b.valuation) - num(a.valuation)).slice(0, 5),
    [stockRows]
  );

  const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const billed = invoices.reduce((s, i) => s + num(i.total_amount), 0);
  const cover = liabilities > 0 ? assets / liabilities : 0;
  const monthlyPeak = Math.max(0, ...monthly);

  return (
    <AppLayout
      pageTitle="Dashboard"
      pageSubtitle={company ? `Live position for ${company.name}` : "Loading company…"}
    >
      <div className="space-y-5">
        {loadError && (
          <div className="panel panel-accent">
            <div className="panel-body flex items-center gap-2 text-[0.8rem]">
              <AlertTriangle className="w-4 h-4" style={{ color: "var(--accent)" }} />
              {loadError}
            </div>
          </div>
        )}

        {/* Headline figures. Stat tiles, not charts — a single number whose
            job is to be read, not compared, does not want a plot. */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat
            icon={TrendingUp}
            label="Revenue"
            value={money(revenue)}
            note={`${revenueRows.length} income ledger${revenueRows.length === 1 ? "" : "s"}`}
            tone="var(--viz-3)"
          />
          <Stat
            icon={netProfit >= 0 ? TrendingUp : TrendingDown}
            label="Net Profit"
            value={money(netProfit)}
            note={revenue > 0 ? `${margin.toFixed(1)}% margin` : "No revenue booked"}
            tone={netProfit >= 0 ? "var(--positive)" : "var(--negative)"}
          />
          <Stat
            icon={Package}
            label="Stock Value"
            value={money(stockValuation)}
            note={`${stockItemCount} items · ${stockQty.toLocaleString("en-IN")} units`}
            tone="var(--viz-1)"
          />
          <Stat
            icon={Receipt}
            label="Billed"
            value={money(billed)}
            note={`${invoices.length} invoice${invoices.length === 1 ? "" : "s"}`}
            tone="var(--viz-2)"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Profit & loss --------------------------------------------- */}
          <div className="panel panel-accent">
            <div className="panel-head">
              <span className="flex items-center gap-2">
                <Scale className="w-4 h-4" style={{ color: "var(--accent)" }} />
                Profit &amp; Loss
              </span>
              <span className="font-mono normal-case tracking-normal text-[0.66rem]">
                {netProfit >= 0 ? "Profit" : "Loss"} {money(Math.abs(netProfit))}
              </span>
            </div>
            <div className="panel-body space-y-4">
              <Bar label="Revenue" value={revenue} total={Math.max(revenue, expenses)} tone="var(--positive)" fmt={money} />
              <Bar label="Expenses" value={expenses} total={Math.max(revenue, expenses)} tone="var(--negative)" fmt={money} />
              <Breakdown rows={expenseRows} total={expenses} fmt={money} title="Largest expense heads" />
            </div>
          </div>

          {/* Balance sheet --------------------------------------------- */}
          <div className="panel">
            <div className="panel-head">
              <span className="flex items-center gap-2">
                <Wallet className="w-4 h-4" style={{ color: "var(--viz-1)" }} />
                Balance Sheet
              </span>
              <span className="font-mono normal-case tracking-normal text-[0.66rem]">
                {liabilities > 0 ? `${cover.toFixed(2)}× cover` : "No liabilities"}
              </span>
            </div>
            <div className="panel-body space-y-4">
              <Bar label="Assets" value={assets} total={Math.max(assets, liabilities)} tone="var(--viz-1)" fmt={money} />
              <Bar label="Liabilities" value={liabilities} total={Math.max(assets, liabilities)} tone="var(--viz-2)" fmt={money} />
              <div className="mat-sunk rounded-[var(--r-md)] px-3 py-2.5 flex items-baseline justify-between">
                <span className="label mb-0">Net Worth</span>
                <span className="font-mono font-bold tabular text-[0.9rem]" style={{ color: "var(--ink-1)" }}>
                  {money(assets - liabilities)}
                </span>
              </div>
            </div>
          </div>

          {/* Billing by month ------------------------------------------ */}
          <div className="panel">
            <div className="panel-head">
              <span>Billing by Month · FY</span>
              <span className="font-mono normal-case tracking-normal text-[0.66rem]">
                Peak {money(monthlyPeak)}
              </span>
            </div>
            <div className="panel-body">
              {invoices.length === 0 ? (
                <Empty>No invoices raised yet.</Empty>
              ) : (
                <>
                  <div className="h-36 col-track" role="img" aria-label="Billed value by financial-year month">
                    {monthly.map((v, i) => (
                      <div
                        key={MONTHS[i]}
                        className="col"
                        title={`${MONTHS[i]}: ${money(v)}`}
                        style={{
                          height: `${v > 0 ? Math.max(3, (v / (monthlyPeak || 1)) * 100) : 0.8}%`,
                          background: v > 0 ? "var(--viz-1)" : "var(--viz-grid)",
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-[2px] mt-2">
                    {MONTHS.map((m) => (
                      <span
                        key={m}
                        className="flex-1 min-w-0 text-center font-mono text-[0.58rem]"
                        style={{ color: "var(--ink-3)" }}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Voucher mix ------------------------------------------------ */}
          <div className="panel">
            <div className="panel-head">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" style={{ color: "var(--ink-2)" }} />
                Voucher Mix
              </span>
              <span className="font-mono normal-case tracking-normal text-[0.66rem]">
                {vouchers.length} total · {ledgerCount} ledgers
              </span>
            </div>
            <div className="panel-body space-y-2.5">
              {voucherMix.length === 0 ? (
                <Empty>No vouchers posted yet.</Empty>
              ) : (
                voucherMix.map((v, i) => (
                  <div key={v.type} className="flex items-center gap-3">
                    <span className="legend-dot" style={{ background: `var(--viz-${(i % 4) + 1})` }} />
                    <span className="text-[0.75rem] capitalize w-24 shrink-0" style={{ color: "var(--ink-2)" }}>
                      {v.type}
                    </span>
                    <div
                      className="flex-1 min-w-0"
                      style={{ background: "var(--mat-0)", boxShadow: "var(--sunk)", borderRadius: "5px" }}
                    >
                      <div
                        className="hbar"
                        title={`${v.type}: ${v.count}`}
                        style={{
                          width: `${(v.count / voucherMix[0].count) * 100}%`,
                          background: `var(--viz-${(i % 4) + 1})`,
                        }}
                      />
                    </div>
                    {/* Every segment is direct-labelled: two of the light-mode
                        slots sit under 3:1 on this surface, so the count is
                        required relief, not decoration. */}
                    <span
                      className="font-mono text-[0.75rem] font-bold tabular w-8 text-right"
                      style={{ color: "var(--ink-1)" }}
                    >
                      {v.count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Stock by value --------------------------------------------- */}
          <div className="panel">
            <div className="panel-head">
              <span className="flex items-center gap-2">
                <Package className="w-4 h-4" style={{ color: "var(--ink-2)" }} />
                Stock by Value
              </span>
              <span className="font-mono normal-case tracking-normal text-[0.66rem]">
                Top {topStock.length}
              </span>
            </div>
            <div className="panel-body space-y-3">
              {topStock.length === 0 ? (
                <Empty>No stock items yet.</Empty>
              ) : (
                topStock.map((s) => (
                  <div key={s.id}>
                    <div className="flex justify-between items-baseline gap-3 mb-1">
                      <span className="text-[0.75rem] truncate" style={{ color: "var(--ink-2)" }}>
                        {s.name}
                      </span>
                      <span
                        className="font-mono text-[0.75rem] font-bold tabular shrink-0"
                        style={{ color: "var(--ink-1)" }}
                      >
                        {money(num(s.valuation))}
                      </span>
                    </div>
                    <div style={{ background: "var(--mat-0)", boxShadow: "var(--sunk)", borderRadius: "5px" }}>
                      <div
                        className="hbar"
                        title={`${s.name}: ${num(s.quantity).toLocaleString("en-IN")} units @ ${money(num(s.purchase_price))}`}
                        style={{
                          width: `${(num(s.valuation) / (num(topStock[0].valuation) || 1)) * 100}%`,
                          background: "var(--viz-1)",
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent activity -------------------------------------------- */}
          <div className="panel">
            <div className="panel-head">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4" style={{ color: "var(--ink-2)" }} />
                Recent Activity
              </span>
              <span className="font-mono normal-case tracking-normal text-[0.66rem]">Day book</span>
            </div>
            <div className="panel-body" style={{ padding: 0 }}>
              {dayBook.length === 0 ? (
                <div className="p-4">
                  <Empty>Day book is empty.</Empty>
                </div>
              ) : (
                <table className="ledger">
                  <thead>
                    <tr>
                      <th>Voucher</th>
                      <th>Type</th>
                      <th>Date</th>
                      <th style={{ textAlign: "right" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayBook.slice(0, 6).map((r) => (
                      <tr key={r.voucher_id}>
                        <td className="font-mono">{r.voucher_number}</td>
                        <td className="capitalize">{r.voucher_type}</td>
                        <td className="font-mono">
                          {new Date(r.voucher_date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </td>
                        <td className="amt">{money(num(r.total_amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.75rem] italic py-3" style={{ color: "var(--ink-3)" }}>
      {children}
    </p>
  );
}

/** A raised stat plate. Deliberately not a rounded translucent card. */
function Stat({
  icon: Icon,
  label,
  value,
  note,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  note: string;
  tone: string;
}) {
  return (
    <div className="mat-raised rounded-[var(--r-lg)] p-4 flex items-start gap-3.5">
      <div
        className="shrink-0 grid place-items-center w-10 h-10 rounded-[var(--r-md)]"
        style={{
          color: tone,
          background: `color-mix(in srgb, ${tone} 14%, transparent)`,
          border: `1px solid color-mix(in srgb, ${tone} 34%, transparent)`,
          boxShadow: "inset 0 1px 0 0 var(--mat-bevel)",
        }}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="label mb-1">{label}</p>
        <p
          className="font-display text-2xl font-extrabold leading-none tabular truncate"
          style={{ color: "var(--ink-1)" }}
        >
          {value}
        </p>
        <p className="text-[0.68rem] mt-1.5 truncate" style={{ color: "var(--ink-3)" }}>
          {note}
        </p>
      </div>
    </div>
  );
}

/** Sunk track, raised fill — the bar reads as a machined gauge, not a div. */
function Bar({
  label,
  value,
  total,
  tone,
  fmt,
}: {
  label: string;
  value: number;
  total: number;
  tone: string;
  fmt: (n: number) => string;
}) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between items-baseline gap-3 mb-1.5">
        <span className="text-[0.75rem]" style={{ color: "var(--ink-2)" }}>
          {label}
        </span>
        <span className="font-mono text-[0.78rem] font-bold tabular" style={{ color: tone }}>
          {fmt(value)}
        </span>
      </div>
      <div
        className="h-2.5 rounded-full overflow-hidden"
        style={{ background: "var(--mat-0)", boxShadow: "var(--sunk)" }}
        role="meter"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(180deg, color-mix(in srgb, ${tone} 100%, white 22%), ${tone})`,
            boxShadow: `0 1px 0 0 #ffffff33 inset, 0 0 10px -2px ${tone}`,
          }}
        />
      </div>
    </div>
  );
}

/** Top contributors within a total, as a ranked list rather than a pie. */
function Breakdown({
  rows,
  total,
  fmt,
  title,
}: {
  rows: NamedAmount[];
  total: number;
  fmt: (n: number) => string;
  title: string;
}) {
  const top = [...rows].sort((a, b) => num(b.amount) - num(a.amount)).slice(0, 3);
  if (top.length === 0) return null;
  return (
    <div className="mat-sunk rounded-[var(--r-md)] p-3 space-y-2">
      <p className="label mb-0">{title}</p>
      {top.map((r) => (
        <div key={r.name} className="flex justify-between items-baseline gap-3">
          <span className="text-[0.73rem] truncate" style={{ color: "var(--ink-2)" }}>
            {r.name}
          </span>
          <span className="font-mono text-[0.73rem] tabular shrink-0" style={{ color: "var(--ink-1)" }}>
            {fmt(num(r.amount))}
            {total > 0 && (
              <span style={{ color: "var(--ink-3)" }}>
                {" "}· {((num(r.amount) / total) * 100).toFixed(0)}%
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
