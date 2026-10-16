import jsPDF from "jspdf";
import { LOGO_BASE64 } from "../assets/logoBase64.js";

const safe = (v) => v == null || v === "" ? "—" : String(v);
const money = (v) => v == null || v === "" ? "—" : Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export const SOURCE_TERMS = [
  "we have prepared this contract confirmation as per details and terms mention hear agreed by buyer and seller both. If any discrepancy in contract detail and terms buyers and sellers has inform us within 24 hours which please note.",
  "Buyer and seller both has sign contract confirmation and have to send us within 2 days.",
  "We send this contract confirmation by MAIL OR WHATand if we will not get any reply nor sign from buyer and seller even though this contract confirmation is treat as confirm and binding to buyer and seller both which please note.",
  "We are only broker and we don \"t have any legal nor financial responsibility if any dispute arise in this contract, we are only link between buyer and seller which please note.",
  "If any dispute arise then buyer and seller has to hold our brokerage related to that contract confirmation only and not our other brokerage"
];

function basePdf(title, contract) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const w = pdf.internal.pageSize.getWidth();
  
  // Header navy bar
  pdf.setFillColor(16, 27, 45);
  pdf.rect(0, 0, w, 35, "F");
  
  // Logo badge & emblem
  try {
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(12, 4.5, 34, 26, 2, 2, "F");
    pdf.addImage(LOGO_BASE64, "PNG", 14, 6, 30, 23);
  } catch (e) {
    // Graceful fallback if image decoding issues occur
  }

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("SHREE JAGDAMBA", 50, 14);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.text("COTTON GINNING & PRESSING FACTORY", 50, 20);

  pdf.setFontSize(7.5);
  pdf.setTextColor(200, 210, 225);
  pdf.text("NET COTTON CONTRACT MANAGEMENT SYSTEM", 50, 25);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text(title, w - 15, 15, { align: "right" });

  pdf.setTextColor(30, 41, 59);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.5);
  pdf.text(`Contract No: ${safe(contract.contract_number)}`, 15, 43);
  if (contract.pr_number || contract.lot_number) {
    pdf.text(`PR No: ${safe(contract.pr_number)}  |  Lot No: ${safe(contract.lot_number)}`, 15, 48);
  }
  pdf.text(`Date: ${safe(contract.contract_date)}`, w - 15, 43, { align: "right" });

  return pdf;
}

function section(pdf, title, rows, y) {
  const w = pdf.internal.pageSize.getWidth();
  pdf.setFillColor(239, 243, 248);
  pdf.roundedRect(15, y, w - 30, 8, 1.5, 1.5, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(16, 27, 45);
  pdf.text(title, 19, y + 5.3);
  y += 13;
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
  return y + 3;
}

export function generateContractPdf(c, { returnBlob = false } = {}) {
  const pdf = basePdf("CONTRACT CONFIRMATION", c);
  let y = c.pr_number || c.lot_number ? 54 : 50;

  // 1. Party & Broker Details
  const partyRows = [
    ["Party name", c.party_name],
    ["GST number", c.gst_number],
    ["Address", c.party_address],
    ["Contact number", c.contact_number]
  ];

  if (c.buyer_name || c.buyer_gst_number) {
    partyRows.push(
      ["Buyer name", c.buyer_name],
      ["Buyer GST number", c.buyer_gst_number],
      ["Buyer address", c.buyer_address],
      ["Buyer contact number", c.buyer_contact_number]
    );
  }

  if (c.seller_name || c.seller_gst_number) {
    partyRows.push(
      ["Seller name", c.seller_name],
      ["Seller GST number", c.seller_gst_number],
      ["Seller address", c.seller_address],
      ["Seller contact number", c.seller_contact_number]
    );
  }

  // Broker details
  partyRows.push(
    ["Broker person", c.broker_person_name || c.broker_name],
    ["Brokerage firm", c.broker_firm_name],
    ["Broker contact number", c.broker_contact_number]
  );

  y = section(pdf, "PARTY & BROKER DETAILS", partyRows, y);

  // 2. Commodity & Deal Terms
  const commodity = c.commodity || "COTTON BALES";
  const qtyDesc = c.quantity_bales
    ? `${c.quantity_bales} Bales (${safe(c.quantity_quintals)} quintals)`
    : `${safe(c.quantity_quintals)} quintals`;

  let rateDesc = "—";
  let grossVal = 0;

  if (c.rate_per_candy) {
    rateDesc = `INR ${money(c.rate_per_candy)} per Candy`;
    const candys = Number(c.quantity_quintals || 0) / 3.556;
    grossVal = candys * Number(c.rate_per_candy);
  } else if (c.rate_per_quintal) {
    rateDesc = `INR ${money(c.rate_per_quintal)} per Quintal`;
    grossVal = Number(c.quantity_quintals || 0) * Number(c.rate_per_quintal || 0);
  }

  y = section(pdf, "COMMODITY & DEAL TERMS", [
    ["Commodity", commodity],
    ["PR No. (Press Running)", c.pr_number],
    ["Lot No.", c.lot_number],
    ["Quantity", qtyDesc],
    [c.rate_per_candy ? "Rate per Candy" : "Rate per Quintal", rateDesc],
    ["Estimated total goods value", grossVal > 0 ? `INR ${money(grossVal)}` : "—"],
    ["Delivery condition", c.delivery_condition],
    ["Payment condition", c.payment_condition],
    ["Delivery address", c.delivery_address]
  ], y);

  // 3. Brokerage Terms if applicable
  const bRate = Number(c.brokerage_rate || 0);
  if (c.broker_firm_name || c.broker_person_name || bRate > 0) {
    const bearerDesc = c.brokerage_paid_by === "shared"
      ? "50-50 Shared (Half Buyer / Half Seller)"
      : c.brokerage_paid_by === "seller"
      ? "Borne by Seller"
      : "Borne by Buyer";

    let totalB = 0;
    if (c.brokerage_calc_type === "percentage") {
      totalB = (grossVal * bRate) / 100;
    } else if (c.brokerage_calc_type === "lumpsum") {
      totalB = bRate;
    } else {
      totalB = Number(c.quantity_quintals || 0) * bRate;
    }

    const rateText = c.brokerage_calc_type === "percentage"
      ? `${bRate}% of goods value`
      : c.brokerage_calc_type === "lumpsum"
      ? `Fixed lump-sum INR ${money(bRate)}`
      : `INR ${money(bRate)} per quintal`;

    y = section(pdf, "BROKERAGE & COMMISSION TERMS", [
      ["Broker / Agent", c.broker_person_name || c.broker_name || "—"],
      ["Brokerage firm", c.broker_firm_name || "—"],
      ["Broker contact", c.broker_contact_number || "—"],
      ["Commission rate", rateText],
      ["Borne by", bearerDesc],
      ["Commission amount", totalB > 0 ? `INR ${money(totalB)}` : "—"],
      ["Brokerage terms", c.brokerage_terms || "Payable upon dispatch as agreed"]
    ], y);
  }

  // 4. Terms & Conditions (Verbatim from specification document)
  y = section(pdf, "TERMS & CONDITIONS", SOURCE_TERMS.map((term, i) => [`${i + 1})`, term]), y);

  // 5. Signatures
  if (y > 245) {
    pdf.addPage();
    y = 35;
  } else {
    y = Math.max(y + 8, 235);
  }

  const w = pdf.internal.pageSize.getWidth();
  pdf.setDrawColor(140, 150, 165);
  pdf.line(15, y + 10, 65, y + 10);
  pdf.line(78, y + 10, 132, y + 10);
  pdf.line(145, y + 10, w - 15, y + 10);

  pdf.setFontSize(8.5);
  pdf.setTextColor(30, 41, 59);

  const brokerSignLabel = c.broker_firm_name
    ? `${c.broker_firm_name} (Broker)`
    : c.broker_person_name
    ? `${c.broker_person_name} (Broker)`
    : "Broker Sign & Stamp";

  pdf.text(brokerSignLabel, 15, y + 15);
  pdf.text("Buyer Sign & Stamp", 78, y + 15);
  pdf.text("Seller Sign & Stamp", 145, y + 15);

  pdf.setFontSize(7);
  pdf.setTextColor(100, 110, 125);
  pdf.text("Official Net Cotton Contract Confirmation — Generated as per agreed terms.", 15, 287);

  if (returnBlob) return pdf.output("blob");
  pdf.save(`Contract-${c.contract_number || "draft"}.pdf`);
}

export function generateGatePassPdf(c, l, number, { returnBlob = false } = {}) {
  const pdf = basePdf("GATE PASS", c);
  let y = 54;

  const commodity = c.commodity || "COTTON BALES";
  const qtyDesc = c.quantity_bales
    ? `${c.quantity_bales} Bales (${safe(c.quantity_quintals)} qtl)`
    : `${safe(c.quantity_quintals)} quintals`;

  // Step 1 Contract Details
  y = section(pdf, "CONTRACT DETAILS (AS PER CONTRACT)", [
    ["Gate pass number", number],
    ["Contract number", c.contract_number],
    ["Date generated", new Date().toLocaleDateString("en-CA")],
    ["Commodity", commodity],
    ["PR No. (Press Running)", c.pr_number],
    ["Lot No.", c.lot_number],
    ["Quantity contracted", qtyDesc],
    ["Party name", c.party_name],
    ["Buyer name", c.buyer_name || c.party_name],
    ["Seller name", c.seller_name],
    ["Delivery address", c.delivery_address]
  ], y);

  // Step 3 Loading Details
  y = section(pdf, "LOADING DETAILS (AS PER CONTRACT)", [
    ["1. Truck / tempo number", l.vehicle_number],
    ["2. Net weight (quintals)", `${safe(l.net_weight_quintals)} qtl`],
    ["3. Driver license no.", l.driver_license_number],
    ["4. Driver contact number", l.driver_contact_number],
    ["5. Transport no.", l.transport_number],
    ["6. Transporter name", l.transport_name],
    ["7. LR no.", l.lr_number]
  ], y);

  // Signatures
  const w = pdf.internal.pageSize.getWidth();
  if (y > 255) {
    pdf.addPage();
    y = 35;
  } else {
    y = Math.max(y + 15, 230);
  }

  pdf.setDrawColor(140, 150, 165);
  pdf.line(18, y, 70, y);
  pdf.line(80, y, 132, y);
  pdf.line(w - 70, y, w - 18, y);

  pdf.setFontSize(8.5);
  pdf.setTextColor(30, 41, 59);
  pdf.text("Prepared by", 18, y + 6);
  pdf.text("Gate / Security In-Charge", 80, y + 6);
  pdf.text("Authorized Sign & Stamp", w - 70, y + 6);

  pdf.setFontSize(7);
  pdf.setTextColor(100, 110, 125);
  pdf.text("Gate Pass — Verify loading & net weight before vehicle leaves factory premises.", 15, 287);

  if (returnBlob) return pdf.output("blob");
  pdf.save(`Gate-Pass-${number || "draft"}.pdf`);
}

// ==========================================
// TRIPLICATE BILL & FARMER PROCUREMENT PDFS
// ==========================================

export function generateTriplicateBillPdf(b, { returnBlob = false, copyTitle = "ORIGINAL (FARMER COPY)" } = {}) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const w = pdf.internal.pageSize.getWidth();

  // Top header banner
  pdf.setFillColor(16, 27, 45);
  pdf.rect(0, 0, w, 32, "F");

  try {
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(12, 4.5, 30, 23, 2, 2, "F");
    pdf.addImage(LOGO_BASE64, "PNG", 14, 6, 26, 20);
  } catch (e) {}

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.text("SHREE JAGDAMBA", 46, 13);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.text("COTTON GINNING & PRESSING FACTORY (HANDOD)", 46, 19);
  pdf.setFontSize(7.5);
  pdf.setTextColor(200, 210, 225);
  pdf.text("FARMER WEIGHMENT & PURCHASE BILL — TRIPLICATE VOUCHER", 46, 24);

  // Copy badge
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9.5);
  pdf.setTextColor(250, 204, 21);
  pdf.text(copyTitle, w - 15, 14, { align: "right" });
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  pdf.text(`Bill No: ${safe(b.bill_number)}`, w - 15, 20, { align: "right" });
  pdf.text(`Date: ${safe(b.bill_date)} | ${safe(b.bill_time)}`, w - 15, 25, { align: "right" });

  let y = 40;

  // Party & Reference Details
  y = section(pdf, "BILL & FARMER REFERENCE", [
    ["Triplicate Bill No", b.bill_number],
    ["Date & Time", `${b.bill_date} at ${b.bill_time}`],
    ["Seller / Farmer Name", b.seller_name],
    ["Residence / Village", b.village_name],
    ["Vehicle Number", b.vehicle_number || "—"],
    ["Buyer Name", "Shree Jagdamba Cotton G And P Factory (Handod)"],
    ["Dalal / Broker", "Direct Purchase / Mandi Desk"],
    ["Gate Pass No", b.gate_pass_number],
    ["Heap No", `Heap #${b.heap_number}`],
    ["Cotton / Commodity Type", `${b.commodity || "Kapash"} (${b.cotton_type || "S/6"})`],
    ["Payment Mode", b.payment_mode === "CASH" ? "CASH PURCHASE" : "DEBIT PURCHASE (CREDIT)"]
  ], y);

  // Weighbridge & Financial Calculation (Gross - Tare = Net * Rate = Amount - Labor = Net Amount)
  y = section(pdf, "WEIGHBRIDGE & VALUATION DETAILS", [
    ["1. Gross Weight (Quintals)", `${safe(b.gross_weight)} qtl`],
    ["2. Tare Weight (Quintals)", `${safe(b.tare_weight)} qtl`],
    ["3. Net Weight (Quintals)", `${safe(b.net_weight)} qtl (Gross - Tare)`],
    ["4. Rate per Quintal (INR)", `INR ${money(b.rate)} / quintal`],
    ["5. Gross Amount (INR)", `INR ${money(b.gross_amount)} (Net Wt * Rate)`],
    ["6. Labor / Hamali Deductions (INR)", b.labor_charges > 0 ? `(-) INR ${money(b.labor_charges)}` : "INR 0.00 (Nil)"],
    ["7. Net Payable Amount (INR)", `INR ${money(b.net_amount)}`]
  ], y);

  // Settlement Mode Details (Cash Drawer vs Debit)
  if (b.payment_mode === "CASH") {
    const d = b.currency_drawer || {};
    const notesSummary = ["500", "200", "100", "50", "20", "10", "5"]
      .filter(n => Number(d[n] || 0) > 0)
      .map(n => `Rs.${n} x ${d[n]} = Rs.${Number(n) * Number(d[n])}`)
      .join("  |  ") || "Cash payment issued in full";

    y = section(pdf, "CASH DRAWER SETTLEMENT BREAKDOWN", [
      ["Payment Mode", "CASH PURCHASE (IMMEDIATE CASHOUT)"],
      ["Net Cash Amount Paid", `INR ${money(b.net_amount)}`],
      ["Currency Notes Drawer", notesSummary]
    ], y);
  } else {
    y = section(pdf, "DEBIT / CREDIT PURCHASE SETTLEMENT", [
      ["Payment Mode", "DEBIT PURCHASE (CREDIT TO ACCOUNT)"],
      ["Due Date", b.due_date || "—"],
      ["Total Credit Days", b.total_credit_days ? `${b.total_credit_days} days` : "—"],
      ["Cheque Number / NEFT UTR", b.cheque_number || b.neft_reference || "Pending settlement"],
      ["Bank Name / Account", b.bank_name || "—"],
      ["Net Amount Payable", `INR ${money(b.net_amount)}`]
    ], y);
  }

  // 4 Signatures & Authorization Blocks
  const signY = Math.max(y + 12, 240);
  pdf.setDrawColor(140, 150, 165);
  pdf.line(16, signY, 56, signY);
  pdf.line(62, signY, 102, signY);
  pdf.line(108, signY, 148, signY);
  pdf.line(154, signY, w - 16, signY);

  pdf.setFontSize(8);
  pdf.setTextColor(30, 41, 59);
  pdf.text("Farmer / Cash Received", 16, signY + 5);
  pdf.text("Weighbridge Clerk", 62, signY + 5);
  pdf.text("Cashier Sign", 108, signY + 5);
  pdf.text("Authorized Sign & Stamp", 154, signY + 5);

  pdf.setFontSize(7);
  pdf.setTextColor(100, 110, 125);
  pdf.text("Computer generated Triplicate Bill voucher. Please preserve for farmer payment records.", 16, 287);

  if (returnBlob) return pdf.output("blob");
  pdf.save(`Triplicate-${b.bill_number || "Bill"}.pdf`);
}

export function generateDailyPurchaseReportPdf(date, records, { returnBlob = false } = {}) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const w = pdf.internal.pageSize.getWidth();

  pdf.setFillColor(16, 27, 45);
  pdf.rect(0, 0, w, 28, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("SHREE JAGDAMBA COTTON G AND P FACTORY", 16, 12);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.text("DAILY COTTON PURCHASE REPORT", 16, 18);
  pdf.setFontSize(9);
  pdf.text(`Date: ${date}`, w - 16, 18, { align: "right" });

  let y = 38;
  pdf.setTextColor(30, 41, 59);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);

  // Table header
  pdf.setFillColor(239, 243, 248);
  pdf.rect(14, y, w - 28, 7, "F");
  pdf.text("Sr", 16, y + 5);
  pdf.text("Farmer Name", 28, y + 5);
  pdf.text("Residence", 80, y + 5);
  pdf.text("Type", 115, y + 5);
  pdf.text("Weight (qtl)", 135, y + 5, { align: "right" });
  pdf.text("Rate (Rs)", 160, y + 5, { align: "right" });
  pdf.text("Amount (Rs)", w - 18, y + 5, { align: "right" });

  y += 11;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);

  let totalWeight = 0;
  let totalAmount = 0;

  records.forEach((r, idx) => {
    if (y > 270) {
      pdf.addPage();
      y = 20;
    }
    const wt = Number(r.weight || 0);
    const amt = Number(r.amount || 0);
    totalWeight += wt;
    totalAmount += amt;

    pdf.text(String(idx + 1), 16, y);
    pdf.text(safe(r.farmer_name).substring(0, 24), 28, y);
    pdf.text(safe(r.village_name || r.residence).substring(0, 18), 80, y);
    pdf.text(safe(r.cotton_type || "S/6"), 115, y);
    pdf.text(wt.toFixed(2), 135, y, { align: "right" });
    pdf.text(Number(r.rate || 0).toFixed(2), 160, y, { align: "right" });
    pdf.text(money(amt), w - 18, y, { align: "right" });

    pdf.setDrawColor(240, 242, 245);
    pdf.line(14, y + 2, w - 14, y + 2);
    y += 6;
  });

  // Summary box
  y += 4;
  pdf.setFillColor(241, 245, 249);
  pdf.roundedRect(14, y, w - 28, 12, 1.5, 1.5, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("Total Weight: " + totalWeight.toFixed(2) + " qtl", 22, y + 8);
  const avgRate = totalWeight > 0 ? (totalAmount / totalWeight).toFixed(2) : "0.00";
  pdf.text("Avg Rate: Rs " + avgRate + "/qtl", 95, y + 8);
  pdf.text("Total Amount: Rs " + money(totalAmount), w - 22, y + 8, { align: "right" });

  if (returnBlob) return pdf.output("blob");
  pdf.save(`Daily-Purchase-${date}.pdf`);
}

export function generateHeapWiseReportPdf(fromDate, toDate, rows, { returnBlob = false } = {}) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const w = pdf.internal.pageSize.getWidth();

  pdf.setFillColor(16, 27, 45);
  pdf.rect(0, 0, w, 28, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("SHREE JAGDAMBA COTTON G AND P FACTORY", 16, 12);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.text("DAILY PURCHASE REPORT — HEAP WISE AVERAGE", 16, 18);
  pdf.setFontSize(8.5);
  pdf.text(`Date: ${fromDate} To ${toDate}`, w - 16, 18, { align: "right" });

  let y = 38;
  pdf.setFillColor(239, 243, 248);
  pdf.rect(14, y, w - 28, 7, "F");
  pdf.setTextColor(30, 41, 59);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);

  pdf.text("Heap No.", 24, y + 5);
  pdf.text("Net Weight (qtl)", 90, y + 5, { align: "right" });
  pdf.text("Total Amount (Rs)", 140, y + 5, { align: "right" });
  pdf.text("Average Rate (Rs/qtl)", w - 24, y + 5, { align: "right" });

  y += 11;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);

  let totalWeight = 0;
  let totalAmount = 0;

  rows.forEach((r) => {
    const wt = Number(r.net_weight || 0);
    const amt = Number(r.amount || 0);
    const avg = wt > 0 ? (amt / wt).toFixed(2) : "0.00";
    totalWeight += wt;
    totalAmount += amt;

    pdf.text(`Heap #${r.heap_number}`, 24, y);
    pdf.text(wt.toFixed(2), 90, y, { align: "right" });
    pdf.text(money(amt), 140, y, { align: "right" });
    pdf.text(Number(avg).toLocaleString("en-IN", { minimumFractionDigits: 2 }), w - 24, y, { align: "right" });

    pdf.setDrawColor(240, 242, 245);
    pdf.line(14, y + 2, w - 14, y + 2);
    y += 7;
  });

  // Summary box
  y += 4;
  pdf.setFillColor(241, 245, 249);
  pdf.roundedRect(14, y, w - 28, 12, 1.5, 1.5, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text(`Total Weight: ${totalWeight.toFixed(2)} qtl`, 24, y + 8);
  const overallAvg = totalWeight > 0 ? (totalAmount / totalWeight).toFixed(2) : "0.00";
  pdf.text(`Overall Avg: Rs ${overallAvg}`, 95, y + 8);
  pdf.text(`Total Amount: Rs ${money(totalAmount)}`, w - 24, y + 8, { align: "right" });

  if (returnBlob) return pdf.output("blob");
  pdf.save(`Heap-Wise-Average-${fromDate}-to-${toDate}.pdf`);
}
