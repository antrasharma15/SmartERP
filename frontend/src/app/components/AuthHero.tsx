"use client";

import React from "react";

/**
 * Left-hand panel for the sign-in and register screens.
 *
 * Replaces a 1 MB generated stock render of a fictional dashboard. This draws
 * the thing the product actually is: a trial balance on ruled paper, tilted on
 * a real CSS perspective, over the keycaps the app is driven by. The figures
 * below balance — an accountant reads the totals first, and a sheet that does
 * not foot is the fastest way to look unserious.
 */

const ROWS: Array<[string, number | null, number | null]> = [
  ["Cash In Hand", 85000, null],
  ["State Bank of India", 420000, null],
  ["Stock In Hand", 346500, null],
  ["Sundry Debtors", 160364, null],
  ["Sales Revenue A/c", null, 508800],
  ["Capital A/c", null, 503064],
];

const DR_TOTAL = 1011864;
const CR_TOTAL = 1011864;

const inr = (n: number) => n.toLocaleString("en-IN");

export default function AuthHero({
  headline,
  sub,
  tags,
}: {
  headline: React.ReactNode;
  sub: string;
  tags: string[];
}) {
  return (
    <div
      className="md:w-1/2 relative min-h-[320px] md:min-h-[620px] flex flex-col justify-between p-8 md:p-10 overflow-hidden doodle-grid"
      style={{ background: "var(--mat-0)" }}
    >
      {/* A single warm pool of light, instead of two blurred colour blobs. */}
      <div
        aria-hidden
        className="absolute -top-24 -right-16 w-[26rem] h-[26rem] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--accent) 18%, transparent) 0%, transparent 68%)",
        }}
      />

      <div className="relative z-10">
        <span className="kbd kbd-hot" style={{ height: "auto", padding: "0.3rem 0.6rem" }}>
          KEYBOARD-FIRST ACCOUNTING
        </span>
      </div>

      {/* The sheet. Real perspective, so it reads as an object on a desk. */}
      <div
        aria-hidden
        className="relative z-10 my-5 hidden md:block pr-2"
        style={{ perspective: "1100px" }}
      >
        <div
          className="panel"
          style={{
            transform: "rotateY(-11deg) rotateX(5deg) scale(0.94)",
            transformOrigin: "left center",
            boxShadow:
              "0 1px 0 0 var(--mat-bevel) inset, 22px 26px 0 -18px #00000055, 0 30px 60px -20px #000e",
          }}
        >
          <div className="panel-head">
            <span>Trial Balance · 31 Mar 2027</span>
            <span className="font-mono normal-case tracking-normal">₹</span>
          </div>

          <table className="ledger">
            <thead>
              <tr>
                <th>Particulars</th>
                <th style={{ textAlign: "right" }}>Debit</th>
                <th style={{ textAlign: "right" }}>Credit</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([name, dr, cr]) => (
                <tr key={name as string}>
                  <td style={{ whiteSpace: "nowrap" }}>{name}</td>
                  <td className="amt">{dr ? inr(dr) : "—"}</td>
                  <td className="amt">{cr ? inr(cr) : "—"}</td>
                </tr>
              ))}
              <tr style={{ borderTop: "2px solid var(--mat-edge)" }}>
                <td
                  className="font-display"
                  style={{ fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", fontSize: "0.7rem", color: "var(--ink-2)" }}
                >
                  Total
                </td>
                {[DR_TOTAL, CR_TOTAL].map((t, i) => (
                  <td
                    key={i}
                    className="amt"
                    style={{
                      fontWeight: 700,
                      color: "var(--ink-1)",
                      // Double rule under a balancing total — the convention
                      // every accountant scans for first.
                      borderBottom: "3px double var(--ink-3)",
                    }}
                  >
                    {inr(t)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="relative z-10 space-y-4">
        <h2 className="font-display text-3xl md:text-[2.1rem] font-extrabold leading-[1.1]" style={{ color: "var(--ink-1)" }}>
          {headline}
        </h2>
        <p className="text-sm max-w-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
          {sub}
        </p>

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {tags.map((t) => (
            <kbd key={t} className="kbd">{t}</kbd>
          ))}
        </div>
      </div>
    </div>
  );
}
