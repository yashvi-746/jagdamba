import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  Activity, ArrowDownToLine, ArrowLeft, ArrowRight, BadgeCheck, Bell, Boxes,
  CalendarDays, Check, ChevronDown, ClipboardList, FileCheck2, FilePlus2,
  FileText, LayoutDashboard, LogOut, Menu, PackageCheck, Plus, Search,
  Settings2, ShieldCheck, Truck, Users, X, Mail, MessageCircle, Upload, PenLine, ExternalLink,
  Send, Coins, Scale
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { generateContractPdf, generateGatePassPdf, SOURCE_TERMS } from "./lib/documents";
import DailyPurchasePage from "./components/DailyPurchasePage";
import TriplicateBillingPage from "./components/TriplicateBillingPage";
import ProcurementReportsPage from "./components/ProcurementReportsPage";

const blankContract = {
  contract_date: new Date().toLocaleDateString("en-CA"),
  contract_number: "",
  party_name: "",
  gst_number: "",
  party_address: "",
  contact_number: "",
  buyer_name: "", buyer_gst_number: "", buyer_address: "", buyer_contact_number: "",
  seller_name: "", seller_gst_number: "", seller_address: "", seller_contact_number: "",
  broker_person_name: "", broker_firm_name: "", broker_contact_number: "",
  brokerage_calc_type: "per_quintal", brokerage_rate: "", brokerage_total: "", brokerage_terms: "", brokerage_paid_by: "buyer",
  pr_number: "",
  lot_number: "",
  quantity_bales: "",
  quantity_quintals: "",
  commodity: "COTTON BALES",
  delivery_condition: "",
  payment_condition: "",
  rate_per_candy: "",
  rate_per_quintal: "",
  rate_unit: "candy",
  packing_type: "BALES",
  delivery_address: "",
  status: "draft"
};

const blankLoading = {
  vehicle_number: "",
  net_weight_quintals: "",
  driver_license_number: "",
  driver_contact_number: "",
  transport_number: "",
  transport_name: "",
  lr_number: ""
};

const demoContracts = [
  { id: "demo-1", contract_number: "NC-2026-001", contract_date: "2026-10-10", party_name: "Shree Ganesh Cotton Mill", commodity: "COTTON BALES", pr_number: "PR-102", lot_number: "LOT-55", quantity_bales: 100, quantity_quintals: 170, rate_per_candy: 58500, status: "confirmed", packing_type: "BALES", delivery_condition: "Ready Delivery", payment_condition: "Immediate on delivery", delivery_address: "Halol, Gujarat", contact_number: "+91 98250 11111" },
  { id: "demo-2", contract_number: "NC-2026-002", contract_date: "2026-10-11", party_name: "Patel Agro Industries", commodity: "COTTON BALES", pr_number: "PR-105", lot_number: "LOT-62", quantity_bales: 150, quantity_quintals: 255, rate_per_candy: 57800, status: "loading", packing_type: "BALES", delivery_condition: "Ex-Factory", payment_condition: "RTGS on dispatch", delivery_address: "Vadodara, Gujarat", contact_number: "+91 98250 22222" },
  { id: "demo-3", contract_number: "NC-2026-003", contract_date: "2026-10-12", party_name: "Kisan Cotton Company", commodity: "COTTON BALES", pr_number: "PR-108", lot_number: "LOT-71", quantity_bales: 200, quantity_quintals: 340, rate_per_candy: 59200, status: "draft", packing_type: "BALES", delivery_condition: "FOR Destination", payment_condition: "7 days credit", delivery_address: "Godhra, Gujarat", contact_number: "+91 98250 33333" }
];

function useContracts(offlineOverride = false) {
  const [contracts, setContracts] = useState(() => {
    try {
      const saved = localStorage.getItem("seedledger_contracts");
      return saved ? JSON.parse(saved) : demoContracts;
    } catch { return demoContracts; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const demoMode = !isSupabaseConfigured || offlineOverride;

  const setContractsAndPersist = (updater) => {
    setContracts(old => {
      const next = typeof updater === "function" ? updater(old) : updater;
      try { localStorage.setItem("seedledger_contracts", JSON.stringify(next)); } catch (e) {}
      return next;
    });
  };

  async function refresh() {
    if (demoMode) {
      try {
        const saved = localStorage.getItem("seedledger_contracts");
        if (saved) setContracts(JSON.parse(saved));
      } catch (e) {}
      return;
    }
    const { data, error: queryError } = await supabase
      .from("contracts").select("*").order("created_at", { ascending: false });
    if (queryError) setError(queryError.message);
    else setContracts(data || []);
    setLoading(false);
  }

  useEffect(() => { if (demoMode) refresh(); }, []);
  return { contracts, setContracts: demoMode ? setContractsAndPersist : setContracts, refresh, loading, error, demoMode };
}

export default function App() {
  const [session, setSession] = useState(null);
  const [offlineMode, setOfflineMode] = useState(() => localStorage.getItem("seedledger_offline_mode") === "true");
  const [authChecked, setAuthChecked] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const data = useContracts(offlineMode);

  useEffect(() => {
    if (!isSupabaseConfigured || offlineMode) { setAuthChecked(true); return; }
    supabase.auth.getSession().then(({ data: { session: current } }) => {
      setSession(current); setAuthChecked(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, current) => setSession(current));
    return () => listener.subscription.unsubscribe();
  }, [offlineMode]);

  useEffect(() => { if (session && !data.demoMode) data.refresh(); }, [session?.user?.id]);

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    localStorage.removeItem("seedledger_offline_mode");
    setOfflineMode(false);
    setSession(null);
  };

  if (!authChecked) return <div className="boot-screen"><div className="app-logo-badge"><img src="/logo.svg" alt="Logo" className="app-logo-img" style={{ width: 60 }}/></div><span>Loading Shree Jagdamba Net Cotton…</span></div>;
  if (isSupabaseConfigured && !session && !offlineMode) return <Login onLogin={setSession} onOffline={() => {
    setOfflineMode(true);
    localStorage.setItem("seedledger_offline_mode", "true");
  }} />;

  const pageTitle = ({
    "/": "Overview",
    "/contracts": "Contract register",
    "/contracts/new": "Contract 1: Net Cotton Contract Details",
    "/confirmations": "Step 2: Confirmations & Buyer Dispatch",
    "/loading": "Step 3: Loading management",
    "/gate-passes": "Step 4: Gate passes",
    "/parties": "Parties",
    "/daily-purchase": "Cotton Daily Purchase Entry",
    "/triplicate-billing": "Purchase Bill / Triplicate Billing",
    "/procurement-reports": "Procurement Registers & Heap Analytics"
  })[location.pathname] || "Workspace";

  return (
    <div className="app-shell">
      {mobileOpen && <button className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label="Close menu" />}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`} style={{ overflowY: "auto" }}>
        <div className="brand">
          <div className="app-logo-badge"><img src="/logo.svg" alt="Shree Jagdamba" className="app-logo-img"/></div>
          <div><strong>Shree Jagdamba</strong><span>NET COTTON & BALES</span></div>
          <button className="icon-button sidebar-close" onClick={() => setMobileOpen(false)}><X size={18}/></button>
        </div>
        <div className="workspace-label">NET COTTON WORKFLOW</div>
        <nav className="nav-list">
          <NavItem to="/" icon={<LayoutDashboard size={18}/>} label="Overview" onClick={() => setMobileOpen(false)} />
          <NavItem to="/contracts" icon={<FileText size={18}/>} label="Contract Register" count={data.contracts.length} onClick={() => setMobileOpen(false)} />
          <NavItem to="/contracts/new" icon={<FilePlus2 size={18}/>} label="Step 1: New Contract" onClick={() => setMobileOpen(false)} />
          <NavItem to="/confirmations" icon={<Send size={18}/>} label="Step 2: Send to Buyer" onClick={() => setMobileOpen(false)} />
          <NavItem to="/loading" icon={<Truck size={18}/>} label="Step 3: Loading" onClick={() => setMobileOpen(false)} />
          <NavItem to="/gate-passes" icon={<PackageCheck size={18}/>} label="Step 4: Gate Passes" onClick={() => setMobileOpen(false)} />
          <NavItem to="/parties" icon={<Users size={18}/>} label="Parties" onClick={() => setMobileOpen(false)} />
        </nav>

        <div className="workspace-label" style={{ marginTop: 20, color: "#d6b77c", letterSpacing: "1.2px" }}>
          FARMER PROCUREMENT ("DIFFER SECTION")
        </div>
        <nav className="nav-list">
          <NavItem to="/daily-purchase" icon={<ClipboardList size={18}/>} label="Daily Purchase Entry" onClick={() => setMobileOpen(false)} />
          <NavItem to="/triplicate-billing" icon={<FileCheck2 size={18}/>} label="Triplicate Billing" onClick={() => setMobileOpen(false)} />
          <NavItem to="/procurement-reports" icon={<Boxes size={18}/>} label="Procurement Registers" onClick={() => setMobileOpen(false)} />
        </nav>

        <div className="sidebar-bottom">
          <div className="secure-card"><ShieldCheck size={18}/><div><strong>Private workspace</strong><span>Ginning & Broker Desk</span></div></div>
          <div className="profile-row"><div className="avatar">BO</div><div className="profile-copy"><strong>Broker Office</strong><span>Operations team</span></div><button className="icon-button" onClick={signOut} title="Sign out"><LogOut size={16}/></button></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button menu-toggle" onClick={() => setMobileOpen(true)}><Menu size={20}/></button>
            <div className="breadcrumbs"><span>Net Cotton Workspace</span><span className="crumb-slash">/</span><strong>{pageTitle}</strong></div>
          </div>
          <div className="topbar-actions">
            <div className="today-pill"><CalendarDays size={15}/>{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
            <button className="icon-button notification-button" title="Notifications"><Bell size={18}/><i /></button>
            <div className="top-avatar">BO</div>
          </div>
        </header>
        {data.demoMode && <div className="demo-banner" style={{ background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" }}><Activity size={15}/><span><strong>Local Offline Mode</strong> — You can create Net Cotton contracts, record loading details, and download PDFs freely.</span></div>}
        {data.error && <div className="error-banner">{data.error}</div>}
        <div className="page-content">
          <Routes>
            <Route path="/" element={<Dashboard data={data} />} />
            <Route path="/contracts" element={<ContractRegister data={data} />} />
            <Route path="/contracts/new" element={<ContractForm data={data} />} />
            <Route path="/confirmations" element={<ConfirmationsPage data={data} />} />
            <Route path="/contracts/:id" element={<ContractDetail data={data} />} />
            <Route path="/loading" element={<LoadingPage data={data} />} />
            <Route path="/gate-passes" element={<GatePasses data={data} />} />
            <Route path="/parties" element={<PartiesPage data={data} />} />
            <Route path="/daily-purchase" element={<DailyPurchasePage />} />
            <Route path="/triplicate-billing" element={<TriplicateBillingPage />} />
            <Route path="/procurement-reports" element={<ProcurementReportsPage />} />
            <Route path="*" element={<Dashboard data={data} />} />
          </Routes>
        </div>
        <footer className="footer"><span>© {new Date().getFullYear()} Shree Jagdamba Net Cotton System</span><span><span className="status-dot"/> 4-Step Contract & Gate Pass Workflow</span></footer>
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError("");
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) setError(authError.message); else onLogin(data.session);
    setBusy(false);
  }
  return <div className="login-page"><div className="login-decoration"><div className="login-orbit orbit-one"/><div className="login-orbit orbit-two"/><div className="login-copy"><div className="app-logo-badge"><img src="/logo.svg" alt="Shree Jagdamba" className="app-logo-img"/></div><p className="eyebrow">COTTON GINNING & PRESSING FACTORY</p><h1>Net Cotton Contracts.<br/><em>In good order.</em></h1><p>4-step lifecycle: Contract details, confirmation dispatch, loading records, and gate passes.</p><div className="login-feature"><ShieldCheck size={18}/> Authorized office & broker team access</div></div></div><div className="login-form-wrap"><form className="login-form" onSubmit={submit}><span className="eyebrow">WELCOME BACK</span><h2>Sign in to Shree Jagdamba</h2><p>Use your authorized office account to continue.</p><label>Email address<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com"/></label><label>Password<input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password"/></label>{error && <div className="form-error">{error}</div>}<button className="button primary full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}<ArrowRight size={16}/></button>{onOffline && <button type="button" className="button secondary full" onClick={onOffline} style={{marginTop: 10, justifyContent: "center", fontWeight: 700}}>⚡ Enter Offline Workspace (Instant Demo)</button>}<small>Staff accounts must be created by an authorized administrator.</small></form></div></div>;
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

function Dashboard({ data }) {
  const { contracts } = data;
  const totalBales = contracts.reduce((sum, c) => sum + Number(c.quantity_bales || (c.quantity_quintals ? Math.round(Number(c.quantity_quintals) / 1.7) : 0)), 0);
  const confirmed = contracts.filter(c => ["confirmed", "loading", "completed"].includes(c.status)).length;
  const pending = contracts.filter(c => ["draft", "pending"].includes(c.status)).length;
  const loadingCount = contracts.filter(c => c.status === "loading").length;
  const completedCount = contracts.filter(c => c.status === "completed").length;
  const navigate = useNavigate();

  return <>
    <PageHeading
      eyebrow="NET COTTON WORKSPACE"
      title="Operations Overview"
      description="Track the complete 4-step workflow: Contract 1 details, Contract 2 buyer confirmation, factory loading, and gate pass dispatch."
      action={<button className="button primary" onClick={() => navigate("/contracts/new")}><Plus size={17}/> Step 1: New contract</button>}
    />

    {/* 4 Stat Cards for the 4 Steps */}
    <div className="stat-grid">
      <StatCard label="Step 1: Total Contracts" value={contracts.length.toString().padStart(2, "0")} change="All contract bookings" icon={<FileText size={18}/>} tone="blue" onClick={() => navigate("/contracts")}/>
      <StatCard label="Step 2: Awaiting Confirmation" value={pending.toString().padStart(2, "0")} change="Send Contract 2 to Buyer" icon={<Send size={18}/>} tone="amber" onClick={() => navigate("/confirmations")}/>
      <StatCard label="Step 3: Loading Stage" value={loadingCount.toString().padStart(2, "0")} change="Vehicle & transport ready" icon={<Truck size={18}/>} tone="green" onClick={() => navigate("/loading")}/>
      <StatCard label="Step 4: Gate Passes Issued" value={completedCount.toString().padStart(2, "0")} change="Dispatched passes" icon={<PackageCheck size={18}/>} tone="violet" onClick={() => navigate("/gate-passes")}/>
    </div>

    {/* Quick Actions Panel — Step 1, Step 2, Step 3, Step 4 */}
    <section className="panel quick-panel" style={{ marginBottom: 20 }}>
      <div className="panel-heading">
        <div><h2>Interactive 4-Step Actions</h2><p>Click any step to move forward or back across the deal lifecycle</p></div>
      </div>
      <div className="quick-actions" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <QuickAction icon={<FilePlus2/>} title="Step 1: Book Contract 1" desc="Enter 15 Net Cotton details & pricing" onClick={() => navigate("/contracts/new")}/>
        <QuickAction icon={<Send/>} title="Step 2: Send Contract 2" desc="Review & dispatch confirmation to Buyer" onClick={() => navigate("/confirmations")}/>
        <QuickAction icon={<Truck/>} title="Step 3: Record Loading" desc="Truck no, driver contact, net weight" onClick={() => navigate("/loading")}/>
        <QuickAction icon={<PackageCheck/>} title="Step 4: Gate Passes" desc="Generate authorized gate pass PDF" onClick={() => navigate("/gate-passes")}/>
      </div>
    </section>

    {/* Farmer Procurement Module ("Make Differ Section") */}
    <section className="panel" style={{ marginBottom: 20, background: "linear-gradient(135deg, #101b2d 0%, #1c2b3e 100%)", color: "#fff", border: "1px solid #2d3e56", padding: "20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "1.5px", color: "#d6b77c", textTransform: "uppercase" }}>
            FARMER PROCUREMENT ("DIFFER SECTION")
          </div>
          <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 18, margin: "6px 0 4px", color: "#fff" }}>
            Farmer Daily Cotton Purchase & Triplicate Billing System
          </h2>
          <p style={{ fontSize: 11, color: "#94a3b8", margin: 0, maxWidth: 680 }}>
            Raw cotton procurement ledger with auto-refreshing live totals, weighbridge formula (Gross − Tare = Net Weight × Rate − Labor = Net Amount), interactive Currency Drawer (₹500 to ₹5), and Heap-Wise average costing reports.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="button" style={{ background: "#d6b77c", color: "#101b2d", fontWeight: 800 }} onClick={() => navigate("/daily-purchase")}>
            <ClipboardList size={16}/> Daily Purchase Grid
          </button>
          <button className="button" style={{ background: "#2563eb", color: "#fff", fontWeight: 700 }} onClick={() => navigate("/triplicate-billing")}>
            <FileCheck2 size={16}/> Triplicate Bill Voucher
          </button>
          <button className="button secondary" style={{ background: "rgba(255,255,255,0.1)", color: "#fff", borderColor: "rgba(255,255,255,0.2)" }} onClick={() => navigate("/procurement-reports")}>
            <Boxes size={16}/> Registers & Heap Report
          </button>
        </div>
      </div>
    </section>

    <div className="dashboard-grid">
      <section className="panel recent-panel">
        <div className="panel-heading">
          <div><h2>Recent Net Cotton contracts</h2><p>Latest PR / Lot deal activity</p></div>
          <button className="text-button" onClick={() => navigate("/contracts")}>View all <ArrowRight size={15}/></button>
        </div>
        <ContractTable contracts={contracts.slice(0, 5)} compact onOpen={id => navigate(`/contracts/${id}`)}/>
      </section>

      <section className="panel workflow-panel">
        <div className="panel-heading">
          <div><h2>4-Step Workflow Progress</h2><p>Click any step to jump directly to it</p></div>
          <span className="panel-icon"><ClipboardList size={18}/></span>
        </div>
        <div className="workflow-list">
          <WorkflowItem number="01" title="Step 1: Contract 1 Details" desc="15 parameters: PR No, Lot No, Rate per Candy" done={contracts.length > 0} onClick={() => navigate("/contracts/new")}/>
          <WorkflowItem number="02" title="Step 2: Contract 2 Confirmation" desc="Generate PDF with 5 terms & send to Buyer" done={contracts.some(c => c.status !== "draft")} onClick={() => navigate("/confirmations")}/>
          <WorkflowItem number="03" title="Step 3: Loading as per Contract" desc="Truck, net weight, driver contact, LR no" done={contracts.some(c => c.status === "loading" || c.status === "completed")} onClick={() => navigate("/loading")}/>
          <WorkflowItem number="04" title="Step 4: Generate Gate Pass" desc="Print authorized dispatch pass with all details" done={contracts.some(c => c.status === "completed")} onClick={() => navigate("/gate-passes")}/>
        </div>
        <button className="button secondary full" onClick={() => navigate("/confirmations")}>
          Open Step 2 Confirmations <ArrowRight size={15}/>
        </button>
      </section>
    </div>
  </>;
}

function WorkflowItem({ number, title, desc, done, onClick }) {
  return (
    <div className="workflow-item workflow-clickable" onClick={onClick} title="Click to open step">
      <div className={`workflow-number ${done ? "done" : ""}`}>{done ? <Check size={15}/> : number}</div>
      <div className="workflow-copy"><strong>{title}</strong><span>{desc}</span></div>
      <ArrowRight size={14} style={{ color: "#94a3b8" }}/>
    </div>
  );
}

function QuickAction({ icon, title, desc, onClick }) {
  return (
    <button className="quick-action" onClick={onClick}>
      <span className="quick-icon">{icon}</span>
      <span><strong>{title}</strong><small>{desc}</small></span>
      <ArrowRight size={16}/>
    </button>
  );
}

function ContractRegister({ data }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const navigate = useNavigate();
  const filtered = useMemo(() => data.contracts.filter(c => (`${c.contract_number} ${c.party_name} ${c.pr_number || ""} ${c.lot_number || ""} ${c.delivery_address || ""}`).toLowerCase().includes(query.toLowerCase()) && (status === "all" || c.status === status)), [data.contracts, query, status]);
  return <>
    <PageHeading eyebrow="CONTRACT DATABASE" title="Net Cotton Register" description="Search, review, and manage Cotton Bales contract confirmations." action={<button className="button primary" onClick={() => navigate("/contracts/new")}><Plus size={17}/> Step 1: New contract</button>}/>
    <section className="panel">
      <div className="table-toolbar">
        <div className="search-field"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search contract, party, PR No, Lot No…"/></div>
        <select className="filter-select" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending confirmation</option>
          <option value="confirmed">Confirmed</option>
          <option value="loading">Loading</option>
          <option value="completed">Completed</option>
        </select>
        <button className="button secondary" onClick={() => data.refresh()}><Activity size={15}/> Refresh</button>
      </div>
      <ContractTable contracts={filtered} onOpen={id => navigate(`/contracts/${id}`)}/>
    </section>
  </>;
}

function ContractTable({ contracts, onOpen, compact = false }) {
  if (!contracts.length) return <div className="empty-state"><FileText size={25}/><strong>No contracts found</strong><span>Create a Net Cotton contract to start your workflow.</span></div>;
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Contract</th>
            <th>Party / Mill</th>
            <th>PR / Lot</th>
            <th>Date</th>
            <th>Volume</th>
            <th>Rate</th>
            <th>Status</th>
            {!compact && <th></th>}
          </tr>
        </thead>
        <tbody>
          {contracts.map(c => (
            <tr key={c.id} onClick={() => onOpen && onOpen(c.id)} className={onOpen ? "clickable-row" : ""}>
              <td><strong className="contract-code">{c.contract_number || "Draft"}</strong><small className="cell-sub">{c.commodity || "COTTON BALES"}</small></td>
              <td><span className="party-cell">{c.party_name || "—"}</span></td>
              <td><small>{c.pr_number ? `PR: ${c.pr_number}` : "—"} {c.lot_number ? `| Lot: ${c.lot_number}` : ""}</small></td>
              <td>{c.contract_date || "—"}</td>
              <td><strong>{c.quantity_bales ? `${c.quantity_bales} Bales` : `${c.quantity_quintals || "—"} qtl`}</strong></td>
              <td>{c.rate_per_candy ? `₹${Number(c.rate_per_candy).toLocaleString("en-IN")}/candy` : (c.rate_per_quintal ? `₹${Number(c.rate_per_quintal).toLocaleString("en-IN")}/qtl` : "—")}</td>
              <td><StatusBadge status={c.status}/></td>
              {!compact && <td><ArrowRight size={16} className="row-arrow"/></td>}
            </tr>
          ))}
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
// (Contract 1 Details -> Next -> Contract 2 Confirmation & Send -> Back)
// ==========================================
function ContractForm({ data }) {
  const [formStep, setFormStep] = useState(1);
  const [form, setForm] = useState(blankContract);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const set = (key, value) => setForm(old => ({ ...old, [key]: value }));

  const handleBalesChange = (val) => {
    setForm(old => {
      const bales = Number(val || 0);
      const autoQtl = bales > 0 && (!old.quantity_quintals || old.quantity_quintals === (old._lastBales * 1.7).toFixed(2))
        ? (bales * 1.7).toFixed(2)
        : old.quantity_quintals;
      return { ...old, quantity_bales: val, quantity_quintals: autoQtl, _lastBales: bales };
    });
  };

  const validateStep1 = () => {
    setError("");
    if (!form.party_name?.trim()) {
      setError("Please enter the Party Name (Item 3) before proceeding to Contract 2.");
      return false;
    }
    if (!form.quantity_quintals && !form.quantity_bales) {
      setError("Please enter the Quantity (Item 10) in Bales or Quintals.");
      return false;
    }
    if (!form.rate_per_candy && !form.rate_per_quintal) {
      setError("Please enter the Rate per Candy (Item 14).");
      return false;
    }
    if (!form.delivery_address?.trim()) {
      setError("Please enter the Delivery Address (Item 15).");
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

    const calcB = Number(form.quantity_bales || 0);
    const calcQ = Number(form.quantity_quintals || (calcB ? calcB * 1.7 : 0));
    const calcR = Number(form.rate_per_candy || 0);
    const calcRQ = Number(form.rate_per_quintal || 0);

    if (data.demoMode) {
      const contractNum = form.contract_number.trim() || ("NC-2026-" + Math.floor(100 + Math.random() * 900));
      const newContract = {
        ...form,
        id: "local-" + Date.now(),
        contract_number: contractNum,
        quantity_bales: calcB || Math.round(calcQ / 1.7),
        quantity_quintals: calcQ,
        rate_per_candy: calcR,
        rate_per_quintal: calcRQ || (calcR ? Number((calcR / 3.556).toFixed(2)) : 0),
        status: "pending",
        created_at: new Date().toISOString()
      };
      data.setContracts(old => [newContract, ...old]);
      generateContractPdf(newContract);
      setSaving(false);
      navigate("/contracts/" + newContract.id + "?step=2");
      return;
    }

    const user = (await supabase.auth.getUser()).data.user;
    const { broker_person_name, broker_firm_name, broker_name, broker_contact_number, brokerage_calc_type, brokerage_rate, brokerage_total, brokerage_terms, brokerage_paid_by, pr_number, lot_number, rate_per_candy, quantity_bales, ...baseForm } = form;

    const fullPayload = {
      ...form,
      quantity_bales: calcB,
      quantity_quintals: calcQ,
      rate_per_candy: calcR,
      rate_per_quintal: calcRQ || (calcR ? Number((calcR / 3.556).toFixed(2)) : 0),
      created_by: user?.id,
      status: "pending"
    };

    let { data: inserted, error: insertError } = await supabase.from("contracts").insert(fullPayload).select().single();
    if (insertError && (insertError.message.includes("column") || insertError.message.includes("schema cache") || insertError.message.includes("commodity"))) {
      const fallbackPayload = {
        ...baseForm,
        quantity_quintals: calcQ,
        rate_per_quintal: calcRQ || (calcR ? Number((calcR / 3.556).toFixed(2)) : 2500),
        commodity: "COTTON SEED",
        created_by: user?.id,
        status: "pending"
      };
      const res = await supabase.from("contracts").insert(fallbackPayload).select().single();
      inserted = res.data;
      insertError = res.error;
      if (inserted) {
        inserted.pr_number = pr_number;
        inserted.lot_number = lot_number;
        inserted.rate_per_candy = rate_per_candy;
        inserted.quantity_bales = quantity_bales;
        inserted.commodity = form.commodity;
        inserted.broker_person_name = broker_person_name;
        inserted.broker_firm_name = broker_firm_name;
        inserted.broker_contact_number = broker_contact_number;
      }
    }

    if (insertError) { setError(insertError.message); setSaving(false); return; }
    data.setContracts(old => [inserted, ...old]);

    try {
      await savePdfToStorage(inserted, "contract_pdf", generateContractPdf(inserted, { returnBlob: true }));
    } catch (storageError) {
      console.warn("PDF storage warning:", storageError.message);
    }

    generateContractPdf(inserted);
    await writeAudit("contract", inserted.id, "created", { contract_number: inserted.contract_number });
    await data.refresh();
    navigate(`/contracts/${inserted.id}?step=2`);
    setSaving(false);
  }

  const calcBales = Number(form.quantity_bales || 0);
  const calcQty = Number(form.quantity_quintals || 0);
  const calcRateCandy = Number(form.rate_per_candy || 0);
  const calcRateQtl = Number(form.rate_per_quintal || 0);

  let calcGross = 0;
  if (calcRateCandy > 0) {
    const candys = calcQty > 0 ? (calcQty / 3.556) : (calcBales > 0 ? calcBales / 2.06 : 0);
    calcGross = candys * calcRateCandy;
  } else if (calcRateQtl > 0) {
    calcGross = calcQty * calcRateQtl;
  }

  const calcBRate = Number(form.brokerage_rate || 0);
  let calcBrokerageTotal = 0;
  if (form.brokerage_calc_type === "percentage") {
    calcBrokerageTotal = (calcGross * calcBRate) / 100;
  } else if (form.brokerage_calc_type === "lumpsum") {
    calcBrokerageTotal = calcBRate;
  } else {
    calcBrokerageTotal = calcQty * calcBRate;
  }

  return <>
    <button className="back-link" onClick={() => navigate("/contracts")}><ArrowLeft size={16}/> Back to contract register</button>
    <PageHeading
      eyebrow={formStep === 1 ? "STEP 01 / CONTRACT 1" : "STEP 02 / CONTRACT 2"}
      title={formStep === 1 ? "Contract 1: Net Cotton Details" : "Contract 2: Confirmation & Review"}
      description={formStep === 1 ? "Enter the agreed 15 deal parameters, press lot identifiers, broker particulars, and rate per candy." : "Review terms, download contract confirmation PDF, and proceed to send to Buyer."}
    />

    {/* Stepper Header between Contract 1 and Contract 2 */}
    <div className="contract-stepper">
      <button type="button" className={`stepper-tab ${formStep === 1 ? "active" : "done"}`} onClick={() => setFormStep(1)}>
        <div className="stepper-num">1</div>
        <div className="stepper-label">
          <strong>Contract 1: Deal Details</strong>
          <span>15 items & broker details</span>
        </div>
      </button>
      <button type="button" className={`stepper-tab ${formStep === 2 ? "active" : ""}`} onClick={() => { if (validateStep1()) setFormStep(2); }}>
        <div className="stepper-num">2</div>
        <div className="stepper-label">
          <strong>Contract 2: Confirmation & Review</strong>
          <span>PDF, 5 Terms & Buyer send</span>
        </div>
      </button>
    </div>

    {error && <div className="form-error" style={{ marginBottom: 18 }}>{error}</div>}

    {formStep === 1 ? (
      /* PAGE 1: CONTRACT 1 DETAILS (15 ITEMS) */
      <form onSubmit={goToContract2}>
        <div className="form-layout">
          <div className="form-main">
            {/* Step 1: Items 1 to 7 */}
            <section className="panel form-panel">
              <div className="form-section-heading">
                <span className="form-section-icon"><FileText size={18}/></span>
                <div>
                  <h2>Contract Reference & Party Details</h2>
                  <p>Items 1 to 7 from the specification document</p>
                </div>
                <span className="required-note">* Required</span>
              </div>

              <div className="field-grid">
                <Field label="1. Date" required>
                  <input type="date" required value={form.contract_date} onChange={e => set("contract_date", e.target.value)}/>
                </Field>
                <Field label="2. Contract number" hint="Leave blank to auto-generate (e.g. NC-2026-004)">
                  <input value={form.contract_number} onChange={e => set("contract_number", e.target.value)} placeholder="e.g. NC-2026-004"/>
                </Field>
                <Field label="3. Party name" required hint="Buyer / Seller trading party">
                  <input required value={form.party_name} onChange={e => set("party_name", e.target.value)} placeholder="Enter party or mill firm name"/>
                </Field>
                <Field label="4. GST number">
                  <input value={form.gst_number} onChange={e => set("gst_number", e.target.value)} placeholder="GST identification number"/>
                </Field>
                <Field label="6. Contact no." hint="Used for WhatsApp & dispatch alerts">
                  <input value={form.contact_number} onChange={e => set("contact_number", e.target.value)} placeholder="+91 98765 43210"/>
                </Field>
                <Field label="5. Address" wide>
                  <textarea rows="2" value={form.party_address} onChange={e => set("party_address", e.target.value)} placeholder="Full business address"/>
                </Field>
              </div>

              {/* Item 7: Broker Name and Firm Name */}
              <div className="form-section-heading sub-section">
                <span className="form-section-icon" style={{background: '#fef3c7', color: '#b45309'}}><Users size={17}/></span>
                <div>
                  <h2>7. Broker Name & Firm Name</h2>
                  <p>Individual broker and intermediary firm representing the deal</p>
                </div>
              </div>
              <div className="field-grid">
                <Field label="Broker person name">
                  <input value={form.broker_person_name || ""} onChange={e => set("broker_person_name", e.target.value)} placeholder="e.g. Shrenik Shah"/>
                </Field>
                <Field label="Broker firm name">
                  <input value={form.broker_firm_name || ""} onChange={e => set("broker_firm_name", e.target.value)} placeholder="e.g. Shrenik Cotton Brokers"/>
                </Field>
                <Field label="Broker contact no.">
                  <input value={form.broker_contact_number || ""} onChange={e => set("broker_contact_number", e.target.value)} placeholder="+91 98250 12345"/>
                </Field>
              </div>
            </section>

            {/* Step 1: Items 8 to 15 */}
            <section className="panel form-panel">
              <div className="form-section-heading">
                <span className="form-section-icon green"><Boxes size={18}/></span>
                <div>
                  <h2>Commercial, Lot & Rate Terms</h2>
                  <p>Items 8 to 15 from the specification document</p>
                </div>
              </div>

              <div className="field-grid">
                <Field label="8. PR No. (Press Running No.)" hint="Press run identifier">
                  <input value={form.pr_number || ""} onChange={e => set("pr_number", e.target.value)} placeholder="e.g. PR-104"/>
                </Field>
                <Field label="9. Lot No." hint="Ginning lot number">
                  <input value={form.lot_number || ""} onChange={e => set("lot_number", e.target.value)} placeholder="e.g. LOT-48"/>
                </Field>
                <Field label="11. Commodity" required>
                  <select value={form.commodity} onChange={e => set("commodity", e.target.value)}>
                    <option value="COTTON BALES">COTTON BALES (Standard)</option>
                    <option value="COTTON SEED">COTTON SEED</option>
                  </select>
                </Field>

                <Field label="10. Quantity in Bales" hint="Total bales count">
                  <input type="number" min="1" step="1" value={form.quantity_bales || ""} onChange={e => handleBalesChange(e.target.value)} placeholder="e.g. 100 Bales"/>
                </Field>
                <Field label="10. Quantity (Quintals)" required hint="1 Bale ≈ 1.70 qtl approx">
                  <input type="number" min="0.01" step="0.01" required value={form.quantity_quintals} onChange={e => set("quantity_quintals", e.target.value)} placeholder="e.g. 170.00 qtl"/>
                </Field>

                <Field label="14. Rate per Candy (₹)" required hint="Standard Indian Cotton Bale pricing (1 Candy ≈ 355.6 kg)">
                  <input type="number" min="0" step="1" required value={form.rate_per_candy} onChange={e => set("rate_per_candy", e.target.value)} placeholder="e.g. 58500"/>
                </Field>
                <Field label="Rate per Quintal (₹) (Optional)" hint="Alternate quintal rate">
                  <input type="number" min="0" step="0.01" value={form.rate_per_quintal} onChange={e => set("rate_per_quintal", e.target.value)} placeholder="e.g. 16450.00"/>
                </Field>

                <Field label="12. Delivery condition" required>
                  <input required value={form.delivery_condition} onChange={e => set("delivery_condition", e.target.value)} placeholder="e.g. Ready Delivery / Ex-Factory / Destination"/>
                </Field>
                <Field label="13. Payment condition" required>
                  <input required value={form.payment_condition} onChange={e => set("payment_condition", e.target.value)} placeholder="e.g. Immediate on delivery / RTGS / 7 days credit"/>
                </Field>

                <Field label="15. Delivery address" required wide>
                  <textarea required rows="2" value={form.delivery_address} onChange={e => set("delivery_address", e.target.value)} placeholder="Where will the cotton bales be delivered?"/>
                </Field>
              </div>

              {/* Live Valuation Bar */}
              <div className="deal-calc-banner" style={{marginTop: 18, padding: "16px 20px", background: "linear-gradient(135deg, #f0fdf4 0%, #e6f7ec 100%)", border: "1.5px solid #86efac", borderRadius: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16}}>
                <div>
                  <span style={{fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, color: "#166534", fontWeight: 700, display: "block", marginBottom: 3}}>Estimated Goods Value</span>
                  <strong style={{fontSize: 18, color: "#14532d", fontWeight: 800}}>₹{calcGross.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong>
                  <span style={{fontSize: 11, color: "#15803d", display: "block", marginTop: 2}}>
                    {calcRateCandy > 0 ? `${calcQty ? `${calcQty} qtl (${(calcQty / 3.556).toFixed(2)} Candies)` : `${calcBales} Bales`} × ₹${calcRateCandy}/candy` : "Enter qty & rate"}
                  </span>
                </div>
                <div>
                  <span style={{fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, color: "#92400e", fontWeight: 700, display: "block", marginBottom: 3}}>Commodity & Lots</span>
                  <strong style={{fontSize: 16, color: "#b45309", fontWeight: 800}}>{form.commodity}</strong>
                  <span style={{fontSize: 11, color: "#a16207", display: "block", marginTop: 2}}>PR: {form.pr_number || "—"} | Lot: {form.lot_number || "—"}</span>
                </div>
              </div>
            </section>
          </div>

          <aside className="form-aside">
            <div className="panel preview-card">
              <div className="preview-top">
                <div className="preview-doc-icon"><FileCheck2 size={22}/></div>
                <span className="preview-label">STEP 01 COMPLETE</span>
              </div>
              <h3>Contract 1 Summary</h3>
              <p>Click Next to proceed to Contract 2 (Step 2 Confirmation & Review).</p>
              <div className="preview-line"/>
              <div className="preview-row"><span>Party</span><strong>{form.party_name || "—"}</strong></div>
              <div className="preview-row"><span>PR / Lot</span><strong>{form.pr_number || "—"} / {form.lot_number || "—"}</strong></div>
              <div className="preview-row"><span>Volume</span><strong>{form.quantity_bales ? `${form.quantity_bales} Bales` : ""}{form.quantity_quintals ? ` (${form.quantity_quintals} qtl)` : "—"}</strong></div>
              <div className="preview-row"><span>Rate</span><strong>{form.rate_per_candy ? `₹${Number(form.rate_per_candy).toLocaleString("en-IN")}/candy` : "—"}</strong></div>
              <div className="preview-total"><span>Total Goods Value</span><strong>₹{calcGross.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong></div>
            </div>
          </aside>
        </div>

        {/* Back and Next navigation footer */}
        <div className="step-nav-footer">
          <button type="button" className="button secondary" onClick={() => navigate("/contracts")}>
            <ArrowLeft size={16}/> Back to Register
          </button>
          <button type="submit" className="button primary">
            Next: Contract 2 (Step 2 Confirmation & Review) <ArrowRight size={16}/>
          </button>
        </div>
      </form>
    ) : (
      /* PAGE 2: CONTRACT 2 CONFIRMATION & REVIEW (STEP 2) */
      <div className="contract-page-2">
        <section className="panel" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <span className="eyebrow" style={{ color: "#2563eb" }}>CONTRACT 2 / STEP 2 CONFIRMATION</span>
              <h2 style={{ margin: "4px 0 0", fontFamily: "Manrope, sans-serif", fontSize: 20, color: "#1e293b" }}>Official Net Cotton Contract Confirmation</h2>
              <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 12 }}>Generated after confirmation to send to the buyer (per document instructions)</p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="button secondary" onClick={() => generateContractPdf({ ...form, id: "draft", contract_number: form.contract_number || "DRAFT" })}>
                <ArrowDownToLine size={15}/> Download Draft PDF
              </button>
            </div>
          </div>

          {/* 15 Contract Parameters Summary */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.7, color: "#334155" }}>Contract 1 Commercial Parameters</h3>
            <div className="detail-fields" style={{ padding: 0 }}>
              <Detail label="1. Date" value={form.contract_date}/>
              <Detail label="2. Contract Number" value={form.contract_number || "Auto-Generated"}/>
              <Detail label="3. Party Name" value={form.party_name}/>
              <Detail label="4. GST Number" value={form.gst_number}/>
              <Detail label="5. Address" value={form.party_address}/>
              <Detail label="6. Contact Number" value={form.contact_number}/>
              <Detail label="7. Broker Name" value={form.broker_person_name}/>
              <Detail label="7. Broker Firm Name" value={form.broker_firm_name}/>
              <Detail label="8. PR No." value={form.pr_number}/>
              <Detail label="9. Lot No." value={form.lot_number}/>
              <Detail label="10. Quantity" value={`${form.quantity_bales ? `${form.quantity_bales} Bales ` : ""}(${form.quantity_quintals} qtl)`}/>
              <Detail label="11. Commodity" value={form.commodity}/>
              <Detail label="12. Delivery Condition" value={form.delivery_condition}/>
              <Detail label="13. Payment Condition" value={form.payment_condition}/>
              <Detail label="14. Rate per Candy" value={form.rate_per_candy ? `₹${Number(form.rate_per_candy).toLocaleString("en-IN")}` : "—"}/>
              <Detail label="15. Delivery Address" value={form.delivery_address}/>
            </div>
          </div>

          {/* 5 Verbatim Terms & Conditions */}
          <div style={{ background: "#fcfaf6", border: "1px solid #f3e8d2", borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 13, color: "#854d0e", fontWeight: 700 }}>Terms & Conditions (Source Document Specification):</h3>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12, lineHeight: 1.8, color: "#713f12" }}>
              {SOURCE_TERMS.map((term, i) => <li key={i} style={{ marginBottom: 6 }}>{term}</li>)}
            </ol>
          </div>

          {/* 3 Required Sign & Stamp Blocks */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, padding: "16px 0", borderTop: "1px solid #e2e8f0" }}>
            <div style={{ border: "1.5px dashed #cbd5e1", borderRadius: 8, padding: 18, textAlign: "center", background: "#f8fafc" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>Broker Sign & Stamp</span>
              <div style={{ height: 40 }}/>
              <small style={{ color: "#94a3b8" }}>{form.broker_firm_name || form.broker_person_name || "Broker"}</small>
            </div>
            <div style={{ border: "1.5px dashed #cbd5e1", borderRadius: 8, padding: 18, textAlign: "center", background: "#f8fafc" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>Buyer Sign & Stamp</span>
              <div style={{ height: 40 }}/>
              <small style={{ color: "#94a3b8" }}>Buyer Authorized Signatory</small>
            </div>
            <div style={{ border: "1.5px dashed #cbd5e1", borderRadius: 8, padding: 18, textAlign: "center", background: "#f8fafc" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>Seller Sign & Stamp</span>
              <div style={{ height: 40 }}/>
              <small style={{ color: "#94a3b8" }}>Seller Authorized Signatory</small>
            </div>
          </div>
        </section>

        {/* Back and Save navigation footer */}
        <div className="step-nav-footer">
          <button type="button" className="button secondary" onClick={() => setFormStep(1)}>
            <ArrowLeft size={16}/> Back to Contract 1 (Edit Details)
          </button>
          <button type="button" className="button primary" disabled={saving} onClick={saveContract}>
            {saving ? "Saving Contract…" : "Save & Proceed to Step 3 Loading"} <ArrowRight size={16}/>
          </button>
        </div>
      </div>
    )}
  </>;
}

function Field({ label, required, hint, wide, children }) {
  return <label className={`field ${wide ? "field-wide" : ""}`}><span>{label}{required && <i> *</i>}</span>{children}{hint && <small>{hint}</small>}</label>;
}

// ==========================================
// STEP 2: CONFIRMATIONS & BUYER DISPATCH PAGE
// ==========================================
function ConfirmationsPage({ data }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const filtered = data.contracts.filter(c =>
    (`${c.contract_number} ${c.party_name} ${c.pr_number || ""} ${c.lot_number || ""}`).toLowerCase().includes(query.toLowerCase())
  );

  return <>
    <PageHeading
      eyebrow="STEP 02 / BUYER DISPATCH"
      title="Contract Confirmations"
      description="Step 2 from specification: 'Generate the contract after confirmation send to the buyer'. Send via WhatsApp or Mail, and track 2-day return signatures."
      action={<button className="button primary" onClick={() => navigate("/contracts/new")}><Plus size={17}/> Step 1: New contract</button>}
    />

    <section className="panel">
      <div className="table-toolbar">
        <div className="search-field">
          <Search size={17}/>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search contract, party, PR No, Lot No…"/>
        </div>
        <button className="button secondary" onClick={() => data.refresh()}><Activity size={15}/> Refresh</button>
      </div>

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Contract</th>
              <th>Party / Buyer</th>
              <th>PR / Lot</th>
              <th>Volume & Rate</th>
              <th>Status</th>
              <th>Step 2 Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td><strong className="contract-code">{c.contract_number}</strong><small className="cell-sub">{c.contract_date}</small></td>
                <td><span className="party-cell">{c.party_name}</span><small className="cell-sub">{c.contact_number || "No contact"}</small></td>
                <td><small>{c.pr_number ? `PR: ${c.pr_number}` : "—"} | {c.lot_number ? `Lot: ${c.lot_number}` : "—"}</small></td>
                <td><strong>{c.quantity_bales ? `${c.quantity_bales} Bales` : `${c.quantity_quintals} qtl`}</strong><small className="cell-sub">{c.rate_per_candy ? `₹${Number(c.rate_per_candy).toLocaleString("en-IN")}/candy` : "—"}</small></td>
                <td><StatusBadge status={c.status}/></td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="button secondary" onClick={() => navigate(`/contracts/${c.id}?step=2`)} style={{ padding: "6px 10px", fontSize: 10 }}>
                      Open Contract 2 <ArrowRight size={12}/>
                    </button>
                    <button className="button secondary" onClick={() => generateContractPdf(c)} title="Download PDF" style={{ padding: "6px 8px" }}>
                      <ArrowDownToLine size={13}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  </>;
}

// ==========================================
// CONTRACT DETAIL VIEW (STEPS 1, 2, 3, 4 WITH NEXT & BACK)
// ==========================================
function ContractDetail({ data }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = location.pathname.match(/\/contracts\/([^/]+)/)?.[1] ? { id: location.pathname.match(/\/contracts\/([^/]+)/)[1] } : { id: "" };
  const contract = data.contracts.find(c => c.id === id);

  const initialStep = (() => {
    const p = new URLSearchParams(location.search).get("step");
    return p ? parseInt(p, 10) : 1;
  })();

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [loading, setLoading] = useState(blankLoading);
  const [message, setMessage] = useState("");
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    const p = new URLSearchParams(location.search).get("step");
    if (p) setCurrentStep(parseInt(p, 10));
  }, [location.search]);

  useEffect(() => {
    if (!contract || data.demoMode) return;
    setLoading(blankLoading);
    supabase.from("loading_details").select("*").eq("contract_id", contract.id).maybeSingle().then(({ data: row }) => { if (row) setLoading(row); });
    supabase.from("contract_documents").select("*").eq("contract_id", contract.id).order("created_at", { ascending: false }).then(({ data: rows }) => setDocuments(rows || []));
  }, [contract?.id]);

  if (!contract) return <div className="panel empty-state"><FileText size={25}/><strong>Contract not found</strong><button className="button secondary" onClick={() => navigate("/contracts")}>Back to register</button></div>;

  const setStep = (s) => {
    setCurrentStep(s);
    navigate(`/contracts/${contract.id}?step=${s}`, { replace: true });
  };

  async function saveLoading(e) {
    if (e) e.preventDefault();
    setMessage("");
    if (data.demoMode) {
      localStorage.setItem("seedledger_loading_" + contract.id, JSON.stringify(loading));
      data.setContracts(old => old.map(c => c.id === contract.id ? { ...c, status: "loading" } : c));
      setMessage("Step 3: Loading details saved successfully (Offline mode).");
      return;
    }
    const user = (await supabase.auth.getUser()).data.user;
    const payload = {
      ...loading,
      contract_id: contract.id,
      created_by: user?.id,
      net_weight_quintals: Number(loading.net_weight_quintals)
    };
    const { error } = await supabase.from("loading_details").upsert(payload, { onConflict: "contract_id" });
    if (error) { setMessage(error.message); return; }
    await supabase.from("contracts").update({ status: "loading" }).eq("id", contract.id);
    await writeAudit("loading", contract.id, "saved", { vehicle_number: loading.vehicle_number, lr_number: loading.lr_number });
    setMessage("Step 3: Loading details saved.");
    data.refresh();
  }

  async function makeGatePass() {
    if (!loading.vehicle_number || !loading.net_weight_quintals || !loading.transport_name || !loading.lr_number) {
      setMessage("Please fill and save all Step 3 loading details before generating a Gate Pass.");
      return;
    }

    if (data.demoMode) {
      const gateNum = "GP-2026-" + Math.floor(1000 + Math.random() * 9000);
      generateGatePassPdf(contract, loading, gateNum);
      data.setContracts(old => old.map(c => c.id === contract.id ? { ...c, status: "completed" } : c));
      setMessage("Step 4: Gate Pass " + gateNum + " generated and downloaded with all contract and loading details!");
      return;
    }

    const { data: savedLoading, error: loadingError } = await supabase.from("loading_details").select("*").eq("contract_id", contract.id).single();
    if (loadingError) { setMessage("Save complete loading details before generating a gate pass."); return; }

    const user = (await supabase.auth.getUser()).data.user;
    const { data: existingGate } = await supabase.from("gate_passes").select("*").eq("loading_detail_id", savedLoading.id).limit(1).maybeSingle();
    let gate = existingGate;

    if (!gate) {
      const { data: createdGate, error: createGateError } = await supabase.from("gate_passes").insert({ contract_id: contract.id, loading_detail_id: savedLoading.id, created_by: user?.id }).select().single();
      if (createGateError) { setMessage(createGateError.message); return; }
      gate = createdGate;
    }

    try {
      const blob = generateGatePassPdf(contract, savedLoading, gate.gate_pass_number, { returnBlob: true });
      const path = `${contract.id}/gate-pass-${gate.gate_pass_number}.pdf`;
      await supabase.storage.from("contract-documents").upload(path, blob, { contentType: "application/pdf", upsert: true });
      await supabase.from("gate_passes").update({ storage_path: path }).eq("id", gate.id);
      generateGatePassPdf(contract, savedLoading, gate.gate_pass_number);
    } catch (uploadError) {
      generateGatePassPdf(contract, savedLoading, gate.gate_pass_number);
      setMessage(`Gate pass created and downloaded: ${uploadError.message}`);
    }

    await supabase.from("contracts").update({ status: "completed" }).eq("id", contract.id);
    setMessage(`Step 4: Gate pass ${gate.gate_pass_number} generated with all details and downloaded.`);
    data.refresh();
  }

  async function recordSent(channel) {
    const phone = (contract.contact_number || contract.buyer_contact_number || contract.seller_contact_number || "").replace(/\D/g, "");
    if (channel === "whatsapp" && !phone) {
      setMessage("Add a contact phone number to dispatch WhatsApp confirmation.");
      return;
    }

    const qtyText = contract.quantity_bales
      ? `${contract.quantity_bales} Bales (${contract.quantity_quintals || ""} qtl)`
      : `${contract.quantity_quintals} quintals`;

    const rateText = contract.rate_per_candy
      ? `INR ${Number(contract.rate_per_candy).toLocaleString("en-IN")} per Candy`
      : `INR ${contract.rate_per_quintal} per quintal`;

    const text = `*Shree Jagdamba - Net Cotton Contract Confirmation*\n` +
      `Contract No: ${contract.contract_number}\n` +
      `Party: ${contract.party_name}\n` +
      `Commodity: ${contract.commodity || "COTTON BALES"}\n` +
      `PR No: ${contract.pr_number || "—"} | Lot No: ${contract.lot_number || "—"}\n` +
      `Quantity: ${qtyText}\n` +
      `Rate: ${rateText}\n` +
      `Delivery: ${contract.delivery_address}\n` +
      `Terms: Please sign and return within 2 days as per terms.`;

    const target = channel === "whatsapp"
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `mailto:?subject=${encodeURIComponent("Net Cotton Contract Confirmation " + contract.contract_number)}&body=${encodeURIComponent(text + "\n\nPlease find the attached Contract PDF.")}`;

    window.open(target, "_blank");

    if (!data.demoMode) {
      await supabase.from("contracts").update({ confirmation_prepared_at: new Date().toISOString(), confirmation_channel: channel, status: "pending" }).eq("id", contract.id);
      await writeAudit("contract", contract.id, "confirmation_message_prepared", { channel });
      data.refresh();
    }
    setMessage(`Step 2: Contract confirmation dispatched to Buyer via ${channel === "whatsapp" ? "WhatsApp" : "Email"}.`);
  }

  async function toggleSignature(key) {
    if (data.demoMode) {
      const next = contract[key] ? null : new Date().toISOString();
      data.setContracts(old => old.map(c => c.id === contract.id ? { ...c, [key]: next, status: next ? "confirmed" : c.status } : c));
      setMessage(`${key.replaceAll("_", " ")} recorded.`);
      return;
    }
    const next = contract[key] ? null : new Date().toISOString();
    await supabase.from("contracts").update({ [key]: next }).eq("id", contract.id);
    setMessage(`${key.replaceAll("_", " ")} updated.`);
    data.refresh();
  }

  return <>
    <button className="back-link" onClick={() => navigate("/contracts")}><ArrowLeft size={16}/> Back to contract register</button>
    
    <PageHeading
      eyebrow={`STEP 0${currentStep} / ${currentStep === 1 ? "CONTRACT 1" : currentStep === 2 ? "CONTRACT 2" : currentStep === 3 ? "LOADING" : "GATE PASS"}`}
      title={`${contract.contract_number || "Contract"} · ${currentStep === 1 ? "Contract 1 Details" : currentStep === 2 ? "Contract 2 Confirmation" : currentStep === 3 ? "Loading Details" : "Gate Pass"}`}
      description={`${contract.party_name || "Party not specified"} · Created ${contract.contract_date || "—"}`}
      action={
        <div style={{ display: "flex", gap: 8 }}>
          <button className="button secondary" onClick={() => generateContractPdf(contract)}>
            <ArrowDownToLine size={16}/> Download Contract PDF
          </button>
        </div>
      }
    />

    {/* 4-Step Stepper Bar with Direct Navigation */}
    <div className="contract-stepper">
      <button type="button" className={`stepper-tab ${currentStep === 1 ? "active" : "done"}`} onClick={() => setStep(1)}>
        <div className="stepper-num">1</div>
        <div className="stepper-label">
          <strong>Contract 1: Details</strong>
          <span>15 items & pricing</span>
        </div>
      </button>
      <button type="button" className={`stepper-tab ${currentStep === 2 ? "active" : currentStep > 2 ? "done" : ""}`} onClick={() => setStep(2)}>
        <div className="stepper-num">2</div>
        <div className="stepper-label">
          <strong>Contract 2: Confirmation</strong>
          <span>Send to Buyer & Terms</span>
        </div>
      </button>
      <button type="button" className={`stepper-tab ${currentStep === 3 ? "active" : currentStep > 3 ? "done" : ""}`} onClick={() => setStep(3)}>
        <div className="stepper-num">3</div>
        <div className="stepper-label">
          <strong>Step 3: Loading</strong>
          <span>Truck, weight & driver</span>
        </div>
      </button>
      <button type="button" className={`stepper-tab ${currentStep === 4 ? "active" : ""}`} onClick={() => setStep(4)}>
        <div className="stepper-num">4</div>
        <div className="stepper-label">
          <strong>Step 4: Gate Pass</strong>
          <span>Official pass with all details</span>
        </div>
      </button>
    </div>

    {message && <div className={message.includes("saved") || message.includes("generated") || message.includes("dispatched") ? "success-message" : "form-error"} style={{ marginBottom: 18 }}>{message}</div>}

    {/* STEP 1: CONTRACT 1 DETAILS */}
    {currentStep === 1 && (
      <div>
        <section className="panel">
          <div className="panel-heading">
            <div><h2>Contract 1 Commercial Summary</h2><p>Agreed party & commercial terms (Items 1 to 15)</p></div>
            <StatusBadge status={contract.status}/>
          </div>
          <div className="detail-fields">
            <Detail label="1. Contract Date" value={contract.contract_date}/>
            <Detail label="2. Contract Number" value={contract.contract_number}/>
            <Detail label="3. Party Name" value={contract.party_name}/>
            <Detail label="4. GST Number" value={contract.gst_number}/>
            <Detail label="5. Party Address" value={contract.party_address}/>
            <Detail label="6. Contact Number" value={contract.contact_number}/>
            <Detail label="7. Broker Name" value={contract.broker_person_name || contract.broker_name}/>
            <Detail label="7. Broker Firm Name" value={contract.broker_firm_name}/>
            <Detail label="8. PR No. (Press Running)" value={contract.pr_number}/>
            <Detail label="9. Lot No." value={contract.lot_number}/>
            <Detail label="10. Quantity" value={contract.quantity_bales ? `${contract.quantity_bales} Bales (${contract.quantity_quintals} qtl)` : `${contract.quantity_quintals || "—"} qtl`}/>
            <Detail label="11. Commodity" value={contract.commodity || "COTTON BALES"}/>
            <Detail label="12. Delivery Condition" value={contract.delivery_condition}/>
            <Detail label="13. Payment Condition" value={contract.payment_condition}/>
            <Detail label="14. Rate per Candy" value={contract.rate_per_candy ? `₹${Number(contract.rate_per_candy).toLocaleString("en-IN")}` : "—"}/>
            <Detail label="15. Delivery Address" value={contract.delivery_address}/>
          </div>
        </section>

        {/* Back and Next navigation footer */}
        <div className="step-nav-footer">
          <button className="button secondary" onClick={() => navigate("/contracts")}>
            <ArrowLeft size={16}/> Back to Contracts
          </button>
          <button className="button primary" onClick={() => setStep(2)}>
            Next: Contract 2 (Step 2 Confirmation & Send) <ArrowRight size={16}/>
          </button>
        </div>
      </div>
    )}

    {/* STEP 2: CONTRACT 2 CONFIRMATION & BUYER DISPATCH */}
    {currentStep === 2 && (
      <div>
        {/* Step 2 Buyer Dispatch Banner */}
        <div className="panel" style={{marginBottom: 20, padding: "20px 24px", background: "#f8fafc", border: "1.5px solid #cbd5e1", borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14}}>
          <div>
            <span className="eyebrow" style={{ color: "#2563eb" }}>STEP 2 DIRECTIVE</span>
            <strong style={{fontSize: 16, color: "#1e293b", display: "block", marginTop: 2}}>Generate Contract 2 After Confirmation & Send to Buyer</strong>
            <span style={{fontSize: 12, color: "#64748b"}}>Per clause 3: Send via MAIL or WHAT (WhatsApp). Buyer & Seller to sign within 2 days.</span>
          </div>
          <div style={{display: "flex", gap: 10, flexWrap: "wrap"}}>
            <button className="button secondary" onClick={() => recordSent("whatsapp")} style={{borderColor: "#22c55e", color: "#15803d", fontWeight: 700}}>
              <MessageCircle size={16}/> Send via WhatsApp ("WHAT")
            </button>
            <button className="button secondary" onClick={() => recordSent("email")} style={{ fontWeight: 700 }}>
              <Mail size={16}/> Send via Mail ("MAIL")
            </button>
            <button className="button primary" onClick={() => generateContractPdf(contract)}>
              <ArrowDownToLine size={16}/> Download PDF
            </button>
          </div>
        </div>

        {/* Terms & Conditions Box */}
        <section className="panel" style={{ padding: 22, marginBottom: 20 }}>
          <div className="panel-heading" style={{ padding: 0, marginBottom: 14 }}>
            <div>
              <h2>Terms & Conditions (Verbatim from specification document)</h2>
              <p>5 legal conditions binding upon buyer and seller</p>
            </div>
          </div>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12, lineHeight: 1.85, color: "#475569" }}>
            {SOURCE_TERMS.map((term, i) => <li key={i} style={{ marginBottom: 8 }}>{term}</li>)}
          </ol>
        </section>

        {/* 3 Required Sign & Stamp Compliance Tracker */}
        <section className="panel tracking-panel" style={{ marginTop: 0 }}>
          <div className="panel-heading">
            <div>
              <h2>Required Signatures & Stamps</h2>
              <p>Document requires: Broker Sign & Stamp, Buyer Sign & Stamp, Seller Sign & Stamp</p>
            </div>
            <PenLine size={19}/>
          </div>
          <div className="tracking-grid">
            {[["broker_signed_at", "Broker Sign & Stamp"], ["buyer_signed_at", "Buyer Sign & Stamp"], ["seller_signed_at", "Seller Sign & Stamp"]].map(([key, label]) => (
              <div className="tracking-item" key={key}>
                <span>{label}</span>
                <strong>{contract[key] ? `Recorded ${new Date(contract[key]).toLocaleDateString("en-IN")}` : "Awaiting Sign & Stamp"}</strong>
                <button className="button secondary" onClick={() => toggleSignature(key)}>
                  {contract[key] ? "Undo signature" : "Mark Signed"}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Back and Next navigation footer */}
        <div className="step-nav-footer">
          <button className="button secondary" onClick={() => setStep(1)}>
            <ArrowLeft size={16}/> Back to Contract 1 (Details)
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
        <section className="panel">
          <div className="panel-heading">
            <div><h2>Step 3: Loading details as per contract</h2><p>Record all 7 dispatch fields: vehicle, net weight, driver contact, transporter, and LR no.</p></div>
            <Truck size={20}/>
          </div>
          <form className="loading-form" onSubmit={saveLoading}>
            <Field label="1. Truck / tempo number" required>
              <input required value={loading.vehicle_number || ""} onChange={e => setLoading({...loading, vehicle_number: e.target.value})} placeholder="e.g. GJ 06 AB 1234"/>
            </Field>
            <Field label="2. Net Weight quintals" required hint="Weighbridge certified net weight">
              <input type="number" min="0.01" step="0.01" required value={loading.net_weight_quintals || ""} onChange={e => setLoading({...loading, net_weight_quintals: e.target.value})} placeholder="0.00"/>
            </Field>
            <Field label="3. Driver license no." required>
              <input required value={loading.driver_license_number || ""} onChange={e => setLoading({...loading, driver_license_number: e.target.value})} placeholder="e.g. DL-0420110012345"/>
            </Field>
            <Field label="4. Driver contact number" required hint="Driver phone for tracking">
              <input required value={loading.driver_contact_number || ""} onChange={e => setLoading({...loading, driver_contact_number: e.target.value})} placeholder="+91 98765 43210"/>
            </Field>
            <Field label="5. Transport no.">
              <input value={loading.transport_number || ""} onChange={e => setLoading({...loading, transport_number: e.target.value})} placeholder="Transport company reference"/>
            </Field>
            <Field label="6. Transporter name" required>
              <input required value={loading.transport_name || ""} onChange={e => setLoading({...loading, transport_name: e.target.value})} placeholder="Logistics / transport firm"/>
            </Field>
            <Field label="7. LR no." required>
              <input required value={loading.lr_number || ""} onChange={e => setLoading({...loading, lr_number: e.target.value})} placeholder="Lorry receipt number"/>
            </Field>

            <button className="button primary full"><Check size={16}/> Save Step 3 Loading Details</button>
          </form>
        </section>

        {/* Back and Next navigation footer */}
        <div className="step-nav-footer">
          <button className="button secondary" onClick={() => setStep(2)}>
            <ArrowLeft size={16}/> Back to Contract 2 (Confirmation)
          </button>
          <button className="button primary" onClick={() => setStep(4)}>
            Next: Step 4 Gate Pass <ArrowRight size={16}/>
          </button>
        </div>
      </div>
    )}

    {/* STEP 4: GATE PASS WITH ALL DETAILS */}
    {currentStep === 4 && (
      <div>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Step 4: Generate Gate Pass with all details</h2>
              <p>Consolidates all 15 Contract 1 details and all 7 Step 3 loading details</p>
            </div>
            <PackageCheck size={22}/>
          </div>

          <div style={{ padding: "0 21px 20px" }}>
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 18, marginBottom: 18 }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 13, color: "#1e293b" }}>Dispatch Summary</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, fontSize: 11 }}>
                <div><span style={{ color: "#64748b" }}>Contract:</span> <strong>{contract.contract_number}</strong></div>
                <div><span style={{ color: "#64748b" }}>Party:</span> <strong>{contract.party_name}</strong></div>
                <div><span style={{ color: "#64748b" }}>Vehicle:</span> <strong>{loading.vehicle_number || "Not saved"}</strong></div>
                <div><span style={{ color: "#64748b" }}>Net Weight:</span> <strong>{loading.net_weight_quintals ? `${loading.net_weight_quintals} qtl` : "—"}</strong></div>
                <div><span style={{ color: "#64748b" }}>Transporter:</span> <strong>{loading.transport_name || "—"}</strong></div>
                <div><span style={{ color: "#64748b" }}>Driver Phone:</span> <strong>{loading.driver_contact_number || "—"}</strong></div>
                <div><span style={{ color: "#64748b" }}>LR No.:</span> <strong>{loading.lr_number || "—"}</strong></div>
              </div>
            </div>

            <button className="button primary full" onClick={makeGatePass} style={{ padding: 14, fontSize: 13, fontWeight: 700 }}>
              <PackageCheck size={18}/> Generate & Download Official Gate Pass PDF
            </button>
          </div>
        </section>

        {/* Back and Next navigation footer */}
        <div className="step-nav-footer">
          <button className="button secondary" onClick={() => setStep(3)}>
            <ArrowLeft size={16}/> Back to Step 3 (Loading Details)
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

function LoadingPage({ data }) {
  const navigate = useNavigate();
  const ready = data.contracts.filter(c => ["confirmed", "loading"].includes(c.status));
  return <>
    <PageHeading eyebrow="STEP 03 / DISPATCH" title="Step 3: Loading Management" description="Choose a contract to enter vehicle, net weight, driver license, driver contact number, and transporter details."/>
    <section className="panel">
      <div className="panel-heading">
        <div><h2>Contracts Ready for Loading</h2><p>{ready.length} contract(s) ready in this stage</p></div>
        <Truck size={19}/>
      </div>
      {ready.length ? <ContractTable contracts={ready} onOpen={id => navigate(`/contracts/${id}?step=3`)}/> : <div className="empty-state"><Truck size={25}/><strong>No contracts awaiting loading</strong><span>Create a contract first, then open its details to record loading info.</span><button className="button primary" onClick={() => navigate("/contracts/new")}>Create Step 1 contract <ArrowRight size={15}/></button></div>}
    </section>
  </>;
}

function GatePasses({ data }) {
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (data.demoMode) return;
    setLoading(true);
    supabase.from("gate_passes").select("*, contracts(*)").order("created_at", { ascending: false }).then(({ data: rows, error: e }) => {
      if (e) setError(e.message);
      else setPasses(rows || []);
      setLoading(false);
    });
  }, [data.demoMode]);

  return <>
    <PageHeading eyebrow="STEP 04 / DISPATCH DOCUMENTS" title="Step 4: Gate Passes" description="Review generated Gate Passes containing complete contract and loading details."/>
    <section className="panel">
      <div className="panel-heading">
        <div><h2>Generated Gate Passes</h2><p>Each gate pass consolidates all 15 contract fields and 7 loading fields.</p></div>
        <PackageCheck size={20}/>
      </div>
      {data.demoMode ? (
        <div className="empty-state">
          <PackageCheck size={25}/>
          <strong>Ready to generate Gate Passes</strong>
          <span>Open any contract in Step 4 stage and click "Generate Gate Pass with all details".</span>
        </div>
      ) : loading ? (
        <div className="empty-state">Loading gate passes…</div>
      ) : error ? (
        <div className="form-error">{error}</div>
      ) : !passes.length ? (
        <div className="empty-state">
          <PackageCheck size={25}/>
          <strong>No gate passes generated yet</strong>
          <span>Complete Step 3 loading details on any contract to generate its gate pass.</span>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Gate Pass</th>
                <th>Contract</th>
                <th>Party</th>
                <th>PR / Lot</th>
                <th>Generated</th>
                <th>Status</th>
                <th>Document</th>
              </tr>
            </thead>
            <tbody>
              {passes.map(p => (
                <tr key={p.id}>
                  <td><strong className="contract-code">{p.gate_pass_number}</strong></td>
                  <td>{p.contracts?.contract_number}</td>
                  <td>{p.contracts?.party_name}</td>
                  <td>{p.contracts?.pr_number ? `PR: ${p.contracts?.pr_number} | Lot: ${p.contracts?.lot_number || ""}` : "—"}</td>
                  <td>{new Date(p.created_at).toLocaleDateString("en-IN")}</td>
                  <td><StatusBadge status="completed"/></td>
                  <td>
                    {p.storage_path ? (
                      <button className="text-button" onClick={() => openPrivateDocument(p.storage_path)}>
                        Open PDF <ExternalLink size={13}/>
                      </button>
                    ) : "PDF downloaded"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  </>;
}

async function writeAudit(entity_type, entity_id, action, details = {}) {
  if (!supabase || !entity_id) return;
  const user = (await supabase.auth.getUser()).data.user;
  const { error } = await supabase.from("audit_logs").insert({ entity_type, entity_id, action, details, actor_id: user?.id });
  if (error) console.warn("Audit log was not saved:", error.message);
}

async function savePdfToStorage(contract, documentType, blob) {
  const user = (await supabase.auth.getUser()).data.user;
  const fileName = `${documentType === "contract_pdf" ? "Contract" : "Signed-Contract"}-${contract.contract_number}.pdf`;
  const path = `${contract.id}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const { error: uploadError } = await supabase.storage.from("contract-documents").upload(path, blob, { contentType: "application/pdf", upsert: true });
  if (uploadError) throw uploadError;
  const { error: rowError } = await supabase.from("contract_documents").insert({ contract_id: contract.id, document_type: documentType, storage_path: path, file_name: fileName, uploaded_by: user?.id });
  if (rowError) throw rowError;
  return path;
}

async function openPrivateDocument(path) {
  const { data, error } = await supabase.storage.from("contract-documents").createSignedUrl(path, 60);
  if (error) { window.alert(`Could not open document: ${error.message}`); return; }
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}

function PartiesPage({ data }) {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (data.demoMode) return;
    setLoading(true);
    supabase.from("parties").select("*").order("name").then(({ data: rows }) => {
      setParties(rows || []);
      setLoading(false);
    });
  }, [data.demoMode]);

  const demoParties = [...new Map(data.contracts.filter(c => c.party_name).map(c => [c.party_name, { name: c.party_name, gst_number: c.gst_number, contact_number: c.contact_number, address: c.party_address }])).values()];
  const rows = data.demoMode ? demoParties : parties;

  return <>
    <PageHeading eyebrow="BUSINESS DIRECTORY" title="Parties" description="Buyer, seller, and spinning mill records referenced by contracts."/>
    <section className="panel">
      <div className="panel-heading">
        <div><h2>Party Directory</h2><p>Parties registered across contracts</p></div>
        <Users size={19}/>
      </div>
      {loading ? (
        <div className="empty-state">Loading parties…</div>
      ) : !rows.length ? (
        <div className="empty-state"><Users size={25}/><strong>No party records yet</strong><span>Party details will be available here as you add them to contracts.</span></div>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr><th>Party name</th><th>GST number</th><th>Contact</th><th>Address</th></tr>
            </thead>
            <tbody>
              {rows.map((p, i) => (
                <tr key={p.id || i}>
                  <td><strong>{p.name}</strong></td>
                  <td>{p.gst_number || "—"}</td>
                  <td>{p.contact_number || "—"}</td>
                  <td>{p.address || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  </>;
}
