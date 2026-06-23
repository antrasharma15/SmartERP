"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Layers,
  BarChart3,
  TrendingUp,
  Cloud,
  MousePointer,
  Mail,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Menu,
  X,
  Lock,
  CheckCircle,
  HelpCircle
} from "lucide-react";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(5); // Keep the last one open by default as in the screenshot

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const features = [
    {
      title: "Integrated Business Processes",
      tagline: "Seamless Integration Across All Business Functions",
      description:
        "Unify your finance, sales, supply chain, and HR processes under one robust system. My Smart ERP facilitates seamless data flow and coordination across departments, enhancing efficiency and decision-making.",
      icon: <Layers className="w-8 h-8 text-brand-lime" />
    },
    {
      title: "Real-time Analytics",
      tagline: "Make Informed Decisions with Real-Time Data",
      description:
        "Gain instant insights with live analytics and reporting features. My Smart ERP empowers you with real-time data to drive strategic decisions and stay ahead of market trends.",
      icon: <BarChart3 className="w-8 h-8 text-brand-lime" />
    },
    {
      title: "Scalability",
      tagline: "Grow Your Business with Scalable Solutions",
      description:
        "Whether you're a small startup or a large enterprise, My Smart ERP scales with your business. Effortlessly adapt to changing market demands and expand your capabilities with our scalable platform.",
      icon: <TrendingUp className="w-8 h-8 text-brand-lime" />
    },
    {
      title: "Cloud Technology",
      tagline: "Embrace the Cloud for Global Accessibility",
      description:
        "Access critical business functionalities anytime, anywhere with our cloud-based ERP system. Enjoy the flexibility and security of cloud technology, ensuring business continuity and remote access.",
      icon: <Cloud className="w-8 h-8 text-brand-lime" />
    },
    {
      title: "User-Friendly Interface",
      tagline: "Navigate with Ease Using Our Intuitive Interface",
      description:
        "My Smart ERP's user-friendly interface is designed for simplicity and efficiency. Enjoy a smooth user experience with customizable dashboards and easy-to-use features.",
      icon: <MousePointer className="w-8 h-8 text-brand-lime" />
    },
    {
      title: "Email Service Integration",
      tagline: "Streamlined Email Communication within Your ERP",
      description:
        "Enhance your communication capabilities with integrated email services. My Smart ERP allows you to send, receive, and manage emails directly within the platform. Stay connected with your team and clients seamlessly, ensuring effective communication and collaboration.",
      icon: <Mail className="w-8 h-8 text-brand-lime" />
    }
  ];

  const faqs = [
    {
      question: "What makes My Smart ERP different from other ERP systems?",
      answer:
        "My Smart ERP offers a unique blend of Tally-inspired, keyboard-first navigation combined with modern web technology, live analytics, role-based controls, and seamless cloud deployments."
    },
    {
      question: "Can My Smart ERP be customized to fit my business needs?",
      answer:
        "Yes! Our system allows you to define custom ledgers, groups, stock item configurations, and reports tailored to your specific workflows and industrial requirements."
    },
    {
      question: "How does My Smart ERP support decision-making?",
      answer:
        "By offering instant reports including Balance Sheet, Profit & Loss, Trial Balance, and GST Registers directly powered by live double-entry voucher transactions."
    },
    {
      question: "Is My Smart ERP suitable for small businesses?",
      answer:
        "Absolutely. We offer light setups for startups up to robust structures for larger companies, allowing up to 5 concurrent companies managed easily within a single account."
    },
    {
      question: "What kind of support can I expect with My Smart ERP?",
      answer:
        "Our clients receive 24/7 technical assistance, continuous security updates, standard system guides, and immediate developer support."
    },
    {
      question: "How secure is My Smart ERP?",
      answer:
        "Security is a top priority for us. My Smart ERP uses advanced encryption and security protocols to protect your data. We continuously update our system to tackle the latest security challenges, ensuring your business information stays safe."
    }
  ];

  return (
    <div className="relative min-h-screen bg-brand-navy-dark overflow-x-hidden select-none">
      {/* Decorative growth vectors in background */}
      <div className="absolute top-0 right-0 w-full h-[800px] pointer-events-none opacity-20 lg:opacity-40">
        <svg
          className="absolute right-0 top-0 w-full max-w-[800px] h-full"
          viewBox="0 0 800 800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Main growth arrow 1 */}
          <path
            d="M500 700 C 500 500, 600 300, 750 180"
            stroke="#38bdf8"
            strokeWidth="4"
            strokeDasharray="8 8"
          />
          {/* Main growth arrow 2 */}
          <path
            d="M300 750 C 350 450, 550 250, 700 100"
            stroke="#0ea5e9"
            strokeWidth="5"
          />
          {/* Main growth arrow 3 (touchpoint) */}
          <path
            d="M100 800 C 200 550, 450 350, 780 200"
            stroke="#bef264"
            strokeWidth="6"
          />
          {/* Arrow heads */}
          <path d="M 750 180 L 730 180 L 745 200 Z" fill="#38bdf8" />
          <path d="M 700 100 L 680 110 L 690 85 Z" fill="#0ea5e9" />
          <path d="M 780 200 L 760 215 L 775 180 Z" fill="#bef264" />

          {/* Abstract Hand Outline / Nodes */}
          <circle cx="280" cy="580" r="10" fill="#0ea5e9" className="animate-pulse" />
          <circle cx="430" cy="400" r="12" fill="#bef264" className="animate-ping [animation-duration:3s]" />
          <circle cx="430" cy="400" r="8" fill="#bef264" />
          <circle cx="580" cy="270" r="15" fill="#38bdf8" className="opacity-75" />
        </svg>
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-brand-navy-dark/75 border-b border-brand-navy-light/40 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            {/* Logo Icon */}
            <div className="flex flex-col gap-1 w-8 h-8 justify-center">
              <span className="w-8 h-1 bg-white rounded-full transition-transform group-hover:translate-x-1"></span>
              <span className="w-6 h-1 bg-brand-lime rounded-full transition-transform group-hover:translate-x-2"></span>
              <span className="w-7 h-1 bg-sky-400 rounded-full transition-transform group-hover:translate-x-1.5"></span>
            </div>
            {/* Logo text */}
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white tracking-wide">
                My smart
              </span>
              <span className="px-2 py-0.5 text-xs font-extrabold bg-brand-lime text-brand-navy-dark rounded font-mono">
                ERP
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <Link
              href="#features"
              className="hover:text-brand-lime transition-colors duration-200"
            >
              Features
            </Link>
            <Link
              href="#about"
              className="hover:text-brand-lime transition-colors duration-200"
            >
              About Us
            </Link>
            <Link
              href="#faq"
              className="hover:text-brand-lime transition-colors duration-200"
            >
              FAQ
            </Link>
            <Link
              href="#contacts"
              className="hover:text-brand-lime transition-colors duration-200"
            >
              Contacts
            </Link>
          </nav>

          {/* Action buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="px-5 py-2 text-sm font-semibold rounded-full bg-brand-navy-accent border border-brand-navy-light text-slate-200 hover:text-white hover:bg-brand-navy-light hover:border-brand-lime/50 transition-all duration-300 shadow-lg shadow-brand-navy-dark/50"
            >
              Request a Free Demo
            </Link>
          </div>

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-300 hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-brand-navy-dark/95 backdrop-blur-xl flex flex-col justify-center px-8 md:hidden transition-all duration-300">
          <nav className="flex flex-col gap-6 text-2xl font-bold text-slate-100 mb-12">
            <Link
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-brand-lime transition-colors"
            >
              Features
            </Link>
            <Link
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-brand-lime transition-colors"
            >
              About Us
            </Link>
            <Link
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-brand-lime transition-colors"
            >
              FAQ
            </Link>
            <Link
              href="#contacts"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-brand-lime transition-colors"
            >
              Contacts
            </Link>
          </nav>
          <div className="flex flex-col gap-4">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-3.5 text-center font-bold text-brand-navy-dark bg-brand-lime rounded-full hover:bg-white transition-all shadow-lg"
            >
              Request a Free Demo
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-3.5 text-center font-bold text-slate-300 border border-slate-700 rounded-full hover:text-white transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>
      )}

      {/* HERO SECTION */}
      <section className="relative max-w-7xl mx-auto px-6 pt-16 pb-24 md:pt-28 md:pb-36 flex flex-col items-start justify-center min-h-[calc(100vh-80px)]">
        <div className="max-w-3xl space-y-8 z-10">
          <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.1] animate-fade-in">
            Revolutionize Your Business with <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-sky-300">
              My Smart ERP
            </span>
          </h1>

          <h2 className="text-xl md:text-2xl font-semibold text-sky-400/90 tracking-wide">
            Integrating Innovation and Efficiency into Every Aspect of Your Operations
          </h2>

          <p className="text-slate-400 text-base md:text-lg leading-relaxed max-w-2xl">
            Unlock the full potential of your business with My Smart ERP – the ultimate
            solution for seamless management, insightful analytics, and unparalleled
            scalability. Streamline your processes, reduce costs, and foster growth in a
            smart, connected world.
          </p>

          <div className="flex flex-wrap items-center gap-5 pt-4">
            <Link
              href="/login"
              className="group px-8 py-3.5 flex items-center gap-2 rounded-full font-bold text-brand-navy-dark bg-brand-lime hover:bg-white transition-all duration-300 shadow-xl shadow-brand-lime/10 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Request a Free Demo
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              href="#features"
              className="px-8 py-3.5 rounded-full font-bold text-slate-300 bg-brand-navy-light/60 hover:bg-brand-navy-light hover:text-white border border-slate-800 hover:border-slate-600 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Learn more
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="bg-brand-navy-dark/45 border-t border-b border-brand-navy-light/45 py-24 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
              Features
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="group p-6 rounded-2xl bg-brand-navy-light/20 hover:bg-brand-navy-light/40 border border-slate-900 hover:border-slate-800 transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="mb-6 p-3 w-14 h-14 flex items-center justify-center rounded-xl bg-brand-navy-accent/50 border border-brand-navy-light group-hover:border-brand-lime/30 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-brand-lime transition-colors">
                  {feature.title}
                </h3>
                <h4 className="text-sm font-semibold text-sky-400 mb-4 leading-snug">
                  {feature.tagline}
                </h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT US SECTION */}
      <section id="about" className="py-24 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column */}
          <div className="lg:col-span-5 space-y-6">
            <span className="text-sm font-extrabold uppercase tracking-widest text-brand-lime">
              About Us
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Empowering Your Business with Innovative Solutions
            </h2>
            <div className="pt-4">
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-brand-navy-dark bg-brand-lime hover:bg-white transition-all duration-300 shadow-xl shadow-brand-lime/10"
              >
                Join
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-7 p-8 rounded-3xl bg-gradient-to-br from-brand-navy-light/20 to-brand-navy-accent/15 border border-slate-900/60 leading-relaxed text-slate-300 space-y-4">
            <p className="text-base md:text-lg">
              At My Smart ERP, we are committed to redefining business management through
              innovation and technology. Our journey began with a vision to create a
              versatile ERP system that not only streamlines operations but also empowers
              businesses to stay agile in a dynamic market landscape.
            </p>
            <p className="text-base md:text-lg">
              With a team of experts in technology, business management, and customer
              service, we have developed a solution that is intuitive, efficient, and
              scalable. Our focus is on delivering a product that caters to the unique
              needs of each business, fostering growth and operational excellence.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="bg-brand-navy-dark/45 border-t border-brand-navy-light/45 py-24 scroll-mt-20 relative">
        {/* Growth graphic left background */}
        <div className="absolute bottom-0 left-0 w-80 h-80 pointer-events-none opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
            <circle cx="20" cy="80" r="30" stroke="#bef264" strokeWidth="2" />
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
                  className="border-b border-slate-800/80 last:border-0 pb-4 transition-all"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full py-4 flex items-center justify-between text-left text-white hover:text-brand-lime group transition-colors duration-200"
                  >
                    <span className="text-lg md:text-xl font-medium pr-8">
                      {faq.question}
                    </span>
                    <span className="p-1 rounded-full bg-slate-900 group-hover:bg-slate-800 text-slate-400 group-hover:text-brand-lime transition-all shrink-0">
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
                      <p className="text-slate-400 text-sm md:text-base leading-relaxed pr-8 pb-4">
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
              className="group px-8 py-3.5 flex items-center gap-2 rounded-full font-bold text-brand-navy-dark bg-brand-lime hover:bg-white transition-all duration-300 shadow-xl shadow-brand-lime/10"
            >
              Request a Free Demo
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* CONTACT / FOOTER SECTION */}
      <footer id="contacts" className="bg-brand-navy-light/10 border-t border-brand-navy-light/40 py-16 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Col 1 */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white tracking-wide">
                My smart
              </span>
              <span className="px-2 py-0.5 text-xs font-extrabold bg-brand-lime text-brand-navy-dark rounded font-mono">
                ERP
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Unlock scaling limits and simplify management for small retail outlets, large scale whole sellers, and medical setups using a keyboard-first flow.
            </p>
          </div>

          {/* Col 2 */}
          <div className="space-y-4">
            <h4 className="text-sm font-extrabold uppercase tracking-widest text-slate-200">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link href="#features" className="hover:text-brand-lime transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#about" className="hover:text-brand-lime transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="#faq" className="hover:text-brand-lime transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-4">
            <h4 className="text-sm font-extrabold uppercase tracking-widest text-slate-200">
              Contacts
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>Email: info@mysmarterp.com</li>
              <li>Phone: +1 (555) 234-5678</li>
              <li>Address: Silicon Valley, CA</li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-slate-900/60 text-center text-xs text-slate-500 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} My Smart ERP. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-brand-lime transition-colors">
              Terms of Service
            </Link>
            <Link href="/login" className="hover:text-brand-lime transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
