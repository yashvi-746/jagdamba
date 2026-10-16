import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  Activity, ArrowDownToLine, ArrowLeft, ArrowRight, Bell, CalendarDays, Check,
  ChevronDown, FileCheck2, FilePlus2, FileText, LayoutDashboard, LogOut, Menu,
  PackageCheck, Plus, Search, ShieldCheck, Truck, Users, X, Mail, MessageCircle,
  PenLine, ExternalLink, Send
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { generateContractPdf, generateGatePassPdf, SOURCE_TERMS } from "./lib/documents";

// STEP 1: COTTON SEED (Strictly the 13 fields from the PDF)
const blankContract = {
  contract_date: new Date().toLocaleDateString("en-CA"), // 1. DATE
  contract_number: "",                                  // 2. CONTRACT NUMBER
  party_name: "",                                       // 3. PARTY NAME
  gst_number: "",                                       // 4. GST NUMBER
  party_address: "",                                    // 5. ADDREESS
  contact_number: "",                                   // 6. CONTACT NO.
  quantity_quintals: "",                                // 7. QUANTITY
  commodity: "COTTON SEED",                             // 8. COMMODITY : COTTON SEED
  delivery_condition: "",                               // 9. DELIVERY CONDITION
  payment_condition: "",                                // 10. PAYMENT CONDITION
  rate_per_quintal: "",                                 // 11. RATE PER QUINTALS
  packing_type: "LOOSE",                                // 12. PACKING TYPE : LOOSE/BAGS
  delivery_address: "",                                 // 13. DELIVERY ADDRESS
  status: "draft"
};

// Step 3: Loading details as per contract (Strictly the 6 fields from the PDF)
const blankLoading = {
  vehicle_number: "",          // 1. Truck /tempo number
  net_weight_quintals: "",     // 2. Net Weight quintals
  driver_license_number: "",   // 3. Driver license no.
  transport_number: "",        // 4. Transport no.
  transport_name: "",          // 5. Transport name
  lr_number: ""                // 6. Lr no.
};

const demoContracts = [
  {
    id: "demo-1",
    contract_number: "CS-2026-001",
    contract_date: "2026-10-10",
    party_name: "Shree Ganesh Agro Oil Mill",
    gst_number: "24AAACG1234F1Z1",
    party_address: "Kadi, Gujarat",
    contact_number: "+91 98250 11111",
    quantity_quintals: 250,
    commodity: "COTTON SEED",
    delivery_condition: "Ready Delivery (Ex-Factory)",
    payment_condition: "Immediate on delivery / RTGS",
    rate_per_quintal: 3650,
    packing_type: "LOOSE",
    delivery_address: "Plot 12, GIDC Kadi, Gujarat",
    status: "confirmed"
  },
  {
    id: "demo-2",
    contract_number: "CS-2026-002",
    contract_date: "2026-10-12",
    party_name: "Patel Seed Crushers",
    gst_number: "24AABCP5678K1Z5",
    party_address: "Mansa, Gandhinagar",
    contact_number: "+91 98250 22222",
    quantity_quintals: 300,
    commodity: "COTTON SEED",
    delivery_condition: "FOR Destination",
    payment_condition: "7 days credit",
    rate_per_quintal: 3700,
    packing_type: "BAGS",
    delivery_address: "Mansa Industrial Area, Gujarat",
    status: "loading"
  }
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

  if (!authChecked) return <div className="boot-screen"><div className="app-logo-badge"><img src="/logo.svg" alt="Logo" className="app-logo-img" style={{ width: 60 }}/></div><span>Loading Shree Jagdamba Cotton Seed System…</span></div>;
  if (isSupabaseConfigured && !session && !offlineMode) return <Login onLogin={setSession} onOffline={() => {
    setOfflineMode(true);
    localStorage.setItem("seedledger_offline_mode", "true");
  }} />;

  const pageTitle = ({
    "/": "Overview",
    "/contracts": "Contract Register",
    "/contracts/new": "Step 1: Cotton Seed Contract Details",
    "/confirmations": "Step 2: Send to Buyer",
    "/loading": "Step 3: Loading Management",
    "/gate-passes": "Step 4: Gate Passes",
    "/parties": "Parties"
  })[location.pathname] || "Workspace";

  return (
    <div className="app-shell">
      {mobileOpen && <button className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label="Close menu" />}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`} style={{ overflowY: "auto" }}>
        <div className="brand">
          <div className="app-logo-badge"><img src="/logo.svg" alt="Shree Jagdamba" className="app-logo-img"/></div>
          <div><strong>Shree Jagdamba</strong><span>COTTON SEED</span></div>
          <button className="icon-button sidebar-close" onClick={() => setMobileOpen(false)}><X size={18}/></button>
        </div>
        <div className="workspace-label">COTTON SEED WORKFLOW</div>
        <nav className="nav-list">
          <NavItem to="/" icon={<LayoutDashboard size={18}/>} label="Overview" onClick={() => setMobileOpen(false)} />
          <NavItem to="/contracts" icon={<FileText size={18}/>} label="Contract Register" count={data.contracts.length} onClick={() => setMobileOpen(false)} />
          <NavItem to="/contracts/new" icon={<FilePlus2 size={18}/>} label="Step 1: New Contract" onClick={() => setMobileOpen(false)} />
          <NavItem to="/confirmations" icon={<Send size={18}/>} label="Step 2: Send to Buyer" onClick={() => setMobileOpen(false)} />
          <NavItem to="/loading" icon={<Truck size={18}/>} label="Step 3: Loading" onClick={() => setMobileOpen(false)} />
          <NavItem to="/gate-passes" icon={<PackageCheck size={18}/>} label="Step 4: Gate Passes" onClick={() => setMobileOpen(false)} />
          <NavItem to="/parties" icon={<Users size={18}/>} label="Parties" onClick={() => setMobileOpen(false)} />
        </nav>

        <div className="sidebar-bottom">
          <div className="secure-card"><ShieldCheck size={18}/><div><strong>Cotton Seed Desk</strong><span>Broker Confirmation Workflow</span></div></div>
          <div className="profile-row"><div className="avatar">BO</div><div className="profile-copy"><strong>Broker Office</strong><span>Authorized</span></div><button className="icon-button" onClick={signOut} title="Sign out"><LogOut size={16}/></button></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button menu-toggle" onClick={() => setMobileOpen(true)}><Menu size={20}/></button>
            <div className="breadcrumbs"><span>Cotton Seed Workspace</span><span className="crumb-slash">/</span><strong>{pageTitle}</strong></div>
          </div>
          <div className="topbar-actions">
            <div className="today-pill"><CalendarDays size={15}/>{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
            <button className="icon-button notification-button" title="Notifications"><Bell size={18}/><i /></button>
            <div className="top-avatar">BO</div>
          </div>
        </header>
        {data.demoMode && <div className="demo-banner" style={{ background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" }}><Activity size={15}/><span><strong>Local Workspace</strong> — All 4 Steps (Contract 13 details, Send to Buyer, Loading 6 fields, Gate Pass) active.</span></div>}
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
            <Route path="*" element={<Dashboard data={data} />} />
          </Routes>
        </div>
        <footer className="footer"><span>© {new Date().getFullYear()} Shree Jagdamba Cotton Seed System</span><span><span className="status-dot"/> 4-Step Contract & Gate Pass Workflow</span></footer>
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
  return <div className="login-page"><div className="login-decoration"><div className="login-orbit orbit-one"/><div className="login-orbit orbit-two"/><div className="login-copy"><div className="app-logo-badge"><img src="/logo.svg" alt="Shree Jagdamba" className="app-logo-img"/></div><p className="eyebrow">COTTON SEED CONTRACT MANAGEMENT</p><h1>Cotton Seed Contracts.<br/><em>In exact order.</em></h1><p>4-step lifecycle: Step 1 Details, Step 2 Buyer confirmation, Step 3 Loading records, and Step 4 Gate passes.</p><div className="login-feature"><ShieldCheck size={18}/> Authorized office & broker team access</div></div></div><div className="login-form-wrap"><form className="login-form" onSubmit={submit}><span className="eyebrow">WELCOME BACK</span><h2>Sign in to Shree Jagdamba</h2><p>Use your authorized office account to continue.</p><label>Email address<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com"/></label><label>Password<input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password"/></label>{error && <div className="form-error">{error}</div>}<button className="button primary full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}<ArrowRight size={16}/></button>{onOffline && <button type="button" className="button secondary full" onClick={onOffline} style={{marginTop: 10, justifyContent: "center", fontWeight: 700}}>⚡ Enter Offline Workspace (Instant Demo)</button>}<small>Staff accounts must be created by an authorized administrator.</small></form></div></div>;
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
  const totalQuintals = contracts.reduce((sum, c) => sum + Number(c.quantity_quintals || 0), 0);
  const confirmed = contracts.filter(c => ["confirmed", "loading", "completed"].includes(c.status)).length;
  const pending = contracts.filter(c => ["draft", "pending"].includes(c.status)).length;
  const loadingCount = contracts.filter(c => c.status === "loading").length;
  const completedCount = contracts.filter(c => c.status === "completed").length;
  const navigate = useNavigate();

  return <>
    <PageHeading
      eyebrow="COTTON SEED WORKSPACE"
      title="Operations Overview"
      description="Track the exact 4-step workflow: Step 1 Contract Details, Step 2 Buyer Confirmation, Step 3 Loading Details, and Step 4 Gate Pass."
      action={<button className="button primary" onClick={() => navigate("/contracts/new")}><Plus size={17}/> Step 1: New Contract</button>}
    />

    <div className="stat-grid">
      <StatCard label="Total Contract Quantity" value={`${totalQuintals.toLocaleString("en-IN")} qtl`} change="Contracted Cotton Seed" tone="amber" icon={<FileText size={20}/>} onClick={() => navigate("/contracts")}/>
      <StatCard label="Step 2: Sent to Buyer" value={confirmed} change="Active confirmations" tone="blue" icon={<Send size={20}/>} onClick={() => navigate("/confirmations")}/>
      <StatCard label="Step 3: Loading" value={loadingCount} change="Vehicles in loading" tone="amber" icon={<Truck size={20}/>} onClick={() => navigate("/loading")}/>
      <StatCard label="Step 4: Gate Passes" value={completedCount} change="Dispatched with pass" tone="green" icon={<PackageCheck size={20}/>} onClick={() => navigate("/gate-passes")}/>
    </div>

    {/* Exact 4-Step Visual Workflow */}
    <section className="panel" style={{ marginTop: 22 }}>
      <div className="panel-heading">
        <div>
          <h2>4-Step Workflow Pipeline</h2>
          <p>Follows the exact specification document</p>
        </div>
      </div>
      <div className="workflow-stepper-grid">
        <div className="workflow-step-card" onClick={() => navigate("/contracts/new")}>
          <div className="workflow-step-header">
            <span className="step-badge">STEP 1</span>
            <FilePlus2 size={20} className="step-icon text-blue"/>
          </div>
          <h3>Cotton Seed Contract Details</h3>
          <p>Enter the exact 13 fields: Date, Contract No, Party, GST, Address, Contact, Qty, Cotton Seed, Delivery & Payment conditions, Rate, Packing, Address.</p>
          <div className="step-action-row"><span>New Contract</span><ArrowRight size={14}/></div>
        </div>

        <div className="workflow-step-card" onClick={() => navigate("/confirmations")}>
          <div className="workflow-step-header">
            <span className="step-badge">STEP 2</span>
            <Send size={20} className="step-icon text-purple"/>
          </div>
          <h3>Generate Contract & Send to Buyer</h3>
          <p>Generate confirmation PDF containing 13 details, 5 terms, and 3 signatures. Send to buyer via MAIL or WHAT (WhatsApp).</p>
          <div className="step-action-row"><span>Send to Buyer</span><ArrowRight size={14}/></div>
        </div>

        <div className="workflow-step-card" onClick={() => navigate("/loading")}>
          <div className="workflow-step-header">
            <span className="step-badge">STEP 3</span>
            <Truck size={20} className="step-icon text-amber"/>
          </div>
          <h3>Loading Details as per Contract</h3>
          <p>Record Truck/tempo number, Net weight quintals, Driver license no, Transport no, Transport name, and LR no.</p>
          <div className="step-action-row"><span>Record Loading</span><ArrowRight size={14}/></div>
        </div>

        <div className="workflow-step-card" onClick={() => navigate("/gate-passes")}>
          <div className="workflow-step-header">
            <span className="step-badge">STEP 4</span>
            <PackageCheck size={20} className="step-icon text-green"/>
          </div>
          <h3>Generate Gate Pass With All Details</h3>
          <p>Consolidate all Contract details and Loading details into an official Gate Pass document for factory dispatch.</p>
          <div className="step-action-row"><span>View Gate Passes</span><ArrowRight size={14}/></div>
        </div>
      </div>
    </section>

    <div className="dashboard-grid" style={{ marginTop: 22 }}>
      <section className="panel">
        <div className="panel-heading">
          <div><h2>Recent Contracts</h2><p>Latest Cotton Seed contracts entered</p></div>
          <button className="text-button" onClick={() => navigate("/contracts")}>View all <ArrowRight size={14}/></button>
        </div>
        <ContractTable contracts={contracts.slice(0, 5)} onOpen={id => navigate(`/contracts/${id}`)} compact/>
      </section>

      <section className="panel helper-panel">
        <div className="panel-heading">
          <div><h2>Terms & Conditions</h2><p>5 Terms as per specification</p></div>
          <ShieldCheck size={20}/>
        </div>
        <ol style={{ paddingLeft: 18, fontSize: 11.5, lineHeight: 1.7, color: "#475569", margin: "0 0 16px" }}>
          {SOURCE_TERMS.map((t, idx) => <li key={idx} style={{ marginBottom: 6 }}>{t}</li>)}
        </ol>
        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12, fontSize: 11, color: "#64748b" }}>
          <strong>Signatures Required:</strong> Broker Sign & Stamp, Buyer Sign & Stamp, Seller Sign & Stamp.
        </div>
      </section>
    </div>
  </>;
}

function ContractRegister({ data }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    return data.contracts.filter(c => {
      const matchFilter = filter === "all" ? true : c.status === filter;
      const q = search.toLowerCase();
      const matchSearch = !q ||
        (c.party_name && c.party_name.toLowerCase().includes(q)) ||
        (c.contract_number && c.contract_number.toLowerCase().includes(q)) ||
        (c.delivery_address && c.delivery_address.toLowerCase().includes(q));
      return matchFilter && matchSearch;
    });
  }, [data.contracts, filter, search]);

  return <>
    <PageHeading
      eyebrow="REGISTER"
      title="Contract Register"
      description="View and manage all Cotton Seed contracts across the 4-step lifecycle."
      action={<button className="button primary" onClick={() => navigate("/contracts/new")}><Plus size={17}/> Step 1: New Contract</button>}
    />

    <div className="filter-bar">
      <div className="search-box">
        <Search size={16}/>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by contract number, party, or address…"/>
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
        <ContractTable contracts={filtered} onOpen={id => navigate(`/contracts/${id}`)}/>
      ) : (
        <div className="empty-state">
          <FileText size={28}/>
          <strong>No contracts found</strong>
          <span>Try adjusting your search or create a new contract.</span>
        </div>
      )}
    </section>
  </>;
}

function ConfirmationsPage({ data }) {
  const navigate = useNavigate();
  return <>
    <PageHeading
      eyebrow="STEP 02 / DISPATCH"
      title="Step 2: Send to Buyer"
      description="Generate the contract after confirmation and send to the buyer via WhatsApp ('WHAT') or Email ('MAIL')."
    />
    <section className="panel">
      <div className="panel-heading">
        <div><h2>Contracts for Confirmation</h2><p>Select any contract to review and dispatch to Buyer</p></div>
        <Send size={19}/>
      </div>
      {data.contracts.length ? (
        <ContractTable contracts={data.contracts} onOpen={id => navigate(`/contracts/${id}?step=2`)}/>
      ) : (
        <div className="empty-state">
          <Send size={26}/>
          <strong>No contracts available</strong>
          <span>Create a contract first in Step 1.</span>
        </div>
      )}
    </section>
  </>;
}

function ContractTable({ contracts, onOpen, compact = false }) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Contract No.</th>
            <th>Party Name</th>
            <th>Date</th>
            <th>Quantity</th>
            <th>Rate / Quintal</th>
            <th>Packing</th>
            <th>Status</th>
            {!compact && <th/>}
          </tr>
        </thead>
        <tbody>
          {contracts.map(c => (
            <tr key={c.id} onClick={() => onOpen && onOpen(c.id)} className={onOpen ? "clickable-row" : ""}>
              <td><strong className="contract-code">{c.contract_number || "Draft"}</strong><small className="cell-sub">{c.commodity || "COTTON SEED"}</small></td>
              <td><span className="party-cell">{c.party_name || "—"}</span></td>
              <td>{c.contract_date || "—"}</td>
              <td><strong>{c.quantity_quintals ? `${c.quantity_quintals} Quintals` : "—"}</strong></td>
              <td>{c.rate_per_quintal ? `₹${Number(c.rate_per_quintal).toLocaleString("en-IN")}` : "—"}</td>
              <td><span className="packing-tag">{c.packing_type || "LOOSE"}</span></td>
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
// (Strictly the 13 fields from Step 1 of the PDF)
// ==========================================
function ContractForm({ data }) {
  const [formStep, setFormStep] = useState(1);
  const [form, setForm] = useState(blankContract);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const set = (key, value) => setForm(old => ({ ...old, [key]: value }));

  const validateStep1 = () => {
    setError("");
    if (!form.party_name?.trim()) {
      setError("Please enter 3. PARTY NAME before proceeding.");
      return false;
    }
    if (!form.quantity_quintals) {
      setError("Please enter 7. QUANTITY in Quintals.");
      return false;
    }
    if (!form.rate_per_quintal) {
      setError("Please enter 11. RATE PER QUINTALS.");
      return false;
    }
    if (!form.delivery_address?.trim()) {
      setError("Please enter 13. DELIVERY ADDRESS.");
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

    const generatedNumber = form.contract_number?.trim() || `CS-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const finalForm = {
      ...form,
      contract_number: generatedNumber,
      commodity: "COTTON SEED"
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
    const { data: inserted, error: insertError } = await supabase
      .from("contracts")
      .insert({ ...finalForm, created_by: user?.id, status: "confirmed" })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    data.setContracts(old => [inserted, ...old]);
    generateContractPdf(inserted);
    await data.refresh();
    navigate(`/contracts/${inserted.id}?step=2`);
    setSaving(false);
  }

  const calcQty = Number(form.quantity_quintals || 0);
  const calcRate = Number(form.rate_per_quintal || 0);
  const totalVal = calcQty * calcRate;

  return <>
    <button className="back-link" onClick={() => navigate("/contracts")}><ArrowLeft size={16}/> Back to contract register</button>
    <PageHeading
      eyebrow={formStep === 1 ? "STEP 1" : "STEP 2"}
      title={formStep === 1 ? "Step 1: COTTON SEED Contract Details" : "Step 2: Generate Contract & Send to Buyer"}
      description={formStep === 1 ? "Enter the exact 13 fields from the specification document." : "Review details, download contract PDF, and send to buyer via WhatsApp or Mail."}
    />

    {/* Stepper Header */}
    <div className="contract-stepper">
      <button type="button" className={`stepper-tab ${formStep === 1 ? "active" : "done"}`} onClick={() => setFormStep(1)}>
        <div className="stepper-num">1</div>
        <div className="stepper-label">
          <strong>Step 1: Contract Details</strong>
          <span>Exact 13 items from PDF</span>
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
      /* STEP 1: EXACT 13 ITEMS FROM PDF */
      <form onSubmit={goToContract2}>
        <div className="form-layout">
          <div className="form-main">
            <section className="panel form-panel">
              <div className="form-section-heading">
                <span className="form-section-icon"><FileText size={18}/></span>
                <div>
                  <h2>COTTON SEED Contract Details</h2>
                  <p>Items 1 to 13 as specified in the PDF</p>
                </div>
                <span className="required-note">* Required</span>
              </div>

              <div className="field-grid">
                <Field label="1. DATE" required>
                  <input type="date" required value={form.contract_date} onChange={e => set("contract_date", e.target.value)}/>
                </Field>
                <Field label="2. CONTRACT NUMBER ." hint="Leave blank to auto-generate (e.g. CS-2026-003)">
                  <input value={form.contract_number} onChange={e => set("contract_number", e.target.value)} placeholder="e.g. CS-2026-003"/>
                </Field>
                <Field label="3. PARTY NAME" required>
                  <input required value={form.party_name} onChange={e => set("party_name", e.target.value)} placeholder="Enter Party Name"/>
                </Field>
                <Field label="4. GST NUMBER">
                  <input value={form.gst_number} onChange={e => set("gst_number", e.target.value)} placeholder="GST Number"/>
                </Field>
                <Field label="5. ADDREESS" wide>
                  <textarea rows="2" value={form.party_address} onChange={e => set("party_address", e.target.value)} placeholder="Full Party Address"/>
                </Field>
                <Field label="6. CONTACT NO.">
                  <input value={form.contact_number} onChange={e => set("contact_number", e.target.value)} placeholder="+91 98765 43210"/>
                </Field>
                <Field label="7. QUANTITY" required hint="Quantity in Quintals">
                  <input type="number" min="0.01" step="0.01" required value={form.quantity_quintals} onChange={e => set("quantity_quintals", e.target.value)} placeholder="Quantity (Quintals)"/>
                </Field>
                <Field label="8. COMMODITY : COTTON SEED" required>
                  <input value="COTTON SEED" readOnly style={{ background: "#f8fafc", fontWeight: 700, color: "#1e293b" }}/>
                </Field>
                <Field label="9. DELIVERY CONDITION" required>
                  <input required value={form.delivery_condition} onChange={e => set("delivery_condition", e.target.value)} placeholder="e.g. Ready Delivery / Ex-Factory"/>
                </Field>
                <Field label="10. PAYMENT CONDITION" required>
                  <input required value={form.payment_condition} onChange={e => set("payment_condition", e.target.value)} placeholder="e.g. Immediate on delivery / RTGS"/>
                </Field>
                <Field label="11. RATE PER QUINTALS" required hint="Rate in ₹ per Quintal">
                  <input type="number" min="0" step="0.01" required value={form.rate_per_quintal} onChange={e => set("rate_per_quintal", e.target.value)} placeholder="e.g. 3650.00"/>
                </Field>
                <Field label="12. PACKING TYPE : LOOSE/BAGS" required>
                  <select value={form.packing_type} onChange={e => set("packing_type", e.target.value)}>
                    <option value="LOOSE">LOOSE</option>
                    <option value="BAGS">BAGS</option>
                  </select>
                </Field>
                <Field label="13. DELIVERY ADDRESS" required wide>
                  <textarea required rows="2" value={form.delivery_address} onChange={e => set("delivery_address", e.target.value)} placeholder="Delivery destination address"/>
                </Field>
              </div>

              {/* Live Calculation */}
              <div style={{ marginTop: 18, padding: "16px 20px", background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, color: "#166534", fontWeight: 700, display: "block" }}>Total Valuation</span>
                  <strong style={{ fontSize: 20, color: "#14532d", fontWeight: 800 }}>₹{totalVal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong>
                </div>
                <div style={{ fontSize: 12, color: "#15803d" }}>
                  {calcQty > 0 && calcRate > 0 ? `${calcQty} Quintals × ₹${calcRate}/qtl` : "Enter Quantity & Rate to see total"}
                </div>
              </div>
            </section>
          </div>

          <aside className="form-aside">
            <div className="panel preview-card">
              <div className="preview-top">
                <div className="preview-doc-icon"><FileCheck2 size={22}/></div>
                <span className="preview-label">STEP 1 CHECKLIST</span>
              </div>
              <h3>13 Items Ready</h3>
              <p>Proceed to Step 2 to generate the contract PDF and send to the buyer.</p>
              <div className="preview-line"/>
              <div className="preview-row"><span>Party</span><strong>{form.party_name || "—"}</strong></div>
              <div className="preview-row"><span>Commodity</span><strong>COTTON SEED</strong></div>
              <div className="preview-row"><span>Quantity</span><strong>{form.quantity_quintals ? `${form.quantity_quintals} qtl` : "—"}</strong></div>
              <div className="preview-row"><span>Rate</span><strong>{form.rate_per_quintal ? `₹${form.rate_per_quintal}/qtl` : "—"}</strong></div>
              <div className="preview-row"><span>Packing</span><strong>{form.packing_type}</strong></div>
              <button type="submit" className="button primary full" style={{ marginTop: 16 }}>
                Next: Step 2 Send to Buyer <ArrowRight size={16}/>
              </button>
            </div>
          </aside>
        </div>
      </form>
    ) : (
      /* STEP 2: REVIEW, GENERATE & SEND TO BUYER */
      <div className="form-layout">
        <div className="form-main">
          <section className="panel" style={{ padding: 22, marginBottom: 20 }}>
            <div className="panel-heading" style={{ padding: 0, marginBottom: 14 }}>
              <div>
                <h2>Step 2: Generate the contract after conformation send to the buyer</h2>
                <p>Verify all 13 details and the 5 legal terms before saving and dispatching</p>
              </div>
            </div>

            <div className="detail-fields" style={{ marginBottom: 20 }}>
              <Detail label="1. DATE" value={form.contract_date}/>
              <Detail label="2. CONTRACT NUMBER" value={form.contract_number || "Auto-generated on save"}/>
              <Detail label="3. PARTY NAME" value={form.party_name}/>
              <Detail label="4. GST NUMBER" value={form.gst_number}/>
              <Detail label="5. ADDREESS" value={form.party_address}/>
              <Detail label="6. CONTACT NO." value={form.contact_number}/>
              <Detail label="7. QUANTITY" value={`${form.quantity_quintals} QUINTALS`}/>
              <Detail label="8. COMMODITY" value="COTTON SEED"/>
              <Detail label="9. DELIVERY CONDITION" value={form.delivery_condition}/>
              <Detail label="10. PAYMENT CONDITION" value={form.payment_condition}/>
              <Detail label="11. RATE PER QUINTALS" value={`₹${form.rate_per_quintal} / Quintal`}/>
              <Detail label="12. PACKING TYPE" value={form.packing_type}/>
              <Detail label="13. DELIVERY ADDRESS" value={form.delivery_address}/>
            </div>

            <h3 style={{ fontSize: 13, marginBottom: 10, color: "#1e293b" }}>Terms & Conditions :</h3>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12, lineHeight: 1.8, color: "#475569" }}>
              {SOURCE_TERMS.map((t, idx) => <li key={idx} style={{ marginBottom: 6 }}>{t}</li>)}
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
            <p>Once saved, the official contract PDF will be downloaded and you will proceed to the dispatch screen.</p>
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
// 4-STEP CONTRACT LIFECYCLE CONTROLLER
// (Contract Details -> Step 2 Send -> Step 3 Loading -> Step 4 Gate Pass)
// ==========================================
function ContractDetail({ data }) {
  const location = useLocation();
  const navigate = useNavigate();
  const contractId = location.pathname.split("/")[2];
  const contract = data.contracts.find(c => String(c.id) === String(contractId));

  const [loading, setLoading] = useState(blankLoading);
  const [message, setMessage] = useState("");

  const searchParams = new URLSearchParams(location.search);
  const initialStep = Number(searchParams.get("step")) || 1;
  const [currentStep, setCurrentStep] = useState(initialStep);

  useEffect(() => {
    const s = Number(searchParams.get("step")) || 1;
    setCurrentStep(s);
  }, [location.search]);

  useEffect(() => {
    if (!contract) return;
    if (data.demoMode) {
      const saved = localStorage.getItem("seedledger_loading_" + contract.id);
      if (saved) {
        try { setLoading(JSON.parse(saved)); } catch (e) {}
      }
      return;
    }
    supabase.from("loading_details").select("*").eq("contract_id", contract.id).limit(1).maybeSingle().then(({ data: row }) => {
      if (row) setLoading(row);
    });
  }, [contract?.id, data.demoMode]);

  if (!contract) {
    return <div className="panel empty-state"><strong>Contract not found</strong><button className="button primary" onClick={() => navigate("/contracts")}>Back to Register</button></div>;
  }

  const setStep = (s) => {
    setCurrentStep(s);
    navigate(`/contracts/${contract.id}?step=${s}`, { replace: true });
  };

  // Step 3: Save Loading Details (6 fields from PDF)
  async function saveLoading(e) {
    if (e) e.preventDefault();
    setMessage("");

    if (data.demoMode) {
      localStorage.setItem("seedledger_loading_" + contract.id, JSON.stringify(loading));
      data.setContracts(old => old.map(c => c.id === contract.id ? { ...c, status: "loading" } : c));
      setMessage("Step 3: Loading details saved successfully.");
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
    setMessage("Step 3: Loading details saved.");
    data.refresh();
  }

  // Step 4: Generate Gate Pass with all details
  async function makeGatePass() {
    if (!loading.vehicle_number || !loading.net_weight_quintals || !loading.transport_name || !loading.lr_number) {
      setMessage("Please fill and save all Step 3 loading details before generating Gate Pass.");
      return;
    }

    const gateNum = "GP-2026-" + Math.floor(1000 + Math.random() * 9000);

    if (data.demoMode) {
      generateGatePassPdf(contract, loading, gateNum);
      data.setContracts(old => old.map(c => c.id === contract.id ? { ...c, status: "completed" } : c));
      setMessage(`Step 4: Gate Pass ${gateNum} generated and downloaded with all details!`);
      return;
    }

    const { data: savedLoading, error: loadingError } = await supabase.from("loading_details").select("*").eq("contract_id", contract.id).single();
    if (loadingError) { setMessage("Save complete loading details before generating a gate pass."); return; }

    const user = (await supabase.auth.getUser()).data.user;
    const { data: createdGate } = await supabase.from("gate_passes").insert({ contract_id: contract.id, loading_detail_id: savedLoading.id, created_by: user?.id }).select().single();

    generateGatePassPdf(contract, savedLoading, createdGate?.gate_pass_number || gateNum);
    await supabase.from("contracts").update({ status: "completed" }).eq("id", contract.id);
    setMessage(`Step 4: Gate pass ${createdGate?.gate_pass_number || gateNum} generated and downloaded.`);
    data.refresh();
  }

  // Step 2: Send to Buyer via WhatsApp or Mail
  async function recordSent(channel) {
    const phone = (contract.contact_number || "").replace(/\D/g, "");
    if (channel === "whatsapp" && !phone) {
      setMessage("Add a contact phone number to dispatch WhatsApp confirmation.");
      return;
    }

    const text = `*Shree Jagdamba - Cotton Seed Contract Confirmation*\n` +
      `Contract No: ${contract.contract_number}\n` +
      `Party: ${contract.party_name}\n` +
      `Commodity: COTTON SEED\n` +
      `Quantity: ${contract.quantity_quintals} Quintals\n` +
      `Rate: INR ${contract.rate_per_quintal} per Quintal\n` +
      `Packing: ${contract.packing_type}\n` +
      `Delivery: ${contract.delivery_address}\n\n` +
      `Please sign and send contract confirmation within 1 days as agreed.`;

    const target = channel === "whatsapp"
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `mailto:?subject=${encodeURIComponent("Cotton Seed Contract Confirmation " + contract.contract_number)}&body=${encodeURIComponent(text + "\n\nPlease find the contract confirmation attached.")}`;

    window.open(target, "_blank");

    if (!data.demoMode) {
      await supabase.from("contracts").update({ status: "pending" }).eq("id", contract.id);
      data.refresh();
    }
    setMessage(`Step 2: Confirmation sent to Buyer via ${channel === "whatsapp" ? "WhatsApp" : "Email"}.`);
  }

  return <>
    <button className="back-link" onClick={() => navigate("/contracts")}><ArrowLeft size={16}/> Back to contract register</button>
    
    <PageHeading
      eyebrow={`STEP 0${currentStep} / ${currentStep === 1 ? "CONTRACT DETAILS" : currentStep === 2 ? "SEND TO BUYER" : currentStep === 3 ? "LOADING DETAILS" : "GATE PASS"}`}
      title={`${contract.contract_number || "Contract"} · ${currentStep === 1 ? "Step 1: Contract Details" : currentStep === 2 ? "Step 2: Send to Buyer" : currentStep === 3 ? "Step 3: Loading Details" : "Step 4: Gate Pass"}`}
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
          <span>13 Cotton Seed fields</span>
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
          <span>6 dispatch details</span>
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

    {message && <div className={message.includes("saved") || message.includes("generated") || message.includes("sent") ? "success-message" : "form-error"} style={{ marginBottom: 18 }}>{message}</div>}

    {/* STEP 1: COTTON SEED CONTRACT DETAILS (13 ITEMS) */}
    {currentStep === 1 && (
      <div>
        <section className="panel">
          <div className="panel-heading">
            <div><h2>COTTON SEED Contract Details</h2><p>Exact 13 fields from the specification document</p></div>
            <StatusBadge status={contract.status}/>
          </div>
          <div className="detail-fields">
            <Detail label="1. DATE" value={contract.contract_date}/>
            <Detail label="2. CONTRACT NUMBER ." value={contract.contract_number}/>
            <Detail label="3. PARTY NAME" value={contract.party_name}/>
            <Detail label="4. GST NUMBER" value={contract.gst_number}/>
            <Detail label="5. ADDREESS" value={contract.party_address}/>
            <Detail label="6. CONTACT NO." value={contract.contact_number}/>
            <Detail label="7. QUANTITY" value={`${contract.quantity_quintals} QUINTALS`}/>
            <Detail label="8. COMMODITY" value="COTTON SEED"/>
            <Detail label="9. DELIVERY CONDITION" value={contract.delivery_condition}/>
            <Detail label="10. PAYMENT CONDITION" value={contract.payment_condition}/>
            <Detail label="11. RATE PER QUINTALS" value={contract.rate_per_quintal ? `₹${Number(contract.rate_per_quintal).toLocaleString("en-IN")}` : "—"}/>
            <Detail label="12. PACKING TYPE" value={contract.packing_type || "LOOSE/BAGS"}/>
            <Detail label="13. DELIVERY ADDRESS" value={contract.delivery_address}/>
          </div>
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

    {/* STEP 2: GENERATE CONTRACT AFTER CONFORMATION SEND TO THE BUYER */}
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

        {/* Exact 5 Terms & Conditions */}
        <section className="panel" style={{ padding: 22, marginBottom: 20 }}>
          <div className="panel-heading" style={{ padding: 0, marginBottom: 14 }}>
            <div>
              <h2>Terms & Conditions :</h2>
              <p>5 legal clauses as specified in the PDF</p>
            </div>
          </div>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12, lineHeight: 1.85, color: "#475569" }}>
            {SOURCE_TERMS.map((term, i) => <li key={i} style={{ marginBottom: 8 }}>{term}</li>)}
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

    {/* STEP 3: LOADING DETAILS AS PER CONTRACT (EXACT 6 FIELDS) */}
    {currentStep === 3 && (
      <div>
        <section className="panel">
          <div className="panel-heading">
            <div><h2>Step 3: Loading details as per contract</h2><p>Exact 6 loading fields from the specification document</p></div>
            <Truck size={20}/>
          </div>
          <form className="loading-form" onSubmit={saveLoading}>
            <Field label="1. Truck /tempo number" required>
              <input required value={loading.vehicle_number || ""} onChange={e => setLoading({...loading, vehicle_number: e.target.value})} placeholder="e.g. GJ 06 AB 1234"/>
            </Field>
            <Field label="2. Net Weight quintals" required>
              <input type="number" min="0.01" step="0.01" required value={loading.net_weight_quintals || ""} onChange={e => setLoading({...loading, net_weight_quintals: e.target.value})} placeholder="Net Weight in Quintals"/>
            </Field>
            <Field label="3. Driver license no." required>
              <input required value={loading.driver_license_number || ""} onChange={e => setLoading({...loading, driver_license_number: e.target.value})} placeholder="Driver license number"/>
            </Field>
            <Field label="4. Transport no.">
              <input value={loading.transport_number || ""} onChange={e => setLoading({...loading, transport_number: e.target.value})} placeholder="Transport registration / permit no."/>
            </Field>
            <Field label="5. Transport name" required>
              <input required value={loading.transport_name || ""} onChange={e => setLoading({...loading, transport_name: e.target.value})} placeholder="Transport company name"/>
            </Field>
            <Field label="6. Lr no." required>
              <input required value={loading.lr_number || ""} onChange={e => setLoading({...loading, lr_number: e.target.value})} placeholder="Lorry receipt number"/>
            </Field>

            <button className="button primary full"><Check size={16}/> Save Step 3 Loading Details</button>
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
              <h2>Step 4: Generate gate pass with all details</h2>
              <p>Combines Contract Details (Step 1) and Loading Details (Step 3)</p>
            </div>
            <PackageCheck size={22}/>
          </div>

          <div style={{ padding: "0 21px 20px" }}>
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 18, marginBottom: 18 }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 13, color: "#1e293b" }}>Gate Pass Summary</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, fontSize: 11 }}>
                <div><span style={{ color: "#64748b" }}>Contract:</span> <strong>{contract.contract_number}</strong></div>
                <div><span style={{ color: "#64748b" }}>Commodity:</span> <strong>COTTON SEED</strong></div>
                <div><span style={{ color: "#64748b" }}>Party:</span> <strong>{contract.party_name}</strong></div>
                <div><span style={{ color: "#64748b" }}>1. Truck/tempo:</span> <strong>{loading.vehicle_number || "Not saved"}</strong></div>
                <div><span style={{ color: "#64748b" }}>2. Net Weight:</span> <strong>{loading.net_weight_quintals ? `${loading.net_weight_quintals} Quintals` : "—"}</strong></div>
                <div><span style={{ color: "#64748b" }}>3. Driver License:</span> <strong>{loading.driver_license_number || "—"}</strong></div>
                <div><span style={{ color: "#64748b" }}>4. Transport No.:</span> <strong>{loading.transport_number || "—"}</strong></div>
                <div><span style={{ color: "#64748b" }}>5. Transport Name:</span> <strong>{loading.transport_name || "—"}</strong></div>
                <div><span style={{ color: "#64748b" }}>6. LR No.:</span> <strong>{loading.lr_number || "—"}</strong></div>
              </div>
            </div>

            <button className="button primary full" onClick={makeGatePass} style={{ padding: 14, fontSize: 13, fontWeight: 700 }}>
              <PackageCheck size={18}/> Generate Gate Pass with all details (Download PDF)
            </button>
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

function LoadingPage({ data }) {
  const navigate = useNavigate();
  return <>
    <PageHeading eyebrow="STEP 03" title="Step 3: Loading Details as per Contract" description="Choose a contract to record the 6 loading details: Truck/tempo, Net weight, Driver license, Transport no, Transport name, and LR no."/>
    <section className="panel">
      <div className="panel-heading">
        <div><h2>Contracts for Loading</h2><p>{data.contracts.length} contract(s) registered</p></div>
        <Truck size={19}/>
      </div>
      {data.contracts.length ? (
        <ContractTable contracts={data.contracts} onOpen={id => navigate(`/contracts/${id}?step=3`)}/>
      ) : (
        <div className="empty-state">
          <Truck size={25}/>
          <strong>No contracts awaiting loading</strong>
          <button className="button primary" onClick={() => navigate("/contracts/new")}>Step 1: New Contract <ArrowRight size={15}/></button>
        </div>
      )}
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
    <PageHeading eyebrow="STEP 04" title="Step 4: Gate Passes" description="Generate and review Gate Passes containing all contract details and loading details."/>
    <section className="panel">
      <div className="panel-heading">
        <div><h2>Gate Passes</h2><p>Official passes generated with contract and loading details</p></div>
        <PackageCheck size={20}/>
      </div>
      {data.demoMode ? (
        <div className="empty-state">
          <PackageCheck size={25}/>
          <strong>Gate Pass Generator Active</strong>
          <span>Select any contract from the register or click below to open Step 4 and generate an official Gate Pass PDF.</span>
          <button className="button primary" onClick={() => {
            const first = data.contracts[0];
            if (first) window.location.href = `#/contracts/${first.id}?step=4`;
          }}>Open Gate Pass Generator <ArrowRight size={14}/></button>
        </div>
      ) : loading ? (
        <div className="empty-state">Loading gate passes…</div>
      ) : error ? (
        <div className="form-error">{error}</div>
      ) : !passes.length ? (
        <div className="empty-state">
          <PackageCheck size={25}/>
          <strong>No gate passes generated yet</strong>
          <span>Save Step 3 loading details on any contract to generate its gate pass.</span>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Gate Pass</th>
                <th>Contract</th>
                <th>Party</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {passes.map(p => (
                <tr key={p.id}>
                  <td><strong className="contract-code">{p.gate_pass_number}</strong></td>
                  <td>{p.contracts?.contract_number}</td>
                  <td>{p.contracts?.party_name}</td>
                  <td>{new Date(p.created_at).toLocaleDateString("en-IN")}</td>
                  <td><StatusBadge status="completed"/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  </>;
}

function PartiesPage({ data }) {
  const demoParties = [...new Map(data.contracts.filter(c => c.party_name).map(c => [c.party_name, { name: c.party_name, gst_number: c.gst_number, contact_number: c.contact_number, address: c.party_address }])).values()];

  return <>
    <PageHeading eyebrow="DIRECTORY" title="Parties" description="Party name, GST number, contact number, and address records from contracts."/>
    <section className="panel">
      <div className="panel-heading">
        <div><h2>Party Directory</h2><p>Parties registered across Cotton Seed contracts</p></div>
        <Users size={19}/>
      </div>
      {!demoParties.length ? (
        <div className="empty-state"><Users size={25}/><strong>No party records yet</strong><span>Party details will be listed here as you add them to Step 1 contracts.</span></div>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr><th>Party name</th><th>GST number</th><th>Contact</th><th>Address</th></tr>
            </thead>
            <tbody>
              {demoParties.map((p, i) => (
                <tr key={i}>
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
