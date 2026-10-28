import React, { useState, useMemo } from "react";
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Search,
  Filter,
  BarChart3,
  Layers,
  Coins,
  CreditCard,
  ArrowUpRight,
  Download
} from "lucide-react";
import { getLocalTriplicateBills, getLocalDailyPurchases } from "../lib/farmerStore";
import { generateHeapWiseReportPdf, generateDailyPurchaseReportPdf } from "../lib/documents";

export default function ProcurementReportsPage() {
  const [activeTab, setActiveTab] = useState("heap"); // 'cash' | 'debit' | 'heap'
  const [fromDate, setFromDate] = useState("01-01-2026");
  const [toDate, setToDate] = useState("13-10-2026");
  const [selectedHeap, setSelectedHeap] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [bills] = useState(() => getLocalTriplicateBills());
  const [dailyPurchases] = useState(() => getLocalDailyPurchases());

  // Dynamic heap aggregation directly from user-created bills (starts completely blank)
  const dynamicHeapData = useMemo(() => {
    const heapMap = {};
    bills.forEach(b => {
      const hNo = String(b.heap_number || "Unassigned").trim();
      if (!heapMap[hNo]) {
        heapMap[hNo] = { heap_number: hNo, net_weight: 0, amount: 0, count: 0 };
      }
      const wt = Number(b.net_weight || 0);
      const amt = Number(b.net_amount || (wt * Number(b.rate || 0)));
      heapMap[hNo].net_weight += wt;
      heapMap[hNo].amount += amt;
      heapMap[hNo].count += 1;
    });

    return Object.values(heapMap).map(h => ({
      ...h,
      avg_rate: h.net_weight > 0 ? h.amount / h.net_weight : 0
    })).sort((a, b) => a.heap_number.localeCompare(b.heap_number, undefined, { numeric: true }));
  }, [bills]);

  const activeHeapDataset = dynamicHeapData;

  // Cash bills filter
  const cashBills = useMemo(() => {
    return bills.filter(b => {
      const isCash = b.payment_mode === "CASH";
      const matchesSearch = !searchQuery || (
        b.bill_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.seller_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.village_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return isCash && matchesSearch;
    });
  }, [bills, searchQuery]);

  // Debit bills filter
  const debitBills = useMemo(() => {
    return bills.filter(b => {
      const isDebit = b.payment_mode === "DEBIT";
      const matchesSearch = !searchQuery || (
        b.bill_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.seller_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.village_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return isDebit && matchesSearch;
    });
  }, [bills, searchQuery]);

  // Heap-wise filtered data
  const filteredHeapList = useMemo(() => {
    if (selectedHeap === "ALL") return activeHeapDataset;
    return activeHeapDataset.filter(h => h.heap_number === selectedHeap);
  }, [selectedHeap, activeHeapDataset]);

  const heapTotals = useMemo(() => {
    let weight = 0;
    let amount = 0;
    filteredHeapList.forEach(h => {
      weight += Number(h.net_weight || 0);
      amount += Number(h.amount || 0);
    });
    const avg = weight > 0 ? amount / weight : 0;
    return { weight, amount, avg };
  }, [filteredHeapList]);

  const cashTotals = useMemo(() => {
    let weight = 0;
    let amount = 0;
    cashBills.forEach(b => {
      weight += Number(b.net_weight || 0);
      amount += Number(b.net_amount || 0);
    });
    const avg = weight > 0 ? amount / weight : 0;
    return { weight, amount, avg };
  }, [cashBills]);

  const debitTotals = useMemo(() => {
    let weight = 0;
    let amount = 0;
    debitBills.forEach(b => {
      weight += Number(b.net_weight || 0);
      amount += Number(b.net_amount || 0);
    });
    const avg = weight > 0 ? amount / weight : 0;
    return { weight, amount, avg };
  }, [debitBills]);

  const exportHeapPdf = () => {
    generateHeapWiseReportPdf(fromDate, toDate, filteredHeapList);
  };

  return (
    <div className="procurement-reports-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">FARMER PROCUREMENT SECTION</div>
          <h1>Procurement Registers & Heap Analytics</h1>
          <p>
            Summary registers for Cash purchases, Debit purchases, and Heap-wise average rate outturn.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="button primary" onClick={exportHeapPdf}>
            <Printer size={15} /> Export Report PDF
          </button>
        </div>
      </div>

      {/* Subtabs matching legacy reports */}
      <div className="report-subtabs">
        <button
          type="button"
          className={`report-subtab ${activeTab === "heap" ? "active" : ""}`}
          onClick={() => setActiveTab("heap")}
        >
          <BarChart3 size={15} />
          <span>1. Heap-Wise Average (Page 8)</span>
        </button>

        <button
          type="button"
          className={`report-subtab ${activeTab === "cash" ? "active" : ""}`}
          onClick={() => setActiveTab("cash")}
        >
          <Coins size={15} />
          <span>2. Cash Register ({cashBills.length})</span>
        </button>

        <button
          type="button"
          className={`report-subtab ${activeTab === "debit" ? "active" : ""}`}
          onClick={() => setActiveTab("debit")}
        >
          <CreditCard size={15} />
          <span>3. Debit Register ({debitBills.length})</span>
        </button>
      </div>

      {/* CONTAINER 1: Filter & Query Bar */}
      <div className="modern-procurement-card" style={{ marginBottom: 18 }}>
        <div className="container-header-bar">
          <div className="container-title">
            <h2>Report Filter & Date Parameters</h2>
            <span className="container-badge">Handod Procurement Unit</span>
          </div>

          <div className="report-filters-wrapper">
            <div className="report-filter-date-row">
              <div className="report-filter-field">
                <span className="filter-label">From:</span>
                <input
                  type="text"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="filter-input"
                />
              </div>

              <div className="report-filter-field">
                <span className="filter-label">To:</span>
                <input
                  type="text"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  className="filter-input"
                />
              </div>
            </div>

            <div className="report-filter-action-row">
              {activeTab === "heap" && (
                <div className="report-filter-field heap-field">
                  <span className="filter-label">Heap:</span>
                  <select
                    value={selectedHeap}
                    onChange={e => setSelectedHeap(e.target.value)}
                    className="filter-select"
                  >
                    <option value="ALL">All Heaps (6 to 14)</option>
                    <option value="6">Heap #6</option>
                    <option value="7">Heap #7</option>
                    <option value="8">Heap #8</option>
                    <option value="9">Heap #9</option>
                    <option value="10">Heap #10</option>
                  </select>
                </div>
              )}

              <div className="report-filter-field search-field">
                <Search size={14} color="#64748b" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="filter-input search-input"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TAB 1: HEAP-WISE AVERAGE REPORT (CONTAINER MATCHING PAGE 8) */}
      {activeTab === "heap" && (
        <div>
          {/* Summary Metric Cards */}
          <div className="stat-grid" style={{ marginBottom: 18 }}>
            <div className="stat-card">
              <div className="stat-top">
                <span>Active Factory Heaps</span>
                <div className="stat-icon blue"><Layers size={16} /></div>
              </div>
              <div className="stat-value">{filteredHeapList.length} Lots</div>
              <div className="stat-foot">Separated yard storage stacks</div>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <span>Total Net Weight</span>
                <div className="stat-icon green"><Layers size={16} /></div>
              </div>
              <div className="stat-value">{heapTotals.weight.toFixed(2)} qtl</div>
              <div className="stat-foot">Aggregated lot procurement</div>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <span>Factory Weighted Avg Rate</span>
                <div className="stat-icon amber"><BarChart3 size={16} /></div>
              </div>
              <div className="stat-value" style={{ color: "#D97706" }}>
                ₹{heapTotals.avg.toFixed(2)}
              </div>
              <div className="stat-foot">Per quintal blended average</div>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <span>Total Procurement Valuation</span>
                <div className="stat-icon violet"><Coins size={16} /></div>
              </div>
              <div className="stat-value" style={{ fontSize: 22, color: "#0F172A" }}>
                ₹{heapTotals.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </div>
              <div className="stat-foot">Total raw cotton investment</div>
            </div>
          </div>

          <div className="modern-procurement-card">
            <div className="factory-brand-strip" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div className="brand-left">
                <span className="brand-badge">HEAP ANALYTICS</span>
                <div>
                  <h3>DAILY PURCHASE REPORT — HEAP WISE AVERAGE</h3>
                  <p>SHREE JAGDAMBA COTTON G AND P FACTORY (HANDOD)</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="brand-meta" style={{ textAlign: "right" }}>
                  <span>Period: <b>{fromDate} To {toDate}</b></span>
                </div>
              </div>
            </div>

            <div className="table-scroll">
              <div className="mobile-scroll-hint">
                👈 Swipe horizontally to view heap columns 👉
              </div>
              {filteredHeapList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "50px 20px", color: "#64748b" }}>
                  <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>No heaps recorded in active factory register.</p>
                  <p style={{ fontSize: 11, color: "#94a3b8" }}>Heaps are automatically compiled as you generate Triplicate Bills for arriving farmer lots.</p>
                </div>
              ) : (
                <table className="modern-report-table">
                  <thead>
                    <tr>
                      <th style={{ width: 140 }}>Heap No.</th>
                      <th style={{ textAlign: "right" }}>Net Weight (qtl)</th>
                      <th style={{ textAlign: "right" }}>Total Amount (₹)</th>
                      <th style={{ textAlign: "right", width: 220 }}>Average Rate (₹ / qtl)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHeapList.map(h => (
                      <tr key={h.heap_number}>
                        <td>
                          <strong style={{ color: "#0F172A", fontSize: 13 }}>
                            Heap #{h.heap_number}
                          </strong>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                          {Number(h.net_weight || 0).toFixed(2)}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 600 }}>
                          ₹{Number(h.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 800, color: "#B45309", fontSize: 13 }}>
                          ₹{Number(h.avg_rate || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="modern-report-footer">
                      <td>TOTAL / FACTORY WEIGHTED AVERAGE:</td>
                      <td style={{ textAlign: "right" }}>{heapTotals.weight.toFixed(2)} qtl</td>
                      <td style={{ textAlign: "right" }}>₹{heapTotals.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      <td style={{ textAlign: "right", color: "#B45309", fontSize: 14 }}>
                        ₹{heapTotals.avg.toFixed(2)} / qtl
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CASH PURCHASE REGISTER (CONTAINER MATCHING PAGE 6) */}
      {activeTab === "cash" && (
        <div className="modern-procurement-card">
          <div className="factory-brand-strip">
            <div className="brand-left">
              <span className="brand-badge">CASH REGISTER</span>
              <div>
                <h3>TRIPLICATE CASH PURCHASE REGISTER</h3>
                <p>INSTANT CASH DISBURSEMENTS WITH CURRENCY NOTE AUDIT</p>
              </div>
            </div>
            <div className="brand-meta">
              <span>Date: <b>{toDate}</b></span>
            </div>
          </div>

          <div className="table-scroll">
            <div className="mobile-scroll-hint">
              👈 Swipe horizontally to view full register columns 👉
            </div>
            {cashBills.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px", color: "#64748b" }}>
                <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>No cash purchase vouchers recorded.</p>
                <p style={{ fontSize: 11, color: "#94a3b8" }}>Cash disbursements will appear here as you generate Cash Triplicate Bills in Step 2.</p>
              </div>
            ) : (
              <table className="modern-report-table">
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>SrNo</th>
                    <th style={{ width: 90 }}>TNo.</th>
                    <th>Name (Farmer)</th>
                    <th>Residence (Village)</th>
                    <th>Date</th>
                    <th style={{ textAlign: "right" }}>Net Wt (qtl)</th>
                    <th style={{ textAlign: "right" }}>Rate (₹)</th>
                    <th style={{ textAlign: "right" }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {cashBills.map((b, idx) => (
                    <tr key={b.id || idx}>
                      <td>{idx + 1}</td>
                      <td><b>{b.bill_number}</b></td>
                      <td><b>{b.seller_name}</b></td>
                      <td>{b.village_name || b.seller_residence}</td>
                      <td>{b.bill_date}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{Number(b.net_weight || 0).toFixed(2)}</td>
                      <td style={{ textAlign: "right" }}>₹{Number(b.rate || 0).toFixed(2)}</td>
                      <td style={{ textAlign: "right", fontWeight: 800, color: "#15803D" }}>
                        ₹{Number(b.net_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="modern-report-footer">
                    <td colSpan={5}>TOTAL CASH DISBURSED:</td>
                    <td style={{ textAlign: "right" }}>{cashTotals.weight.toFixed(2)} qtl</td>
                    <td style={{ textAlign: "right" }}>₹{cashTotals.avg.toFixed(2)}</td>
                    <td style={{ textAlign: "right", color: "#15803D", fontSize: 13 }}>
                      ₹{cashTotals.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DEBIT PURCHASE REGISTER (CONTAINER MATCHING PAGE 6) */}
      {activeTab === "debit" && (
        <div className="modern-procurement-card">
          <div className="factory-brand-strip">
            <div className="brand-left">
              <span className="brand-badge">DEBIT REGISTER</span>
              <div>
                <h3>TRIPLICATE DEBIT PURCHASE REGISTER</h3>
                <p>OUTSTANDING FARMER CREDIT LIABILITY & DUE DATES</p>
              </div>
            </div>
            <div className="brand-meta">
              <span>Status: <b>Pending Due Settlement</b></span>
            </div>
          </div>

          <div className="table-scroll">
            <div className="mobile-scroll-hint">
              👈 Swipe horizontally to view full register columns 👉
            </div>
            {debitBills.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px", color: "#64748b" }}>
                <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>No debit credit vouchers recorded.</p>
                <p style={{ fontSize: 11, color: "#94a3b8" }}>Debit/credit vouchers will appear here when you create bills with payment mode set to Debit.</p>
              </div>
            ) : (
              <table className="modern-report-table">
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>SrNo</th>
                    <th style={{ width: 90 }}>TNo.</th>
                    <th>Name (Farmer)</th>
                    <th>Residence</th>
                    <th>Debit Dt. (Due Date)</th>
                    <th style={{ textAlign: "right" }}>Net Wt (qtl)</th>
                    <th style={{ textAlign: "right" }}>Rate (₹)</th>
                    <th style={{ textAlign: "right" }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {debitBills.map((b, idx) => (
                    <tr key={b.id || idx}>
                      <td>{idx + 1}</td>
                      <td><b>{b.bill_number}</b></td>
                      <td><b>{b.seller_name}</b></td>
                      <td>{b.village_name || b.seller_residence}</td>
                      <td style={{ color: "#B91C1C", fontWeight: 700 }}>{b.due_date || "—"}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{Number(b.net_weight || 0).toFixed(2)}</td>
                      <td style={{ textAlign: "right" }}>₹{Number(b.rate || 0).toFixed(2)}</td>
                      <td style={{ textAlign: "right", fontWeight: 800, color: "#1D4ED8" }}>
                        ₹{Number(b.net_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="modern-report-footer">
                    <td colSpan={5}>TOTAL OUTSTANDING DEBIT:</td>
                    <td style={{ textAlign: "right" }}>{debitTotals.weight.toFixed(2)} qtl</td>
                    <td style={{ textAlign: "right" }}>₹{debitTotals.avg.toFixed(2)}</td>
                    <td style={{ textAlign: "right", color: "#1D4ED8", fontSize: 13 }}>
                      ₹{debitTotals.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
