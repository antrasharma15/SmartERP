"use client";

import Loader from "../components/Loader";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getCurrentUser } from "../utils/api";
import AppLayout from "../components/AppLayout";
import Logo from "../components/Logo";
import {
  Building2,
  Calendar,
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  ArrowLeft,
  X,
  Loader2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Package,
  Layers,
  Scale,
  Download
} from "lucide-react";
import { exportToCsv } from "../utils/exportCsv";

interface StockItem {
  id: string;
  company_id: string;
  stock_group_id: string | null;
  unit_id: string | null;
  name: string;
  sku: string | null;
  purchase_price: number;
  selling_price: number;
  gst_percentage: number;
  quantity: number;
  reorder_level: number;
  group_name?: string;
  unit_symbol?: string;
}

interface StockGroup {
  id: string;
  company_id: string;
  name: string;
  parent_id: string | null;
  parent_name?: string;
}

interface Unit {
  id: string;
  company_id: string;
  name: string;
  symbol: string;
}

type TabType = "items" | "groups" | "units";

export default function InventoryDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);

  // Currency State
  const [currency, setCurrency] = useState("₹");

  // Synchronize currency when changed globally
  useEffect(() => {
    const updateCurrency = () => {
      const activeCompanyStr = localStorage.getItem("activeCompany");
      if (activeCompanyStr) {
        try {
          const comp = JSON.parse(activeCompanyStr);
          setCurrency(comp.currency || "₹");
          setCompany(comp);
        } catch (e) {}
      }
    };
    updateCurrency();
    window.addEventListener("activeCompanyChanged", updateCurrency);
    return () => window.removeEventListener("activeCompanyChanged", updateCurrency);
  }, []);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>("items");

  // Read active tab parameter from URL on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "items" || tabParam === "groups" || tabParam === "units") {
        setActiveTab(tabParam as TabType);
      }
    }
  }, []);

  // Data lists
  const [items, setItems] = useState<StockItem[]>([]);
  const [groups, setGroups] = useState<StockGroup[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  
  // Page load state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Navigation states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Modal forms states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [modalType, setModalType] = useState<"item" | "group" | "unit">("item");

  // Form Fields: Item
  const [itemFields, setItemFields] = useState({
    id: "",
    name: "",
    sku: "",
    stock_group_id: "",
    unit_id: "",
    purchase_price: 0,
    selling_price: 0,
    gst_percentage: 0,
    quantity: 0,
    reorder_level: 0
  });

  // Form Fields: Group
  const [groupFields, setGroupFields] = useState({
    id: "",
    name: "",
    parent_id: ""
  });

  // Form Fields: Unit
  const [unitFields, setUnitFields] = useState({
    id: "",
    name: "",
    symbol: ""
  });

  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

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

  // Auth and company verification on mount
  useEffect(() => {
    console.log("[InventoryPage] Checking session auth...");
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

    try {
      const activeCompany = JSON.parse(activeCompanyStr);
      setCompany(activeCompany);
      fetchInventoryData(activeCompany.id);
    } catch (err) {
      console.error("[InventoryPage Parse Error] Failed to retrieve company details:", err);
      localStorage.removeItem("activeCompany");
      router.push("/companies");
    }
  }, [router]);

  // Fetch all inventory resources in parallel
  const fetchInventoryData = async (companyId: string) => {
    setLoading(true);
    setError("");
    console.log(`[InventoryPage] Loading stock items, groups, and units for company: ${companyId}`);
    try {
      const [itemsData, groupsData, unitsData] = await Promise.all([
        apiFetch(`/stock-items?company_id=${companyId}`),
        apiFetch(`/stock-groups?company_id=${companyId}`),
        apiFetch(`/units?company_id=${companyId}`)
      ]);

      setItems(itemsData.items || []);
      setGroups(groupsData.groups || []);
      setUnits(unitsData.units || []);

      console.log(`[InventoryPage] Load complete. Items: ${itemsData.items?.length}, Groups: ${groupsData.groups?.length}, Units: ${unitsData.units?.length}`);
    } catch (err: any) {
      console.error("[InventoryPage Error] Failed to load inventory resources:", err);
      setError(err.message || "Failed to load inventory assets");
    } finally {
      setLoading(false);
    }
  };

  // Filter items, groups, or units based on query
  const getFilteredList = () => {
    const query = searchQuery.toLowerCase().trim();
    if (activeTab === "items") {
      return items.filter(
        i =>
          i.name.toLowerCase().includes(query) ||
          (i.sku && i.sku.toLowerCase().includes(query)) ||
          (i.group_name && i.group_name.toLowerCase().includes(query))
      );
    } else if (activeTab === "groups") {
      return groups.filter(
        g =>
          g.name.toLowerCase().includes(query) ||
          (g.parent_name && g.parent_name.toLowerCase().includes(query))
      );
    } else {
      return units.filter(
        u =>
          u.name.toLowerCase().includes(query) ||
          u.symbol.toLowerCase().includes(query)
      );
    }
  };

  const filteredList = getFilteredList();

  // Pagination states
  const ITEMS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when tab or search changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedRowIndex(0);
  }, [activeTab, searchQuery]);

  const totalPages = Math.ceil(filteredList.length / ITEMS_PER_PAGE) || 1;
  const paginatedList = filteredList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset row selection when list changes
  useEffect(() => {
    if (selectedRowIndex >= paginatedList.length && paginatedList.length > 0) {
      setSelectedRowIndex(paginatedList.length - 1);
    }
  }, [paginatedList.length, selectedRowIndex]);

  // Global Keyboard listener hook
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTypingInInput = 
        document.activeElement?.tagName === "INPUT" || 
        document.activeElement?.tagName === "SELECT" || 
        document.activeElement?.tagName === "TEXTAREA";

      // 1. Modals input handling
      if (isTypingInInput && isModalOpen) {
        if (e.key === "Escape") {
          e.preventDefault();
          setIsModalOpen(false);
          setFormError("");
        }
        return;
      }

      // Block defaults
      if (e.ctrlKey && ["f", "F", "n", "N", "e", "E", "d", "D", "s", "S", "u", "U", "g", "G"].includes(e.key)) {
        e.preventDefault();
      }
      if (e.altKey && ["s", "S", "g", "G", "u", "U", "a", "A", "n", "N"].includes(e.key)) {
        e.preventDefault();
      }

      // Escape
      if (e.key === "Escape") {
        e.preventDefault();
        if (isModalOpen) {
          setIsModalOpen(false);
          setFormError("");
        } else {
          router.push("/dashboard");
        }
        return;
      }

      // Tab switcher (only when not typing in input and modal is closed)
      if (!isModalOpen && !isTypingInInput && e.key === "Tab") {
        e.preventDefault();
        const tabs: TabType[] = ["items", "groups", "units"];
        const nextIdx = (tabs.indexOf(activeTab) + (e.shiftKey ? -1 : 1) + tabs.length) % tabs.length;
        setActiveTab(tabs[nextIdx]);
        triggerToast(`Switched Tab to: ${tabs[nextIdx].toUpperCase()}`);
        return;
      }

      // CTRL + F Focus search
      if (e.ctrlKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // ALT + S or CTRL + N (New Item)
      if ((e.altKey && (e.key === "s" || e.key === "S")) || (e.ctrlKey && (e.key === "n" || e.key === "N"))) {
        e.preventDefault();
        handleOpenCreateModal("item");
        return;
      }

      // ALT + G (New Group)
      if (e.altKey && (e.key === "g" || e.key === "G")) {
        e.preventDefault();
        handleOpenCreateModal("group");
        return;
      }

      // ALT + U (New Unit)
      if (e.altKey && (e.key === "u" || e.key === "U")) {
        e.preventDefault();
        handleOpenCreateModal("unit");
        return;
      }

      // ALT + A or Enter (Alter highlighted item)
      if ((e.altKey && (e.key === "a" || e.key === "A")) || (!isModalOpen && !isTypingInInput && e.key === "Enter")) {
        e.preventDefault();
        const selectedRow = paginatedList[selectedRowIndex];
        if (selectedRow) {
          handleOpenEditModal(activeTab, selectedRow);
        } else {
          triggerToast("No item selected to alter.");
        }
        return;
      }

      // Delete / CTRL + D (Delete highlighted)
      if (!isModalOpen && !isTypingInInput && (e.key === "Delete" || (e.ctrlKey && (e.key === "d" || e.key === "D")))) {
        e.preventDefault();
        const selectedRow = paginatedList[selectedRowIndex];
        if (selectedRow) {
          handleDeleteRow(activeTab, selectedRow);
        }
        return;
      }

      // Arrow navigation
      if (!isModalOpen && !isTypingInInput && paginatedList.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedRowIndex(prev => (prev + 1) % paginatedList.length);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedRowIndex(prev => (prev - 1 + paginatedList.length) % paginatedList.length);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, activeTab, paginatedList, selectedRowIndex, router]);

  // Open Create Modals
  const handleOpenCreateModal = (type: "item" | "group" | "unit") => {
    setModalType(type);
    setModalMode("create");
    setFormError("");

    if (type === "item") {
      setItemFields({
        id: "",
        name: "",
        sku: "",
        stock_group_id: groups.length > 0 ? groups[0].id : "",
        unit_id: units.length > 0 ? units[0].id : "",
        purchase_price: 0,
        selling_price: 0,
        gst_percentage: 18, // default 18% standard GST
        quantity: 0,
        reorder_level: 5
      });
    } else if (type === "group") {
      setGroupFields({
        id: "",
        name: "",
        parent_id: ""
      });
    } else {
      setUnitFields({
        id: "",
        name: "",
        symbol: ""
      });
    }
    setIsModalOpen(true);
  };

  // Open Alter Modals
  const handleOpenEditModal = (type: "items" | "groups" | "units", row: any) => {
    setFormError("");
    if (type === "items") {
      setModalType("item");
      setModalMode("edit");
      setItemFields({
        id: row.id,
        name: row.name,
        sku: row.sku || "",
        stock_group_id: row.stock_group_id || "",
        unit_id: row.unit_id || "",
        purchase_price: Number(row.purchase_price),
        selling_price: Number(row.selling_price),
        gst_percentage: Number(row.gst_percentage),
        quantity: Number(row.quantity),
        reorder_level: Number(row.reorder_level)
      });
    } else if (type === "groups") {
      setModalType("group");
      setModalMode("edit");
      setGroupFields({
        id: row.id,
        name: row.name,
        parent_id: row.parent_id || ""
      });
    } else {
      setModalType("unit");
      setModalMode("edit");
      setUnitFields({
        id: row.id,
        name: row.name,
        symbol: row.symbol
      });
    }
    setIsModalOpen(true);
  };

  // Handle Form submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    let path = "";
    let method = modalMode === "create" ? "POST" : "PUT";
    let bodyPayload: any = {};
    let resourceName = "";

    if (modalType === "item") {
      path = modalMode === "create" ? "/stock-items" : `/stock-items/${itemFields.id}`;
      bodyPayload = {
        company_id: company.id,
        name: itemFields.name.trim(),
        sku: itemFields.sku.trim() || null,
        stock_group_id: itemFields.stock_group_id || null,
        unit_id: itemFields.unit_id || null,
        purchase_price: Number(itemFields.purchase_price),
        selling_price: Number(itemFields.selling_price),
        gst_percentage: Number(itemFields.gst_percentage),
        quantity: Number(itemFields.quantity),
        reorder_level: Number(itemFields.reorder_level)
      };
      resourceName = itemFields.name;
    } else if (modalType === "group") {
      path = modalMode === "create" ? "/stock-groups" : `/stock-groups/${groupFields.id}`;
      bodyPayload = {
        company_id: company.id,
        name: groupFields.name.trim(),
        parent_id: groupFields.parent_id || null
      };
      resourceName = groupFields.name;
    } else {
      path = modalMode === "create" ? "/units" : `/units/${unitFields.id}`;
      bodyPayload = {
        company_id: company.id,
        name: unitFields.name.trim(),
        symbol: unitFields.symbol.trim()
      };
      resourceName = unitFields.symbol;
    }

    console.log(`[InventoryPage] Form submit requested. Type: ${modalType}, Mode: ${modalMode}. Payload:`, bodyPayload);

    try {
      const response = await apiFetch(path, {
        method,
        body: JSON.stringify(bodyPayload)
      });
      console.log(`[InventoryPage] API execution success:`, response);
      triggerToast(`Resource "${resourceName}" saved successfully.`);
      setIsModalOpen(false);
      fetchInventoryData(company.id);
    } catch (err: any) {
      console.error(`[InventoryPage Error] Transaction failed:`, err);
      setFormError(err.message || "Save operation failed. Please check inputs.");
    } finally {
      setFormLoading(false);
    }
  };

  // Delete resources
  const handleDeleteRow = async (type: "items" | "groups" | "units", row: any) => {
    if (!confirm(`Are you sure you want to delete "${row.name || row.symbol}"?`)) {
      return;
    }

    let path = "";
    if (type === "items") path = `/stock-items/${row.id}`;
    else if (type === "groups") path = `/stock-groups/${row.id}`;
    else path = `/units/${row.id}`;

    console.log(`[InventoryPage] Requesting delete. Type: ${type}, ID: ${row.id}`);

    try {
      const response = await apiFetch(path, { method: "DELETE" });
      console.log(`[InventoryPage] Deletion success:`, response);
      triggerToast(`Deleted successfully.`);
      fetchInventoryData(company.id);
    } catch (err: any) {
      console.error(`[InventoryPage Error] Deletion failed:`, err);
      triggerToast(`Error: ${err.message || "Deletion failed"}`);
    }
  };

  // Calculate statistics
  const getInventoryStats = () => {
    let totalStockValue = 0;
    let lowStockCount = 0;
    let taxWarningCount = 0;

    items.forEach(i => {
      const qty = Number(i.quantity) || 0;
      const price = Number(i.purchase_price) || 0;
      totalStockValue += qty * price;

      if (qty <= (Number(i.reorder_level) || 0)) {
        lowStockCount++;
      }
      if ((Number(i.gst_percentage) || 0) === 0) {
        taxWarningCount++;
      }
    });

    return {
      totalStockValue,
      lowStockCount,
      taxWarningCount
    };
  };

  const stats = getInventoryStats();

  const handleExportCsv = () => {
    if (activeTab === "items") {
      const headers = [
        "Item Name",
        "SKU",
        "Stock Group",
        "Unit",
        `Cost Price (${company?.currency || "₹"})`,
        `Selling Price (${company?.currency || "₹"})`,
        "GST %",
        "Quantity",
        "Reorder Level"
      ];
      const rows = items.map(i => [
        i.name,
        i.sku || "-",
        i.group_name || "Primary",
        i.unit_symbol || "PCS",
        Number(i.purchase_price).toFixed(2),
        Number(i.selling_price).toFixed(2),
        `${i.gst_percentage || 0}%`,
        i.quantity,
        i.reorder_level
      ]);
      exportToCsv("Stock_Items_Catalog", headers, rows);
    } else if (activeTab === "groups") {
      const headers = ["Group Name", "Parent Group"];
      const rows = groups.map(g => [g.name, g.parent_name || "PRIMARY"]);
      exportToCsv("Stock_Groups_Catalog", headers, rows);
    } else {
      const headers = ["Unit Name", "Symbol"];
      const rows = units.map(u => [u.name, u.symbol]);
      exportToCsv("Stock_Units_Catalog", headers, rows);
    }
  };

  return (
    <AppLayout
      pageTitle="Inventory & Stock Management"
      pageSubtitle="Maintain stock items catalog, groups categories, units of measure, pricing lists, and tax rules."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Inventory list & tab managers - 9 span */}
        <section className="lg:col-span-8 xl:col-span-9 rounded-3xl bg-[#0b1528]/50 light:bg-white border border-slate-800/80 light:border-slate-200 p-6 shadow-xl backdrop-blur-xl space-y-6">
          
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 light:border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-extrabold text-white light:text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-red-500" />
                Stock Directory
              </h2>
            </div>

            {/* Quick Create Buttons & CSV Export */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-slate-200 light:text-slate-800 bg-slate-800 light:bg-slate-100 border border-slate-700 light:border-slate-300 hover:bg-slate-700 transition duration-200 text-sm shadow-sm"
                title="Export Catalog to CSV"
              >
                <Download className="w-4 h-4 text-red-500" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => handleOpenCreateModal("item")}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-xl text-sm transition duration-200 shadow-sm"
              >
                + Item (Alt+S)
              </button>
              <button
                onClick={() => handleOpenCreateModal("group")}
                className="px-4 py-2 bg-slate-800 light:bg-slate-100 hover:bg-slate-700 border border-slate-700 light:border-slate-300 text-slate-200 light:text-slate-900 font-bold rounded-xl text-sm transition duration-200"
              >
                + Group (Alt+G)
              </button>
              <button
                onClick={() => handleOpenCreateModal("unit")}
                className="px-4 py-2 bg-slate-800 light:bg-slate-100 hover:bg-slate-700 border border-slate-700 light:border-slate-300 text-slate-200 light:text-slate-900 font-bold rounded-xl text-sm transition duration-200"
              >
                + Unit (Alt+U)
              </button>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-slate-800 light:border-slate-200 text-sm font-bold gap-1 pb-1">
            <button
              onClick={() => setActiveTab("items")}
              className={`px-5 py-2.5 rounded-xl flex items-center gap-2 transition ${
                activeTab === "items"
                  ? "bg-red-500/10 light:bg-red-50 text-red-500 light:text-red-600 border-b-2 border-red-500 font-bold"
                  : "text-slate-400 light:text-slate-600 hover:bg-slate-800/40 light:hover:bg-slate-100 hover:text-white light:hover:text-black"
              }`}
            >
              <Package className="w-4 h-4" />
              Stock Items ({items.length})
            </button>
            <button
              onClick={() => setActiveTab("groups")}
              className={`px-5 py-2.5 rounded-xl flex items-center gap-2 transition ${
                activeTab === "groups"
                  ? "bg-red-500/10 light:bg-red-50 text-red-500 light:text-red-600 border-b-2 border-red-500 font-bold"
                  : "text-slate-400 light:text-slate-600 hover:bg-slate-800/40 light:hover:bg-slate-100 hover:text-white light:hover:text-black"
              }`}
            >
              <Layers className="w-4 h-4" />
              Stock Groups ({groups.length})
            </button>
            <button
              onClick={() => setActiveTab("units")}
              className={`px-5 py-2.5 rounded-xl flex items-center gap-2 transition ${
                activeTab === "units"
                  ? "bg-red-500/10 light:bg-red-50 text-red-500 light:text-red-600 border-b-2 border-red-500 font-bold"
                  : "text-slate-400 light:text-slate-600 hover:bg-slate-800/40 light:hover:bg-slate-100 hover:text-white light:hover:text-black"
              }`}
            >
              <Scale className="w-4 h-4" />
              Units of Measure ({units.length})
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={`Search in ${activeTab}... (Press Ctrl+F to focus, Tab to swap tabs)`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-900/60 light:bg-white border border-slate-800 light:border-slate-300 rounded-2xl text-white light:text-slate-900 placeholder-slate-500 outline-none focus:border-red-500 transition text-sm font-semibold"
            />
          </div>

          {/* Grid lists */}
          {loading ? (
            <Loader kind="stock" label="Fetching inventory database" />
          ) : error ? (
            <div className="py-16 text-center space-y-3">
              <div className="inline-flex p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-slate-300 light:text-slate-700 text-sm">{error}</p>
              <button
                onClick={() => fetchInventoryData(company.id)}
                className="px-5 py-2 bg-brand-navy-light/40 border border-slate-800 light:border-slate-200 text-xs rounded-xl hover:text-white light:text-slate-900 light:hover:text-black"
              >
                Retry Request
              </button>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-24 border border-dashed border-slate-800 light:border-slate-200 rounded-3xl text-center">
              <p className="text-slate-500 light:text-slate-500 text-xs">No records found matching query filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-800 light:border-slate-200 rounded-2xl bg-slate-900/30 light:bg-white">
              {activeTab === "items" && (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 light:border-slate-200 bg-slate-950 light:bg-slate-100 text-slate-400 light:text-slate-600 uppercase font-black tracking-wider text-xs">
                      <th className="py-3.5 px-4">Item Name</th>
                      <th className="py-3.5 px-4">SKU</th>
                      <th className="py-3.5 px-4">Group</th>
                      <th className="py-3.5 px-4 text-right">Purchase Price</th>
                      <th className="py-3.5 px-4 text-right">Selling Price</th>
                      <th className="py-3.5 px-4 text-right">Tax (GST)</th>
                      <th className="py-3.5 px-4 text-right">Qty</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {paginatedList.map((item: any, idx) => {
                      const isSelected = selectedRowIndex === idx;
                      const isLowStock = Number(item.quantity) <= (Number(item.reorder_level) || 0);
                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedRowIndex(idx)}
                          onDoubleClick={() => handleOpenEditModal("items", item)}
                          className={`border-b border-slate-800/50 light:border-slate-100 transition ${
                            isSelected
                              ? "bg-red-500/10 light:bg-red-50 text-red-500 light:text-red-600 font-bold border-l-4 border-l-red-500"
                              : "text-slate-300 light:text-slate-700 hover:bg-slate-800/40 light:hover:bg-slate-100/60"
                          }`}
                        >
                          <td className="py-3.5 px-4 font-bold text-white light:text-slate-900">
                            <span className="flex items-center gap-1.5">
                              {isSelected && <ChevronRight className="w-4 h-4 text-red-500 shrink-0" />}
                              {item.name}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-400 light:text-slate-600">{item.sku || "N/A"}</td>
                          <td className="py-3.5 px-4 text-slate-400 light:text-slate-600 font-medium">{item.group_name || "Primary"}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold">{currency}{Number(item.purchase_price).toFixed(2)}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold">{currency}{Number(item.selling_price).toFixed(2)}</td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-400 light:text-slate-600 font-bold">{item.gst_percentage}%</td>
                          <td className="py-3.5 px-4 text-right font-mono">
                            <span className={`px-2.5 py-1 rounded text-xs font-black ${isLowStock ? "bg-red-500/10 text-red-400" : "text-white light:text-slate-900"}`}>
                              {item.quantity} {item.unit_symbol || "PCS"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button onClick={() => handleOpenEditModal("items", item)} className="p-2 bg-slate-800 light:bg-slate-100 rounded-lg border border-slate-700 light:border-slate-200 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-black transition" title="Edit Item"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteRow("items", item)} className="p-2 bg-slate-800 light:bg-slate-100 rounded-lg border border-slate-700 light:border-slate-200 text-slate-400 light:text-slate-600 hover:text-red-400 transition" title="Delete Item"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {activeTab === "groups" && (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 light:border-slate-200 bg-slate-950 light:bg-slate-100 text-slate-400 light:text-slate-600 uppercase font-black tracking-wider text-xs">
                      <th className="py-3.5 px-4">Stock Group Name</th>
                      <th className="py-3.5 px-4">Parent Group</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {paginatedList.map((group: any, idx) => {
                      const isSelected = selectedRowIndex === idx;
                      return (
                        <tr
                          key={group.id}
                          onClick={() => setSelectedRowIndex(idx)}
                          onDoubleClick={() => handleOpenEditModal("groups", group)}
                          className={`border-b border-slate-800/50 light:border-slate-100 transition ${
                            isSelected
                              ? "bg-red-500/10 light:bg-red-50 text-red-500 light:text-red-600 font-bold border-l-4 border-l-red-500"
                              : "text-slate-300 light:text-slate-700 hover:bg-slate-800/40 light:hover:bg-slate-100/60"
                          }`}
                        >
                          <td className="py-3.5 px-4 font-bold text-white light:text-slate-900">
                            <span className="flex items-center gap-1.5">
                              {isSelected && <ChevronRight className="w-4 h-4 text-red-500 shrink-0" />}
                              {group.name}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 light:text-slate-600 font-medium">{group.parent_name || "PRIMARY"}</td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button onClick={() => handleOpenEditModal("groups", group)} className="p-2 bg-slate-800 light:bg-slate-100 rounded-lg border border-slate-700 light:border-slate-200 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-black transition" title="Edit Group"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteRow("groups", group)} className="p-2 bg-slate-800 light:bg-slate-100 rounded-lg border border-slate-700 light:border-slate-200 text-slate-400 light:text-slate-600 hover:text-red-400 transition" title="Delete Group"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {activeTab === "units" && (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 light:border-slate-200 bg-slate-950 light:bg-slate-100 text-slate-400 light:text-slate-600 uppercase font-black tracking-wider text-xs">
                      <th className="py-3.5 px-4">Symbol</th>
                      <th className="py-3.5 px-4">Formal Name</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {paginatedList.map((unit: any, idx) => {
                      const isSelected = selectedRowIndex === idx;
                      return (
                        <tr
                          key={unit.id}
                          onClick={() => setSelectedRowIndex(idx)}
                          onDoubleClick={() => handleOpenEditModal("units", unit)}
                          className={`border-b border-slate-800/50 light:border-slate-100 transition ${
                            isSelected
                              ? "bg-red-500/10 light:bg-red-50 text-red-500 light:text-red-600 font-bold border-l-4 border-l-red-500"
                              : "text-slate-300 light:text-slate-700 hover:bg-slate-800/40 light:hover:bg-slate-100/60"
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-sky-400">
                            <span className="flex items-center gap-1.5">
                              {isSelected && <ChevronRight className="w-4 h-4 text-red-500 shrink-0" />}
                              {unit.symbol}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 light:text-slate-700 font-semibold">{unit.name}</td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button onClick={() => handleOpenEditModal("units", unit)} className="p-2 bg-slate-800 light:bg-slate-100 rounded-lg border border-slate-700 light:border-slate-200 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-black transition" title="Edit Unit"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteRow("units", unit)} className="p-2 bg-slate-800 light:bg-slate-100 rounded-lg border border-slate-700 light:border-slate-200 text-slate-400 light:text-slate-600 hover:text-red-400 transition" title="Delete Unit"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Pagination Toolbar */}
          {filteredList.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-800 light:border-slate-200 text-xs">
              <p className="text-slate-400 light:text-slate-600">
                Showing <span className="font-bold text-white light:text-slate-900">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{" "}
                <span className="font-bold text-white light:text-slate-900">{Math.min(currentPage * ITEMS_PER_PAGE, filteredList.length)}</span> of{" "}
                <span className="font-bold text-white light:text-slate-900">{filteredList.length}</span> records
              </p>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => { setCurrentPage(prev => Math.max(prev - 1, 1)); setSelectedRowIndex(0); }}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-white text-slate-300 light:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 light:hover:bg-slate-100 font-semibold"
                  >
                    Previous
                  </button>

                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5 && currentPage > 3) {
                      pageNum = currentPage - 3 + i + 1;
                      if (pageNum > totalPages) pageNum = totalPages - 4 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => { setCurrentPage(pageNum); setSelectedRowIndex(0); }}
                        className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center transition ${
                          currentPage === pageNum
                            ? "bg-red-600 text-white"
                            : "border border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-white text-slate-300 light:text-slate-700 hover:bg-slate-800 light:hover:bg-slate-100"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => { setCurrentPage(prev => Math.min(prev + 1, totalPages)); setSelectedRowIndex(0); }}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-white text-slate-300 light:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 light:hover:bg-slate-100 font-semibold"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Guide Legend */}
          <div className="flex justify-between items-center bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-200 p-3 rounded-2xl text-[10px] text-slate-400 light:text-slate-600 font-mono">
            <span>Use ↑↓ keys to select, Enter to edit, Tab to switch categories</span>
            <span>ALT+S = New Item | ALT+G = New Group | ALT+U = New Unit | ESC = Dashboard</span>
          </div>
        </section>

        {/* Right Column: Statistics Summary - 3 span */}
        <section className="lg:col-span-3 space-y-6">
          {/* Inventory Stats card */}
          <div className="rounded-3xl bg-slate-900/30 light:bg-white border border-slate-800 light:border-slate-200 p-5 shadow-xl backdrop-blur-xl space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-red-500 flex items-center gap-1.5 border-b border-slate-800 light:border-slate-200 pb-2">
              <TrendingUp className="w-4 h-4" />
              Stock Asset Summary
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/50 light:border-slate-100">
                <span className="text-slate-400 light:text-slate-600 font-bold">Total Items</span>
                <span className="font-bold text-white light:text-slate-900 font-mono">{items.length}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/50 light:border-slate-100">
                <span className="text-slate-400 light:text-slate-600 font-bold">Stock Groups</span>
                <span className="font-bold text-white light:text-slate-900 font-mono">{groups.length}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/50 light:border-slate-100">
                <span className="text-slate-400 light:text-slate-600 font-bold">Units of Measure</span>
                <span className="font-bold text-white light:text-slate-900 font-mono">{units.length}</span>
              </div>
              
              <div className="flex items-center justify-between py-1 border-b border-slate-800/50 light:border-slate-100">
                <span className="text-slate-400 light:text-slate-600 font-bold">Low Stock items</span>
                <span className={`font-mono font-bold ${stats.lowStockCount > 0 ? "text-red-400" : "text-slate-400 light:text-slate-600"}`}>
                  {stats.lowStockCount}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/50 light:border-slate-100">
                <span className="text-slate-400 light:text-slate-600 font-bold">Tax Warnings (0% GST)</span>
                <span className={`font-mono font-bold ${stats.taxWarningCount > 0 ? "text-amber-400" : "text-slate-400 light:text-slate-600"}`}>
                  {stats.taxWarningCount}
                </span>
              </div>
            </div>

            {/* Total asset valuation */}
            <div className="pt-2 border-t border-slate-800 light:border-slate-200">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Stock Asset Valuation</p>
              <p className="text-xl font-black text-white light:text-slate-900 font-mono mt-0.5">
                {currency}{stats.totalStockValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Shortcuts guide card */}
          <div className="rounded-3xl bg-[#0b1528]/50 light:bg-white border border-slate-800/80 light:border-slate-200 p-5 shadow-xl backdrop-blur-xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-white light:text-slate-900 flex items-center gap-1.5 border-b border-slate-800 light:border-slate-200 pb-2">
              <HelpCircle className="w-4 h-4 text-sky-400" />
              Keyboard Guides
            </h3>
            <div className="space-y-2.5 pt-3 text-[10px] font-mono text-slate-400 light:text-slate-600">
              <div className="flex justify-between items-center">
                <span>Create Item</span>
                <span className="px-1.5 py-0.5 bg-slate-900 light:bg-slate-100 border border-slate-800 light:border-slate-200 text-brand-red font-bold rounded">Alt + S</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Create Group</span>
                <span className="px-1.5 py-0.5 bg-slate-900 light:bg-slate-100 border border-slate-800 light:border-slate-200 text-white light:text-slate-900 rounded">Alt + G</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Create Unit</span>
                <span className="px-1.5 py-0.5 bg-slate-900 light:bg-slate-100 border border-slate-800 light:border-slate-200 text-white light:text-slate-900 rounded">Alt + U</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Alter selected</span>
                <span className="px-1.5 py-0.5 bg-slate-900 light:bg-slate-100 border border-slate-800 light:border-slate-200 text-white light:text-slate-900 rounded">Alt + A / Enter</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Delete selected</span>
                <span className="px-1.5 py-0.5 bg-slate-900 light:bg-slate-100 border border-slate-800 light:border-slate-200 text-white light:text-slate-900 rounded">Delete / Ctrl+D</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Focus search</span>
                <span className="px-1.5 py-0.5 bg-slate-900 light:bg-slate-100 border border-slate-800 light:border-slate-200 text-white light:text-slate-900 rounded">Ctrl + F</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Switch tabs</span>
                <span className="px-1.5 py-0.5 bg-slate-900 light:bg-slate-100 border border-slate-800 light:border-slate-200 text-white light:text-slate-900 rounded">Tab</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Return Home</span>
                <span className="px-1.5 py-0.5 bg-slate-900 light:bg-slate-100 border border-slate-800 light:border-slate-200 text-white light:text-slate-900 rounded">ESC</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Forms Modals */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-3xl p-6 md:p-8 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 light:border-slate-200 pb-3">
              <h2 className="text-xl font-bold text-white light:text-slate-900 flex items-center gap-2 capitalize">
                <Package className="w-5 h-5 text-red-500" />
                {modalMode} {modalType}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setFormError("");
                }}
                className="p-1.5 rounded-full text-slate-400 light:text-slate-600 hover:text-white light:hover:text-black hover:bg-slate-800 light:hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs font-semibold">
              
              {/* ITEM FORM */}
              {modalType === "item" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 light:text-slate-600">Stock Item Name *</label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={itemFields.name}
                      onChange={(e) => setItemFields({ ...itemFields, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-white light:text-slate-900 outline-none focus:border-red-500 transition"
                      placeholder="e.g. Dell Inspiron Laptop"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 light:text-slate-600">SKU / Code</label>
                    <input
                      type="text"
                      value={itemFields.sku}
                      onChange={(e) => setItemFields({ ...itemFields, sku: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-white light:text-slate-900 outline-none focus:border-red-500 transition font-mono uppercase"
                      placeholder="e.g. LAP-DELL-123"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 light:text-slate-600">Stock Group</label>
                      <select
                        value={itemFields.stock_group_id}
                        onChange={(e) => setItemFields({ ...itemFields, stock_group_id: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-white light:text-slate-900 outline-none focus:border-red-500 transition cursor-pointer"
                      >
                        <option value="">PRIMARY (No group)</option>
                        {groups.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 light:text-slate-600">Unit of Measure</label>
                      <select
                        value={itemFields.unit_id}
                        onChange={(e) => setItemFields({ ...itemFields, unit_id: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-white light:text-slate-900 outline-none focus:border-red-500 transition cursor-pointer"
                      >
                        <option value="">PRIMARY (No unit)</option>
                        {units.map(u => (
                          <option key={u.id} value={u.id}>{u.symbol} ({u.name})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 light:text-slate-600">Purchase Price ({currency})</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={itemFields.purchase_price === 0 ? "" : itemFields.purchase_price}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "" || /^\d*\.?\d*$/.test(val)) {
                            setItemFields({ ...itemFields, purchase_price: val === "" ? 0 : parseFloat(val) || 0 });
                          }
                        }}
                        placeholder="0.00"
                        className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-white light:text-slate-900 outline-none focus:border-red-500 transition font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 light:text-slate-600">Selling Price ({currency})</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={itemFields.selling_price === 0 ? "" : itemFields.selling_price}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "" || /^\d*\.?\d*$/.test(val)) {
                            setItemFields({ ...itemFields, selling_price: val === "" ? 0 : parseFloat(val) || 0 });
                          }
                        }}
                        placeholder="0.00"
                        className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-white light:text-slate-900 outline-none focus:border-red-500 transition font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 light:text-slate-600">GST Rate (%)</label>
                      <select
                        value={itemFields.gst_percentage}
                        onChange={(e) => setItemFields({ ...itemFields, gst_percentage: parseInt(e.target.value, 10) || 0 })}
                        className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-white light:text-slate-900 outline-none focus:border-red-500 transition cursor-pointer font-mono font-bold"
                      >
                        {[0, 5, 12, 18, 28].map(r => (
                          <option key={r} value={r}>{r}% GST</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 light:text-slate-600">Opening Qty</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={itemFields.quantity === 0 ? "" : itemFields.quantity}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "" || /^\d*\.?\d*$/.test(val)) {
                            setItemFields({ ...itemFields, quantity: val === "" ? 0 : parseFloat(val) || 0 });
                          }
                        }}
                        placeholder="0"
                        className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-white light:text-slate-900 outline-none focus:border-red-500 transition font-mono disabled:opacity-50"
                        disabled={modalMode === "edit"}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 light:text-slate-600">Reorder Alert Qty</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={itemFields.reorder_level === 0 ? "" : itemFields.reorder_level}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "" || /^\d*\.?\d*$/.test(val)) {
                            setItemFields({ ...itemFields, reorder_level: val === "" ? 0 : parseFloat(val) || 0 });
                          }
                        }}
                        placeholder="0"
                        className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-white light:text-slate-900 outline-none focus:border-red-500 transition font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* GROUP FORM */}
              {modalType === "group" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 light:text-slate-600">Stock Group Name *</label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={groupFields.name}
                      onChange={(e) => setGroupFields({ ...groupFields, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-white light:text-slate-900 outline-none focus:border-red-500 transition"
                      placeholder="e.g. Electronics, Office Hardware"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 light:text-slate-600">Parent Group (Under)</label>
                    <select
                      value={groupFields.parent_id}
                      onChange={(e) => setGroupFields({ ...groupFields, parent_id: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-white light:text-slate-900 outline-none focus:border-red-500 transition cursor-pointer"
                    >
                      <option value="">PRIMARY (No parent)</option>
                      {groups.filter(g => g.id !== groupFields.id).map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* UNIT FORM */}
              {modalType === "unit" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 light:text-slate-600">Unit Symbol *</label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={unitFields.symbol}
                      onChange={(e) => setUnitFields({ ...unitFields, symbol: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-white light:text-slate-900 outline-none focus:border-red-500 transition font-mono uppercase"
                      placeholder="e.g. PCS, KG, BOX"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 light:text-slate-600">Formal Name *</label>
                    <input
                      type="text"
                      required
                      value={unitFields.name}
                      onChange={(e) => setUnitFields({ ...unitFields, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-white light:text-slate-900 outline-none focus:border-red-500 transition"
                      placeholder="e.g. Pieces, Kilograms"
                    />
                  </div>
                </>
              )}

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3.5 border-t border-slate-800 light:border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormError("");
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-700 light:border-slate-200 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-black font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 disabled:bg-slate-800 transition"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Asset"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Notification Container */}
      <div className="fixed top-24 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="p-4 rounded-2xl bg-slate-900/95 light:bg-white border border-slate-800 light:border-slate-200 text-xs font-semibold text-white light:text-slate-900 shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in-left pointer-events-auto"
          >
            <div className="p-1 bg-brand-red/15 border border-brand-red/30 text-brand-red rounded-lg shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <span>{toast.text}</span>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
