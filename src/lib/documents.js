import jsPDF from "jspdf";
import { LOGO_BASE64 } from "../assets/logoBase64.js";

const safe = (v) => (v == null || v === "" ? "—" : String(v));
const money = (v) =>
  v == null || v === ""
    ? "—"
    : Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 });

// Exact 5 terms & conditions verbatim from the specification PDF
export const SOURCE_TERMS = [
  "we have prepared this contract confirmation as per details and terms mention hear agreed by buyer and seller both. If any discrepancy in contract detail and terms buyers and sellers has inform us within 24 hours which please note.",
  "Buyer and seller both has sign contract confirmation and have to send us within 1 days.",
  "We send this contract confirmation by MAIL OR WHATand if we will not get any reply nor sign from buyer and seller even though this contract confirmation is treat as confirm and binding to buyer and seller both which please note.",
  "We are only broker and we don \"t have any legal nor financial responsibility if any dispute arise in this contract, we are only link between buyer and seller which please note.",
  "If any dispute arise then buyer and seller has to hold our brokerage related to that contract confirmation only and not our other brokerage"
];

function basePdf(title, contract) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const w = pdf.internal.pageSize.getWidth();

  // Header navy bar
  pdf.setFillColor(16, 27, 45);
  pdf.rect(0, 0, w, 32, "F");

  // Logo badge & emblem
  try {
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(12, 4, 30, 24, 2, 2, "F");
    pdf.addImage(LOGO_BASE64, "PNG", 14, 5.5, 26, 21);
  } catch (e) {
    // Graceful fallback
  }

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("SHREE JAGDAMBA", 48, 14);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.text("COTTON SEED CONTRACT MANAGEMENT", 48, 20);

  pdf.setFontSize(7.5);
  pdf.setTextColor(200, 210, 225);
  pdf.text("OFFICIAL BROKER CONFIRMATION & GATE PASS SYSTEM", 48, 25);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text(title, w - 15, 18, { align: "right" });

  pdf.setTextColor(30, 41, 59);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9.5);
  pdf.text(`1. DATE: ${safe(contract.contract_date)}`, 15, 40);
  pdf.text(`2. CONTRACT NUMBER: ${safe(contract.contract_number)}`, w - 15, 40, { align: "right" });

  return pdf;
}

function section(pdf, title, rows, y) {
  const w = pdf.internal.pageSize.getWidth();
  pdf.setFillColor(241, 245, 249);
  pdf.roundedRect(15, y, w - 30, 7.5, 1.5, 1.5, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9.5);
  pdf.setTextColor(16, 27, 45);
  pdf.text(title, 19, y + 5.2);
  y += 12;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);

  for (const [label, value] of rows) {
    const lines = pdf.splitTextToSize(`${label}: ${safe(value)}`, w - 38);
    if (y + lines.length * 4.5 > 275) {
      pdf.addPage();
      y = 18;
    }
    pdf.text(lines, 19, y);
    y += lines.length * 4.5 + 1.2;
  }
  return y + 2;
}

// STEP 2: Generate the contract after conformation send to the buyer
// Contains EXACTLY the 13 fields from Step 1 of the PDF + 5 Terms & Conditions + 3 Signatures
export function generateContractPdf(c, { returnBlob = false } = {}) {
  const pdf = basePdf("CONTRACT CONFIRMATION", c);
  let y = 46;

  // Exact 13 items from Step 1 of the PDF
  const items = [
    ["1. DATE", c.contract_date],
    ["2. CONTRACT NUMBER", c.contract_number],
    ["3. PARTY NAME", c.party_name],
    ["4. GST NUMBER", c.gst_number],
    ["5. ADDREESS", c.party_address],
    ["6. CONTACT NO.", c.contact_number],
    ["7. QUANTITY", `${safe(c.quantity_quintals)} QUINTALS`],
    ["8. COMMODITY", "COTTON SEED"],
    ["9. DELIVERY CONDITION", c.delivery_condition],
    ["10. PAYMENT CONDITION", c.payment_condition],
    ["11. RATE PER QUINTALS", c.rate_per_quintal ? `INR ${money(c.rate_per_quintal)} / Quintal` : "—"],
    ["12. PACKING TYPE", c.packing_type || "LOOSE/BAGS"],
    ["13. DELIVERY ADDRESS", c.delivery_address]
  ];

  y = section(pdf, "COTTON SEED CONTRACT DETAILS (STEP 1)", items, y);

  // Terms & Conditions verbatim from the PDF
  y = section(
    pdf,
    "Terms & Conditions :",
    SOURCE_TERMS.map((term, i) => [`${i + 1})`, term]),
    y + 2
  );

  // Exact 3 Signatures from PDF
  if (y > 245) {
    pdf.addPage();
    y = 35;
  } else {
    y = Math.max(y + 8, 240);
  }

  const w = pdf.internal.pageSize.getWidth();
  pdf.setDrawColor(140, 150, 165);
  pdf.line(15, y + 10, 65, y + 10);
  pdf.line(78, y + 10, 132, y + 10);
  pdf.line(145, y + 10, w - 15, y + 10);

  pdf.setFontSize(8.5);
  pdf.setTextColor(30, 41, 59);
  pdf.setFont("helvetica", "bold");
  pdf.text("Broker Sign & Stamp", 15, y + 15);
  pdf.text("Buyer Sign & Stamp", 78, y + 15);
  pdf.text("Seller Sign & Stamp", 145, y + 15);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(100, 110, 125);
  pdf.text("Shree Jagdamba — Cotton Seed Contract Confirmation", 15, 287);

  if (returnBlob) return pdf.output("blob");
  pdf.save(`Contract-${c.contract_number || "draft"}.pdf`);
}

// STEP 4: Generate gate pass with all details
// Combines Contract Details + Step 3 Loading Details (Exact 6 fields from PDF)
export function generateGatePassPdf(c, l, number, { returnBlob = false } = {}) {
  const pdf = basePdf("GATE PASS", c);
  let y = 46;

  // Contract Details (Step 1)
  y = section(pdf, "CONTRACT DETAILS (AS PER CONTRACT)", [
    ["Contract Number", c.contract_number],
    ["Date", c.contract_date],
    ["Party Name", c.party_name],
    ["GST Number", c.gst_number],
    ["Commodity", "COTTON SEED"],
    ["Contracted Quantity", `${safe(c.quantity_quintals)} Quintals`],
    ["Packing Type", c.packing_type || "LOOSE/BAGS"],
    ["Delivery Address", c.delivery_address]
  ], y);

  // Step 3 Loading details as per contract (Exact 6 items from PDF)
  y = section(pdf, "Step 3: Loading details as per contract", [
    ["1. Truck /tempo number", l.vehicle_number],
    ["2. Net Weight quintals", `${safe(l.net_weight_quintals)} Quintals`],
    ["3. Driver license no.", l.driver_license_number],
    ["4. Transport no.", l.transport_number],
    ["5. Transport name", l.transport_name],
    ["6. Lr no.", l.lr_number]
  ], y + 2);

  // Gate Pass Signatures
  const w = pdf.internal.pageSize.getWidth();
  if (y > 250) {
    pdf.addPage();
    y = 35;
  } else {
    y = Math.max(y + 15, 235);
  }

  pdf.setDrawColor(140, 150, 165);
  pdf.line(18, y, 70, y);
  pdf.line(80, y, 132, y);
  pdf.line(w - 70, y, w - 18, y);

  pdf.setFontSize(8.5);
  pdf.setTextColor(30, 41, 59);
  pdf.setFont("helvetica", "bold");
  pdf.text("Prepared by", 18, y + 6);
  pdf.text("Gate / Security In-Charge", 80, y + 6);
  pdf.text("Authorized Sign & Stamp", w - 70, y + 6);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(100, 110, 125);
  pdf.text("Gate Pass — Generated after verifying vehicle & net weight as per contract.", 15, 287);

  if (returnBlob) return pdf.output("blob");
  pdf.save(`Gate-Pass-${number || "draft"}.pdf`);
}
