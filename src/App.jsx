import React, { useEffect, useMemo, useState, useRef } from "react";
import { NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  Activity, ArrowDownToLine, ArrowLeft, ArrowRight, Bell, CalendarDays, Check,
  FileCheck2, FilePlus2, FileText, LayoutDashboard, LogOut, Menu,
  PackageCheck, Plus, Search, ShieldCheck, Truck, Users, X, Mail, MessageCircle,
  Send, Lock, KeyRound, Eye, EyeOff, Coins, Layers, Receipt, UserPlus, Scale, BarChart3,
  CreditCard, CornerDownLeft, Sparkles, Wifi, WifiOff, RefreshCw
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { getOfflineQueue, syncOfflineQueue } from "./lib/offlineSync";
import { generateContractPdf, generateGatePassPdf, COTTON_SEED_TERMS, NET_COTTON_TERMS } from "./lib/documents";
import DailyPurchasePage from "./components/DailyPurchasePage";
import TriplicateBillingPage from "./components/TriplicateBillingPage";
import ProcurementReportsPage from "./components/ProcurementReportsPage";

// MODULE 1: COTTON SEED (Strictly the 13 fields from PDF 1)
const blankCottonSeed = {
  module: "cotton_seed",
  contract_date: new Date().toLocaleDateString("en-CA"), // 1. DATE
  contract_number: "",                                  // 2. CONTRACT NUMBER .
  party_name: "",                                       // 3. PARTY NAME
  gst_number: "",                                       // 4. GST NUMBER
  party_address: "",                                    // 5. ADDREESS
  contact_number: "",                                   // 6. CONTACT NO.
  quantity: "",                                         // 7. QUANTITY
  commodity: "COTTON SEED",                             // 8. COMMODITY : COTTON SEED
  delivery_condition: "",                               // 9. DELIVERY CONDITION
  payment_condition: "",                                // 10. PAYMENT CONDITION
  rate_per_quintal: "",                                 // 11. RATE PER QUINTALS
  packing_type: "LOOSE",                                // 12. PACKING TYPE :LOOSE/BAGS
  delivery_address: "",                                 // 13. DELIVERY ADDRESS
  gst_rate: "5",                                        // USER EDITABLE GST RATE %
  status: "draft"
};

// MODULE 2: NET COTTON (Strictly the 15 fields from PDF 2)
const blankNetCotton = {
  module: "net_cotton",
  contract_date: new Date().toLocaleDateString("en-CA"), // 1. DATE
  contract_number: "",                                  // 2. CONTRACT NUMBER .
  party_name: "",                                       // 3. PARTY NAME
  gst_number: "",                                       // 4. GST NUMBER
  party_address: "",                                    // 5. ADDREESS
  contact_number: "",                                   // 6. CONTACT NO.
  broker_name_and_firm_name: "",                        // 7. BROKER NAME AND FIRM NAME
  pr_no: "",                                            // 8. PR NO .
  lot_no: "",                                           // 9. LOT NO.
  quantity: "",                                         // 10. QUANTITY
  commodity: "COTTON BALES",                            // 11. COMMODITY : COTTON BALES
  delivery_condition: "",                               // 12. DELIVERY CONDITION
  payment_condition: "",                                // 13. PAYMENT CONDITION
  rate_per_candy: "",                                   // 14. RATE PER CANDY
  delivery_address: "",                                 // 15. DELIVERY ADDRESS
  gst_rate: "5",                                        // USER EDITABLE GST RATE %
  status: "draft"
};

// Step 3 Loading Details: Module 1 has 6 fields; Module 2 has 7 fields
const blankLoadingDetails = {
  vehicle_number: "",          // 1. Truck /tempo number
  net_weight_quintals: "",     // 2. Net Weight quintals
  driver_license_number: "",   // 3. Driver license no.
  driver_contact_number: "",   // 4. Driver contact number (Net Cotton only)
  transport_number: "",        // Transport no. (CS: #4, NC: #5)
  transport_name: "",          // Transport name (CS: #5, NC: #6)
  lr_number: ""                // Lr no. (CS: #6, NC: #7)
};

const demoContracts = [];

function useContracts(offlineOverride = false) {
  const [contracts, setContracts] = useState(() => {
    try {
      const saved = localStorage.getItem("seedledger_contracts_v3");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const demoMode = !isSupabaseConfigured || offlineOverride;

  const setContractsAndPersist = (updater) => {
    setContracts(old => {
      const next = typeof updater === "function" ? updater(old) : updater;
      try { localStorage.setItem("seedledger_contracts_v3", JSON.stringify(next)); } catch (e) {}
      return next;
    });
  };

  async function refresh() {
    // 1. Load locally saved contracts
    let localSaved = [];
    try {
      const saved = localStorage.getItem("seedledger_contracts_v3");
      if (saved) localSaved = JSON.parse(saved);
    } catch (e) {
      localSaved = [];
    }

    if (demoMode) {
      setContracts(localSaved);
      return;
    }

    try {
      const { data: remoteData, error: queryError } = await supabase
        .from("contracts").select("*").order("created_at", { ascending: false });

      if (queryError) {
        setContracts(localSaved);
        setError(queryError.message);
      } else if (remoteData) {
        // Merge remote contracts with local contracts so offline/local contracts (like local- or offline-) are never lost
        const remoteIds = new Set(remoteData.map(c => c.id));
        const nonDuplicateLocal = localSaved.filter(c => !remoteIds.has(c.id));
        const merged = [...remoteData, ...nonDuplicateLocal];

        // Also ensure any Net Cotton / Cotton Seed distinction is normalized
        const normalized = merged.map(c => {
          let mod = c.module;
          if (!mod) {
            if (c.commodity === "COTTON BALES" || c.pr_number || c.rate_per_candy || c.lot_number) {
              mod = "net_cotton";
            } else {
              mod = "cotton_seed";
            }
          }
          return { ...c, module: mod };
        });

        setContracts(normalized);
        try {
          localStorage.setItem("seedledger_contracts_v3", JSON.stringify(normalized));
        } catch (e) {}
      }
    } catch (err) {
      setContracts(localSaved);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);
  return { contracts, setContracts: setContractsAndPersist, refresh, loading, error, demoMode };
}

export default function App() {
  const [session, setSession] = useState(null);
  const [offlineMode, setOfflineMode] = useState(() => localStorage.getItem("seedledger_offline_mode") === "true");
  const [authChecked, setAuthChecked] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeModule, setActiveModule] = useState(() => localStorage.getItem("active_app_module") || "cotton_seed");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlinePending, setOfflinePending] = useState(() => getOfflineQueue().length);
  const [isSyncing, setIsSyncing] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const data = useContracts(offlineMode);

  const switchModule = (mod) => {
    setActiveModule(mod);
    localStorage.setItem("active_app_module", mod);
  };

  useEffect(() => {
    if (!isSupabaseConfigured || offlineMode) { setAuthChecked(true); return; }
    supabase.auth.getSession().then(({ data: { session: current } }) => {
      setSession(current); setAuthChecked(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, current) => setSession(current));
    return () => listener.subscription.unsubscribe();
  }, [offlineMode]);

  useEffect(() => { if (session && !data.demoMode) data.refresh(); }, [session?.user?.id]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);
    const handleQueueChange = () => setOfflinePending(getOfflineQueue().length);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("offline-queue-changed", handleQueueChange);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("offline-queue-changed", handleQueueChange);
    };
  }, []);

  const triggerSync = async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    try {
      await syncOfflineQueue();
      setOfflinePending(getOfflineQueue().length);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    localStorage.removeItem("seedledger_offline_mode");
    setOfflineMode(false);
    setSession(null);
  };

  if (!authChecked) return <div className="boot-screen"><div className="app-logo-badge"><img src="/logo.svg" alt="Logo" className="app-logo-img" style={{ width: 60 }}/></div><span>Loading Shree Jagdamba System…</span></div>;
  if (isSupabaseConfigured && !session && !offlineMode) return <Login onLogin={setSession} onOffline={() => {
    setOfflineMode(true);
    localStorage.setItem("seedledger_offline_mode", "true");
  }} />;

  const moduleName = activeModule === "net_cotton" ? "Net Cotton" : "Cotton Seed";
  const commodityName = activeModule === "net_cotton" ? "COTTON BALES" : "COTTON SEED";

  const pageTitle = ({
    "/": "Overview",
    "/contracts": "Contract Register",
    "/contracts/new": `Step 1: ${moduleName} Contract Details`,
    "/confirmations": "Step 2: Send to Buyer",
    "/loading": "Step 3: Loading Management",
    "/gate-passes": "Step 4: Gate Passes",
    "/parties": "Parties",
    "/daily-purchase": "Cotton Daily Purchase",
    "/triplicate-billing": "Triplicate Billing (Cash & Debit)",
    "/procurement-reports": "Procurement & Heap Reports"
  })[location.pathname] || "Workspace";

  return (
    <div className="app-shell">
      {mobileOpen && <button className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label="Close menu" />}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`} style={{ overflowY: "auto" }}>
        <div className="brand">
          <div className="app-logo-badge"><img src="/logo.svg" alt="Shree Jagdamba" className="app-logo-img"/></div>
          <div><strong>Shree Jagdamba</strong><span>{commodityName}</span></div>
          <button className="icon-button sidebar-close" onClick={() => setMobileOpen(false)}><X size={18}/></button>
        </div>

        {/* Module Switcher Tab */}
        <div style={{ padding: "0 10px 16px" }}>
          <div style={{ background: "rgba(255, 255, 255, 0.08)", padding: 4, borderRadius: 10, display: "flex", gap: 4 }}>
            <button
              onClick={() => switchModule("cotton_seed")}
              style={{
                flex: 1, padding: "7px 6px", fontSize: 11, fontWeight: 700, border: 0, borderRadius: 7, cursor: "pointer",
                background: activeModule === "cotton_seed" ? "#ffffff" : "transparent",
                color: activeModule === "cotton_seed" ? "#0f172a" : "#94a3b8"
              }}
            >
              Module 1: Seed
            </button>
            <button
              onClick={() => switchModule("net_cotton")}
              style={{
                flex: 1, padding: "7px 6px", fontSize: 11, fontWeight: 700, border: 0, borderRadius: 7, cursor: "pointer",
                background: activeModule === "net_cotton" ? "#ffffff" : "transparent",
                color: activeModule === "net_cotton" ? "#0f172a" : "#94a3b8"
              }}
            >
              Module 2: Net Cotton
            </button>
          </div>
        </div>

        <div className="workspace-label">{moduleName.toUpperCase()} WORKFLOW</div>
        <nav className="nav-list">
          <NavItem to="/" icon={<LayoutDashboard size={18}/>} label="Overview" onClick={() => setMobileOpen(false)} />
          <NavItem to="/contracts" icon={<FileText size={18}/>} label="Contract Register" count={data.contracts.filter(c => (c.module || "cotton_seed") === activeModule).length} onClick={() => setMobileOpen(false)} />
          <NavItem to="/contracts/new" icon={<FilePlus2 size={18}/>} label="Step 1: New Contract" onClick={() => setMobileOpen(false)} />
          <NavItem to="/confirmations" icon={<Send size={18}/>} label="Step 2: Send to Buyer" onClick={() => setMobileOpen(false)} />
          <NavItem to="/loading" icon={<Truck size={18}/>} label="Step 3: Loading" onClick={() => setMobileOpen(false)} />
          <NavItem to="/gate-passes" icon={<PackageCheck size={18}/>} label="Step 4: Gate Passes" onClick={() => setMobileOpen(false)} />
          <NavItem to="/parties" icon={<Users size={18}/>} label="Parties" onClick={() => setMobileOpen(false)} />
        </nav>

        {/* MAKE DIFFER SECTION: FARMER PROCUREMENT */}
        <div className="workspace-label" style={{ marginTop: 20, color: "#38bdf8" }}>FARMER PROCUREMENT</div>
        <nav className="nav-list">
          <NavItem to="/daily-purchase" icon={<Scale size={18}/>} label="Daily Purchase" onClick={() => setMobileOpen(false)} />
          <NavItem to="/triplicate-billing" icon={<Receipt size={18}/>} label="Triplicate Billing" onClick={() => setMobileOpen(false)} />
          <NavItem to="/procurement-reports" icon={<BarChart3 size={18}/>} label="Heap & Cash Reports" onClick={() => setMobileOpen(false)} />
        </nav>

        <div className="sidebar-bottom">
          <div className="secure-card"><ShieldCheck size={18}/><div><strong>{moduleName} Desk</strong><span>4-Step Contract & Gate Pass</span></div></div>
          <div className="profile-row"><div className="avatar">BO</div><div className="profile-copy"><strong>Broker Office</strong><span>Authorized</span></div><button className="icon-button" onClick={signOut} title="Sign out"><LogOut size={16}/></button></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button menu-toggle" onClick={() => setMobileOpen(true)} aria-label="Open navigation menu"><Menu size={20}/></button>
            <div className="breadcrumbs">
              <span className="crumb-workspace">{moduleName} Workspace</span>
              <span className="crumb-slash">/</span>
              <strong className="crumb-current">{pageTitle}</strong>
            </div>
          </div>
          <div className="topbar-actions">
            {/* Quick Switcher (Desktop only; on mobile it is in the slide-out menu) */}
            <div className="topbar-module-switcher">
              <button
                onClick={() => switchModule("cotton_seed")}
                style={{
                  border: 0, padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
                  background: activeModule === "cotton_seed" ? "#0f172a" : "transparent",
                  color: activeModule === "cotton_seed" ? "#ffffff" : "#64748b"
                }}
              >
                Module 1: Cotton Seed (13 fields)
              </button>
              <button
                onClick={() => switchModule("net_cotton")}
                style={{
                  border: 0, padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
                  background: activeModule === "net_cotton" ? "#0f172a" : "transparent",
                  color: activeModule === "net_cotton" ? "#ffffff" : "#64748b"
                }}
              >
                Module 2: Net Cotton (15 fields)
              </button>
            </div>

            {/* Network / Offline Sync Status Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 10px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                background: !isOnline ? "#fef2f2" : offlinePending > 0 ? "#fffbeb" : "#f0fdf4",
                color: !isOnline ? "#ef4444" : offlinePending > 0 ? "#b45309" : "#16a34a",
                border: `1px solid ${!isOnline ? "#fecaca" : offlinePending > 0 ? "#fde68a" : "#bbf7d0"}`
              }}
              title={!isOnline ? "Working offline. Entries stored locally in factory device." : offlinePending > 0 ? `${offlinePending} items queued to sync` : "All factory records synced"}
            >
              {!isOnline ? (
                <>
                  <WifiOff size={13} />
                  <span>Offline</span>
                </>
              ) : offlinePending > 0 ? (
                <button
                  onClick={triggerSync}
                  style={{ background: "none", border: "none", color: "inherit", font: "inherit", display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer", padding: 0 }}
                >
                  <RefreshCw size={12} className={isSyncing ? "spin-sync" : ""} />
                  <span>Sync ({offlinePending})</span>
                </button>
              ) : (
                <>
                  <Wifi size={13} />
                  <span>Online</span>
                </>
              )}
            </div>

            <div className="today-pill"><CalendarDays size={15}/>{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
            <div className="top-avatar" title="Broker Office Authorized">BO</div>
          </div>
        </header>

        {data.demoMode && <div className="demo-banner" style={{ background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" }}><Activity size={15}/><span><strong>Active Workspace ({moduleName})</strong> — Follows the exact specification PDF for {moduleName} with zero extra fields.</span></div>}
        {data.error && <div className="error-banner">{data.error}</div>}

        <div className="page-content">
          <Routes>
            <Route path="/" element={<Dashboard data={data} activeModule={activeModule} switchModule={switchModule} />} />
            <Route path="/contracts" element={<ContractRegister data={data} activeModule={activeModule} />} />
            <Route path="/contracts/new" element={<ContractForm data={data} activeModule={activeModule} />} />
            <Route path="/confirmations" element={<ConfirmationsPage data={data} activeModule={activeModule} />} />
            <Route path="/contracts/:id" element={<ContractDetail data={data} activeModule={activeModule} />} />
            <Route path="/loading" element={<LoadingPage data={data} activeModule={activeModule} />} />
            <Route path="/gate-passes" element={<GatePasses data={data} activeModule={activeModule} />} />
            <Route path="/parties" element={<PartiesPage data={data} activeModule={activeModule} />} />
            <Route path="/daily-purchase" element={<DailyPurchasePage />} />
            <Route path="/triplicate-billing" element={<TriplicateBillingPage />} />
            <Route path="/procurement-reports" element={<ProcurementReportsPage />} />
            <Route path="*" element={<Dashboard data={data} activeModule={activeModule} switchModule={switchModule} />} />
          </Routes>
        </div>
        <footer className="footer">
          <span>© {new Date().getFullYear()} Shree Jagdamba — {moduleName} System</span>
          <span><span className="status-dot"/> Exact 4-Step Contract & Gate Pass Workflow</span>
        </footer>
      </main>
    </div>
  );
}

function NavItem({ to, icon, label, count, onClick }) {
  return <NavLink to={to} end={to === "/"} onClick={onClick} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}><span className="nav-icon">{icon}</span><span>{label}</span>{count != null && <span className="nav-count">{count}</span>}</NavLink>;
}

function Login({ onLogin, onOffline }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message);
    } else {
      onLogin(data.session);
    }
    setBusy(false);
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-brand-header">
          <div className="login-logo-container">
            <img src="/logo.svg" alt="Shree Jagdamba" className="login-logo" />
          </div>
          <h1 className="login-title">Sign In</h1>
          <p className="login-subtitle">Enter your credentials to access your account</p>
        </div>

        {error && (
          <div className="login-error-alert" role="alert">
            <span>{error}</span>
          </div>
        )}

        <form className="login-form-fields" onSubmit={submit} autoComplete="on">
          <div className="login-field-group">
            <label htmlFor="login-email">Email Address</label>
            <div className="login-input-wrap">
              <Mail size={18} className="login-input-icon" />
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@company.com"
                disabled={busy}
              />
            </div>
          </div>

          <div className="login-field-group">
            <label htmlFor="login-password">Password</label>
            <div className="login-input-wrap">
              <Lock size={18} className="login-input-icon" />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={busy}
              />
              <button
                type="button"
                className="login-toggle-pw"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="login-submit-btn" disabled={busy}>
            {busy ? (
              <span>Signing in…</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {onOffline && (
          <div className="login-offline-section">
            <div className="login-divider">
              <span>or</span>
            </div>
            <button
              type="button"
              className="login-offline-btn"
              onClick={onOffline}
            >
              Demo Access (Offline Mode)
            </button>
          </div>
        )}

        <div className="login-card-footer">
          <ShieldCheck size={14} />
          <span>Secure Broker Office Workspace</span>
        </div>
      </div>
    </div>
  );
}

function PageHeading({ eyebrow, title, description, action }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function StatCard({ label, value, change, icon, tone = "blue", onClick }) {
  return (
    <div className={`stat-card ${onClick ? "workflow-clickable" : ""}`} onClick={onClick}>
      <div className="stat-top"><span>{label}</span><span className={`stat-icon ${tone}`}>{icon}</span></div>
      <div className="stat-value">{value}</div>
      <div className="stat-foot"><span className="stat-note">{change}</span></div>
    </div>
  );
}

function Dashboard({ data, activeModule, switchModule }) {
  const isNetCotton = activeModule === "net_cotton";
  const modContracts = data.contracts.filter(c => (c.module || "cotton_seed") === activeModule);
  const confirmed = modContracts.filter(c => ["confirmed", "loading", "completed"].includes(c.status)).length;
  const loadingCount = modContracts.filter(c => c.status === "loading").length;
  const completedCount = modContracts.filter(c => c.status === "completed").length;
  const navigate = useNavigate();

  const moduleName = isNetCotton ? "Net Cotton" : "Cotton Seed";
  const termsList = isNetCotton ? NET_COTTON_TERMS : COTTON_SEED_TERMS;

  return <>
    <PageHeading
      eyebrow={`MODULE ${isNetCotton ? "2: NET COTTON (COTTON BALES)" : "1: COTTON SEED"}`}
      title={`${moduleName} Operations Overview`}
      description={`Exact 4-step workflow from the ${moduleName} specification PDF.`}
      action={<button className="button primary" onClick={() => navigate("/contracts/new")}><Plus size={17}/> Step 1: New Contract</button>}
    />

    <div className="stat-grid">
      <StatCard label="Total Contracts" value={modContracts.length} change={`Active in ${moduleName}`} tone="blue" icon={<FileText size={20}/>} onClick={() => navigate("/contracts")}/>
      <StatCard label="Step 2: Sent to Buyer" value={confirmed} change="Confirmations sent" tone="blue" icon={<Send size={20}/>} onClick={() => navigate("/confirmations")}/>
      <StatCard label="Step 3: Loading" value={loadingCount} change="In loading stage" tone="amber" icon={<Truck size={20}/>} onClick={() => navigate("/loading")}/>
      <StatCard label="Step 4: Gate Passes" value={completedCount} change="Dispatched with pass" tone="green" icon={<PackageCheck size={20}/>} onClick={() => navigate("/gate-passes")}/>
    </div>

    {/* Exact 4-Step Visual Workflow */}
    <section className="panel" style={{ marginTop: 22 }}>
      <div className="panel-heading">
        <div>
          <h2>4-Step Workflow Pipeline ({moduleName})</h2>
          <p>Strictly matches the {moduleName} specification document</p>
        </div>
      </div>
      <div className="workflow-stepper-grid">
        <div className="workflow-step-card" onClick={() => navigate("/contracts/new")}>
          <div className="workflow-step-header">
            <span className="step-badge">STEP 1</span>
            <FilePlus2 size={20} className="step-icon text-blue"/>
          </div>
          <h3>{moduleName} Contract Details</h3>
          <p>{isNetCotton ? "15 fields: Date, Contract No, Party, GST, Address, Contact, Broker Name & Firm Name, PR No, Lot No, Qty, Cotton Bales, Delivery & Payment conditions, Rate per Candy, Address." : "13 fields: Date, Contract No, Party, GST, Address, Contact, Qty, Cotton Seed, Delivery & Payment conditions, Rate per Quintals, Packing (Loose/Bags), Address."}</p>
          <div className="step-action-row"><span>New Contract</span><ArrowRight size={14}/></div>
        </div>

        <div className="workflow-step-card" onClick={() => navigate("/confirmations")}>
          <div className="workflow-step-header">
            <span className="step-badge">STEP 2</span>
            <Send size={20} className="step-icon text-purple"/>
          </div>
          <h3>Generate Contract & Send to Buyer</h3>
          <p>Generate confirmation PDF with details, 5 terms, and 3 signatures. Send to buyer via MAIL or WHAT (WhatsApp).</p>
          <div className="step-action-row"><span>Send to Buyer</span><ArrowRight size={14}/></div>
        </div>

        <div className="workflow-step-card" onClick={() => navigate("/loading")}>
          <div className="workflow-step-header">
            <span className="step-badge">STEP 3</span>
            <Truck size={20} className="step-icon text-amber"/>
          </div>
          <h3>Loading Details as per Contract</h3>
          <p>{isNetCotton ? "7 loading fields: Truck/tempo, Net weight, Driver license, Driver contact, Transport no, Transporter name, and LR no." : "6 loading fields: Truck/tempo number, Net Weight quintals, Driver license no., Transport no., Transport name, and Lr no."}</p>
          <div className="step-action-row"><span>Record Loading</span><ArrowRight size={14}/></div>
        </div>

        <div className="workflow-step-card" onClick={() => navigate("/gate-passes")}>
          <div className="workflow-step-header">
            <span className="step-badge">STEP 4</span>
            <PackageCheck size={20} className="step-icon text-green"/>
          </div>
          <h3>Generate Gate Pass With All Details</h3>
          <p>Consolidate all Contract details and Loading details into an official Gate Pass document.</p>
          <div className="step-action-row"><span>View Gate Passes</span><ArrowRight size={14}/></div>
        </div>
      </div>
    </section>

    <div className="dashboard-grid" style={{ marginTop: 22 }}>
      <section className="panel">
        <div className="panel-heading">
          <div><h2>Recent {moduleName} Contracts</h2><p>Latest entries registered</p></div>
          <button className="text-button" onClick={() => navigate("/contracts")}>View all <ArrowRight size={14}/></button>
        </div>
        <ContractTable contracts={modContracts.slice(0, 5)} onOpen={id => navigate(`/contracts/${id}`)} isNetCotton={isNetCotton} compact/>
      </section>

      <section className="panel helper-panel">
        <div className="panel-heading">
          <div><h2>Terms & Conditions</h2><p>5 Terms as per {moduleName} PDF</p></div>
          <ShieldCheck size={20}/>
        </div>
        <ol style={{ paddingLeft: 18, fontSize: 11.5, lineHeight: 1.7, color: "#475569", margin: "0 0 16px" }}>
          {termsList.map((t, idx) => <li key={idx} style={{ marginBottom: 6 }}>{t}</li>)}
        </ol>
        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12, fontSize: 11, color: "#64748b" }}>
          <strong>Signatures Required:</strong> Broker Sign & Stamp, Buyer Sign & Stamp, Seller Sign & Stamp.
        </div>
      </section>
    </div>
  </>;
}

function ContractRegister({ data, activeModule }) {
  const isNetCotton = activeModule === "net_cotton";
  const moduleName = isNetCotton ? "Net Cotton" : "Cotton Seed";
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    return data.contracts
      .filter(c => (c.module || "cotton_seed") === activeModule)
      .filter(c => {
        const matchFilter = filter === "all" ? true : c.status === filter;
        const q = search.toLowerCase();
        const matchSearch = !q ||
          (c.party_name && c.party_name.toLowerCase().includes(q)) ||
          (c.contract_number && c.contract_number.toLowerCase().includes(q)) ||
          (c.delivery_address && c.delivery_address.toLowerCase().includes(q));
        return matchFilter && matchSearch;
      });
  }, [data.contracts, activeModule, filter, search]);

  return <>
    <PageHeading
      eyebrow={`MODULE: ${moduleName.toUpperCase()}`}
      title={`${moduleName} Contract Register`}
      description={`View and manage all ${moduleName} contracts across the 4-step lifecycle.`}
      action={<button className="button primary" onClick={() => navigate("/contracts/new")}><Plus size={17}/> Step 1: New Contract</button>}
    />

    <div className="filter-bar">
      <div className="search-box">
        <Search size={16}/>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${moduleName} contracts…`}/>
      </div>
      <div className="filter-pills">
        {["all", "draft", "confirmed", "loading", "completed"].map(s => (
          <button key={s} className={`filter-pill ${filter === s ? "active" : ""}`} onClick={() => setFilter(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
    </div>

    <section className="panel">
      {filtered.length ? (
        <ContractTable contracts={filtered} onOpen={id => navigate(`/contracts/${id}`)} isNetCotton={isNetCotton}/>
      ) : (
        <div className="empty-state">
          <FileText size={28}/>
          <strong>No {moduleName} contracts found</strong>
          <span>Click Step 1: New Contract to create one.</span>
        </div>
      )}
    </section>
  </>;
}

function ConfirmationsPage({ data, activeModule }) {
  const isNetCotton = activeModule === "net_cotton";
  const moduleName = isNetCotton ? "Net Cotton" : "Cotton Seed";
  const modContracts = data.contracts.filter(c => (c.module || "cotton_seed") === activeModule);
  const navigate = useNavigate();

  return <>
    <PageHeading
      eyebrow={`STEP 02 / ${moduleName.toUpperCase()}`}
      title="Step 2: Send to Buyer"
      description={`Generate the ${moduleName} contract after confirmation and send to the buyer via WhatsApp ('WHAT') or Email ('MAIL').`}
    />
    <section className="panel">
      <div className="panel-heading">
        <div><h2>Contracts for Confirmation</h2><p>Select any contract to review and dispatch to Buyer</p></div>
        <Send size={19}/>
      </div>
      {modContracts.length ? (
        <ContractTable contracts={modContracts} onOpen={id => navigate(`/contracts/${id}?step=2`)} isNetCotton={isNetCotton}/>
      ) : (
        <div className="empty-state">
          <Send size={26}/>
          <strong>No {moduleName} contracts available</strong>
          <span>Create a contract first in Step 1.</span>
        </div>
      )}
    </section>
  </>;
}

function ContractTable({ contracts, onOpen, isNetCotton = false, compact = false }) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Contract No.</th>
            <th>Party Name</th>
            <th>Date</th>
            <th>Quantity</th>
            {isNetCotton ? <th>Rate / Candy</th> : <th>Rate / Quintal</th>}
            <th>Total Amount</th>
            {isNetCotton ? <th>PR / Lot</th> : <th>Packing</th>}
            <th>Status</th>
            {!compact && <th/>}
          </tr>
        </thead>
        <tbody>
          {contracts.map(c => {
            const rawQtyMatch = String(c.quantity || "").match(/[\d.]+/);
            const qNum = rawQtyMatch ? parseFloat(rawQtyMatch[0]) : 0;
            const rNum = isNetCotton ? (parseFloat(c.rate_per_candy) || 0) : (parseFloat(c.rate_per_quintal) || 0);
            const gstR = parseFloat(c.gst_rate) >= 0 ? parseFloat(c.gst_rate) : 5;
            const sub = qNum * rNum;
            const totalWithGst = sub > 0 ? sub + (sub * (gstR / 100)) : 0;

            return (
              <tr key={c.id} onClick={() => onOpen && onOpen(c.id)} className={onOpen ? "clickable-row" : ""}>
                <td data-label="Contract No.">
                  <strong className="contract-code">{c.contract_number || "Draft"}</strong>
                  <small className="cell-sub">{c.commodity}</small>
                </td>
                <td data-label="Party Name"><span className="party-cell" style={{ fontWeight: 600, color: "#0f172a" }}>{c.party_name || "—"}</span></td>
                <td data-label="Date"><span style={{ color: "#64748b", fontSize: 12.5 }}>{c.contract_date || "—"}</span></td>
                <td data-label="Quantity"><strong>{c.quantity || "—"}</strong></td>
                {isNetCotton ? (
                  <td data-label="Rate">{c.rate_per_candy ? `₹${Number(c.rate_per_candy).toLocaleString("en-IN")}` : "—"}</td>
                ) : (
                  <td data-label="Rate">{c.rate_per_quintal ? `₹${Number(c.rate_per_quintal).toLocaleString("en-IN")}` : "—"}</td>
                )}
                <td data-label="Total Amount">
                  {totalWithGst > 0 ? (
                    <strong style={{ color: "#16a34a", fontSize: 13 }}>
                      ₹{Math.round(totalWithGst).toLocaleString("en-IN")}
                    </strong>
                  ) : "—"}
                </td>
                {isNetCotton ? (
                  <td data-label="PR / Lot">
                    <small style={{ fontWeight: 600, color: "#64748b" }}>
                      {c.pr_no ? `PR: ${c.pr_no}` : ""} {c.lot_no ? `| Lot: ${c.lot_no}` : ""}
                    </small>
                  </td>
                ) : (
                  <td data-label="Packing"><span className="packing-tag">{c.packing_type || "LOOSE"}</span></td>
                )}
                <td data-label="Status"><StatusBadge status={c.status}/></td>
                {!compact && <td><ArrowRight size={16} className="row-arrow"/></td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }) {
  const label = ({ draft: "Draft", pending: "Pending confirmation", confirmed: "Confirmed", loading: "Loading", completed: "Completed" })[status] || status || "Draft";
  return <span className={`status-badge status-${status || "draft"}`}><i/>{label}</span>;
}

// ==========================================
// STEP 1 & STEP 2: CONTRACT CREATION WIZARD
// ==========================================
function ContractForm({ data, activeModule }) {
  const isNetCotton = activeModule === "net_cotton";
  const [formStep, setFormStep] = useState(1);
  const [form, setForm] = useState(() => (isNetCotton ? { ...blankNetCotton } : { ...blankCottonSeed }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Rapid Keyboard Mode refs
  const contractRefs = useRef({});

  const handleContractKeyDown = (e, fieldName) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const netCottonOrder = [
        "contract_date", "contract_number", "party_name", "gst_number", "party_address",
        "contact_number", "broker_name_and_firm_name", "pr_no", "lot_no", "quantity",
        "delivery_condition", "payment_condition", "rate_per_candy", "gst_rate", "delivery_address"
      ];
      const cottonSeedOrder = [
        "contract_date", "contract_number", "party_name", "gst_number", "party_address",
        "contact_number", "quantity", "delivery_condition", "payment_condition",
        "rate_per_quintal", "gst_rate", "packing_type", "delivery_address"
      ];
      const order = isNetCotton ? netCottonOrder : cottonSeedOrder;
      const idx = order.indexOf(fieldName);
      if (idx !== -1 && idx < order.length - 1) {
        contractRefs.current[order[idx + 1]]?.focus();
      } else if (idx === order.length - 1) {
        contractRefs.current["submit_step1_btn"]?.focus();
      }
    }
  };

  useEffect(() => {
    setForm(isNetCotton ? { ...blankNetCotton } : { ...blankCottonSeed });
    setFormStep(1);
  }, [activeModule]);

  const set = (key, value) => setForm(old => ({ ...old, [key]: value }));

  const validateStep1 = () => {
    setError("");
    if (!form.party_name?.trim()) {
      setError("Please enter 3. PARTY NAME before proceeding.");
      return false;
    }
    if (!form.quantity) {
      setError("Please enter QUANTITY.");
      return false;
    }
    if (isNetCotton && !form.rate_per_candy) {
      setError("Please enter 14. RATE PER CANDY.");
      return false;
    }
    if (!isNetCotton && !form.rate_per_quintal) {
      setError("Please enter 11. RATE PER QUINTALS.");
      return false;
    }
    if (!form.delivery_address?.trim()) {
      setError("Please enter DELIVERY ADDRESS.");
      return false;
    }
    return true;
  };

  const goToContract2 = (e) => {
    e.preventDefault();
    if (validateStep1()) {
      setFormStep(2);
    }
  };

  async function saveContract(e) {
    if (e) e.preventDefault();
    setSaving(true);
    setError("");

    const prefix = isNetCotton ? "NC" : "CS";
    const generatedNumber = form.contract_number?.trim() || `${prefix}-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const finalForm = {
      ...form,
      contract_number: generatedNumber,
      module: activeModule,
      commodity: isNetCotton ? "COTTON BALES" : "COTTON SEED"
    };

    if (data.demoMode) {
      const newContract = {
        ...finalForm,
        id: "offline-" + Date.now(),
        status: "confirmed"
      };
      data.setContracts(old => [newContract, ...old]);
      generateContractPdf(newContract);
      navigate(`/contracts/${newContract.id}?step=2`);
      setSaving(false);
      return;
    }

    const user = (await supabase.auth.getUser()).data.user;

    // Build payload compatible with Supabase schema (maps UI fields to DB columns)
    const dbPayload = {
      contract_number: generatedNumber,
      contract_date: finalForm.contract_date || new Date().toLocaleDateString("en-CA"),
      party_name: finalForm.party_name,
      gst_number: finalForm.gst_number || null,
      party_address: finalForm.party_address || null,
      contact_number: finalForm.contact_number || null,
      delivery_address: finalForm.delivery_address || "",
      delivery_condition: finalForm.delivery_condition || "",
      payment_condition: finalForm.payment_condition || "",
      quantity_quintals: Number(parseFloat(finalForm.quantity) || 1),
      rate_per_quintal: Number(parseFloat(finalForm.rate_per_quintal || finalForm.rate_per_candy) || 0),
      packing_type: finalForm.packing_type || "LOOSE",
      status: "confirmed",
      created_by: user?.id,
      // Broker fields if present
      broker_name: finalForm.broker_name_and_firm_name || finalForm.broker_name || null,
      // Net cotton specific fields
      pr_number: finalForm.pr_no || null,
      lot_number: finalForm.lot_no || null,
      rate_per_candy: finalForm.rate_per_candy ? Number(finalForm.rate_per_candy) : null,
      commodity: isNetCotton ? "COTTON BALES" : "COTTON SEED"
    };

    let inserted = null;
    let insertError = null;

    const res = await supabase
      .from("contracts")
      .insert(dbPayload)
      .select()
      .single();

    inserted = res.data;
    insertError = res.error;

    // If Supabase table hasn't run the Net Cotton migration yet, save contract locally with full fields
    if (insertError) {
      console.warn("Supabase insert encountered error, saving contract locally:", insertError.message);
      const offlineContract = {
        ...finalForm,
        id: "local-" + Date.now(),
        status: "confirmed"
      };
      data.setContracts(old => [offlineContract, ...old]);
      generateContractPdf(offlineContract);

      // Save party into Supabase parties table or local fallback so it appears in Parties Directory
      if (finalForm.party_name) {
        supabase.from("parties").insert({
          name: finalForm.party_name,
          gst_number: finalForm.gst_number || null,
          address: finalForm.party_address || finalForm.delivery_address || null,
          contact_number: finalForm.contact_number || null,
          created_by: user?.id
        }).catch(() => {});
      }

      navigate(`/contracts/${offlineContract.id}?step=2`);
      setSaving(false);
      return;
    }

    const completeContract = { ...finalForm, ...inserted };
    data.setContracts(old => [completeContract, ...old]);
    generateContractPdf(completeContract);

    // Save party into Supabase parties table
    if (finalForm.party_name) {
      supabase.from("parties").insert({
        name: finalForm.party_name,
        gst_number: finalForm.gst_number || null,
        address: finalForm.party_address || finalForm.delivery_address || null,
        contact_number: finalForm.contact_number || null,
        created_by: user?.id
      }).catch(() => {});
    }

    await data.refresh();
    navigate(`/contracts/${inserted.id}?step=2`);
    setSaving(false);
  }

  const termsList = isNetCotton ? NET_COTTON_TERMS : COTTON_SEED_TERMS;
  const moduleName = isNetCotton ? "Net Cotton" : "Cotton Seed";

  return <>
    <button className="back-link" onClick={() => navigate("/contracts")}><ArrowLeft size={16}/> Back to contract register</button>
    <PageHeading
      eyebrow={`MODULE: ${moduleName.toUpperCase()} · STEP ${formStep}`}
      title={formStep === 1 ? `Step 1: ${moduleName} Contract Details` : `Step 2: Generate Contract & Send to Buyer`}
      description={formStep === 1 ? `Enter the exact ${isNetCotton ? "15" : "13"} fields from the ${moduleName} specification document.` : `Review terms, download contract PDF, and send to buyer via WhatsApp or Mail.`}
    />

    {/* Stepper Header */}
    <div className="contract-stepper">
      <button type="button" className={`stepper-tab ${formStep === 1 ? "active" : "done"}`} onClick={() => setFormStep(1)}>
        <div className="stepper-num">1</div>
        <div className="stepper-label">
          <strong>Step 1: Contract Details</strong>
          <span>Exact {isNetCotton ? "15" : "13"} fields from PDF</span>
        </div>
      </button>
      <button type="button" className={`stepper-tab ${formStep === 2 ? "active" : ""}`} onClick={() => { if (validateStep1()) setFormStep(2); }}>
        <div className="stepper-num">2</div>
        <div className="stepper-label">
          <strong>Step 2: Send to Buyer</strong>
          <span>PDF, 5 Terms & 3 Signatures</span>
        </div>
      </button>
    </div>

    {error && <div className="form-error" style={{ marginBottom: 18 }}>{error}</div>}

    {formStep === 1 ? (
      /* STEP 1: FORM WITH EXACT PDF FIELDS */
      <form onSubmit={goToContract2}>
        <div className="form-layout">
          <div className="form-main">
            <section className="panel form-panel">
              <div className="form-section-heading">
                <span className="form-section-icon"><FileText size={18}/></span>
                <div>
                  <h2>{moduleName} Contract Details</h2>
                  <p>Exact fields specified in {moduleName} PDF</p>
                </div>
                <span className="required-note">* Required</span>
              </div>

              {/* Keyboard Quick Navigation Banner */}
              <div style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 8,
                padding: "8px 14px",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 11,
                color: "#166534"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CornerDownLeft size={14} color="#15803d" />
                  <span>
                    <strong>Rapid Keyboard Mode:</strong> Press <kbd style={{ background: "#dcfce7", border: "1px solid #86efac", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>Enter</kbd> to jump across contract fields and proceed directly to Step 2!
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#15803d", fontWeight: 600 }}>
                  <Sparkles size={13} />
                  <span>Rapid desk entry</span>
                </div>
              </div>

              {isNetCotton ? (
                /* MODULE 2: NET COTTON (15 EXACT FIELDS) */
                <div className="field-grid">
                  <Field label="1. DATE" required>
                    <input
                      ref={el => (contractRefs.current["contract_date"] = el)}
                      type="date"
                      required
                      value={form.contract_date}
                      onChange={e => set("contract_date", e.target.value)}
                      onKeyDown={e => handleContractKeyDown(e, "contract_date")}
                    />
                  </Field>
                  <Field label="2. CONTRACT NUMBER ." hint="Auto-generated if left blank">
                    <input
                      ref={el => (contractRefs.current["contract_number"] = el)}
                      value={form.contract_number}
                      onChange={e => set("contract_number", e.target.value)}
                      onKeyDown={e => handleContractKeyDown(e, "contract_number")}
                      placeholder="e.g. NC-2026-003"
                    />
                  </Field>
                  <Field label="3. PARTY NAME" required>
                    <input
                      ref={el => (contractRefs.current["party_name"] = el)}
                      required
                      value={form.party_name}
                      onChange={e => set("party_name", e.target.value)}
                      onKeyDown={e => handleContractKeyDown(e, "party_name")}
                      placeholder="Enter Party Name"
                    />
                  </Field>
                  <Field label="4. GST NUMBER">
                    <input
                      ref={el => (contractRefs.current["gst_number"] = el)}
                      value={form.gst_number}
                      onChange={e => set("gst_number", e.target.value)}
                      onKeyDown={e => handleContractKeyDown(e, "gst_number")}
                      placeholder="GST Number"
                    />
                  </Field>
                  <Field label="5. ADDREESS" wide>
                    <textarea
                      ref={el => (contractRefs.current["party_address"] = el)}
                      rows="2"
                      value={form.party_address}
                      onChange={e => set("party_address", e.target.value)}
                      onKeyDown={e => handleContractKeyDown(e, "party_address")}
                      placeholder="Full Party Address"
                    />
                  </Field>
                  <Field label="6. CONTACT NO.">
                    <input
                      ref={el => (contractRefs.current["contact_number"] = el)}
                      value={form.contact_number}
                      onChange={e => set("contact_number", e.target.value)}
                      onKeyDown={e => handleContractKeyDown(e, "contact_number")}
                      placeholder="+91 98765 43210"
                    />
                  </Field>
                  <Field label="7. BROKER NAME AND FIRM NAME" wide>
                    <input
                      ref={el => (contractRefs.current["broker_name_and_firm_name"] = el)}
                      value={form.broker_name_and_firm_name || ""}
                      onChange={e => set("broker_name_and_firm_name", e.target.value)}
                      onKeyDown={e => handleContractKeyDown(e, "broker_name_and_firm_name")}
                      placeholder="e.g. Shrenik Shah (Shrenik Cotton Brokers)"
                    />
                  </Field>
                  <Field label="8. PR NO .">
                    <input
                      ref={el => (contractRefs.current["pr_no"] = el)}
                      value={form.pr_no || ""}
                      onChange={e => set("pr_no", e.target.value)}
                      onKeyDown={e => handleContractKeyDown(e, "pr_no")}
                      placeholder="e.g. PR-105"
                    />
                  </Field>
                  <Field label="9. LOT NO.">
                    <input
                      ref={el => (contractRefs.current["lot_no"] = el)}
                      value={form.lot_no || ""}
                      onChange={e => set("lot_no", e.target.value)}
                      onKeyDown={e => handleContractKeyDown(e, "lot_no")}
                      placeholder="e.g. LOT-60"
                    />
                  </Field>
                  <Field label="10. QUANTITY" required hint="e.g. 100 Bales (170 qtl)">
                    <input
                      ref={el => (contractRefs.current["quantity"] = el)}
                      required
                      value={form.quantity}
                      onChange={e => set("quantity", e.target.value)}
                      onKeyDown={e => handleContractKeyDown(e, "quantity")}
                      placeholder="e.g. 100 Bales (170 qtl)"
                    />
                  </Field>
                  <Field label="11. COMMODITY : COTTON BALES" required>
                    <input value="COTTON BALES" readOnly style={{ background: "#f8fafc", fontWeight: 700, color: "#1e293b" }}/>
                  </Field>
                  <Field label="12. DELIVERY CONDITION" required>
                    <input
                      ref={el => (contractRefs.current["delivery_condition"] = el)}
                      required
                      value={form.delivery_condition}
                      onChange={e => set("delivery_condition", e.target.value)}
                      onKeyDown={e => handleContractKeyDown(e, "delivery_condition")}
                      placeholder="e.g. Ready Delivery / Ex-Factory / FOR"
                    />
                  </Field>
                  <Field label="13. PAYMENT CONDITION" required>
                    <input
                      ref={el => (contractRefs.current["payment_condition"] = el)}
                      required
                      value={form.payment_condition}
                      onChange={e => set("payment_condition", e.target.value)}
                      onKeyDown={e => handleContractKeyDown(e, "payment_condition")}
                      placeholder="e.g. Immediate / RTGS / 7 days"
                    />
                  </Field>
                  <Field label="14. RATE PER CANDY" required hint="Rate in ₹ per Candy">
                    <input
                      ref={el => (contractRefs.current["rate_per_candy"] = el)}
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={form.rate_per_candy}
                      onChange={e => set("rate_per_candy", e.target.value)}
                      onKeyDown={e => handleContractKeyDown(e, "rate_per_candy")}
                      placeholder="e.g. 58500"
                    />
                  </Field>
                  <Field label="GST RATE (%)" hint="Enter GST % (e.g. 5, 12, 18 or 0)">
                    <input
                      ref={el => (contractRefs.current["gst_rate"] = el)}
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={form.gst_rate ?? "5"}
                      onChange={e => set("gst_rate", e.target.value)}
                      onKeyDown={e => handleContractKeyDown(e, "gst_rate")}
                      placeholder="e.g. 5"
                    />
                  </Field>
                  <Field label="15. DELIVERY ADDRESS" required wide>
                    <textarea
                      ref={el => (contractRefs.current["delivery_address"] = el)}
                      required
                      rows="2"
                      value={form.delivery_address}
                      onChange={e => set("delivery_address", e.target.value)}
                      onKeyDown={e => handleContractKeyDown(e, "delivery_address")}
                      placeholder="Delivery destination address"
                    />
                  </Field>
                </div>
              ) : (
                /* MODULE 1: COTTON SEED (13 EXACT FIELDS) */
                <div className="field-grid">
                  <Field label="1. DATE" required>
                    <input
                      ref={el => (contractRefs.current["contract_date"] = el)}
                      type="date"
                      required
                      value={form.contract_date}
                      onChange={e => set("contract_date", e.target.value)}
                      onKeyDown={e => handleContractKeyDown(e, "contract_date")}
                    />
                  </Field>
                  <Field label="2. CONTRACT NUMBER ." hint="Auto-generated if left blank">
                    <input
                      ref={el => (contractRefs.current["contract_number"] = el)}
                      value={form.contract_number}
                      onChange={e => set("contract_number", e.target.value)}
                      onKeyDown={e => handleContractKeyDown(e, "contract_number")}
                      placeholder="e.g. CS-2026-003"
                    />
                  </Field>
                  <Field label="3. PARTY NAME" required>
                    <input
                      ref={el => (contractRefs.current["party_name"] = el)}
                      required
                      value={form.party_name}
                      onChange={e => set("party_name", e.target.value)}
                      onKeyDown={e => handleContractKeyDown(e, "party_name")}
                      placeholder="Enter Party Name"
                    />
                  </Field>
                  <Field label="4. GST NUMBER">
                    <input
                      ref={el => (contractRefs.current["gst_number"] = el)}
                      value={form.gst_number}
                      onChange={e => set("gst_number", e.target.value)}
                      onKeyDown={e => handleContractKeyDown(e, "gst_number")}
                      placeholder="GST Number"
                    />
                  </Field>
                  <Field label="5. ADDREESS" wide>
                    <textarea
                      ref={el => (contractRefs.current["party_address"] = el)}
                      rows="2"
                      value={form.party_address}
                      onChange={e => set("party_address", e.target.value)}
                      onKeyDown={e => handleContractKeyDown(e, "party_address")}
                      placeholder="Full Party Address"
                    />
                  </Field>
                  <Field label="6. CONTACT NO.">
                    <input
                      ref={el => (contractRefs.current["contact_number"] = el)}
                      value={form.contact_number}
                      onChange={e => set("contact_number", e.target.value)}
                      onKeyDown={e => handleContractKeyDown(e, "contact_number")}
                      placeholder="+91 98765 43210"
                    />
                  </Field>
                  <Field label="7. QUANTITY" required hint="Quantity in Quintals">
                    <input
                      ref={el => (contractRefs.current["quantity"] = el)}
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={form.quantity}
                      onChange={e => set("quantity", e.target.value)}
                      onKeyDown={e => handleContractKeyDown(e, "quantity")}
                      placeholder="Quantity in Quintals"
                    />
                  </Field>
                  <Field label="8. COMMODITY : COTTON SEED" required>
                    <input value="COTTON SEED" readOnly style={{ background: "#f8fafc", fontWeight: 700, color: "#1e293b" }}/>
                  </Field>
                  <Field label="9. DELIVERY CONDITION" required>
                    <input
                      ref={el => (contractRefs.current["delivery_condition"] = el)}
                      required
                      value={form.delivery_condition}
                      onChange={e => set("delivery_condition", e.target.value)}
                      onKeyDown={e => handleContractKeyDown(e, "delivery_condition")}
                      placeholder="e.g. Ready Delivery / Ex-Factory"
                    />
                  </Field>
                  <Field label="10. PAYMENT CONDITION" required>
                    <input
                      ref={el => (contractRefs.current["payment_condition"] = el)}
                      required
                      value={form.payment_condition}
                      onChange={e => set("payment_condition", e.target.value)}
                      onKeyDown={e => handleContractKeyDown(e, "payment_condition")}
                      placeholder="e.g. Immediate on delivery / RTGS"
                    />
                  </Field>
                  <Field label="11. RATE PER QUINTALS" required hint="Rate in ₹ per Quintal">
                    <input
                      ref={el => (contractRefs.current["rate_per_quintal"] = el)}
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={form.rate_per_quintal}
                      onChange={e => set("rate_per_quintal", e.target.value)}
                      onKeyDown={e => handleContractKeyDown(e, "rate_per_quintal")}
                      placeholder="e.g. 3650.00"
                    />
                  </Field>
                  <Field label="GST RATE (%)" hint="Enter GST % (e.g. 5, 12, 18 or 0)">
                    <input
                      ref={el => (contractRefs.current["gst_rate"] = el)}
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={form.gst_rate ?? "5"}
                      onChange={e => set("gst_rate", e.target.value)}
                      onKeyDown={e => handleContractKeyDown(e, "gst_rate")}
                      placeholder="e.g. 5"
                    />
                  </Field>
                  <Field label="12. PACKING TYPE :LOOSE/BAGS" required>
                    <select
                      ref={el => (contractRefs.current["packing_type"] = el)}
                      value={form.packing_type}
                      onChange={e => set("packing_type", e.target.value)}
                      onKeyDown={e => handleContractKeyDown(e, "packing_type")}
                    >
                      <option value="LOOSE">LOOSE</option>
                      <option value="BAGS">BAGS</option>
                    </select>
                  </Field>
                  <Field label="13. DELIVERY ADDRESS" required wide>
                    <textarea
                      ref={el => (contractRefs.current["delivery_address"] = el)}
                      required
                      rows="2"
                      value={form.delivery_address}
                      onChange={e => set("delivery_address", e.target.value)}
                      onKeyDown={e => handleContractKeyDown(e, "delivery_address")}
                      placeholder="Delivery destination address"
                    />
                  </Field>
                </div>
              )}
            </section>
          </div>

          <aside className="form-aside">
            <div className="panel preview-card">
              <div className="preview-top">
                <div className="preview-doc-icon"><FileCheck2 size={22}/></div>
                <span className="preview-label">STEP 1 CHECKLIST</span>
              </div>
              <h3>{moduleName} Summary</h3>
              <p>Proceed to Step 2 to generate the contract PDF and send to the buyer.</p>
              <div className="preview-line"/>
              {/* Live Calculations using user entered GST % */}
              {(() => {
                // If user enters "100 Bales" or "100 Bales (170 qtl)" or "100", extract the primary numeric quantity
                const rawQtyMatch = String(form.quantity || "").match(/[\d.]+/);
                const qtyNum = rawQtyMatch ? parseFloat(rawQtyMatch[0]) : 0;
                const rateNum = isNetCotton ? (parseFloat(form.rate_per_candy) || 0) : (parseFloat(form.rate_per_quintal) || 0);
                const gstRateNum = parseFloat(form.gst_rate) >= 0 ? parseFloat(form.gst_rate) : 5;
                const subtotal = qtyNum * rateNum;
                const gstAmount = subtotal * (gstRateNum / 100);
                const grandTotal = subtotal + gstAmount;

                return (
                  <>
                    <div className="preview-row"><span>Party</span><strong>{form.party_name || "—"}</strong></div>
                    <div className="preview-row"><span>Commodity</span><strong>{isNetCotton ? "COTTON BALES" : "COTTON SEED"}</strong></div>
                    <div className="preview-row"><span>Quantity</span><strong>{form.quantity || "—"}</strong></div>
                    {isNetCotton ? (
                      <div className="preview-row"><span>Rate / Candy</span><strong>{form.rate_per_candy ? `₹${Number(form.rate_per_candy).toLocaleString("en-IN")}` : "—"}</strong></div>
                    ) : (
                      <div className="preview-row"><span>Rate / Qtl</span><strong>{form.rate_per_quintal ? `₹${Number(form.rate_per_quintal).toLocaleString("en-IN")}` : "—"}</strong></div>
                    )}
                    <div className="preview-row"><span>GST Rate</span><strong>{gstRateNum}%</strong></div>

                    {subtotal > 0 && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed #cbd5e1" }}>
                        <div className="preview-row">
                          <span>Base Amount</span>
                          <strong>₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                        </div>
                        <div className="preview-row" style={{ color: "#64748b", fontSize: 11.5 }}>
                          <span>GST ({gstRateNum}%)</span>
                          <span>+ ₹{gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="preview-row" style={{ marginTop: 8, paddingTop: 10, borderTop: "2px solid #0f172a", fontSize: 14 }}>
                          <span style={{ fontWeight: 800, color: "#0f172a" }}>Total Payment Amount</span>
                          <strong style={{ color: "#16a34a", fontSize: 16, fontWeight: 800 }}>
                            ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </strong>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              <button
                ref={el => (contractRefs.current["submit_step1_btn"] = el)}
                type="submit"
                className="button primary full"
                style={{ marginTop: 16 }}
              >
                Next: Step 2 Send to Buyer <ArrowRight size={16}/>
              </button>
            </div>
          </aside>
        </div>
      </form>
    ) : (
      /* STEP 2: REVIEW & SEND TO BUYER */
      <div className="form-layout">
        <div className="form-main">
          <section className="panel" style={{ padding: 22, marginBottom: 20 }}>
            <div className="panel-heading" style={{ padding: 0, marginBottom: 14 }}>
              <div>
                <h2>Step 2: Generate the contract after conformation send to the buyer</h2>
                <p>Verify details and 5 terms before generating official PDF and dispatching</p>
              </div>
            </div>

            <div className="detail-fields" style={{ marginBottom: 20 }}>
              <Detail label="1. DATE" value={form.contract_date}/>
              <Detail label="2. CONTRACT NUMBER ." value={form.contract_number || "Auto-generated on save"}/>
              <Detail label="3. PARTY NAME" value={form.party_name}/>
              <Detail label="4. GST NUMBER" value={form.gst_number}/>
              <Detail label="5. ADDREESS" value={form.party_address}/>
              <Detail label="6. CONTACT NO." value={form.contact_number}/>
              {isNetCotton && <Detail label="7. BROKER NAME AND FIRM NAME" value={form.broker_name_and_firm_name}/>}
              {isNetCotton && <Detail label="8. PR NO ." value={form.pr_no}/>}
              {isNetCotton && <Detail label="9. LOT NO." value={form.lot_no}/>}
              <Detail label={isNetCotton ? "10. QUANTITY" : "7. QUANTITY"} value={form.quantity}/>
              <Detail label={isNetCotton ? "11. COMMODITY" : "8. COMMODITY"} value={isNetCotton ? "COTTON BALES" : "COTTON SEED"}/>
              <Detail label={isNetCotton ? "12. DELIVERY CONDITION" : "9. DELIVERY CONDITION"} value={form.delivery_condition}/>
              <Detail label={isNetCotton ? "13. PAYMENT CONDITION" : "10. PAYMENT CONDITION"} value={form.payment_condition}/>
              {isNetCotton ? (
                <Detail label="14. RATE PER CANDY" value={form.rate_per_candy ? `₹${Number(form.rate_per_candy).toLocaleString("en-IN")} / Candy` : "—"}/>
              ) : (
                <Detail label="11. RATE PER QUINTALS" value={form.rate_per_quintal ? `₹${Number(form.rate_per_quintal).toLocaleString("en-IN")} / Quintal` : "—"}/>
              )}
              {(() => {
                const rawQtyMatch = String(form.quantity || "").match(/[\d.]+/);
                const qtyNum = rawQtyMatch ? parseFloat(rawQtyMatch[0]) : 0;
                const rateNum = isNetCotton ? (parseFloat(form.rate_per_candy) || 0) : (parseFloat(form.rate_per_quintal) || 0);
                const gstRateNum = parseFloat(form.gst_rate) >= 0 ? parseFloat(form.gst_rate) : 5;
                const subtotal = qtyNum * rateNum;
                const gstAmount = subtotal * (gstRateNum / 100);
                const grandTotal = subtotal + gstAmount;
                if (subtotal <= 0) return null;
                return (
                  <>
                    <Detail label="ESTIMATED BASE AMOUNT" value={`₹${subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}/>
                    <Detail label={`TOTAL PAYMENT VALUE (INCL. ${gstRateNum}% GST)`} value={`₹${grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}/>
                  </>
                );
              })()}
              {!isNetCotton && <Detail label="12. PACKING TYPE :LOOSE/BAGS" value={form.packing_type}/>}
              <Detail label={isNetCotton ? "15. DELIVERY ADDRESS" : "13. DELIVERY ADDRESS"} value={form.delivery_address}/>
            </div>

            <h3 style={{ fontSize: 13, marginBottom: 10, color: "#1e293b" }}>Terms & Conditions :</h3>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12, lineHeight: 1.8, color: "#475569" }}>
              {termsList.map((t, idx) => <li key={idx} style={{ marginBottom: 6 }}>{t}</li>)}
            </ol>

            <div style={{ marginTop: 18, borderTop: "1px solid #e2e8f0", paddingTop: 14, fontSize: 11, color: "#64748b" }}>
              <strong>Signatures:</strong> Broker Sign & Stamp, Buyer Sign & Stamp, Seller Sign & Stamp
            </div>
          </section>

          <div className="step-nav-footer">
            <button type="button" className="button secondary" onClick={() => setFormStep(1)}>
              <ArrowLeft size={16}/> Back to Step 1 Details
            </button>
            <button type="button" className="button primary" disabled={saving} onClick={saveContract}>
              <Check size={16}/> {saving ? "Saving…" : "Save Contract & Generate PDF"}
            </button>
          </div>
        </div>

        <aside className="form-aside">
          <div className="panel preview-card">
            <div className="preview-top">
              <div className="preview-doc-icon"><FileText size={22}/></div>
              <span className="preview-label">STEP 2 READY</span>
            </div>
            <h3>Confirmation Dispatch</h3>
            <p>Once saved, the official contract PDF will be downloaded and you can send it to the buyer via WhatsApp or Email.</p>
            <button type="button" className="button primary full" disabled={saving} onClick={saveContract} style={{ marginTop: 16 }}>
              <Check size={16}/> {saving ? "Saving…" : "Confirm & Save"}
            </button>
          </div>
        </aside>
      </div>
    )}
  </>;
}

function Field({ label, required, hint, wide, children }) {
  return (
    <div className={`field ${wide ? "wide" : ""}`}>
      <label>{label} {required && <span className="req">*</span>}</label>
      {children}
      {hint && <small className="field-hint">{hint}</small>}
    </div>
  );
}

// ==========================================
// 4-STEP CONTRACT CONTROLLER (DETAILS -> SEND -> LOADING -> GATE PASS)
// ==========================================
function ContractDetail({ data }) {
  const location = useLocation();
  const navigate = useNavigate();
  const contractId = location.pathname.split("/")[2];
  const contract = data.contracts.find(c => String(c.id) === String(contractId));

  const isNetCotton = contract?.module === "net_cotton";
  const moduleName = isNetCotton ? "Net Cotton" : "Cotton Seed";
  const termsList = isNetCotton ? NET_COTTON_TERMS : COTTON_SEED_TERMS;

  const [loading, setLoading] = useState(blankLoadingDetails);
  const [message, setMessage] = useState("");
  const [contractDispatches, setContractDispatches] = useState([]);

  const searchParams = new URLSearchParams(location.search);
  const initialStep = Number(searchParams.get("step")) || 1;
  const [currentStep, setCurrentStep] = useState(initialStep);

  // Parse contract total quantity
  const rawQtyMatch = String(contract?.quantity || "").match(/[\d.]+/);
  const contractTotalQty = rawQtyMatch ? parseFloat(rawQtyMatch[0]) : 0;

  // Retrieve all dispatches logged specifically for this contract
  const loadDispatches = () => {
    if (!contract) return;
    try {
      const all = JSON.parse(localStorage.getItem("seedledger_gate_passes_v4") || "[]");
      const matched = all.filter(p => String(p.contract_id) === String(contract.id));
      setContractDispatches(matched);
    } catch (e) {
      setContractDispatches([]);
    }
  };

  useEffect(() => {
    loadDispatches();
  }, [contract?.id]);

  const totalDispatchedSoFar = contractDispatches.reduce((sum, p) => sum + (Number(p.loading_details?.net_weight_quintals) || 0), 0);
  const remainingBalanceQty = contractTotalQty > 0 ? Math.max(0, contractTotalQty - totalDispatchedSoFar) : 0;

  // Rapid Keyboard Mode refs for Loading Details
  const loadingRefs = useRef({});

  const handleLoadingKeyDown = (e, fieldName) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const order = isNetCotton
        ? ["vehicle_number", "net_weight_quintals", "driver_license_number", "driver_contact_number", "transport_number", "transport_name", "lr_number"]
        : ["vehicle_number", "net_weight_quintals", "driver_license_number", "transport_number", "transport_name", "lr_number"];
      const idx = order.indexOf(fieldName);
      if (idx !== -1 && idx < order.length - 1) {
        loadingRefs.current[order[idx + 1]]?.focus();
      } else if (idx === order.length - 1) {
        loadingRefs.current["submit_loading_btn"]?.focus();
      }
    }
  };

  useEffect(() => {
    const s = Number(searchParams.get("step")) || 1;
    setCurrentStep(s);
  }, [location.search]);

  if (!contract) {
    return <div className="panel empty-state"><strong>Contract not found</strong><button className="button primary" onClick={() => navigate("/contracts")}>Back to Register</button></div>;
  }

  const setStep = (s) => {
    setCurrentStep(s);
    navigate(`/contracts/${contract.id}?step=${s}`, { replace: true });
  };

  // Step 3 / 4: Save Truck Loading & Generate Gate Pass Immediately
  async function makeGatePass() {
    if (!loading.vehicle_number || !loading.net_weight_quintals || !loading.transport_name || !loading.lr_number) {
      setMessage("Please fill all dispatch fields (Vehicle No, Net Weight, Transporter Name, and LR No).");
      return;
    }

    const currentTruckWt = Number(loading.net_weight_quintals);
    if (currentTruckWt <= 0) {
      setMessage("Please enter a valid Net Weight in Quintals.");
      return;
    }

    const newTotalDispatched = totalDispatchedSoFar + currentTruckWt;
    const newRemaining = contractTotalQty > 0 ? Math.max(0, contractTotalQty - newTotalDispatched) : 0;
    const isFullyCompleted = contractTotalQty > 0 ? newRemaining <= 0.01 : true;
    const newContractStatus = isFullyCompleted ? "completed" : "partially_dispatched";

    const prefix = isNetCotton ? "GP-NC" : "GP-CS";
    const gateNum = `${prefix}-2026-` + Math.floor(1000 + Math.random() * 9000);

    const loadingPayload = {
      ...loading,
      contract_id: contract.id,
      net_weight_quintals: currentTruckWt,
      total_dispatched_prior: totalDispatchedSoFar,
      remaining_balance_after: newRemaining,
      created_at: new Date().toISOString()
    };

    const newGatePassRecord = {
      id: "gp-" + Date.now(),
      gate_pass_number: gateNum,
      contract_id: contract.id,
      module: contract.module || (isNetCotton ? "net_cotton" : "cotton_seed"),
      created_at: new Date().toISOString(),
      contracts: {
        id: contract.id,
        contract_number: contract.contract_number,
        party_name: contract.party_name,
        commodity: contract.commodity || (isNetCotton ? "COTTON BALES" : "COTTON SEED"),
        module: contract.module || (isNetCotton ? "net_cotton" : "cotton_seed"),
        quantity: contract.quantity
      },
      loading_details: loadingPayload
    };

    // 1. Save permanently in localStorage (seedledger_gate_passes_v4)
    try {
      const allPasses = JSON.parse(localStorage.getItem("seedledger_gate_passes_v4") || "[]");
      const updated = [newGatePassRecord, ...allPasses.filter(p => p.gate_pass_number !== gateNum)];
      localStorage.setItem("seedledger_gate_passes_v4", JSON.stringify(updated));
    } catch (e) {}

    // 2. Update contract in application state
    data.setContracts(old => old.map(c => {
      if (String(c.id) === String(contract.id)) {
        return {
          ...c,
          status: newContractStatus,
          dispatched_quantity: newTotalDispatched,
          remaining_quantity: newRemaining
        };
      }
      return c;
    }));

    // 3. Sync to Supabase in background
    if (isSupabaseConfigured && !data.demoMode) {
      try {
        const user = (await supabase.auth.getUser()).data.user;
        const { data: dbLoading } = await supabase.from("loading_details").insert({
          contract_id: contract.id,
          vehicle_number: loading.vehicle_number,
          net_weight_quintals: currentTruckWt,
          driver_license_number: loading.driver_license_number,
          driver_contact_number: loading.driver_contact_number || null,
          transport_number: loading.transport_number || null,
          transport_name: loading.transport_name,
          lr_number: loading.lr_number,
          created_by: user?.id
        }).select().single();

        if (dbLoading) {
          await supabase.from("gate_passes").insert({
            contract_id: contract.id,
            loading_detail_id: dbLoading.id,
            created_by: user?.id
          });
        }
        await supabase.from("contracts").update({ status: newContractStatus }).eq("id", contract.id);
      } catch (err) {
        console.warn("Supabase background sync:", err.message);
      }
    }

    // 4. Generate & Download official PDF
    generateGatePassPdf(contract, loadingPayload, gateNum);

    // Refresh state
    loadDispatches();
    setLoading(blankLoadingDetails);
    setMessage(`Gate Pass ${gateNum} successfully generated! Dispatched: ${currentTruckWt} Qtl. Remaining: ${newRemaining.toFixed(2)} Qtl.`);
    setStep(4);
  }

  // Step 3 save alias
  async function saveLoading(e) {
    if (e) e.preventDefault();
    await makeGatePass();
  }

  // Step 2: Send to Buyer via WhatsApp or Mail
  async function recordSent(channel) {
    const phone = (contract.contact_number || "").replace(/\D/g, "");
    if (channel === "whatsapp" && !phone) {
      setMessage("Add a contact phone number to dispatch WhatsApp confirmation.");
      return;
    }

    const days = isNetCotton ? "2 days" : "1 days";
    const text = `*Shree Jagdamba - ${moduleName} Contract Confirmation*\n` +
      `Contract No: ${contract.contract_number}\n` +
      `Party: ${contract.party_name}\n` +
      `Commodity: ${contract.commodity}\n` +
      (isNetCotton ? `PR No: ${contract.pr_no || "—"} | Lot No: ${contract.lot_no || "—"}\n` : "") +
      `Quantity: ${contract.quantity}\n` +
      (isNetCotton ? `Rate: INR ${contract.rate_per_candy} per Candy\n` : `Rate: INR ${contract.rate_per_quintal} per Quintal\n`) +
      `Delivery: ${contract.delivery_address}\n\n` +
      `Please sign and send contract confirmation within ${days} as agreed.`;

    const target = channel === "whatsapp"
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `mailto:?subject=${encodeURIComponent(moduleName + " Contract Confirmation " + contract.contract_number)}&body=${encodeURIComponent(text + "\n\nPlease find the contract confirmation attached.")}`;

    window.open(target, "_blank");

    if (!data.demoMode) {
      await supabase.from("contracts").update({ status: "pending" }).eq("id", contract.id);
      data.refresh();
    }
    setMessage(`Step 2: Confirmation sent to Buyer via ${channel === "whatsapp" ? "WhatsApp" : "Email"}.`);
  }

  const hasLoadingSaved = Boolean(loading.vehicle_number && loading.net_weight_quintals);

  return <>
    <button className="back-link" onClick={() => navigate("/contracts")}><ArrowLeft size={16}/> Back to contract register</button>
    
    <PageHeading
      eyebrow={`MODULE: ${moduleName.toUpperCase()} · STEP 0${currentStep}`}
      title={`${contract.contract_number || "Contract"} · ${currentStep === 1 ? "Step 1: Details" : currentStep === 2 ? "Step 2: Send to Buyer" : currentStep === 3 ? "Step 3: Loading Details" : "Step 4: Gate Pass"}`}
      description={`${contract.party_name || "Party not specified"} · ${contract.contract_date || "—"}`}
      action={
        <button className="button secondary" onClick={() => generateContractPdf(contract)}>
          <ArrowDownToLine size={16}/> Download Contract PDF
        </button>
      }
    />

    {/* 4-Step Stepper Bar */}
    <div className="contract-stepper">
      <button type="button" className={`stepper-tab ${currentStep === 1 ? "active" : "done"}`} onClick={() => setStep(1)}>
        <div className="stepper-num">1</div>
        <div className="stepper-label">
          <strong>Step 1: Details</strong>
          <span>{isNetCotton ? "15 Net Cotton fields" : "13 Cotton Seed fields"}</span>
        </div>
      </button>
      <button type="button" className={`stepper-tab ${currentStep === 2 ? "active" : currentStep > 2 ? "done" : ""}`} onClick={() => setStep(2)}>
        <div className="stepper-num">2</div>
        <div className="stepper-label">
          <strong>Step 2: Send to Buyer</strong>
          <span>WhatsApp / Mail</span>
        </div>
      </button>
      <button type="button" className={`stepper-tab ${currentStep === 3 ? "active" : currentStep > 3 ? "done" : ""}`} onClick={() => setStep(3)}>
        <div className="stepper-num">3</div>
        <div className="stepper-label">
          <strong>Step 3: Loading</strong>
          <span>{isNetCotton ? "7 dispatch details" : "6 dispatch details"}</span>
        </div>
      </button>
      <button type="button" className={`stepper-tab ${currentStep === 4 ? "active" : ""}`} onClick={() => setStep(4)}>
        <div className="stepper-num">4</div>
        <div className="stepper-label">
          <strong>Step 4: Gate Pass</strong>
          <span>Pass with all details</span>
        </div>
      </button>
    </div>

    {message && <div className={message.includes("saved") || message.includes("generated") || message.includes("sent") ? "success-message" : "form-error"} style={{ marginBottom: 18 }}>{message}</div>}

    {/* STEP 1: CONTRACT DETAILS */}
    {currentStep === 1 && (
      <div>
        <section className="panel">
          <div className="panel-heading">
            <div><h2>{moduleName} Contract Details</h2><p>Exact fields specified in {moduleName} PDF</p></div>
            <StatusBadge status={contract.status}/>
          </div>
          <div className="detail-fields">
            <Detail label="1. DATE" value={contract.contract_date}/>
            <Detail label="2. CONTRACT NUMBER ." value={contract.contract_number}/>
            <Detail label="3. PARTY NAME" value={contract.party_name}/>
            <Detail label="4. GST NUMBER" value={contract.gst_number}/>
            <Detail label="5. ADDREESS" value={contract.party_address}/>
            <Detail label="6. CONTACT NO." value={contract.contact_number}/>
            {isNetCotton && <Detail label="7. BROKER NAME AND FIRM NAME" value={contract.broker_name_and_firm_name}/>}
            {isNetCotton && <Detail label="8. PR NO ." value={contract.pr_no}/>}
            {isNetCotton && <Detail label="9. LOT NO." value={contract.lot_no}/>}
            <Detail label={isNetCotton ? "10. QUANTITY" : "7. QUANTITY"} value={contract.quantity}/>
            <Detail label={isNetCotton ? "11. COMMODITY" : "8. COMMODITY"} value={contract.commodity}/>
            <Detail label={isNetCotton ? "12. DELIVERY CONDITION" : "9. DELIVERY CONDITION"} value={contract.delivery_condition}/>
            <Detail label={isNetCotton ? "13. PAYMENT CONDITION" : "10. PAYMENT CONDITION"} value={contract.payment_condition}/>
            {isNetCotton ? (
              <Detail label="14. RATE PER CANDY" value={contract.rate_per_candy ? `₹${Number(contract.rate_per_candy).toLocaleString("en-IN")}` : "—"}/>
            ) : (
              <Detail label="11. RATE PER QUINTALS" value={contract.rate_per_quintal ? `₹${Number(contract.rate_per_quintal).toLocaleString("en-IN")}` : "—"}/>
            )}
            <Detail label="GST RATE (%)" value={contract.gst_rate ? `${contract.gst_rate}%` : "5%"}/>
            {(() => {
              const rawQtyMatch = String(contract.quantity || "").match(/[\d.]+/);
              const qtyNum = rawQtyMatch ? parseFloat(rawQtyMatch[0]) : 0;
              const rateNum = isNetCotton ? (parseFloat(contract.rate_per_candy) || 0) : (parseFloat(contract.rate_per_quintal) || 0);
              const gstRateNum = parseFloat(contract.gst_rate) >= 0 ? parseFloat(contract.gst_rate) : 5;
              const subtotal = qtyNum * rateNum;
              const gstAmount = subtotal * (gstRateNum / 100);
              const grandTotal = subtotal + gstAmount;
              if (subtotal <= 0) return null;
              return (
                <>
                  <Detail label="BASE AMOUNT" value={`₹${subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}/>
                  <Detail label={`TOTAL PAYMENT VALUE (INCL. ${gstRateNum}% GST)`} value={`₹${grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}/>
                </>
              );
            })()}
            {!isNetCotton && <Detail label="12. PACKING TYPE :LOOSE/BAGS" value={contract.packing_type}/>}
            <Detail label={isNetCotton ? "15. DELIVERY ADDRESS" : "13. DELIVERY ADDRESS"} value={contract.delivery_address}/>
          </div>
        </section>

        {/* INTEGRATED STEP 3 SECTION INSIDE CONTRACT DETAILS */}
        <section className="panel" style={{ marginTop: 22 }}>
          <div className="panel-heading">
            <div>
              <h2>Step 3: Loading details as per contract</h2>
              <p>{isNetCotton ? "7 dispatch details for Net Cotton" : "6 dispatch details: Truck /tempo number, Net Weight quintals, Driver license no., Transport no., Transport name, and Lr no."}</p>
            </div>
            <Truck size={20}/>
          </div>

          {hasLoadingSaved ? (
            <div style={{ padding: "0 21px 20px" }}>
              <div className="detail-fields" style={{ marginBottom: 14 }}>
                <Detail label="1. Truck /tempo number" value={loading.vehicle_number}/>
                <Detail label="2. Net Weight quintals" value={loading.net_weight_quintals ? `${loading.net_weight_quintals} Quintals` : "—"}/>
                <Detail label="3. Driver license no." value={loading.driver_license_number}/>
                {isNetCotton && <Detail label="4. Driver contact number" value={loading.driver_contact_number}/>}
                <Detail label={isNetCotton ? "5. Transport no." : "4. Transport no."} value={loading.transport_number}/>
                <Detail label={isNetCotton ? "6. Transport name" : "5. Transport name"} value={loading.transport_name}/>
                <Detail label={isNetCotton ? "7. LR no." : "6. Lr no."} value={loading.lr_number}/>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="button secondary" onClick={() => setStep(3)}>
                  <Truck size={15}/> Edit Step 3 Loading Details
                </button>
                <button className="button primary" onClick={() => setStep(4)}>
                  <PackageCheck size={15}/> Step 4: Generate Gate Pass <ArrowRight size={15}/>
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: "0 21px 20px" }}>
              {/* Keyboard Quick Navigation Banner */}
              <div style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 8,
                padding: "8px 14px",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 11,
                color: "#166534"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CornerDownLeft size={14} color="#15803d" />
                  <span>
                    <strong>Rapid Keyboard Mode:</strong> Press <kbd style={{ background: "#dcfce7", border: "1px solid #86efac", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>Enter</kbd> to cycle through truck, weight, and driver details to save!
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#15803d", fontWeight: 600 }}>
                  <Sparkles size={13} />
                  <span>Gate pass entry</span>
                </div>
              </div>

              <form className="loading-form" onSubmit={saveLoading} style={{ padding: 0 }}>
                <Field label="1. Truck /tempo number" required>
                  <input
                    ref={el => (loadingRefs.current["vehicle_number"] = el)}
                    required
                    value={loading.vehicle_number || ""}
                    onChange={e => setLoading({...loading, vehicle_number: e.target.value})}
                    onKeyDown={e => handleLoadingKeyDown(e, "vehicle_number")}
                    placeholder="e.g. GJ 06 AB 1234"
                  />
                </Field>
                <Field label="2. Net Weight quintals" required>
                  <input
                    ref={el => (loadingRefs.current["net_weight_quintals"] = el)}
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={loading.net_weight_quintals || ""}
                    onChange={e => setLoading({...loading, net_weight_quintals: e.target.value})}
                    onKeyDown={e => handleLoadingKeyDown(e, "net_weight_quintals")}
                    placeholder="Net Weight in Quintals"
                  />
                </Field>
                <Field label="3. Driver license no." required>
                  <input
                    ref={el => (loadingRefs.current["driver_license_number"] = el)}
                    required
                    value={loading.driver_license_number || ""}
                    onChange={e => setLoading({...loading, driver_license_number: e.target.value})}
                    onKeyDown={e => handleLoadingKeyDown(e, "driver_license_number")}
                    placeholder="Driver license number"
                  />
                </Field>
                {isNetCotton && (
                  <Field label="4. Driver contact number" required>
                    <input
                      ref={el => (loadingRefs.current["driver_contact_number"] = el)}
                      required
                      value={loading.driver_contact_number || ""}
                      onChange={e => setLoading({...loading, driver_contact_number: e.target.value})}
                      onKeyDown={e => handleLoadingKeyDown(e, "driver_contact_number")}
                      placeholder="+91 98765 43210"
                    />
                  </Field>
                )}
                <Field label={isNetCotton ? "5. Transport no." : "4. Transport no."}>
                  <input
                    ref={el => (loadingRefs.current["transport_number"] = el)}
                    value={loading.transport_number || ""}
                    onChange={e => setLoading({...loading, transport_number: e.target.value})}
                    onKeyDown={e => handleLoadingKeyDown(e, "transport_number")}
                    placeholder="Transport registration / permit no."
                  />
                </Field>
                <Field label={isNetCotton ? "6. Transporter name" : "5. Transport name"} required>
                  <input
                    ref={el => (loadingRefs.current["transport_name"] = el)}
                    required
                    value={loading.transport_name || ""}
                    onChange={e => setLoading({...loading, transport_name: e.target.value})}
                    onKeyDown={e => handleLoadingKeyDown(e, "transport_name")}
                    placeholder="Transport company name"
                  />
                </Field>
                <Field label={isNetCotton ? "7. LR no." : "6. Lr no."} required>
                  <input
                    ref={el => (loadingRefs.current["lr_number"] = el)}
                    required
                    value={loading.lr_number || ""}
                    onChange={e => setLoading({...loading, lr_number: e.target.value})}
                    onKeyDown={e => handleLoadingKeyDown(e, "lr_number")}
                    placeholder="Lorry receipt number"
                  />
                </Field>

                <button
                  ref={el => (loadingRefs.current["submit_loading_btn"] = el)}
                  className="button primary full"
                >
                  <Check size={16}/> Save Step 3 Loading Details
                </button>
              </form>
            </div>
          )}
        </section>

        <div className="step-nav-footer">
          <button className="button secondary" onClick={() => navigate("/contracts")}>
            <ArrowLeft size={16}/> Back to Contracts
          </button>
          <button className="button primary" onClick={() => setStep(2)}>
            Next: Step 2 Send to Buyer <ArrowRight size={16}/>
          </button>
        </div>
      </div>
    )}

    {/* STEP 2: SEND TO BUYER */}
    {currentStep === 2 && (
      <div>
        <div className="panel" style={{marginBottom: 20, padding: "20px 24px", background: "#f8fafc", border: "1.5px solid #cbd5e1", borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14}}>
          <div>
            <span className="eyebrow" style={{ color: "#2563eb" }}>STEP 2</span>
            <strong style={{fontSize: 16, color: "#1e293b", display: "block", marginTop: 2}}>Generate the contract after conformation send to the buyer</strong>
            <span style={{fontSize: 12, color: "#64748b"}}>Send confirmation by MAIL or WHAT (WhatsApp) as per clause 3.</span>
          </div>
          <div style={{display: "flex", gap: 10, flexWrap: "wrap"}}>
            <button className="button secondary" onClick={() => recordSent("whatsapp")} style={{borderColor: "#22c55e", color: "#15803d", fontWeight: 700}}>
              <MessageCircle size={16}/> Send by WHAT (WhatsApp)
            </button>
            <button className="button secondary" onClick={() => recordSent("email")} style={{ fontWeight: 700 }}>
              <Mail size={16}/> Send by MAIL
            </button>
            <button className="button primary" onClick={() => generateContractPdf(contract)}>
              <ArrowDownToLine size={16}/> Download Contract PDF
            </button>
          </div>
        </div>

        {/* 5 Terms & Conditions from PDF */}
        <section className="panel" style={{ padding: 22, marginBottom: 20 }}>
          <div className="panel-heading" style={{ padding: 0, marginBottom: 14 }}>
            <div>
              <h2>Terms & Conditions :</h2>
              <p>5 legal clauses verbatim from {moduleName} PDF</p>
            </div>
          </div>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12, lineHeight: 1.85, color: "#475569" }}>
            {termsList.map((term, i) => <li key={i} style={{ marginBottom: 8 }}>{term}</li>)}
          </ol>
          <div style={{ marginTop: 16, borderTop: "1px solid #e2e8f0", paddingTop: 12, fontSize: 11, color: "#64748b" }}>
            <strong>Signatures:</strong> Broker Sign & Stamp, Buyer Sign & Stamp, Seller Sign & Stamp
          </div>
        </section>

        <div className="step-nav-footer">
          <button className="button secondary" onClick={() => setStep(1)}>
            <ArrowLeft size={16}/> Back to Step 1 Details
          </button>
          <button className="button primary" onClick={() => setStep(3)}>
            Next: Step 3 Loading Details <ArrowRight size={16}/>
          </button>
        </div>
      </div>
    )}

    {/* STEP 3: LOADING DETAILS AS PER CONTRACT */}
    {currentStep === 3 && (
      <div>
        {/* CONTRACT BALANCE SUMMARY CARD */}
        <section className="panel" style={{ padding: 20, marginBottom: 20, background: "#f8fafc", border: "1.5px solid #cbd5e1", borderRadius: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
            <div>
              <span className="eyebrow" style={{ color: isNetCotton ? "#d97706" : "#2563eb" }}>CONTRACT DISPATCH TRACKER</span>
              <strong style={{ fontSize: 16, color: "#1e293b", display: "block" }}>
                {contract.party_name} — {contract.contract_number}
              </strong>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Contract Total</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{contractTotalQty.toFixed(2)} Qtl</div>
              </div>
              <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 8, padding: "8px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#047857", textTransform: "uppercase", fontWeight: 700 }}>Dispatched</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#065f46" }}>{totalDispatchedSoFar.toFixed(2)} Qtl</div>
              </div>
              <div style={{ background: remainingBalanceQty > 0 ? "#fffbeb" : "#eff6ff", border: `1px solid ${remainingBalanceQty > 0 ? "#fde68a" : "#bfdbfe"}`, borderRadius: 8, padding: "8px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: remainingBalanceQty > 0 ? "#b45309" : "#1d4ed8", textTransform: "uppercase", fontWeight: 700 }}>Remaining Balance</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: remainingBalanceQty > 0 ? "#b45309" : "#1e40af" }}>{remainingBalanceQty.toFixed(2)} Qtl</div>
              </div>
            </div>
          </div>

          {contractDispatches.length > 0 && (
            <div style={{ marginTop: 12, borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>
                Previous Truck Dispatches for this Contract ({contractDispatches.length}):
              </div>
              <div className="table-scroll">
                <table className="data-table" style={{ fontSize: 11 }}>
                  <thead>
                    <tr>
                      <th>Gate Pass</th>
                      <th>Date</th>
                      <th>Truck / Tempo</th>
                      <th>Net Weight</th>
                      <th>Transporter</th>
                      <th>LR No</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contractDispatches.map((p, idx) => (
                      <tr key={idx}>
                        <td><strong style={{ color: "#2563eb" }}>{p.gate_pass_number}</strong></td>
                        <td>{p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN") : "—"}</td>
                        <td>{p.loading_details?.vehicle_number}</td>
                        <td><strong>{p.loading_details?.net_weight_quintals} Qtl</strong></td>
                        <td>{p.loading_details?.transport_name}</td>
                        <td>{p.loading_details?.lr_number}</td>
                        <td>
                          <button
                            className="button secondary"
                            style={{ padding: "4px 8px", fontSize: 11 }}
                            onClick={() => generateGatePassPdf(contract, p.loading_details, p.gate_pass_number)}
                          >
                            <ArrowDownToLine size={12}/> PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Step 3: Dispatch Truck Loading Details</h2>
              <p>Enter the details for this truck loading ({remainingBalanceQty > 0 ? `${remainingBalanceQty.toFixed(2)} Qtl left on contract` : "Contract fulfilled"})</p>
            </div>
            <Truck size={20}/>
          </div>
          <form className="loading-form" onSubmit={saveLoading}>
            <Field label="1. Truck /tempo number" required>
              <input required value={loading.vehicle_number || ""} onChange={e => setLoading({...loading, vehicle_number: e.target.value})} placeholder="e.g. GJ 06 AB 1234"/>
            </Field>
            <Field label={`2. Net Weight quintals (Max remaining: ${remainingBalanceQty.toFixed(2)} Qtl)`} required>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={loading.net_weight_quintals || ""}
                  onChange={e => setLoading({...loading, net_weight_quintals: e.target.value})}
                  placeholder={`e.g. ${remainingBalanceQty > 0 ? remainingBalanceQty : 100}`}
                  style={{
                    borderColor: Number(loading.net_weight_quintals) > remainingBalanceQty ? "#ef4444" : undefined,
                    flex: 1
                  }}
                />
                {remainingBalanceQty > 0 && (
                  <button
                    type="button"
                    className="button secondary"
                    style={{ whiteSpace: "nowrap", padding: "8px 12px", fontSize: 11, fontWeight: 700 }}
                    onClick={() => setLoading({...loading, net_weight_quintals: remainingBalanceQty})}
                    title="Click to automatically fill full remaining quantity"
                  >
                    ⚡ Fill Remaining ({remainingBalanceQty.toFixed(2)} Qtl)
                  </button>
                )}
              </div>
              {Number(loading.net_weight_quintals) > remainingBalanceQty && (
                <small style={{ color: "#ef4444", fontWeight: 600, display: "block", marginTop: 4 }}>
                  ⚠️ Warning: Weight ({loading.net_weight_quintals} Qtl) exceeds remaining balance ({remainingBalanceQty.toFixed(2)} Qtl).
                </small>
              )}
            </Field>
            <Field label="3. Driver license no." required>
              <input required value={loading.driver_license_number || ""} onChange={e => setLoading({...loading, driver_license_number: e.target.value})} placeholder="Driver license number"/>
            </Field>
            {isNetCotton && (
              <Field label="4. Driver contact number" required>
                <input required value={loading.driver_contact_number || ""} onChange={e => setLoading({...loading, driver_contact_number: e.target.value})} placeholder="+91 98765 43210"/>
              </Field>
            )}
            <Field label={isNetCotton ? "5. Transport no." : "4. Transport no."}>
              <input value={loading.transport_number || ""} onChange={e => setLoading({...loading, transport_number: e.target.value})} placeholder="Transport registration / permit no."/>
            </Field>
            <Field label={isNetCotton ? "6. Transporter name" : "5. Transport name"} required>
              <input required value={loading.transport_name || ""} onChange={e => setLoading({...loading, transport_name: e.target.value})} placeholder="Transport company name"/>
            </Field>
            <Field label={isNetCotton ? "7. LR no." : "6. Lr no."} required>
              <input required value={loading.lr_number || ""} onChange={e => setLoading({...loading, lr_number: e.target.value})} placeholder="Lorry receipt number"/>
            </Field>

            <button className="button primary full"><PackageCheck size={16}/> Save Loading & Generate Gate Pass</button>
          </form>
        </section>

        <div className="step-nav-footer">
          <button className="button secondary" onClick={() => setStep(2)}>
            <ArrowLeft size={16}/> Back to Step 2 Send to Buyer
          </button>
          <button className="button primary" onClick={() => setStep(4)}>
            Next: Step 4 Gate Pass <ArrowRight size={16}/>
          </button>
        </div>
      </div>
    )}

    {/* STEP 4: GENERATE GATE PASS WITH ALL DETAILS */}
    {currentStep === 4 && (
      <div>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Step 4: Gate Pass History & Verification</h2>
              <p>Generated passes for Contract {contract.contract_number} ({contract.party_name})</p>
            </div>
            <PackageCheck size={22}/>
          </div>

          <div style={{ padding: "0 21px 20px" }}>
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 18, marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
                <h3 style={{ margin: 0, fontSize: 14, color: "#1e293b" }}>Contract Fulfillment Status</h3>
                <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, fontWeight: 700, background: remainingBalanceQty === 0 ? "#dcfce7" : "#fef3c7", color: remainingBalanceQty === 0 ? "#166534" : "#92400e" }}>
                  {remainingBalanceQty === 0 ? "✓ 100% Fully Dispatched" : `⚠ ${remainingBalanceQty.toFixed(2)} Qtl Remaining`}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, fontSize: 11 }}>
                <div><span style={{ color: "#64748b" }}>Contract:</span> <strong>{contract.contract_number}</strong></div>
                <div><span style={{ color: "#64748b" }}>Commodity:</span> <strong>{contract.commodity}</strong></div>
                <div><span style={{ color: "#64748b" }}>Party:</span> <strong>{contract.party_name}</strong></div>
                <div><span style={{ color: "#64748b" }}>Contract Total:</span> <strong>{contractTotalQty.toFixed(2)} Qtl</strong></div>
                <div><span style={{ color: "#64748b" }}>Total Dispatched:</span> <strong style={{ color: "#16a34a" }}>{totalDispatchedSoFar.toFixed(2)} Qtl</strong></div>
                <div><span style={{ color: "#64748b" }}>Balance Left:</span> <strong style={{ color: remainingBalanceQty > 0 ? "#d97706" : "#475569" }}>{remainingBalanceQty.toFixed(2)} Qtl</strong></div>
              </div>
            </div>

            {contractDispatches.length > 0 ? (
              <div style={{ marginBottom: 18 }}>
                <h4 style={{ fontSize: 13, marginBottom: 8, color: "#1e293b" }}>Generated Gate Passes for this Contract</h4>
                <div className="table-scroll">
                  <table className="data-table" style={{ fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th>Pass No.</th>
                        <th>Truck / Tempo</th>
                        <th>Dispatched Weight</th>
                        <th>Transporter</th>
                        <th>LR No</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contractDispatches.map((p, idx) => (
                        <tr key={idx}>
                          <td><strong style={{ color: "#2563eb" }}>{p.gate_pass_number}</strong></td>
                          <td>{p.loading_details?.vehicle_number}</td>
                          <td><strong style={{ color: "#16a34a" }}>{p.loading_details?.net_weight_quintals} Qtl</strong></td>
                          <td>{p.loading_details?.transport_name}</td>
                          <td>{p.loading_details?.lr_number}</td>
                          <td>
                            <button
                              className="button primary"
                              style={{ padding: "5px 12px", fontSize: 11 }}
                              onClick={() => generateGatePassPdf(contract, p.loading_details, p.gate_pass_number)}
                            >
                              <ArrowDownToLine size={13}/> Download PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: "20px 0" }}>
                <span>No truck dispatches generated yet. Go to Step 3 to record truck dispatch.</span>
              </div>
            )}

            {remainingBalanceQty > 0 ? (
              <button className="button primary full" onClick={() => setStep(3)} style={{ padding: 14, fontSize: 13, fontWeight: 700 }}>
                <Truck size={18}/> Dispatch Next Truck ({remainingBalanceQty.toFixed(2)} Quintals Remaining)
              </button>
            ) : (
              <button className="button secondary full" onClick={() => navigate("/gate-passes")} style={{ padding: 14, fontSize: 13, fontWeight: 700 }}>
                <PackageCheck size={18}/> View in Gate Passes Register
              </button>
            )}
          </div>
        </section>

        <div className="step-nav-footer">
          <button className="button secondary" onClick={() => setStep(3)}>
            <ArrowLeft size={16}/> Back to Step 3 Loading Details
          </button>
          <button className="button primary" onClick={() => navigate("/gate-passes")}>
            View All Gate Passes <ArrowRight size={16}/>
          </button>
        </div>
      </div>
    )}
  </>;
}

function Detail({ label, value }) {
  return <div className="detail-field"><span>{label}</span><strong>{value || "—"}</strong></div>;
}

function LoadingPage({ data, activeModule }) {
  const isNetCotton = activeModule === "net_cotton";
  const moduleName = isNetCotton ? "Net Cotton" : "Cotton Seed";
  const modContracts = data.contracts.filter(c => (c.module || "cotton_seed") === activeModule);
  const navigate = useNavigate();

  return <>
    <PageHeading
      eyebrow={`STEP 03 / ${moduleName.toUpperCase()}`}
      title={`Step 3: Loading Details as per Contract`}
      description={`Choose a ${moduleName} contract to record loading details: Truck/tempo, Net weight, Driver license, ${isNetCotton ? "Driver contact, " : ""}Transport no, Transporter name, and LR no.`}
    />
    <section className="panel">
      <div className="panel-heading">
        <div><h2>Contracts for Loading</h2><p>{modContracts.length} contract(s) registered</p></div>
        <Truck size={19}/>
      </div>
      {modContracts.length ? (
        <ContractTable contracts={modContracts} onOpen={id => navigate(`/contracts/${id}?step=3`)} isNetCotton={isNetCotton}/>
      ) : (
        <div className="empty-state">
          <Truck size={25}/>
          <strong>No {moduleName} contracts awaiting loading</strong>
          <button className="button primary" onClick={() => navigate("/contracts/new")}>Step 1: New Contract <ArrowRight size={15}/></button>
        </div>
      )}
    </section>
  </>;
}

function GatePasses({ data, activeModule }) {
  const isNetCotton = activeModule === "net_cotton";
  const moduleName = isNetCotton ? "Net Cotton" : "Cotton Seed";
  const [supabasePasses, setSupabasePasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    supabase
      .from("gate_passes")
      .select("*, contracts(*), loading_details(*)")
      .order("created_at", { ascending: false })
      .then(({ data: rows, error: e }) => {
        if (e) {
          console.warn("Error fetching Supabase gate passes:", e.message);
        } else {
          setSupabasePasses(rows || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Consolidate passes strictly for activeModule:
  // 1. Supabase gate_passes (matching activeModule)
  // 2. localStorage saved gate passes (seedledger_gate_passes_v4 matching activeModule)
  const displayedPasses = useMemo(() => {
    const list = [];
    const seenGateNums = new Set();

    // 1. Add Supabase passes for activeModule
    for (const p of supabasePasses) {
      const pMod = p.contracts?.module || p.module || "cotton_seed";
      if (pMod !== activeModule) continue;

      const gNum = p.gate_pass_number;
      if (gNum) seenGateNums.add(gNum);
      list.push({
        ...p,
        module: pMod,
        loading_details: p.loading_details || null
      });
    }

    // 2. Add local passes (seedledger_gate_passes_v4) for activeModule
    try {
      const local = JSON.parse(localStorage.getItem("seedledger_gate_passes_v4") || "[]");
      for (const p of local) {
        const pMod = p.contracts?.module || p.module || "cotton_seed";
        if (pMod !== activeModule) continue;

        if (!seenGateNums.has(p.gate_pass_number)) {
          seenGateNums.add(p.gate_pass_number);
          list.push(p);
        }
      }
    } catch (e) {}

    // 3. Fallback from legacy v3 storage if not yet migrated
    try {
      const legacy = JSON.parse(localStorage.getItem("seedledger_gate_passes_v3") || "[]");
      for (const p of legacy) {
        const pMod = p.contracts?.module || p.module || "cotton_seed";
        if (pMod !== activeModule) continue;

        if (!seenGateNums.has(p.gate_pass_number)) {
          seenGateNums.add(p.gate_pass_number);
          list.push(p);
        }
      }
    } catch (e) {}

    // Sort descending by created_at
    list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    // Optional quick search filtering
    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase();
    return list.filter(p => {
      const passNum = (p.gate_pass_number || "").toLowerCase();
      const party = (p.contracts?.party_name || "").toLowerCase();
      const contractNum = (p.contracts?.contract_number || "").toLowerCase();
      const truck = (p.loading_details?.vehicle_number || "").toLowerCase();
      const transporter = (p.loading_details?.transport_name || "").toLowerCase();
      const lr = (p.loading_details?.lr_number || "").toLowerCase();
      return passNum.includes(q) || party.includes(q) || contractNum.includes(q) || truck.includes(q) || transporter.includes(q) || lr.includes(q);
    });
  }, [supabasePasses, activeModule, searchTerm]);

  const handleDownloadPass = (p) => {
    const contract = p.contracts || data.contracts.find(c => c.id === p.contract_id);
    if (!contract) return;
    let loadingData = p.loading_details;
    if (!loadingData) {
      try {
        const raw = localStorage.getItem("seedledger_loading_" + contract.id);
        if (raw) loadingData = JSON.parse(raw);
      } catch (e) {}
    }
    generateGatePassPdf(contract, loadingData || {}, p.gate_pass_number);
  };

  return <>
    <PageHeading
      eyebrow={`STEP 04 / ${moduleName.toUpperCase()}`}
      title={`${moduleName} Gate Passes`}
      description={`Official gate passes generated exclusively for ${moduleName}. Each truck dispatch has a verified pass and weight record.`}
      action={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="🔍 Search Truck, Party, LR or Pass..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                padding: "8px 14px",
                fontSize: 12,
                borderRadius: 8,
                border: "1.5px solid #cbd5e1",
                minWidth: 240,
                outline: "none"
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                  fontSize: 14
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      }
    />
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>{moduleName} Gate Passes Register</h2>
          <p>Verified truck dispatches for {moduleName} ({displayedPasses.length} total pass{displayedPasses.length === 1 ? "" : "es"}{searchTerm ? ` matching "${searchTerm}"` : ""})</p>
        </div>
        <PackageCheck size={20}/>
      </div>

      {loading ? (
        <div className="empty-state">Loading gate passes…</div>
      ) : error ? (
        <div className="form-error">{error}</div>
      ) : !displayedPasses.length ? (
        <div className="empty-state">
          <PackageCheck size={28}/>
          <strong>No gate passes found for {moduleName}</strong>
          <span>Save Step 3 loading details on any {moduleName} contract to generate its gate pass.</span>
          <button className="button primary" onClick={() => {
            const first = data.contracts.find(c => (c.module || "cotton_seed") === activeModule);
            if (first) navigate(`/contracts/${first.id}?step=3`);
            else navigate("/contracts");
          }}>Go to Step 3 Loading <ArrowRight size={14}/></button>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Gate Pass</th>
                <th>Contract</th>
                <th>Party Name</th>
                <th>Vehicle / Truck</th>
                <th>Dispatched Qtl</th>
                <th>Transporter / LR</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedPasses.map(p => {
                const contractObj = p.contracts || {};
                const loadingObj = p.loading_details || {};

                return (
                  <tr key={p.id || p.gate_pass_number}>
                    <td data-label="Gate Pass">
                      <strong className="contract-code" style={{ color: isNetCotton ? "#d97706" : "#2563eb" }}>
                        {p.gate_pass_number}
                      </strong>
                    </td>
                    <td data-label="Contract">
                      <strong>{contractObj.contract_number || "—"}</strong>
                      {contractObj.commodity && <small className="cell-sub">{contractObj.commodity}</small>}
                    </td>
                    <td data-label="Party Name">
                      <span className="party-cell" style={{ fontWeight: 600, color: "#0f172a" }}>
                        {contractObj.party_name || "—"}
                      </span>
                    </td>
                    <td data-label="Vehicle">
                      <strong>{loadingObj.vehicle_number || "—"}</strong>
                    </td>
                    <td data-label="Dispatched Qtl">
                      <strong style={{ color: "#16a34a" }}>
                        {loadingObj.net_weight_quintals ? `${loadingObj.net_weight_quintals} Qtl` : "—"}
                      </strong>
                    </td>
                    <td data-label="Transporter">
                      <div>{loadingObj.transport_name || "—"}</div>
                      {loadingObj.lr_number && <small className="cell-sub">LR: {loadingObj.lr_number}</small>}
                    </td>
                    <td data-label="Date">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td data-label="Action">
                      <button
                        className="button secondary"
                        style={{ fontSize: 11, padding: "5px 10px" }}
                        onClick={() => handleDownloadPass(p)}
                        title="Download Gate Pass PDF"
                      >
                        <ArrowDownToLine size={13}/> PDF
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  </>;
}

function PartiesPage({ data, activeModule }) {
  const isNetCotton = activeModule === "net_cotton";
  const moduleName = isNetCotton ? "Net Cotton" : "Cotton Seed";
  const [filterMode, setFilterMode] = useState("current"); // "current" | "all"
  const [dbParties, setDbParties] = useState([]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from("parties")
      .select("*")
      .order("name", { ascending: true })
      .then(({ data: rows }) => {
        if (rows) setDbParties(rows);
      })
      .catch(() => {});
  }, []);

  // Consolidate parties from:
  // 1. Contracts in active data.contracts (both online and offline/local)
  // 2. Local gate passes (seedledger_gate_passes_v3)
  // 3. Supabase parties table
  const partyList = useMemo(() => {
    const map = new Map();

    // Add Supabase parties table entries
    dbParties.forEach(p => {
      if (p.name) {
        map.set(p.name.trim().toLowerCase(), {
          name: p.name,
          gst_number: p.gst_number,
          contact_number: p.contact_number,
          address: p.address,
          module: "all"
        });
      }
    });

    // Add parties from local gate passes
    try {
      const passes = JSON.parse(localStorage.getItem("seedledger_gate_passes_v4") || localStorage.getItem("seedledger_gate_passes_v3") || "[]");
      passes.forEach(p => {
        const c = p.contracts;
        if (c?.party_name) {
          const key = c.party_name.trim().toLowerCase();
          const existing = map.get(key) || {};
          map.set(key, {
            name: c.party_name,
            gst_number: c.gst_number || existing.gst_number || "",
            contact_number: c.contact_number || existing.contact_number || "",
            address: c.party_address || c.delivery_address || existing.address || "",
            module: c.module || p.module || "cotton_seed"
          });
        }
      });
    } catch (e) {}

    // Add parties from all contracts
    (data.contracts || []).forEach(c => {
      if (c.party_name) {
        const key = c.party_name.trim().toLowerCase();
        const existing = map.get(key) || {};
        map.set(key, {
          name: c.party_name,
          gst_number: c.gst_number || existing.gst_number || "",
          contact_number: c.contact_number || existing.contact_number || "",
          address: c.party_address || c.delivery_address || existing.address || "",
          module: c.module || "cotton_seed"
        });
      }
    });

    const all = Array.from(map.values());
    if (filterMode === "current") {
      return all.filter(p => p.module === activeModule || p.module === "all");
    }
    return all;
  }, [dbParties, data.contracts, activeModule, filterMode]);

  return <>
    <PageHeading
      eyebrow="DIRECTORY"
      title="Parties Directory"
      description={`Party name, GST number, contact number, and address records for ${moduleName} and across all contracts.`}
      action={
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className={`button ${filterMode === "current" ? "primary" : "secondary"}`}
            style={{ fontSize: 12, padding: "6px 12px" }}
            onClick={() => setFilterMode("current")}
          >
            {moduleName} ({partyList.length})
          </button>
          <button
            className={`button ${filterMode === "all" ? "primary" : "secondary"}`}
            style={{ fontSize: 12, padding: "6px 12px" }}
            onClick={() => setFilterMode("all")}
          >
            All Parties
          </button>
        </div>
      }
    />
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Registered Parties</h2>
          <p>{partyList.length} verified party/parties recorded</p>
        </div>
        <Users size={19}/>
      </div>
      {!partyList.length ? (
        <div className="empty-state">
          <Users size={28}/>
          <strong>No party records found for {filterMode === "current" ? moduleName : "active directory"}</strong>
          <span>Party details are automatically saved when you create a contract in Step 1.</span>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Party Name</th>
                <th>Module</th>
                <th>GST Number</th>
                <th>Contact Number</th>
                <th>Address</th>
              </tr>
            </thead>
            <tbody>
              {partyList.map((p, i) => (
                <tr key={i}>
                  <td data-label="Party Name"><strong style={{ color: "#0f172a" }}>{p.name}</strong></td>
                  <td data-label="Module">
                    <span style={{
                      padding: "2px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      background: p.module === "net_cotton" ? "#fef3c7" : "#e0e7ff",
                      color: p.module === "net_cotton" ? "#92400e" : "#3730a3"
                    }}>
                      {p.module === "net_cotton" ? "Net Cotton" : p.module === "all" ? "All" : "Cotton Seed"}
                    </span>
                  </td>
                  <td data-label="GST Number">{p.gst_number || "—"}</td>
                  <td data-label="Contact Number">{p.contact_number || "—"}</td>
                  <td data-label="Address">{p.address || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  </>;
}
