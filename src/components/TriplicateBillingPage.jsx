import React, { useState, useMemo } from "react";
import {
  FileText,
  UserCheck,
  Building2,
  DollarSign,
  Printer,
  Save,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Coins,
  CreditCard,
  Plus,
  Search,
  Calendar,
  Clock,
  Truck,
  Hash,
  Scale
} from "lucide-react";
import {
  getLocalFarmers,
  saveLocalFarmers,
  getLocalTriplicateBills,
  saveLocalTriplicateBills
} from "../lib/farmerStore";
import { generateTriplicateBillPdf } from "../lib/documents";

const BUYER_DEFAULT = {
  buyer_name: "Shree Jagdamba Cotton G And P Factory",
  address: "Handod"
};

const NOTE_DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5];

export default function TriplicateBillingPage() {
  const [activeStep, setActiveStep] = useState(2); // 1: Master, 2: Billing, 3: History
  const [farmers, setFarmers] = useState(() => getLocalFarmers());
  const [bills, setBills] = useState(() => getLocalTriplicateBills());
  const [message, setMessage] = useState("");
  const [searchHistory, setSearchHistory] = useState("");

  // Step 1: Farmer Master Form
  const [selectedFarmerId, setSelectedFarmerId] = useState("");
  const [farmerForm, setFarmerForm] = useState({
    farmer_name: "",
    village: "",
    vehicle_number: "",
    contact_number: "",
    land_record: "",
    aadhaar_card_number: ""
  });

  // Step 2: Triplicate Bill Form (All containers from Page 4)
  const [billForm, setBillForm] = useState({
    bill_number: "TB-" + (1000 + bills.length + 1),
    dalal_name: "Shree Jagdamba Cotton G And P Factory",
    dalal_residence: "handod",
    buyer_name: "Shree Jagdamba Cotton G And P Factory",
    buyer_residence: "Handod",
    seller_name: "Anilbhai",
    seller_residence: "Fetapura",
    vehicle_number: "GJ 06 AA 1101",
    commodity: "Kapash",
    cotton_type: "Kapash",
    heap_number: "6",
    gate_pass_number: "GP-101",
    bill_date: "13-10-2026",
    bill_time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    gross_weight: 4.20,
    tare_weight: 0.50,
    rate: 7800.00,
    labor_charges: 0,
    vatav: 0,
    diff: 0,
    remarks: "",
    payment_mode: "CASH", // CASH or DEBIT
    // Cash drawer denominations (exact match: 500, 200, 100, 50, 20, 10, 5)
    currency_drawer: {
      500: 57,
      200: 1,
      100: 1,
      50: 1,
      20: 0,
      10: 1,
      5: 0
    },
    // Debit fields
    due_date: "28-10-2026",
    total_credit_days: 15,
    cheque_number: "",
    neft_reference: "",
    bank_name: "SBI Handod"
  });

  // Calculation formulas:
  // Net weight = gross - tare
  // Gross amount = net weight * rate
  // Net amount = gross amount - labor - vatav
  const calculations = useMemo(() => {
    const gross = Number(billForm.gross_weight || 0);
    const tare = Number(billForm.tare_weight || 0);
    const netWeight = Math.max(0, Number((gross - tare).toFixed(2)));
    const rate = Number(billForm.rate || 0);
    const grossAmt = Number((netWeight * rate).toFixed(2));
    const labor = Number(billForm.labor_charges || 0);
    const vatav = Number(billForm.vatav || 0);
    const netPayable = Math.max(0, Number((grossAmt - labor - vatav).toFixed(2)));

    // Currency drawer calculations
    let drawerTotal = 0;
    if (billForm.payment_mode === "CASH") {
      NOTE_DENOMINATIONS.forEach(note => {
        const count = Number(billForm.currency_drawer?.[note] || 0);
        drawerTotal += note * count;
      });
    }

    const drawerDiscrepancy = Number((drawerTotal - netPayable).toFixed(2));

    return {
      netWeight,
      grossAmt,
      netPayable,
      drawerTotal,
      drawerDiscrepancy
    };
  }, [billForm]);

  // When farmer selected in dropdown, populate forms
  const handleSelectFarmer = (id) => {
    setSelectedFarmerId(id);
    const found = farmers.find(f => f.id === id);
    if (found) {
      setFarmerForm(found);
      setBillForm(prev => ({
        ...prev,
        seller_name: found.farmer_name,
        seller_residence: found.village,
        vehicle_number: found.vehicle_number || ""
      }));
    }
  };

  // Save new farmer master
  const handleSaveFarmer = (e) => {
    e.preventDefault();
    if (!farmerForm.farmer_name.trim()) {
      setMessage("Farmer name is required.");
      return;
    }
    const newFarmer = {
      ...farmerForm,
      id: selectedFarmerId || ("f-" + (farmers.length + 1))
    };
    const updated = selectedFarmerId
      ? farmers.map(f => f.id === selectedFarmerId ? newFarmer : f)
      : [newFarmer, ...farmers];

    setFarmers(updated);
    saveLocalFarmers(updated);
    setSelectedFarmerId(newFarmer.id);

    setBillForm(prev => ({
      ...prev,
      seller_name: newFarmer.farmer_name,
      seller_residence: newFarmer.village,
      vehicle_number: newFarmer.vehicle_number || ""
    }));

    setMessage("Farmer KYC saved to master registry. Proceeding to Triplicate Billing.");
    setTimeout(() => {
      setMessage("");
      setActiveStep(2);
    }, 1000);
  };

  // Note count change in currency drawer
  const handleNoteCountChange = (denom, count) => {
    const val = Math.max(0, parseInt(count, 10) || 0);
    setBillForm(prev => ({
      ...prev,
      currency_drawer: {
        ...prev.currency_drawer,
        [denom]: val
      }
    }));
  };

  // Auto-calculate optimal notes for cash drawer
  const autoCalculateNotes = () => {
    let remaining = Math.round(calculations.netPayable);
    const newDrawer = {};
    NOTE_DENOMINATIONS.forEach(denom => {
      const count = Math.floor(remaining / denom);
      newDrawer[denom] = count;
      remaining %= denom;
    });
    setBillForm(prev => ({
      ...prev,
      currency_drawer: newDrawer
    }));
    setMessage("Cash drawer automatically configured for optimal denomination breakdown.");
    setTimeout(() => setMessage(""), 3000);
  };

  // Save Triplicate Bill
  const handleSaveBill = (andPrint = false) => {
    if (!billForm.seller_name.trim()) {
      setMessage("Please enter Seller / Farmer Name.");
      return;
    }
    const newBill = {
      ...billForm,
      id: "tb-" + Date.now(),
      net_weight: calculations.netWeight,
      gross_amount: calculations.grossAmt,
      net_amount: calculations.netPayable,
      status: billForm.payment_mode === "CASH" ? "completed" : "pending_debit"
    };

    const updatedBills = [newBill, ...bills];
    setBills(updatedBills);
    saveLocalTriplicateBills(updatedBills);

    setMessage(`Triplicate Bill ${newBill.bill_number} generated and saved successfully!`);
    setTimeout(() => setMessage(""), 4000);

    if (andPrint) {
      generateTriplicateBillPdf(newBill);
    }

    // Increment bill numbers for next entry
    setBillForm(prev => ({
      ...prev,
      bill_number: "TB-" + (1000 + updatedBills.length + 1),
      gate_pass_number: "GP-" + (100 + updatedBills.length + 1)
    }));
  };

  // Filter bills for History tab
  const filteredBills = bills.filter(b => {
    const term = searchHistory.toLowerCase();
    return (
      b.bill_number?.toLowerCase().includes(term) ||
      b.seller_name?.toLowerCase().includes(term) ||
      b.village_name?.toLowerCase().includes(term) ||
      b.payment_mode?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="triplicate-billing-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">FARMER PROCUREMENT ("DIFFER SECTION")</div>
          <h1>Purchase Bill / Triplicate Billing System</h1>
          <p>
            Complete container-wise raw cotton weighbridge settlement with Currency Drawer (500, 200, 100, 50, 20, 10, 5) and 4-copy signatures.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className={`button ${activeStep === 3 ? "primary" : "secondary"}`}
            onClick={() => setActiveStep(3)}
          >
            <FileText size={15} /> Saved Bills History ({bills.length})
          </button>
        </div>
      </div>

      {message && (
        <div className="success-message" style={{ marginBottom: 18 }}>
          <CheckCircle2 size={16} /> {message}
        </div>
      )}

      {/* Stepper Navigation */}
      <div className="contract-stepper">
        <button
          className={`stepper-tab ${activeStep === 1 ? "active" : ""} ${activeStep > 1 ? "done" : ""}`}
          onClick={() => setActiveStep(1)}
        >
          <div className="stepper-num">1</div>
          <div className="stepper-label">
            <strong>Step 1: Master Registration</strong>
            <span>Farmer KYC & Buyer Registry</span>
          </div>
        </button>

        <button
          className={`stepper-tab ${activeStep === 2 ? "active" : ""}`}
          onClick={() => setActiveStep(2)}
        >
          <div className="stepper-num">2</div>
          <div className="stepper-label">
            <strong>Step 2: Triplicate Billing Form</strong>
            <span>Weighment, Currency Drawer & Case Type</span>
          </div>
        </button>

        <button
          className={`stepper-tab ${activeStep === 3 ? "active" : ""}`}
          onClick={() => setActiveStep(3)}
        >
          <div className="stepper-num">3</div>
          <div className="stepper-label">
            <strong>Saved Bills Register</strong>
            <span>Triplicate Vouchers Archive</span>
          </div>
        </button>
      </div>

      {/* STEP 1: MASTER REGISTRATION */}
      {activeStep === 1 && (
        <div className="form-layout">
          <div className="form-main">
            <div className="panel form-panel">
              <div className="form-section-heading">
                <div className="form-section-icon green">
                  <UserCheck size={18} />
                </div>
                <div>
                  <h2>Farmer (Seller) Master Registration</h2>
                  <p>Register new farmer profile or select existing farmer KYC</p>
                </div>
              </div>

              {/* Quick Select Existing Farmer */}
              <div style={{ marginBottom: 20, background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6 }}>
                  Quick Select Existing Farmer from Registry:
                </label>
                <select
                  value={selectedFarmerId}
                  onChange={(e) => handleSelectFarmer(e.target.value)}
                  style={{ width: "100%", height: 38, borderRadius: 6, border: "1px solid #cbd5e1", padding: "0 10px", fontSize: 12 }}
                >
                  <option value="">-- Or enter new farmer profile below --</option>
                  {farmers.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.farmer_name} — {f.village} {f.vehicle_number ? `(${f.vehicle_number})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <form onSubmit={handleSaveFarmer}>
                <div className="field-grid">
                  <div className="field">
                    <span>Farmer Name <i>*</i></span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Anilbhai"
                      value={farmerForm.farmer_name}
                      onChange={(e) => setFarmerForm({ ...farmerForm, farmer_name: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <span>Village / Residence <i>*</i></span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Fetapura"
                      value={farmerForm.village}
                      onChange={(e) => setFarmerForm({ ...farmerForm, village: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <span>Vehicle Number</span>
                    <input
                      type="text"
                      placeholder="e.g. GJ 06 AA 1101"
                      value={farmerForm.vehicle_number}
                      onChange={(e) => setFarmerForm({ ...farmerForm, vehicle_number: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <span>Contact Number</span>
                    <input
                      type="text"
                      placeholder="e.g. +91 98250 11001"
                      value={farmerForm.contact_number}
                      onChange={(e) => setFarmerForm({ ...farmerForm, contact_number: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <span>Land Record (7/12)</span>
                    <input
                      type="text"
                      placeholder="e.g. 7/12-101"
                      value={farmerForm.land_record}
                      onChange={(e) => setFarmerForm({ ...farmerForm, land_record: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <span>Aadhaar Card Number</span>
                    <input
                      type="text"
                      placeholder="e.g. 2345 6789 0101"
                      value={farmerForm.aadhaar_card_number}
                      onChange={(e) => setFarmerForm({ ...farmerForm, aadhaar_card_number: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button type="submit" className="button primary">
                    Save Farmer & Proceed to Step 2 <ArrowRight size={15} />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Master Side Card: Factory Buyer Info */}
          <div className="form-aside">
            <div className="panel preview-card">
              <div className="preview-top">
                <div className="preview-doc-icon">
                  <Building2 size={20} />
                </div>
                <span className="preview-label">BUYER MASTER</span>
              </div>
              <h3 style={{ marginTop: 12 }}>Buyer (Factory) Info</h3>
              <p>Purchasing factory entity details (fixed as per specification):</p>
              <div className="preview-line" />
              <div className="preview-row">
                <span>Buyer Name:</span>
                <strong>{BUYER_DEFAULT.buyer_name}</strong>
              </div>
              <div className="preview-row">
                <span>Location:</span>
                <strong>{BUYER_DEFAULT.address}</strong>
              </div>
              <div className="preview-row">
                <span>Procurement Unit:</span>
                <strong>Handod Yard</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: TRIPLICATE BILL GENERATION (CONTAINER-WISE LAYOUT MATCHING PAGE 4) */}
      {activeStep === 2 && (
        <div className="modern-procurement-card">
          {/* CONTAINER 1: Factory Brand & Header Strip */}
          <div className="factory-brand-strip">
            <div className="brand-left">
              <span className="brand-badge">TRIPLICATE VOUCHER</span>
              <div>
                <h3>SHREE JAGDAMBA COTTON G AND P FACTORY (HANDOD)</h3>
                <p>3-COPY VOUCHER: ORIGINAL (FARMER) • DUPLICATE (ACCOUNTS) • TRIPLICATE (GATE)</p>
              </div>
            </div>
            <div className="brand-meta">
              <span>Bill No: <b>{billForm.bill_number}</b></span>
              <span>Date: <b>{billForm.bill_date}</b></span>
            </div>
          </div>

          {/* CONTAINER 2: 3-Party Entity Blocks (Dalal, Buyer, Seller) */}
          <div className="party-entities-grid">
            {/* Dalal Box */}
            <div className="entity-box">
              <div className="entity-box-title">
                <span>1. Dalal (Broker) Details</span>
                <span style={{ color: "#94a3b8" }}>Factory Desk</span>
              </div>
              <div className="entity-fields">
                <div className="entity-field">
                  <label>Dalal Name</label>
                  <input
                    type="text"
                    value={billForm.dalal_name}
                    onChange={e => setBillForm({ ...billForm, dalal_name: e.target.value })}
                  />
                </div>
                <div className="entity-field">
                  <label>Residence (Location)</label>
                  <input
                    type="text"
                    value={billForm.dalal_residence}
                    onChange={e => setBillForm({ ...billForm, dalal_residence: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Buyer Box */}
            <div className="entity-box">
              <div className="entity-box-title">
                <span>2. Buyer (Factory) Details</span>
                <span style={{ color: "#10b981" }}>Purchaser</span>
              </div>
              <div className="entity-fields">
                <div className="entity-field">
                  <label>Buyer Name</label>
                  <input
                    type="text"
                    value={billForm.buyer_name}
                    onChange={e => setBillForm({ ...billForm, buyer_name: e.target.value })}
                  />
                </div>
                <div className="entity-field">
                  <label>Residence (Location)</label>
                  <input
                    type="text"
                    value={billForm.buyer_residence}
                    onChange={e => setBillForm({ ...billForm, buyer_residence: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Seller (Farmer) Box */}
            <div className="entity-box" style={{ borderLeft: "3px solid #3b82f6" }}>
              <div className="entity-box-title">
                <span>3. Seller (Farmer) Details</span>
                <span style={{ color: "#3b82f6" }}>Supplier</span>
              </div>
              <div className="entity-fields">
                <div className="entity-field">
                  <label>Seller Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Farmer Name"
                    value={billForm.seller_name}
                    onChange={e => setBillForm({ ...billForm, seller_name: e.target.value })}
                    list="farmer-suggestions-triplicate"
                    style={{ fontWeight: 700 }}
                  />
                  <datalist id="farmer-suggestions-triplicate">
                    {farmers.map(f => (
                      <option key={f.id} value={f.farmer_name}>{f.village}</option>
                    ))}
                  </datalist>
                </div>
                <div className="entity-field">
                  <label>Residence (Village)</label>
                  <input
                    type="text"
                    placeholder="Village"
                    value={billForm.seller_residence}
                    onChange={e => setBillForm({ ...billForm, seller_residence: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CONTAINER 3: Consignment & Yard Metadata Strip */}
          <div className="consignment-meta-bar">
            <div className="meta-item">
              <label>Commodity</label>
              <select
                value={billForm.commodity}
                onChange={e => setBillForm({ ...billForm, commodity: e.target.value })}
              >
                <option value="Kapash">Kapash (Raw Cotton)</option>
                <option value="Maize">Maize</option>
                <option value="Castor Seed">Castor Seed</option>
                <option value="Cotton Seed">Cotton Seed</option>
              </select>
            </div>

            <div className="meta-item">
              <label>Cotton Type</label>
              <select
                value={billForm.cotton_type}
                onChange={e => setBillForm({ ...billForm, cotton_type: e.target.value })}
              >
                <option value="Kapash">Kapash</option>
                <option value="S/6">S/6 (Shankar-6)</option>
                <option value="Y/P">Y/P (Yellow Picking)</option>
                <option value="Standard">Standard</option>
              </select>
            </div>

            <div className="meta-item">
              <label>Heap No.</label>
              <input
                type="text"
                placeholder="e.g. 6"
                value={billForm.heap_number}
                onChange={e => setBillForm({ ...billForm, heap_number: e.target.value })}
                style={{ textAlign: "center", fontWeight: 700 }}
              />
            </div>

            <div className="meta-item">
              <label>Gate Pass No.</label>
              <input
                type="text"
                value={billForm.gate_pass_number}
                onChange={e => setBillForm({ ...billForm, gate_pass_number: e.target.value })}
                style={{ textAlign: "center", fontWeight: 700 }}
              />
            </div>

            <div className="meta-item">
              <label>Vehicle Number</label>
              <input
                type="text"
                placeholder="e.g. GJ 06 AA 1101"
                value={billForm.vehicle_number}
                onChange={e => setBillForm({ ...billForm, vehicle_number: e.target.value })}
              />
            </div>

            <div className="meta-item">
              <label>Weighment Time</label>
              <input
                type="text"
                value={billForm.bill_time}
                onChange={e => setBillForm({ ...billForm, bill_time: e.target.value })}
              />
            </div>
          </div>

          {/* CONTAINER 4: 6-Column Weighment Strip (Exact Page 4 Formula Container) */}
          <div className="weighment-strip-container">
            <div style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#1E293B", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Weighbridge Measurement & Pricing Formulas
              </span>
              <span style={{ fontSize: 10, color: "#64748B" }}>
                Formula: Gross − Tare = Net Wt | Net Wt × Rate = Amount | Amount − Labor − Vatav = Net dalaly
              </span>
            </div>

            <div className="weighment-grid-cards">
              {/* Card 1: Gross Wt */}
              <div className="weigh-card">
                <span className="weigh-card-label">1. Gr. Wt. (Qntl.)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={billForm.gross_weight}
                  onChange={e => setBillForm({ ...billForm, gross_weight: e.target.value })}
                />
                <span className="weigh-card-sub">Loaded Vehicle</span>
              </div>

              {/* Card 2: Tare Wt */}
              <div className="weigh-card">
                <span className="weigh-card-label">2. Tr. Wt. (Qntl.)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={billForm.tare_weight}
                  onChange={e => setBillForm({ ...billForm, tare_weight: e.target.value })}
                />
                <span className="weigh-card-sub">Empty Vehicle</span>
              </div>

              {/* Card 3: Net Wt (Auto) */}
              <div className="weigh-card highlight-net">
                <span className="weigh-card-label">3. Net Wt. (Qntl.)</span>
                <div className="weigh-card-value">
                  {calculations.netWeight.toFixed(2)}
                </div>
                <span className="weigh-card-sub">Gross − Tare</span>
              </div>

              {/* Card 4: Rate/Qnt */}
              <div className="weigh-card">
                <span className="weigh-card-label">4. Rate/Qnt (₹)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={billForm.rate}
                  onChange={e => setBillForm({ ...billForm, rate: e.target.value })}
                />
                <span className="weigh-card-sub">Agreed Rate</span>
              </div>

              {/* Card 5: Amount (Auto) */}
              <div className="weigh-card">
                <span className="weigh-card-label">5. Amount (₹)</span>
                <div className="weigh-card-value">
                  ₹{calculations.grossAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <span className="weigh-card-sub">Net Wt × Rate</span>
              </div>

              {/* Card 6: Net Amount dalaly (Final) */}
              <div className="weigh-card highlight-final">
                <span className="weigh-card-label">6. Net Amount dalaly</span>
                <div className="weigh-card-value">
                  ₹{calculations.netPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <span className="weigh-card-sub">Amount − Charges</span>
              </div>
            </div>
          </div>

          {/* CONTAINER 5: Case Type (Cash Drawer vs Debit) & Vatav/Remarks Strip */}
          <div className="casetype-split-container">
            {/* Left Card: Case Type & Payment Mechanism */}
            <div className="casetype-card">
              <div className="casetype-card-header">
                <span style={{ fontSize: 11, fontWeight: 800, color: "#1E293B", textTransform: "uppercase" }}>
                  Case Type (Payment Mode)
                </span>
                <div className="casetype-toggle-group">
                  <button
                    type="button"
                    className={`casetype-toggle-btn ${billForm.payment_mode === "CASH" ? "active cash" : ""}`}
                    onClick={() => setBillForm({ ...billForm, payment_mode: "CASH" })}
                  >
                    <Coins size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                    Cash Purchase
                  </button>
                  <button
                    type="button"
                    className={`casetype-toggle-btn ${billForm.payment_mode === "DEBIT" ? "active debit" : ""}`}
                    onClick={() => setBillForm({ ...billForm, payment_mode: "DEBIT" })}
                  >
                    <CreditCard size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                    Debit Purchase
                  </button>
                </div>
              </div>

              {/* CASH: Interactive Currency Drawer (₹500 to ₹5) */}
              {billForm.payment_mode === "CASH" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: "#475569", fontWeight: 700 }}>
                      Currency Note Breakdown (₹500, ₹200, ₹100, ₹50, ₹20, ₹10, ₹5):
                    </span>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={autoCalculateNotes}
                      style={{ fontSize: 10, padding: "4px 10px", height: 26 }}
                    >
                      ⚡ Auto-Fill Notes
                    </button>
                  </div>

                  <div className="modern-currency-grid">
                    {NOTE_DENOMINATIONS.map(note => {
                      const count = billForm.currency_drawer?.[note] || 0;
                      const sub = note * count;
                      return (
                        <div key={note} className={`currency-slot ${count > 0 ? "has-notes" : ""}`}>
                          <span className="currency-slot-denom">₹{note}</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={count === 0 ? "" : count}
                            onChange={e => handleNoteCountChange(note, e.target.value)}
                          />
                          <span className="currency-slot-sub">= ₹{sub.toLocaleString("en-IN")}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className={`currency-balance-pill ${calculations.drawerDiscrepancy === 0 ? "balanced" : "mismatch"}`}>
                    <span>Drawer Total: <b>₹{calculations.drawerTotal.toLocaleString("en-IN")}</b></span>
                    <span>
                      {calculations.drawerDiscrepancy === 0 ? (
                        "✓ Cash Drawer Perfectly Balanced (₹0.00)"
                      ) : calculations.drawerDiscrepancy > 0 ? (
                        `Excess Cash: +₹${calculations.drawerDiscrepancy.toLocaleString("en-IN")}`
                      ) : (
                        `Shortage: -₹${Math.abs(calculations.drawerDiscrepancy).toLocaleString("en-IN")}`
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* DEBIT: Credit Terms & Bank Reference */}
              {billForm.payment_mode === "DEBIT" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
                  <div className="entity-field">
                    <label>Due Date (Promise Date)</label>
                    <input
                      type="text"
                      value={billForm.due_date}
                      onChange={e => setBillForm({ ...billForm, due_date: e.target.value })}
                      placeholder="DD-MM-YYYY"
                    />
                  </div>
                  <div className="entity-field">
                    <label>Credit Days</label>
                    <input
                      type="number"
                      value={billForm.total_credit_days}
                      onChange={e => setBillForm({ ...billForm, total_credit_days: Number(e.target.value) })}
                    />
                  </div>
                  <div className="entity-field">
                    <label>Cheque Number</label>
                    <input
                      type="text"
                      placeholder="e.g. CHQ-889921"
                      value={billForm.cheque_number}
                      onChange={e => setBillForm({ ...billForm, cheque_number: e.target.value })}
                    />
                  </div>
                  <div className="entity-field">
                    <label>NEFT / RTGS Ref.</label>
                    <input
                      type="text"
                      placeholder="e.g. NEFT-SBIN2026101389"
                      value={billForm.neft_reference}
                      onChange={e => setBillForm({ ...billForm, neft_reference: e.target.value })}
                    />
                  </div>
                  <div className="entity-field" style={{ gridColumn: "1 / -1" }}>
                    <label>Bank Name & Branch</label>
                    <input
                      type="text"
                      value={billForm.bank_name}
                      onChange={e => setBillForm({ ...billForm, bank_name: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right Card: Vatav, Labor Charges, Diff & Remarks */}
            <div className="casetype-card">
              <span style={{ fontSize: 11, fontWeight: 800, color: "#1E293B", textTransform: "uppercase", display: "block", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #E2E8F0" }}>
                Deductions, Vatav & Remarks
              </span>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="entity-field">
                  <label>Labor / Hamali (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={billForm.labor_charges}
                    onChange={e => setBillForm({ ...billForm, labor_charges: e.target.value })}
                  />
                </div>

                <div className="entity-field">
                  <label>Vatav (Discount / Cess)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={billForm.vatav}
                    onChange={e => setBillForm({ ...billForm, vatav: e.target.value })}
                  />
                </div>

                <div className="entity-field" style={{ gridColumn: "1 / -1" }}>
                  <label>Diff (Tolerance Adjustment)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={billForm.diff}
                    onChange={e => setBillForm({ ...billForm, diff: e.target.value })}
                  />
                </div>

                <div className="entity-field" style={{ gridColumn: "1 / -1" }}>
                  <label>Remarks</label>
                  <input
                    type="text"
                    placeholder="Consignment notes, quality grading..."
                    value={billForm.remarks}
                    onChange={e => setBillForm({ ...billForm, remarks: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px dashed #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B" }}>Net Payable to Farmer:</span>
                <strong style={{ fontSize: 18, color: "#1D4ED8", fontWeight: 800 }}>
                  ₹{calculations.netPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </strong>
              </div>
            </div>
          </div>

          {/* CONTAINER 6: 4 Official Signatures Container (Pages 1 & 2 of PDF) */}
          <div className="signatures-container">
            <div className="sign-box">
              <div className="sign-line" />
              <span className="sign-title">1. Farmer / Cash Received</span>
              <span className="sign-sub">Payment Acknowledgement</span>
            </div>

            <div className="sign-box">
              <div className="sign-line" />
              <span className="sign-title">2. Weighbridge Clerk</span>
              <span className="sign-sub">Gross / Tare Verified</span>
            </div>

            <div className="sign-box">
              <div className="sign-line" />
              <span className="sign-title">3. Cashier Sign</span>
              <span className="sign-sub">Disbursed from Drawer</span>
            </div>

            <div className="sign-box">
              <div className="sign-line" />
              <span className="sign-title">4. Authorized Sign & Stamp</span>
              <span className="sign-sub">Shree Jagdamba Factory</span>
            </div>
          </div>

          {/* Action Bar */}
          <div style={{ padding: "16px 20px", background: "#F8FAFC", borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <button className="button secondary" onClick={() => setActiveStep(1)}>
              <ArrowLeft size={15} /> Back: Step 1 Farmer Master
            </button>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="button secondary" onClick={() => handleSaveBill(false)}>
                <Save size={15} /> Save Bill Without Printing
              </button>
              <button className="button primary" onClick={() => handleSaveBill(true)}>
                <Printer size={15} /> Save & Print 3-Copy Triplicate PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: SAVED TRIPLICATE BILLS REGISTER */}
      {activeStep === 3 && (
        <div className="modern-procurement-card">
          <div className="container-header-bar">
            <div className="container-title">
              <h2>Saved Triplicate Bills Register</h2>
              <span className="container-badge">{bills.length} Total Bills</span>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Search size={14} color="#64748b" />
                <input
                  type="text"
                  placeholder="Filter by Bill No, Farmer or Village..."
                  value={searchHistory}
                  onChange={e => setSearchHistory(e.target.value)}
                  style={{
                    height: 32,
                    padding: "0 10px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 11,
                    width: 250
                  }}
                />
              </div>

              <button className="button primary" onClick={() => setActiveStep(2)}>
                <Plus size={14} /> New Triplicate Bill Entry
              </button>
            </div>
          </div>

          <div className="table-scroll">
            <table className="modern-report-table">
              <thead>
                <tr>
                  <th>Bill No</th>
                  <th>Date & Time</th>
                  <th>Seller (Farmer)</th>
                  <th>Village</th>
                  <th>Vehicle No</th>
                  <th>Heap #</th>
                  <th style={{ textAlign: "right" }}>Net Wt (qtl)</th>
                  <th style={{ textAlign: "right" }}>Rate (₹)</th>
                  <th style={{ textAlign: "right" }}>Net Amount (₹)</th>
                  <th>Mode</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map(b => (
                  <tr key={b.id}>
                    <td><strong style={{ color: "#0F172A" }}>{b.bill_number}</strong></td>
                    <td>{b.bill_date}</td>
                    <td><b>{b.seller_name}</b></td>
                    <td>{b.village_name || b.seller_residence}</td>
                    <td>{b.vehicle_number || "—"}</td>
                    <td><span style={{ fontWeight: 700 }}>#{b.heap_number}</span></td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>{Number(b.net_weight || 0).toFixed(2)}</td>
                    <td style={{ textAlign: "right" }}>₹{Number(b.rate || 0).toFixed(2)}</td>
                    <td style={{ textAlign: "right", fontWeight: 800, color: "#1E293B" }}>
                      ₹{Number(b.net_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className={`status-badge ${b.payment_mode === "CASH" ? "status-completed" : "status-pending"}`}>
                        <i /> {b.payment_mode}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        className="button secondary"
                        style={{ padding: "5px 10px", fontSize: 10 }}
                        onClick={() => generateTriplicateBillPdf(b)}
                      >
                        <Printer size={13} /> Print 3-Copy
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
