import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Display: distinctive, slightly condensed grotesque for headings and figures.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

// UI text: humanist sans with real character, wide weight range.
const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  display: "swap",
});

// Amounts, codes, keycaps — tabular figures matter in an accounting app.
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "KEYbooks | Ultimate Business Accounting & Inventory Management",
  description:
    "Unify your accounting ledgers, purchase and sales vouchers, stock inventory levels, and real-time GST reports under a keyboard-first, Tally-inspired cloud interface.",
};

import { ShortcutProvider } from "./context/ShortcutContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${instrument.variable} ${jetbrains.variable} h-full antialiased`}
      // Next 16 no longer overrides `scroll-behavior: smooth` during route
      // transitions. Without this, every Alt+key navigation smooth-scrolls to
      // the top instead of jumping — unacceptable in a keyboard-driven ERP.
      // The attribute restores the instant jump while keeping in-page
      // scrollIntoView({ behavior: "smooth" }) for keyboard row navigation.
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('theme');
                  if (saved === 'light') {
                    document.documentElement.classList.add('light');
                  } else {
                    document.documentElement.classList.remove('light');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ShortcutProvider>{children}</ShortcutProvider>
      </body>
    </html>
  );
}
