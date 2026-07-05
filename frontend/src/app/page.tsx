"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  Warehouse,
  BookOpen,
  Calendar,
  FileText,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Menu,
  X,
  Sun,
  Moon
} from "lucide-react";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(3); // Keep an item open by default
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
  }, []);

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

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const features = [
    {
      title: "Double-Entry Voucher Entry",
      tagline: "Keyboard-First Ledger Accounting",
      description:
        "Create Payment, Receipt, Sales, and Purchase vouchers easily. The system automatically enforces debit and credit balance matching before saving transactions.",
      icon: <Layers className="w-8 h-8 text-brand-red" />
    },
    {
      title: "Stock & Inventory Report",
      tagline: "FIFO & WAC Material Valuation",
      description:
        "Compute stock quantities and valuations across multiple Godowns. Supports FIFO (First-In, First-Out) and Weighted Average Cost (WAC) models with real-time reorder warnings.",
      icon: <Warehouse className="w-8 h-8 text-brand-red" />
    },
    {
      title: "Cash & Bank Book",
      tagline: "Running Balance Ledger Statements",
      description:
        "Inspect cash registers and bank accounts chronological movements. Filter by date ranges to check opening, current, and closing running balances.",
      icon: <BookOpen className="w-8 h-8 text-brand-red" />
    },
    {
      title: "Chronological Day Book",
      tagline: "Consolidated Daily Audit Register",
      description:
        "View every voucher recorded in the system on a single flat list. Includes opposite ledger mappings, debit/credit totals, and double-entry split drill-downs.",
      icon: <Calendar className="w-8 h-8 text-brand-red" />
    },
    {
      title: "Live Financial Reports",
      tagline: "Balance Sheet & Trial Balance",
      description:
        "Instantly compile Profit & Loss, Balance Sheets, and Trial Balances. Calculated dynamically from double-entry ledger splits with active date range filters.",
      icon: <FileText className="w-8 h-8 text-brand-red" />
    },
    {
      title: "Multi-User Safety Locks",
      tagline: "Governance & Change Auditing",
      description:
        "Prevent write conflicts with concurrency locks when editing settings. Tracks master changes using automated system audit logs.",
      icon: <ShieldAlert className="w-8 h-8 text-brand-red" />
    }
  ];

  const faqs = [
    {
      question: "What makes KEYbooks different?",
      answer:
        "It provides a Tally-inspired, keyboard-friendly navigation flow designed for fast data entry, combining standard double-entry accounting with real-time web reporting."
    },
    {
      question: "Is this a commercial enterprise software?",
      answer:
        "No, this is an internship simulation project demonstrating core ERP architecture. It is built to show clean database design, transactional consistency, and financial aggregations."
    },
    {
      question: "How customizable is the ledger system?",
      answer:
        "You can define custom ledger accounts, register them under standard accounting asset/liability groups, and switch currency preferences dynamically across the entire application."
    },
    {
      question: "How are the stock valuation models calculated?",
      answer:
        "The inventory ledger calculates quantity and rate splits based on historical inbound and outbound transaction flows using FIFO or Weighted Average Cost (WAC) calculations."
    },
    {
      question: "Where can I view the technical specifications?",
      answer:
        "Built-in 'Systems Architect Specification' tabs are integrated directly inside the Stock and Cash/Bank book screens, showing the underlying SQL queries, schema, and API payloads."
    },
    {
      question: "How does the system handle multi-user conflicts?",
      answer:
        "When an administrator updates configuration rules (such as invoice prefixes or tax rates), a system lock is claimed. Other active users are temporarily blocked from mutating configurations until the lock is released, protecting write integrity."
    }
  ];

  return (
    <div className="relative min-h-screen bg-brand-navy-dark text-slate-100 light:text-slate-900 overflow-x-hidden select-none">
      {/* Decorative growth vectors in background */}
      <div className="absolute top-0 right-0 w-full h-[800px] pointer-events-none opacity-20 lg:opacity-40">
        <svg
          className="absolute right-0 top-0 w-full max-w-[800px] h-full"
          viewBox="0 0 800 800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M500 700 C 500 500, 600 300, 750 180"
            stroke="#38bdf8"
            strokeWidth="4"
            strokeDasharray="8 8"
          />
          <path
            d="M300 750 C 350 450, 550 250, 700 100"
            stroke="#0ea5e9"
            strokeWidth="5"
          />
          <path
            d="M100 800 C 200 550, 450 350, 780 200"
            stroke="#ef4444"
            strokeWidth="6"
          />
          <path d="M 750 180 L 730 180 L 745 200 Z" fill="#38bdf8" />
          <path d="M 700 100 L 680 110 L 690 85 Z" fill="#0ea5e9" />
          <path d="M 780 200 L 760 215 L 775 180 Z" fill="#ef4444" />

          <circle cx="280" cy="580" r="10" fill="#0ea5e9" className="animate-pulse" />
          <circle cx="430" cy="400" r="12" fill="#ef4444" className="animate-ping [animation-duration:3s]" />
          <circle cx="430" cy="400" r="8" fill="#ef4444" />
          <circle cx="580" cy="270" r="15" fill="#38bdf8" className="opacity-75" />
        </svg>
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#020617]/75 light:bg-[#f8fafc]/75 border-[#0b1528] light:border-slate-300 border-[#0b1528]/40 light:border-slate-200 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex flex-col gap-1 w-8 h-8 justify-center">
              <span className="w-8 h-1 bg-white rounded-full transition-transform group-hover:translate-x-1"></span>
              <span className="w-6 h-1 bg-brand-red rounded-full transition-transform group-hover:translate-x-2"></span>
              <span className="w-7 h-1 bg-sky-400 rounded-full transition-transform group-hover:translate-x-1.5"></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white light:text-slate-900 tracking-wide">
                KEY
              </span>
              <span className="px-2 py-0.5 text-xs font-extrabold bg-brand-red text-brand-navy-dark rounded font-mono">
                books
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300 light:text-slate-700">
            <Link
              href="#features"
              className="hover:text-brand-red transition-colors duration-200"
            >
              Features
            </Link>
            <Link
              href="#roadmap"
              className="hover:text-brand-red transition-colors duration-200"
            >
              Roadmap
            </Link>
            <Link
              href="#about"
              className="hover:text-brand-red transition-colors duration-200"
            >
              About
            </Link>
            <Link
              href="#faq"
              className="hover:text-brand-red transition-colors duration-200"
            >
              FAQ
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-900 light:bg-slate-200/80 border border-slate-800 light:border-slate-300 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-black transition duration-200"
              title="Toggle Theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold text-slate-300 light:text-slate-700 hover:text-white light:hover:text-black transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="px-5 py-2 text-sm font-semibold rounded-full bg-[#0f2249] light:bg-slate-200 border border-slate-800 light:border-slate-300 text-slate-200 light:text-slate-800 hover:text-white light:hover:text-black hover:bg-[#0b1528] light:hover:bg-slate-300 hover:border-brand-red/50 transition-all duration-300 shadow-lg shadow-black/50"
            >
              Launch Application
            </Link>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-300 light:text-slate-700 hover:text-white light:text-slate-900 light:hover:text-black transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-[#020617]/95 light:bg-[#f8fafc]/95 backdrop-blur-xl flex flex-col justify-center px-8 md:hidden transition-all duration-300">
          <nav className="flex flex-col gap-6 text-2xl font-bold text-slate-100 light:text-slate-900 mb-12">
            <Link
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-brand-red transition-colors"
            >
              Features
            </Link>
            <Link
              href="#roadmap"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-brand-red transition-colors"
            >
              Roadmap
            </Link>
            <Link
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-brand-red transition-colors"
            >
              About Us
            </Link>
            <Link
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-brand-red transition-colors"
            >
              FAQ
            </Link>
          </nav>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => {
                toggleTheme();
                setMobileMenuOpen(false);
              }}
              className="w-full py-3.5 text-center font-bold text-slate-300 light:text-slate-700 border border-slate-700 light:border-slate-300 rounded-full flex items-center justify-center gap-2 hover:bg-slate-900/10 transition-all"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="w-4 h-4" /> Light Mode
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4" /> Dark Mode
                </>
              )}
            </button>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-3.5 text-center font-bold text-brand-navy-dark bg-brand-red rounded-full hover:bg-white transition-all shadow-lg"
            >
              Launch Application
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-3.5 text-center font-bold text-slate-300 light:text-slate-700 border border-slate-700 rounded-full hover:text-white light:hover:text-black transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>
      )}

      {/* HERO SECTION */}
      <section className="relative max-w-7xl mx-auto px-6 pt-16 pb-24 md:pt-28 md:pb-36 flex flex-col items-start justify-center min-h-[calc(100vh-80px)]">
        <div className="max-w-3xl space-y-8 z-10">
          <h1 className="text-4xl md:text-6xl font-extrabold text-white light:text-slate-900 tracking-tight leading-[1.1] animate-fade-in">
            Keyboard-First Accounting <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-sky-300 light:from-slate-900 light:via-slate-800 light:to-sky-600">
              & Stock Registers
            </span>
          </h1>

          <h2 className="text-xl md:text-2xl font-semibold text-sky-400 light:text-sky-600/90 tracking-wide">
            A Keyboard-First Ledger Bookkeeping & Stock Register System
          </h2>

          <p className="text-slate-400 light:text-slate-600 text-base md:text-lg leading-relaxed max-w-2xl">
            Designed to demonstrate rapid keyboard-driven bookkeeping flows. Register voucher entries, balance ledger splits, compute FIFO/WAC inventory allocations, and generate balance sheets instantly within a robust relational system.
          </p>

          <div className="flex flex-wrap items-center gap-5 pt-4">
            <Link
              href="/login"
              className="group px-8 py-3.5 flex items-center gap-2 rounded-full font-bold text-brand-navy-dark bg-brand-red hover:bg-white transition-all duration-300 shadow-xl shadow-brand-red/10 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Launch Application
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              href="#features"
              className="px-8 py-3.5 rounded-full font-bold text-slate-300 light:text-slate-700 bg-[#0b1528]/60 light:bg-slate-200 hover:bg-[#0b1528] light:hover:bg-slate-300/80 hover:text-white light:text-slate-900 light:hover:text-black border border-slate-800 light:border-slate-200 hover:border-slate-600 light:hover:border-slate-400 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Explore Features
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="bg-[#020617]/45 light:bg-[#f1f5f9]/45 border-t border-[#0b1528] light:border-slate-300 border-[#0b1528]/45 light:border-slate-200 py-24 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white light:text-slate-900 light:text-slate-900 tracking-tight">
              Functional Features
            </h2>
            <p className="text-slate-400 light:text-slate-600 text-sm mt-2">
              All of the modules listed below are fully implemented, operational, and ready to use.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="group p-6 rounded-2xl bg-[#0b1528]/20 light:bg-white hover:bg-[#0b1528] light:hover:bg-slate-300/80/40 border border-slate-900 light:border-slate-200 hover:border-slate-800 light:hover:border-slate-300 light:border-slate-200 transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="mb-6 p-3 w-14 h-14 flex items-center justify-center rounded-xl bg-[#0f2249] light:bg-slate-200/80/50 light:bg-slate-200/50 border border-[#0b1528] group-hover:border-[#0b1528] light:border-slate-300rand-lime/30 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white light:text-slate-900 light:text-slate-900 mb-2 group-hover:text-brand-red transition-colors">
                  {feature.title}
                </h3>
                <h4 className="text-sm font-semibold text-sky-400 light:text-sky-600 mb-4 leading-snug">
                  {feature.tagline}
                </h4>
                <p className="text-sm text-slate-400 light:text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROADMAP SECTION */}
      <section id="roadmap" className="py-24 border-[#0b1528] light:border-slate-300 border-[#0b1528]/45 light:border-slate-200 scroll-mt-20 bg-brand-navy-mid/10 light:bg-slate-200/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <span className="text-sm font-extrabold uppercase tracking-widest text-brand-red">
              Project Roadmap
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white light:text-slate-900 light:text-slate-900 tracking-tight mt-2">
              Planned Capabilities
            </h2>
            <p className="text-slate-400 light:text-slate-600 text-sm mt-2">
              These features are currently in the planning stage but are not yet functional.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#0b1528]/10 light:bg-slate-200/40 border border-slate-900 light:border-slate-200/60 space-y-3">
              <span className="px-2 py-0.5 text-[10px] font-black bg-rose-500/10 light:bg-rose-100/60 text-rose-400 light:text-rose-600 rounded uppercase font-mono">Coming Soon</span>
              <h3 className="text-base font-bold text-white light:text-slate-900">Automated Invoice Emails</h3>
              <p className="text-xs text-slate-400 light:text-slate-600 leading-relaxed">
                SMTP integrations to automatically dispatch copies of sales invoices and receipt vouchers to counterparties on creation.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0b1528]/10 light:bg-slate-200/40 border border-slate-900 light:border-slate-200/60 space-y-3">
              <span className="px-2 py-0.5 text-[10px] font-black bg-rose-500/10 light:bg-rose-100/60 text-rose-400 light:text-rose-600 rounded uppercase font-mono">Coming Soon</span>
              <h3 className="text-base font-bold text-white light:text-slate-900">Automated Tax Returns</h3>
              <p className="text-xs text-slate-400 light:text-slate-600 leading-relaxed">
                Automatic generation of formatted GSTR-1 structures and ledger reconciliation based on localized tax rates.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0b1528]/10 light:bg-slate-200/40 border border-slate-900 light:border-slate-200/60 space-y-3">
              <span className="px-2 py-0.5 text-[10px] font-black bg-rose-500/10 light:bg-rose-100/60 text-rose-400 light:text-rose-600 rounded uppercase font-mono">Coming Soon</span>
              <h3 className="text-base font-bold text-white light:text-slate-900">Bank Statement Sync</h3>
              <p className="text-xs text-slate-400 light:text-slate-600 leading-relaxed">
                Direct uploading of CSV bank logs to match payments, identify outstanding receipts, and generate bank reconciliation statements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT US SECTION */}
      <section id="about" className="py-24 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6">
            <span className="text-sm font-extrabold uppercase tracking-widest text-brand-red">
              Project Description
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white light:text-slate-900 light:text-slate-900 tracking-tight leading-tight">
              Simulating Core Financial Workflows
            </h2>
            <div className="pt-4">
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-brand-navy-dark bg-brand-red hover:bg-white transition-all duration-300 shadow-xl shadow-brand-red/10"
              >
                Launch Application
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7 p-8 rounded-3xl bg-gradient-to-br from-brand-navy-light/20 to-brand-navy-accent/15 light:from-white light:to-slate-200/50 border border-slate-900 light:border-slate-200/60 leading-relaxed text-slate-300 light:text-slate-700 space-y-4">
            <p className="text-base md:text-lg">
              This KEYbooks application was created to explore modern solutions for traditional desktop accounting requirements. By implementing standard double-entry rules and database relationships, the project demonstrates how keyboard-driven workflows can run efficiently inside web architectures.
            </p>
            <p className="text-base md:text-lg">
              Focus is placed on transactional consistency (using locking locks and database transactions) and mathematical accuracy for valuations (like FIFO matching on stock bins).
            </p>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="bg-[#020617]/45 light:bg-[#f1f5f9]/45 border-t border-[#0b1528]/45 light:border-slate-200 py-24 scroll-mt-20 relative">
        <div className="absolute bottom-0 left-0 w-80 h-80 pointer-events-none opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
            <circle cx="20" cy="80" r="30" stroke="#ef4444" strokeWidth="2" />
            <path d="M20 80 L50 40 L80 10" stroke="#0ea5e9" strokeWidth="2" />
            <path d="M80 10 L60 10 L80 30 Z" fill="#0ea5e9" />
          </svg>
        </div>

        <div className="max-w-4xl mx-auto px-6 z-10 relative">
          <div className="space-y-6">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="border-[#0b1528] light:border-slate-300 border-slate-800 light:border-slate-200/80 last:border-[#0b1528] light:border-slate-300 pb-4 transition-all"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full py-4 flex items-center justify-between text-left text-white light:text-slate-900 light:text-slate-900 hover:text-brand-red group transition-colors duration-200"
                  >
                    <span className="text-lg md:text-xl font-medium pr-8">
                      {faq.question}
                    </span>
                    <span className="p-1 rounded-full bg-slate-900 light:bg-slate-200/80 group-hover:bg-slate-800 text-slate-400 light:text-slate-600 group-hover:text-brand-red transition-all shrink-0">
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </span>
                  </button>

                  <div
                    className={`grid transition-all duration-300 ease-in-out ${
                      isOpen ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="text-slate-400 light:text-slate-600 text-sm md:text-base leading-relaxed pr-8 pb-4">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-16 flex justify-center">
            <Link
              href="/login"
              className="group px-8 py-3.5 flex items-center gap-2 rounded-full font-bold text-brand-navy-dark bg-brand-red hover:bg-white transition-all duration-300 shadow-xl shadow-brand-red/10"
            >
              Launch Application
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* CONTACT / FOOTER SECTION */}
      <footer id="contacts" className="bg-[#0b1528]/10 light:bg-slate-200/40 border-t border-[#0b1528]/40 light:border-slate-200 py-16 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white light:text-slate-900 tracking-wide">
                KEY
              </span>
              <span className="px-2 py-0.5 text-xs font-extrabold bg-brand-red text-brand-navy-dark rounded font-mono">
                books
              </span>
            </div>
            <p className="text-sm text-slate-400 light:text-slate-600 max-w-sm leading-relaxed">
              Keyboard-first accounting and stock inventory register built as an academic simulation project.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-extrabold uppercase tracking-widest text-slate-200 light:text-slate-800">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm text-slate-400 light:text-slate-600">
              <li>
                <Link href="#features" className="hover:text-brand-red transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#roadmap" className="hover:text-brand-red transition-colors">
                  Roadmap
                </Link>
              </li>
              <li>
                <Link href="#about" className="hover:text-brand-red transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="#faq" className="hover:text-brand-red transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-extrabold uppercase tracking-widest text-slate-200 light:text-slate-800">
              Project Codebase
            </h4>
            <ul className="space-y-2 text-sm text-slate-400 light:text-slate-600">
              <li>
                <a
                  href="https://github.com/antrasharma15/KEYbooks"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-brand-red transition-colors"
                >
                  GitHub Repository
                </a>
              </li>
              <li>Developer: Antra Sharma</li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-slate-900 light:border-slate-200/60 text-center text-xs text-slate-500 light:text-slate-500">
          <p>© {new Date().getFullYear()} KEYbooks. Internship Capstone Project.</p>
        </div>
      </footer>
    </div>
  );
}
