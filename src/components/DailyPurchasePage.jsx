import React, { useState, useMemo, useRef, useEffect } from "react";
import { Plus, Trash2, Save, Printer, Check, Search, Calendar, FileText, Layers, ShieldCheck, Sparkles, CornerDownLeft, LayoutList, Table as TableIcon } from "lucide-react";
import { getLocalDailyPurchases, saveLocalDailyPurchases, getLocalFarmers } from "../lib/farmerStore";
import { generateDailyPurchaseReportPdf } from "../lib/documents";

export default function DailyPurchasePage() {
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-"));
  
  // Auto-detect mobile screen to default to touch-friendly card view
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) return "cards";
    return "table";
  });

  // Track window resize to ensure optimal layout
  useEffect(() => {
    const handleResize = () => {
      // Don't override if user explicitly set it, but default mobile to cards
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  // Clean initialization: starts with 1 blank entry row if empty
  const [records, setRecords] = useState(() => {
    const saved = getLocalDailyPurchases();
    if (saved && saved.length > 0) return saved;
    return [{
      id: "dp-" + Date.now(),
      sr_no: 1,
      farmer_name: "",
      village_name: "",
      cotton_type: "S/6",
      weight: "",
      rate: "",
      amount: 0
    }];
  });

  const [farmers] = useState(() => getLocalFarmers());
  const [savedMsg, setSavedMsg] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

  // Refs matrix for rapid keyboard navigation: inputRefs.current[`${rowIdx}_${colName}`]
  const inputRefs = useRef({});

  const focusField = (rowIdx, colName) => {
    const key = `${rowIdx}_${colName}`;
    const el = inputRefs.current[key];
    if (el) {
      el.focus();
      if (typeof el.select === "function") el.select();
    }
  };

  // Live Auto-Refreshing Totals (Document Requirement: "In this I want total weight and total amount will get refreshing")
  const totals = useMemo(() => {
    let totalWeight = 0;
    let totalAmount = 0;
    records.forEach(r => {
      const wt = Number(r.weight || 0);
      const amt = Number(r.amount || 0);
      totalWeight += wt;
      totalAmount += amt;
    });
    const avgRate = totalWeight > 0 ? (totalAmount / totalWeight) : 0;
    return {
      totalWeight,
      totalAmount,
      avgRate
    };
  }, [records]);

  const updateRow = (index, field, value) => {
    setRecords(old => {
      const next = [...old];
      const item = { ...next[index], [field]: value };

      // Autocomplete village if farmer name matches
      if (field === "farmer_name") {
        const found = farmers.find(f => f.farmer_name.toLowerCase() === (value || "").toLowerCase());
        if (found) item.village_name = found.village;
      }

      // Calculation: weight * rate = amount
      if (field === "weight" || field === "rate") {
        const wt = Number(field === "weight" ? value : item.weight || 0);
        const rt = Number(field === "rate" ? value : item.rate || 0);
        item.amount = wt && rt ? Number((wt * rt).toFixed(2)) : 0;
      }

      next[index] = item;
      return next;
    });
  };

  const addRow = (defaultRate = "", defaultVillage = "") => {
    const newId = "dp-" + Date.now() + Math.random().toString(36).substring(2, 5);
    setRecords(old => [
      ...old,
      {
        id: newId,
        sr_no: old.length + 1,
        farmer_name: "",
        village_name: defaultVillage,
        cotton_type: "S/6",
        weight: "",
        rate: defaultRate,
        amount: 0
      }
    ]);
    return newId;
  };

  // EXCEL-STYLE ENTER KEY PROGRESSION:
  // Pressing Enter moves across cells: Farmer -> Village -> Weight -> Rate.
  // When at the last row, pressing Enter on Rate (or pressing Enter in any cell to advance to next row) creates a new empty row and focuses it!
  const handleKeyDown = (e, rowIdx, colName) => {
    if (e.key === "Enter") {
      e.preventDefault();

      if (colName === "farmer_name") {
        focusField(rowIdx, "village_name");
      } else if (colName === "village_name") {
        focusField(rowIdx, "weight");
      } else if (colName === "cotton_type") {
        focusField(rowIdx, "weight");
      } else if (colName === "weight") {
        focusField(rowIdx, "rate");
      } else if (colName === "rate") {
        // If at the last row, automatically append a new row and focus farmer_name
        if (rowIdx >= records.length - 1) {
          const currentRate = records[rowIdx]?.rate || "";
          addRow(currentRate, "");
          setTimeout(() => {
            focusField(rowIdx + 1, "farmer_name");
          }, 35);
        } else {
          // Move down to next row's farmer_name
          focusField(rowIdx + 1, "farmer_name");
        }
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (rowIdx < records.length - 1) {
        focusField(rowIdx + 1, colName);
      } else {
        // Excel behavior: pressing Arrow Down at the bottom-most row automatically adds a new blank row!
        const currentRate = records[rowIdx]?.rate || "";
        addRow(currentRate, "");
        setTimeout(() => focusField(rowIdx + 1, colName), 35);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (rowIdx > 0) {
        focusField(rowIdx - 1, colName);
      }
    } else if (e.key === "ArrowRight") {
      // Excel-style horizontal arrow
      if (colName === "farmer_name") focusField(rowIdx, "village_name");
      else if (colName === "village_name") focusField(rowIdx, "weight");
      else if (colName === "weight") focusField(rowIdx, "rate");
    } else if (e.key === "ArrowLeft") {
      if (colName === "rate") focusField(rowIdx, "weight");
      else if (colName === "weight") focusField(rowIdx, "village_name");
      else if (colName === "village_name") focusField(rowIdx, "farmer_name");
    }
  };

  const removeRow = (index) => {
    setRecords(old => {
      const remaining = old.filter((_, i) => i !== index);
      if (remaining.length === 0) {
        return [{
          id: "dp-" + Date.now(),
          sr_no: 1,
          farmer_name: "",
          village_name: "",
          cotton_type: "S/6",
          weight: "",
          rate: "",
          amount: 0
        }];
      }
      return remaining.map((r, i) => ({ ...r, sr_no: i + 1 }));
    });
  };

  const clearAllData = () => {
    if (window.confirm("Clear all rows and start a fresh empty ledger?")) {
      const fresh = [{
        id: "dp-" + Date.now(),
        sr_no: 1,
        farmer_name: "",
        village_name: "",
        cotton_type: "S/6",
        weight: "",
        rate: "",
        amount: 0
      }];
      setRecords(fresh);
      saveLocalDailyPurchases(fresh);
      setSavedMsg("Ledger cleared! Ready for fresh data entry.");
      setTimeout(() => setSavedMsg(""), 3000);
      setTimeout(() => focusField(0, "farmer_name"), 50);
    }
  };

  const saveDailyLog = () => {
    saveLocalDailyPurchases(records);
    setSavedMsg("Daily purchase entries saved successfully to local store.");
    setTimeout(() => setSavedMsg(""), 4000);
  };

  const downloadPdf = () => {
    generateDailyPurchaseReportPdf(purchaseDate, records);
  };

  const filteredRecords = records.filter(r => {
    if (!searchFilter) return true;
    const term = searchFilter.toLowerCase();
    return (
      r.farmer_name?.toLowerCase().includes(term) ||
      r.village_name?.toLowerCase().includes(term) ||
      r.cotton_type?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="daily-purchase-page">
      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <div className="eyebrow">FARMER PROCUREMENT SECTION</div>
          <h1>Cotton Daily Purchase Entry</h1>
          <p>Rapid yard procurement ledger with real-time auto-refreshing weight and amount totals.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="button secondary" onClick={downloadPdf}>
            <Printer size={15} /> Print / Export Daily PDF
          </button>
          <button className="button primary" onClick={saveDailyLog}>
            <Save size={15} /> Save Daily Ledger
          </button>
        </div>
      </div>

      {savedMsg && (
        <div className="success-message" style={{ marginBottom: 16 }}>
          <Check size={16} /> {savedMsg}
        </div>
      )}

      {/* Main Modern Container Card */}
      <div className="modern-procurement-card">
        {/* CONTAINER 1: Factory Header Strip (Clean Enterprise Brand Header) */}
        <div className="factory-brand-strip">
          <div className="brand-left">
            <span className="brand-badge">FACTORY DESK</span>
            <div>
              <h3>SHREE JAGDAMBA COTTON G AND P FACTORY (HANDOD)</h3>
              <p>YARD RAW COTTON PROCUREMENT & WEIGHBRIDGE RECORD</p>
            </div>
          </div>
          <div className="brand-meta">
            <span className="session-pill">FY 2026–2027</span>
            <span>Date: <b>{purchaseDate}</b></span>
          </div>
        </div>

        {/* CONTAINER 2: Subheader Control Bar (Date, Filter, Add Action) */}
        <div className="container-header-bar">
          <div className="container-title">
            <h2>Daily Purchase Entry</h2>
            <span className="container-badge">{records.length} Farmers Logged</span>
          </div>

          <div className="daily-purchase-controls">
            {/* View Mode Toggle (Touch Cards vs Enterprise Table) */}
            <div className="view-mode-toggle" title="Switch between Touch Cards and Desktop Table">
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === "cards" ? "active" : ""}`}
                onClick={() => setViewMode("cards")}
              >
                <LayoutList size={13} />
                <span>Cards</span>
              </button>
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === "table" ? "active" : ""}`}
                onClick={() => setViewMode("table")}
              >
                <TableIcon size={13} />
                <span>Table</span>
              </button>
            </div>

            <div className="daily-filter-inputs">
              <div className="control-field-group">
                <Calendar size={14} color="#64748b" />
                <span className="control-label">Date:</span>
                <input
                  type="text"
                  value={purchaseDate}
                  onChange={e => setPurchaseDate(e.target.value)}
                  className="control-input-date"
                />
              </div>

              <div className="control-field-group search-group">
                <Search size={14} color="#64748b" />
                <input
                  type="text"
                  placeholder="Search Farmer / Village..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  className="control-input-search"
                />
              </div>
            </div>

            <div className="daily-action-btns">
              <button
                className="button secondary"
                onClick={clearAllData}
                title="Clear all rows and reset to a clean blank ledger"
                style={{ padding: "7px 12px", fontSize: 11, borderColor: "#cbd5e1" }}
              >
                <Trash2 size={13} style={{ color: "#ef4444" }} /> Clear Ledger
              </button>

              <button className="button primary" onClick={() => addRow()} style={{ padding: "7px 14px", fontSize: 11 }}>
                <Plus size={14} /> Add Farmer Row
              </button>
            </div>
          </div>
        </div>

        {/* Keyboard Quick Navigation Banner (Compact on mobile) */}
        <div className="rapid-kb-banner">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CornerDownLeft size={14} color="#15803d" />
            <span>
              <strong>Rapid Entry:</strong> Fill Weight & Rate to auto-calculate amount. <span className="desktop-kb-tip">Press <kbd style={{ background: "#dcfce7", border: "1px solid #86efac", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>Enter</kbd> to move across cells and auto-append rows!</span>
            </span>
          </div>
          <div className="desktop-kb-tag" style={{ display: "flex", alignItems: "center", gap: 6, color: "#15803d", fontWeight: 600 }}>
            <Sparkles size={13} />
            <span>Real-time weighbridge sync</span>
          </div>
        </div>

        {/* CONTAINER 3A: Touch-Friendly Mobile Cards View */}
        {viewMode === "cards" && (
          <div className="farmer-cards-container">
            {filteredRecords.map((row, idx) => (
              <div key={row.id || idx} className="farmer-mobile-card">
                <div className="farmer-card-top">
                  <div className="farmer-card-badge">
                    <span className="farmer-sr-pill">#{row.sr_no || idx + 1}</span>
                    <strong className="farmer-card-name">
                      {row.farmer_name ? row.farmer_name : <span style={{ color: "#94a3b8" }}>New Farmer Entry</span>}
                    </strong>
                    {row.village_name && (
                      <span className="farmer-village-pill">{row.village_name}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => removeRow(idx)}
                    title="Delete row"
                    style={{ color: "#ef4444" }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="farmer-card-fields">
                  <div className="farmer-card-row">
                    <div className="farmer-field-box">
                      <label>Farmer Name *</label>
                      <input
                        ref={el => (inputRefs.current[`${idx}_farmer_name`] = el)}
                        type="text"
                        value={row.farmer_name}
                        onChange={e => updateRow(idx, "farmer_name", e.target.value)}
                        onKeyDown={e => handleKeyDown(e, idx, "farmer_name")}
                        placeholder="e.g. Anilbhai"
                        list="farmer-suggestions"
                        className="farmer-input"
                      />
                    </div>
                  </div>

                  <div className="farmer-card-row-2col">
                    <div className="farmer-field-box">
                      <label>Residence (Village)</label>
                      <input
                        ref={el => (inputRefs.current[`${idx}_village_name`] = el)}
                        type="text"
                        value={row.village_name || row.residence || ""}
                        onChange={e => updateRow(idx, "village_name", e.target.value)}
                        onKeyDown={e => handleKeyDown(e, idx, "village_name")}
                        placeholder="e.g. Fetapura"
                        className="farmer-input"
                      />
                    </div>

                    <div className="farmer-field-box">
                      <label>Cotton Type</label>
                      <select
                        ref={el => (inputRefs.current[`${idx}_cotton_type`] = el)}
                        value={row.cotton_type || "S/6"}
                        onChange={e => updateRow(idx, "cotton_type", e.target.value)}
                        onKeyDown={e => handleKeyDown(e, idx, "cotton_type")}
                        className="farmer-input"
                      >
                        <option value="S/6">S/6 (Shankar-6)</option>
                        <option value="Y/P">Y/P (Yellow Picking)</option>
                        <option value="Kapash">Kapash (Raw)</option>
                        <option value="Maize">Maize</option>
                        <option value="Castor">Castor Seed</option>
                      </select>
                    </div>
                  </div>

                  <div className="farmer-card-row-2col">
                    <div className="farmer-field-box highlight-field">
                      <label>Weight (quintals)</label>
                      <input
                        ref={el => (inputRefs.current[`${idx}_weight`] = el)}
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        min="0"
                        value={row.weight}
                        onChange={e => updateRow(idx, "weight", e.target.value)}
                        onKeyDown={e => handleKeyDown(e, idx, "weight")}
                        placeholder="0.00"
                        className="farmer-input text-bold"
                        style={{ textAlign: "right" }}
                      />
                    </div>

                    <div className="farmer-field-box highlight-field">
                      <label>Rate (₹ / qtl)</label>
                      <input
                        ref={el => (inputRefs.current[`${idx}_rate`] = el)}
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        min="0"
                        value={row.rate}
                        onChange={e => updateRow(idx, "rate", e.target.value)}
                        onKeyDown={e => handleKeyDown(e, idx, "rate")}
                        placeholder="0.00"
                        className="farmer-input text-bold"
                        style={{ textAlign: "right" }}
                      />
                    </div>
                  </div>

                  <div className="farmer-card-amount-strip">
                    <span className="card-amount-label">Calculated Total Amount:</span>
                    <strong className="card-amount-val">
                      ₹{Number(row.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              className="button secondary mobile-add-farmer-btn"
              onClick={() => addRow()}
            >
              <Plus size={16} /> Add Next Farmer Row
            </button>
          </div>
        )}

        {/* CONTAINER 3B: Enterprise Table View (With Mobile Scroll Hint) */}
        {viewMode === "table" && (
          <div className="table-scroll">
            <div className="mobile-scroll-hint">
              👈 Swipe horizontally to view all weighbridge columns 👉
            </div>
            <table className="modern-report-table">
              <thead>
                <tr>
                  <th style={{ width: 55, textAlign: "center" }}>SrNo</th>
                  <th style={{ minWidth: 200 }}>Farmer Name</th>
                  <th style={{ minWidth: 160 }}>Residence (Village)</th>
                  <th style={{ width: 110, textAlign: "center" }}>Cotton Type</th>
                  <th style={{ width: 125, textAlign: "right" }}>Weight (qtl)</th>
                  <th style={{ width: 125, textAlign: "right" }}>Rate (₹ / qtl)</th>
                  <th style={{ width: 145, textAlign: "right" }}>Amount (₹)</th>
                  <th style={{ width: 50, textAlign: "center" }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((row, idx) => (
                  <tr key={row.id || idx}>
                    <td style={{ textAlign: "center", fontWeight: 700, color: "#64748b" }}>
                      {row.sr_no || idx + 1}
                    </td>
                    <td>
                      <input
                        ref={el => (inputRefs.current[`${idx}_farmer_name`] = el)}
                        type="text"
                        value={row.farmer_name}
                        onChange={e => updateRow(idx, "farmer_name", e.target.value)}
                        onKeyDown={e => handleKeyDown(e, idx, "farmer_name")}
                        placeholder="e.g. Anilbhai"
                        list="farmer-suggestions"
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "0 8px",
                          border: "1px solid #cbd5e1",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600
                        }}
                      />
                    </td>
                    <td>
                      <input
                        ref={el => (inputRefs.current[`${idx}_village_name`] = el)}
                        type="text"
                        value={row.village_name || row.residence || ""}
                        onChange={e => updateRow(idx, "village_name", e.target.value)}
                        onKeyDown={e => handleKeyDown(e, idx, "village_name")}
                        placeholder="e.g. Fetapura"
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "0 8px",
                          border: "1px solid #cbd5e1",
                          borderRadius: 6,
                          fontSize: 11
                        }}
                      />
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <select
                        ref={el => (inputRefs.current[`${idx}_cotton_type`] = el)}
                        value={row.cotton_type || "S/6"}
                        onChange={e => updateRow(idx, "cotton_type", e.target.value)}
                        onKeyDown={e => handleKeyDown(e, idx, "cotton_type")}
                        style={{
                          height: 32,
                          padding: "0 6px",
                          border: "1px solid #cbd5e1",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700
                        }}
                      >
                        <option value="S/6">S/6 (Shankar-6)</option>
                        <option value="Y/P">Y/P (Yellow Picking)</option>
                        <option value="Kapash">Kapash (Raw)</option>
                        <option value="Maize">Maize</option>
                        <option value="Castor">Castor Seed</option>
                      </select>
                    </td>
                    <td>
                      <input
                        ref={el => (inputRefs.current[`${idx}_weight`] = el)}
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        min="0"
                        value={row.weight}
                        onChange={e => updateRow(idx, "weight", e.target.value)}
                        onKeyDown={e => handleKeyDown(e, idx, "weight")}
                        placeholder="0.00"
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "0 8px",
                          border: "1px solid #cbd5e1",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          textAlign: "right"
                        }}
                      />
                    </td>
                    <td>
                      <input
                        ref={el => (inputRefs.current[`${idx}_rate`] = el)}
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        min="0"
                        value={row.rate}
                        onChange={e => updateRow(idx, "rate", e.target.value)}
                        onKeyDown={e => handleKeyDown(e, idx, "rate")}
                        placeholder="e.g. 74.00"
                        style={{
                          width: "100%",
                          height: 32,
                          padding: "0 8px",
                          border: "1px solid #cbd5e1",
                          borderRadius: 6,
                          fontSize: 11,
                          textAlign: "right"
                        }}
                      />
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 800, color: "#0f172a", fontSize: 12 }}>
                      ₹{Number(row.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        className="icon-button"
                        onClick={() => removeRow(idx)}
                        title="Delete row"
                        style={{ color: "#ef4444" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* CONTAINER 4: Real-Time Auto-Refreshing Total Footer Strip (Responsive Grid) */}
        <div className="daily-procurement-totals">
          <div className="daily-total-metric">
            <span className="daily-total-label">Recorded Farmers</span>
            <strong className="daily-total-val count">{records.length} Farmers</strong>
          </div>

          <div className="daily-total-metric">
            <span className="daily-total-label">Total Weight (Net)</span>
            <strong className="daily-total-val">{totals.totalWeight.toFixed(2)} qtl</strong>
          </div>

          <div className="daily-total-metric">
            <span className="daily-total-label">Weighted Avg Rate</span>
            <strong className="daily-total-val amber">₹{totals.avgRate.toFixed(2)} / qtl</strong>
          </div>

          <div className="daily-total-metric highlight-amount">
            <span className="daily-total-label">Total Purchase Amount</span>
            <strong className="daily-total-val green">
              ₹{totals.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>
      </div>

      {/* Suggestion list for farmers */}
      <datalist id="farmer-suggestions">
        {farmers.map(f => (
          <option key={f.id} value={f.farmer_name}>{f.village}</option>
        ))}
      </datalist>
    </div>
  );
}
