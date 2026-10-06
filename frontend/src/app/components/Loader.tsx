"use client";

import React from "react";

/**
 * Domain-specific loading states.
 *
 * A spinner tells you nothing. Each of these draws the thing the screen is
 * about — a ledger flipping, a crate turning, a stamp striking a voucher —
 * so the wait carries information. All of it is CSS 3D (`preserve-3d` on a
 * perspective stage); no canvas, no library, no images.
 *
 * `kind` is normally inferred from the route via `loaderKindFor`, so a page
 * can render `<Loader />` and get the right one without deciding.
 */

export type LoaderKind =
  | "ledger"
  | "stock"
  | "voucher"
  | "invoice"
  | "scale"
  | "report"
  | "cash"
  | "vault";

const CAPTIONS: Record<LoaderKind, string> = {
  ledger: "Opening ledgers",
  stock: "Counting stock",
  voucher: "Posting vouchers",
  invoice: "Printing invoices",
  scale: "Balancing books",
  report: "Building report",
  cash: "Reading cash book",
  vault: "Unlocking company",
};

/** Longest prefix wins, so /reports/stock-summary beats /reports. */
const ROUTE_KINDS: Array<[string, LoaderKind]> = [
  ["/reports/stock-summary", "stock"],
  ["/reports/trial-balance", "scale"],
  ["/reports/balance-sheet", "scale"],
  ["/reports/cash-bank", "cash"],
  ["/reports/day-book", "voucher"],
  ["/reports/profit-loss", "report"],
  ["/reports", "report"],
  ["/dashboard", "report"],
  ["/billing", "invoice"],
  ["/vouchers", "voucher"],
  ["/inventory", "stock"],
  ["/ledgers", "ledger"],
  ["/groups", "ledger"],
  ["/companies", "vault"],
  ["/settings", "vault"],
];

export function loaderKindFor(pathname: string | null | undefined): LoaderKind {
  if (!pathname) return "report";
  let best: LoaderKind = "report";
  let bestLen = -1;
  for (const [prefix, kind] of ROUTE_KINDS) {
    if (pathname.startsWith(prefix) && prefix.length > bestLen) {
      best = kind;
      bestLen = prefix.length;
    }
  }
  return best;
}

function Art({ kind }: { kind: LoaderKind }) {
  switch (kind) {
    case "ledger":
      return (
        <div className="ldr-ledger">
          <i /><i /><i />
        </div>
      );
    case "stock":
      return (
        <div className="ldr-cube">
          <i /><i /><i /><i /><i /><i />
        </div>
      );
    case "voucher":
      return (
        <div className="ldr-stamp">
          <span className="sheet" />
          <span className="mark" />
          <span className="die" />
        </div>
      );
    case "invoice":
      return (
        <div className="ldr-print">
          <span className="paper" />
          <span className="slot" />
          <span className="body" />
        </div>
      );
    case "scale":
      return (
        <div className="ldr-scale">
          <span className="base" />
          <span className="post" />
          <span className="beam" />
        </div>
      );
    case "cash":
      return (
        <div className="ldr-coins">
          <i /><i /><i /><i />
        </div>
      );
    case "vault":
      return (
        <div className="ldr-dial">
          <span className="ring" />
          <span className="hub" />
        </div>
      );
    case "report":
    default:
      return (
        <div className="ldr-bars">
          <i /><i /><i /><i />
        </div>
      );
  }
}

export default function Loader({
  kind = "report",
  label,
  className = "",
}: {
  kind?: LoaderKind;
  label?: string;
  className?: string;
}) {
  return (
    <div className={`ldr ${className}`} role="status" aria-live="polite">
      <div className="ldr-stage">
        <Art kind={kind} />
      </div>
      <span className="ldr-cap">{label ?? CAPTIONS[kind]}</span>
    </div>
  );
}
