import React from "react";
import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  href?: string;
  className?: string;
}

export default function Logo({
  size = "md",
  showText = true,
  href = "/",
  className = "",
}: LogoProps) {
  const iconSizes = {
    sm: "w-7 h-7",
    md: "w-8 h-8",
    lg: "w-10 h-10",
    xl: "w-12 h-12",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl",
  };

  const badgeSizes = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-0.5",
    lg: "text-sm px-2.5 py-0.5",
    xl: "text-base px-3 py-1",
  };

  const content = (
    <div className={`flex items-center gap-2.5 group select-none ${className}`}>
      {/* Modern Geometric Key + Book Ledger Icon */}
      <div className={`relative flex items-center justify-center shrink-0 ${iconSizes[size]}`}>
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-red to-rose-500 rounded-xl opacity-20 blur-sm group-hover:opacity-40 transition-opacity duration-300"></div>
        <div className="relative w-full h-full bg-[#0b1528] light:bg-slate-900 border border-slate-700/60 light:border-slate-800 rounded-xl p-1.5 flex flex-col justify-between shadow-md shadow-black/20 group-hover:border-brand-red/60 transition-colors duration-300">
          <div className="flex items-center gap-1">
            <span className="w-full h-1 bg-white rounded-full transition-transform duration-300 group-hover:translate-x-0.5"></span>
            <span className="w-2 h-1 bg-sky-400 rounded-full"></span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3/4 h-1 bg-brand-red rounded-full transition-transform duration-300 group-hover:translate-x-1"></span>
            <span className="w-1.5 h-1 bg-white/70 rounded-full"></span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-full h-1 bg-sky-400 rounded-full transition-transform duration-300 group-hover:translate-x-0.5"></span>
          </div>
        </div>
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="flex items-center gap-1.5 tracking-tight font-sans">
          <span className={`font-extrabold text-white light:text-slate-900 tracking-wide ${textSizes[size]}`}>
            KEY
          </span>
          <span
            className={`font-mono font-black bg-brand-red text-white rounded-md uppercase tracking-wider shadow-sm shadow-red-500/30 ${badgeSizes[size]}`}
          >
            books
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
