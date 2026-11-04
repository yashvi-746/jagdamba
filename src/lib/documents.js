import jsPDF from "jspdf";
import { LOGO_BASE64 } from "../assets/logoBase64.js";

const safe = (v) => (v == null || v === "" ? "—" : String(v));
const money = (v) =>
  v == null || v === ""
    ? "—"
    : Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 });

// Terms for Cotton Seed (PDF 1: says "within 1 days")
export const COTTON_SEED_TERMS = [
  "we have prepared this contract confirmation as per details and terms mention hear agreed by buyer and seller both. If any discrepancy in contract detail and terms buyers and sellers has inform us within 24 hours which please note.",
  "Buyer and seller both has sign contract confirmation and have to send us within 1 days.",
  "We send this contract confirmation by MAIL OR WHATand if we will not get any reply nor sign from buyer and seller even though this contract confirmation is treat as confirm and binding to buyer and seller both which please note.",
  "We are only broker and we don \"t have any legal nor financial responsibility if any dispute arise in this contract, we are only link between buyer and seller which please note.",
  "If any dispute arise then buyer and seller has to hold our brokerage related to that contract confirmation only and not our other brokerage"
];

// Terms for Net Cotton (PDF 2: says "within 2 days")
export const NET_COTTON_TERMS = [
  "we have prepared this contract confirmation as per details and terms mention hear agreed by buyer and seller both. If any discrepancy in contract detail and terms buyers and sellers has inform us within 24 hours which please note.",
  "Buyer and seller both has sign contract confirmation and have to send us within 2 days.",
  "We send this contract confirmation by MAIL OR WHATand if we will not get any reply nor sign from buyer and seller even though this contract confirmation is treat as confirm and binding to buyer and seller both which please note.",
  "We are only broker and we don \"t have any legal nor financial responsibility if any dispute arise in this contract, we are only link between buyer and seller which please note.",
  "If any dispute arise then buyer and seller has to hold our brokerage related to that contract confirmation only and not our other brokerage"
];

function basePdf(title, subtitle, contract) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const w = pdf.internal.pageSize.getWidth();

  // Header navy bar
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, w, 36, "F");

  // Logo badge & emblem
  try {
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(12, 4.5, 30, 27, 2, 2, "F");
    pdf.addImage(LOGO_BASE64, "PNG", 14, 6, 26, 23);
  } catch (e) {
    // Fallback
  }

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14.5);
  pdf.text("SHREE JAGDAMBA", 46, 12);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(226, 232, 240);
  pdf.text("Shree Jagdamba Cotton Ginning & Pressing Factory", 46, 17);
  pdf.text("At Handod Ta sankheda Dist Chottaudepur-391145", 46, 21.5);
  pdf.text("Email id :- jagdambavhm@gmail.com  |  GST number 24AAHFS2183D1ZF", 46, 26);

  pdf.setFontSize(7);
  pdf.setTextColor(148, 163, 184);
  pdf.text(`${subtitle} • CONTRACT CONFIRMATION & GATE PASS SYSTEM`, 46, 31);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(255, 255, 255);
  pdf.text(title, w - 12, 17, { align: "right" });

  pdf.setTextColor(30, 41, 59);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9.5);
  pdf.text(`1. DATE: ${safe(contract.contract_date)}`, 15, 43);
  pdf.text(`2. CONTRACT NUMBER: ${safe(contract.contract_number)}`, w - 15, 43, { align: "right" });

  return pdf;
}

function section(pdf, title, rows, y) {
  const w = pdf.internal.pageSize.getWidth();
  pdf.setFillColor(241, 245, 249);
  pdf.roundedRect(15, y, w - 30, 7.5, 1.5, 1.5, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9.5);
  pdf.setTextColor(15, 23, 42);
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
export function generateContractPdf(c, { returnBlob = false } = {}) {
  const isNetCotton = c.module === "net_cotton";
  const title = isNetCotton ? "NET COTTON CONFIRMATION" : "COTTON SEED CONFIRMATION";
  const subtitle = isNetCotton ? "NET COTTON (COTTON BALES)" : "COTTON SEED";
  const pdf = basePdf(title, subtitle, c);
  let y = 50;

  let items = [];
  if (isNetCotton) {
    // Module 2: Exact 15 fields from NET COTTON PDF
    items = [
      ["1. DATE", c.contract_date],
      ["2. CONTRACT NUMBER .", c.contract_number],
      ["3. PARTY NAME", c.party_name],
      ["4. GST NUMBER", c.gst_number],
      ["5. ADDREESS", c.party_address],
      ["6. CONTACT NO.", c.contact_number],
      ["7. BROKER NAME AND FIRM NAME", c.broker_name_and_firm_name],
      ["8. PR NO .", c.pr_no],
      ["9. LOT NO.", c.lot_no],
      ["10. QUANTITY", c.quantity],
      ["11. COMMODITY", "COTTON BALES"],
      ["12. DELIVERY CONDITION", c.delivery_condition],
      ["13. PAYMENT CONDITION", c.payment_condition],
      ["14. RATE PER CANDY", c.rate_per_candy ? `INR ${money(c.rate_per_candy)} / Candy` : "—"],
      ["15. DELIVERY ADDRESS", c.delivery_address]
    ];
    const qtyVal = parseFloat(c.quantity) || 0;
    const rateVal = parseFloat(c.rate_per_candy) || 0;
    const gstRateVal = parseFloat(c.gst_rate) >= 0 ? parseFloat(c.gst_rate) : 5;
    const subtotalVal = qtyVal * rateVal;
    if (subtotalVal > 0) {
      const gstVal = subtotalVal * (gstRateVal / 100);
      const grandVal = subtotalVal + gstVal;
      items.push(["GST RATE", `${gstRateVal}%`]);
      items.push(["ESTIMATED BASE AMOUNT", `INR ${money(subtotalVal)}`]);
      items.push(["TOTAL PAYMENT VALUE", `INR ${money(grandVal)} (incl. ${gstRateVal}% GST)`]);
    }
    y = section(pdf, "NET COTTON CONTRACT DETAILS (STEP 1)", items, y);
  } else {
    // Module 1: Exact 13 fields from COTTON SEED PDF
    items = [
      ["1. DATE", c.contract_date],
      ["2. CONTRACT NUMBER .", c.contract_number],
      ["3. PARTY NAME", c.party_name],
      ["4. GST NUMBER", c.gst_number],
      ["5. ADDREESS", c.party_address],
      ["6. CONTACT NO.", c.contact_number],
      ["7. QUANTITY", c.quantity ? `${c.quantity} Quintals` : "—"],
      ["8. COMMODITY", "COTTON SEED"],
      ["9. DELIVERY CONDITION", c.delivery_condition],
      ["10. PAYMENT CONDITION", c.payment_condition],
      ["11. RATE PER QUINTALS", c.rate_per_quintal ? `INR ${money(c.rate_per_quintal)} / Quintal` : "—"],
      ["12. PACKING TYPE", c.packing_type || "LOOSE/BAGS"],
      ["13. DELIVERY ADDRESS", c.delivery_address]
    ];
    const qtyVal = parseFloat(c.quantity) || 0;
    const rateVal = parseFloat(c.rate_per_quintal) || 0;
    const gstRateVal = parseFloat(c.gst_rate) >= 0 ? parseFloat(c.gst_rate) : 5;
    const subtotalVal = qtyVal * rateVal;
    if (subtotalVal > 0) {
      const gstVal = subtotalVal * (gstRateVal / 100);
      const grandVal = subtotalVal + gstVal;
      items.push(["GST RATE", `${gstRateVal}%`]);
      items.push(["ESTIMATED BASE AMOUNT", `INR ${money(subtotalVal)}`]);
      items.push(["TOTAL PAYMENT VALUE", `INR ${money(grandVal)} (incl. ${gstRateVal}% GST)`]);
    }
    y = section(pdf, "COTTON SEED CONTRACT DETAILS (STEP 1)", items, y);
  }

  // Exact 5 Terms & Conditions from PDF
  const terms = isNetCotton ? NET_COTTON_TERMS : COTTON_SEED_TERMS;
  y = section(
    pdf,
    "Terms & Conditions :",
    terms.map((term, i) => [`${i + 1})`, term]),
    y + 2
  );

  // Exact 3 Signatures: Broker Sign & Stamp, Buyer Sign & Stamp, Seller Sign & Stamp
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
  pdf.text(`Shree Jagdamba — ${isNetCotton ? "Net Cotton" : "Cotton Seed"} Contract Confirmation`, 15, 287);

  if (returnBlob) return pdf.output("blob");
  pdf.save(`Contract-${c.contract_number || "draft"}.pdf`);
}

// STEP 4: Generate gate pass with all details
export function generateGatePassPdf(c, l, number, { returnBlob = false } = {}) {
  const isNetCotton = c.module === "net_cotton";
  const title = "GATE PASS";
  const subtitle = isNetCotton ? "NET COTTON (COTTON BALES)" : "COTTON SEED";
  const pdf = basePdf(title, subtitle, c);
  let y = 50;

  // Step 1: Contract Details as per contract
  let contractRows = [];
  if (isNetCotton) {
    contractRows = [
      ["Contract Number", c.contract_number],
      ["Date", c.contract_date],
      ["Party Name", c.party_name],
      ["GST Number", c.gst_number],
      ["Broker Name and Firm Name", c.broker_name_and_firm_name],
      ["PR No.", c.pr_no],
      ["Lot No.", c.lot_no],
      ["Commodity", "COTTON BALES"],
      ["Quantity Contracted", c.quantity],
      ["Delivery Address", c.delivery_address]
    ];
  } else {
    contractRows = [
      ["Contract Number", c.contract_number],
      ["Date", c.contract_date],
      ["Party Name", c.party_name],
      ["GST Number", c.gst_number],
      ["Commodity", "COTTON SEED"],
      ["Quantity Contracted", c.quantity ? `${c.quantity} Quintals` : "—"],
      ["Packing Type", c.packing_type || "LOOSE/BAGS"],
      ["Delivery Address", c.delivery_address]
    ];
  }

  y = section(pdf, "CONTRACT DETAILS (AS PER CONTRACT)", contractRows, y);

  // Step 3: Loading details as per contract
  let loadingRows = [];
  const currentNetWt = Number(l.net_weight_quintals) || 0;
  const contractedQtyMatch = String(c.quantity || "").match(/[\d.]+/);
  const contractedQtyNum = contractedQtyMatch ? parseFloat(contractedQtyMatch[0]) : 0;
  const previousDispatched = Number(l.total_dispatched_prior) || 0;
  const totalWithCurrent = previousDispatched + currentNetWt;
  const remainingBalance = contractedQtyNum > 0 ? Math.max(0, contractedQtyNum - totalWithCurrent) : 0;

  if (isNetCotton) {
    // Module 2: Exact 7 loading fields from NET COTTON PDF + Balance Context
    loadingRows = [
      ["1. Truck /tempo number", l.vehicle_number],
      ["2. Net Weight quintals (This Truck)", `${safe(l.net_weight_quintals)} Quintals`],
      ...(contractedQtyNum > 0 ? [
        ["Total Contract Quantity", `${contractedQtyNum.toFixed(2)} ${c.commodity === 'COTTON BALES' ? 'Bales/Qtl' : 'Quintals'}`],
        ["Dispatched Including This Truck", `${totalWithCurrent.toFixed(2)} Quintals`],
        ["Remaining Contract Balance", `${remainingBalance.toFixed(2)} Quintals`]
      ] : []),
      ["3. Driver license no.", l.driver_license_number],
      ["4. Driver contact number", l.driver_contact_number],
      ["5. Transport no.", l.transport_number],
      ["6. Transporter name", l.transport_name],
      ["7. LR no.", l.lr_number]
    ];
  } else {
    // Module 1: Exact 6 loading fields from COTTON SEED PDF + Balance Context
    loadingRows = [
      ["1. Truck /tempo number", l.vehicle_number],
      ["2. Net Weight quintals (This Truck)", `${safe(l.net_weight_quintals)} Quintals`],
      ...(contractedQtyNum > 0 ? [
        ["Total Contract Quantity", `${contractedQtyNum.toFixed(2)} Quintals`],
        ["Dispatched Including This Truck", `${totalWithCurrent.toFixed(2)} Quintals`],
        ["Remaining Contract Balance", `${remainingBalance.toFixed(2)} Quintals`]
      ] : []),
      ["3. Driver license no.", l.driver_license_number],
      ["4. Transport no.", l.transport_number],
      ["5. Transport name", l.transport_name],
      ["6. Lr no.", l.lr_number]
    ];
  }

  y = section(pdf, "Step 3: Loading details as per contract", loadingRows, y + 2);

  // Signatures
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

// STEP 4: Direct Print Slip for Gate Passes (Native Thermal or A4 Half-Sheet)
export function printGatePassSlip(c, l, number) {
  const isNetCotton = c.module === "net_cotton";
  const contractedQtyMatch = String(c.quantity || "").match(/[\d.]+/);
  const contractedQtyNum = contractedQtyMatch ? parseFloat(contractedQtyMatch[0]) : 0;
  const currentNetWt = Number(l?.net_weight_quintals) || 0;
  const previousDispatched = Number(l?.total_dispatched_prior) || 0;
  const totalWithCurrent = previousDispatched + currentNetWt;
  const remainingBalance = contractedQtyNum > 0 ? Math.max(0, contractedQtyNum - totalWithCurrent) : 0;

  const printWindow = window.open("", "_blank", "width=700,height=800");
  if (!printWindow) {
    alert("Please allow popups to print the gate pass slip.");
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Gate Pass ${number || "Slip"}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 20px; color: #0f172a; }
        .slip-box { max-width: 620px; margin: 0 auto; border: 2px solid #0f172a; padding: 20px; border-radius: 8px; }
        .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px; }
        .header h1 { margin: 0 0 4px; font-size: 18px; text-transform: uppercase; letter-spacing: 0.5px; }
        .header p { margin: 2px 0; font-size: 11px; color: #475569; }
        .pass-meta { display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; background: #f1f5f9; padding: 8px 12px; border-radius: 6px; margin-bottom: 14px; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; font-size: 12px; margin-bottom: 16px; }
        .details-grid div { border-bottom: 1px dotted #cbd5e1; padding-bottom: 4px; }
        .details-grid span { color: #64748b; }
        .details-grid strong { float: right; color: #0f172a; }
        .balance-box { background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 10px; margin-bottom: 16px; font-size: 12px; }
        .balance-box table { width: 100%; border-collapse: collapse; }
        .balance-box td { padding: 4px; }
        .signatures { display: flex; justify-content: space-between; margin-top: 36px; padding-top: 24px; border-top: 1px solid #cbd5e1; font-size: 11px; text-align: center; }
        .sig-block { width: 30%; border-top: 1px solid #0f172a; padding-top: 6px; }
        @media print {
          body { padding: 0; }
          .slip-box { border: 1px solid #000; }
        }
      </style>
    </head>
    <body>
      <div class="slip-box">
        <div class="header">
          <h1>Shree Jagdamba Cotton Ginning & Pressing Factory</h1>
          <p>At Handod Ta sankheda Dist Chottaudepur-391145 | GST: 24AAHFS2183D1ZF</p>
          <p>Email: jagdambavhm@gmail.com | GATE PASS CLEARANCE SLIP (${isNetCotton ? "NET COTTON" : "COTTON SEED"})</p>
        </div>

        <div class="pass-meta">
          <span>PASS NO: ${number || "—"}</span>
          <span>DATE: ${new Date().toLocaleDateString("en-IN")}</span>
        </div>

        <div class="details-grid">
          <div><span>Contract No:</span> <strong>${c.contract_number || "—"}</strong></div>
          <div><span>Party Name:</span> <strong>${c.party_name || "—"}</strong></div>
          <div><span>Truck / Tempo:</span> <strong>${l?.vehicle_number || "—"}</strong></div>
          <div><span>Driver License:</span> <strong>${l?.driver_license_number || "—"}</strong></div>
          ${isNetCotton ? `<div><span>Driver Contact:</span> <strong>${l?.driver_contact_number || "—"}</strong></div>` : ""}
          <div><span>Transporter:</span> <strong>${l?.transport_name || "—"}</strong></div>
          <div><span>LR No:</span> <strong>${l?.lr_number || "—"}</strong></div>
          ${isNetCotton ? `<div><span>PR / Lot:</span> <strong>PR:${c.pr_no || "—"} | Lot:${c.lot_no || "—"}</strong></div>` : ""}
        </div>

        <div class="balance-box">
          <table>
            <tr>
              <td><strong>Contract Total:</strong> ${contractedQtyNum.toFixed(2)} Qtl</td>
              <td><strong style="color: #16a34a;">This Truck Wt:</strong> ${currentNetWt.toFixed(2)} Qtl</td>
              <td><strong>Dispatched:</strong> ${totalWithCurrent.toFixed(2)} Qtl</td>
              <td><strong style="color: ${remainingBalance > 0 ? '#b45309' : '#047857'};">Remaining:</strong> ${remainingBalance.toFixed(2)} Qtl</td>
            </tr>
          </table>
        </div>

        <div class="signatures">
          <div class="sig-block">Driver Signature</div>
          <div class="sig-block">Weighbridge Clerk</div>
          <div class="sig-block">Security Gate In-Charge</div>
        </div>
      </div>
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

// PDF EXPORT FOR COTTON DAILY PURCHASE (Page 1 & 3)
export function generateDailyPurchaseReportPdf(date, records) {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const w = pdf.internal.pageSize.getWidth();

  // Header banner
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, w, 36, "F");

  // Logo badge & emblem
  try {
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(12, 4.5, 30, 27, 2, 2, "F");
    pdf.addImage(LOGO_BASE64, "PNG", 14, 6, 26, 23);
  } catch (e) {
    // Fallback
  }

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14.5);
  pdf.text("Shree Jagdamba Cotton Ginning & Pressing Factory", 46, 12);
  pdf.setFontSize(7.5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(226, 232, 240);
  pdf.text("At Handod Ta sankheda Dist Chottaudepur-391145", 46, 18);
  pdf.text("Email id :- jagdambavhm@gmail.com  |  GST number 24AAHFS2183D1ZF", 46, 23.5);
  pdf.setTextColor(148, 163, 184);
  pdf.setFontSize(7);
  pdf.text("COTTON DAILY PURCHASE SHEET", 46, 29);
  pdf.text(`Date: ${date || new Date().toLocaleDateString("en-IN")}`, w - 45, 29);

  let y = 42;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setFillColor(241, 245, 249);
  pdf.rect(14, y, w - 28, 7, "F");
  pdf.setTextColor(15, 23, 42);

  pdf.text("Sr", 16, y + 5);
  pdf.text("Farmer Name", 25, y + 5);
  pdf.text("Village", 75, y + 5);
  pdf.text("Type", 110, y + 5);
  pdf.text("Weight (Qtl)", 125, y + 5);
  pdf.text("Rate (₹)", 152, y + 5);
  pdf.text("Amount (₹)", 175, y + 5);

  y += 7;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);

  let totalWeight = 0;
  let totalAmount = 0;

  records.forEach((r, idx) => {
    if (y > 270) {
      pdf.addPage();
      y = 20;
    }
    const wt = Number(r.weight) || 0;
    const rate = Number(r.rate) || 0;
    const amt = Number(r.amount) || wt * rate;
    totalWeight += wt;
    totalAmount += amt;

    if (idx % 2 === 1) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(14, y, w - 28, 6, "F");
    }

    pdf.setTextColor(51, 65, 85);
    pdf.text(String(r.sr_no || idx + 1), 16, y + 4.5);
    pdf.text(String(r.farmer_name || "").substring(0, 24), 25, y + 4.5);
    pdf.text(String(r.village_name || "").substring(0, 18), 75, y + 4.5);
    pdf.text(String(r.cotton_type || "S/6"), 110, y + 4.5);
    pdf.text(wt.toFixed(2), 125, y + 4.5);
    pdf.text(rate.toFixed(2), 152, y + 4.5);
    pdf.text(amt.toLocaleString("en-IN", { maximumFractionDigits: 2 }), 175, y + 4.5);

    y += 6;
  });

  // Summary row
  y += 2;
  pdf.setFillColor(226, 232, 240);
  pdf.rect(14, y, w - 28, 8, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(15, 23, 42);
  pdf.text("TOTALS / SUMMARY", 25, y + 5.5);
  pdf.text(totalWeight.toFixed(2), 125, y + 5.5);
  pdf.text(
    totalWeight > 0 ? (totalAmount / totalWeight).toFixed(2) : "0.00",
    152,
    y + 5.5
  );
  pdf.text(
    "₹" + totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 }),
    175,
    y + 5.5
  );

  pdf.save(`Cotton-Daily-Purchase-${date || "today"}.pdf`);
}

// PDF EXPORT FOR HEAP WISE AVERAGE DETAILS (Page 8 benchmark)
export function generateHeapWiseReportPdf(fromDate, toDate, heapList) {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const w = pdf.internal.pageSize.getWidth();

  // Header banner
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, w, 36, "F");

  // Logo badge & emblem
  try {
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(12, 4.5, 30, 27, 2, 2, "F");
    pdf.addImage(LOGO_BASE64, "PNG", 14, 6, 26, 23);
  } catch (e) {
    // Fallback
  }

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14.5);
  pdf.text("Shree Jagdamba Cotton Ginning & Pressing Factory", 46, 12);
  pdf.setFontSize(7.5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(226, 232, 240);
  pdf.text("At Handod Ta sankheda Dist Chottaudepur-391145", 46, 18);
  pdf.text("Email id :- jagdambavhm@gmail.com  |  GST number 24AAHFS2183D1ZF", 46, 23.5);
  pdf.setTextColor(148, 163, 184);
  pdf.setFontSize(7);
  pdf.text("HEAP WISE AVERAGE DETAILS (BENCHMARK PROCUREMENT AUDIT)", 46, 29);
  pdf.text(`Period: ${fromDate || "—"} to ${toDate || "—"}`, w - 75, 29);

  let y = 42;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.setFillColor(241, 245, 249);
  pdf.rect(14, y, w - 28, 7, "F");
  pdf.setTextColor(15, 23, 42);

  pdf.text("Heap No", 16, y + 5);
  pdf.text("Heap Name", 35, y + 5);
  pdf.text("Gross Wt (Qtl)", 75, y + 5);
  pdf.text("Tare Wt (Qtl)", 105, y + 5);
  pdf.text("Net Wt (Qtl)", 135, y + 5);
  pdf.text("Amount (₹)", 155, y + 5);
  pdf.text("Avg Rate (₹)", 182, y + 5);

  y += 7;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);

  let totalNetWt = 0;
  let totalAmount = 0;

  heapList.forEach((h, idx) => {
    if (y > 270) {
      pdf.addPage();
      y = 20;
    }
    const net = Number(h.net_weight) || 0;
    const amt = Number(h.amount) || 0;
    const avg = Number(h.average_rate) || (net > 0 ? amt / net : 0);
    totalNetWt += net;
    totalAmount += amt;

    if (idx % 2 === 1) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(14, y, w - 28, 6, "F");
    }

    pdf.setTextColor(51, 65, 85);
    pdf.text(String(h.heap_number), 16, y + 4.5);
    pdf.text(String(h.heap_name || "").substring(0, 18), 35, y + 4.5);
    pdf.text(Number(h.gross_weight || 0).toFixed(2), 75, y + 4.5);
    pdf.text(Number(h.tare_weight || 0).toFixed(2), 105, y + 4.5);
    pdf.text(net.toFixed(2), 135, y + 4.5);
    pdf.text(amt.toLocaleString("en-IN", { maximumFractionDigits: 2 }), 155, y + 4.5);
    pdf.text(avg.toFixed(2), 182, y + 4.5);

    y += 6;
  });

  // Benchmark Total row
  y += 2;
  pdf.setFillColor(226, 232, 240);
  pdf.rect(14, y, w - 28, 8, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(15, 23, 42);
  pdf.text("GRAND TOTAL", 35, y + 5.5);
  pdf.text(totalNetWt.toFixed(2), 135, y + 5.5);
  pdf.text(
    "₹" + totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 }),
    155,
    y + 5.5
  );
  pdf.text(
    totalNetWt > 0 ? (totalAmount / totalNetWt).toFixed(2) : "0.00",
    182,
    y + 5.5
  );

  pdf.save(`Heap-Wise-Average-Report.pdf`);
}

// PDF EXPORT FOR TRIPLICATE BILLING (Page 4 & 5: Cash / Debit Bill)
export function generateTriplicateBillPdf(bill) {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const w = pdf.internal.pageSize.getWidth();
  const isDebit = (bill.bill_type || bill.payment_mode || "").toLowerCase() === "debit";

  // Factory Header Banner
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, w, 36, "F");

  // Logo badge & emblem
  try {
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(12, 4.5, 30, 27, 2, 2, "F");
    pdf.addImage(LOGO_BASE64, "PNG", 14, 6, 26, 23);
  } catch (e) {
    // Fallback
  }

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14.5);
  pdf.text("Shree Jagdamba Cotton Ginning & Pressing Factory", 46, 12);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(226, 232, 240);
  pdf.text("At Handod Ta sankheda Dist Chottaudepur-391145", 46, 18);
  pdf.text("Email id :- jagdambavhm@gmail.com  |  GST number 24AAHFS2183D1ZF", 46, 23.5);

  pdf.setFontSize(7);
  pdf.setTextColor(148, 163, 184);
  pdf.text(`FARMER COTTON PURCHASE BILL (${isDebit ? "DEBIT PURCHASE" : "CASH PURCHASE"})`, 46, 29);
  pdf.text(`BILL NO: ${bill.bill_number || bill.bill_no || "DRAFT"}`, w - 45, 29);

  // Section: Bill meta
  let y = 43;
  pdf.setFillColor(241, 245, 249);
  pdf.rect(14, y, w - 28, 24, "F");

  pdf.setTextColor(15, 23, 42);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("1. Bill Date:", 18, y + 6);
  pdf.setFont("helvetica", "normal");
  pdf.text(String(bill.bill_date || "—"), 45, y + 6);

  pdf.setFont("helvetica", "bold");
  pdf.text("2. Farmer Name:", 80, y + 6);
  pdf.setFont("helvetica", "normal");
  pdf.text(String(bill.seller_name || bill.farmer_name || "—"), 112, y + 6);

  pdf.setFont("helvetica", "bold");
  pdf.text("3. Village Name:", 18, y + 13);
  pdf.setFont("helvetica", "normal");
  pdf.text(String(bill.seller_residence || bill.village_name || "—"), 45, y + 13);

  pdf.setFont("helvetica", "bold");
  pdf.text("4. Vehicle No:", 80, y + 13);
  pdf.setFont("helvetica", "normal");
  pdf.text(String(bill.vehicle_number || bill.vehicle_no || "—"), 112, y + 13);

  pdf.setFont("helvetica", "bold");
  pdf.text("5. Contact No:", 18, y + 20);
  pdf.setFont("helvetica", "normal");
  pdf.text(String(bill.contact_number || bill.contact_no || "—"), 45, y + 20);

  pdf.setFont("helvetica", "bold");
  pdf.text("6. Heap No:", 80, y + 20);
  pdf.setFont("helvetica", "normal");
  pdf.text(String(bill.heap_number || bill.heap_no || "—"), 112, y + 20);

  // Section: Weight & Rate Calculations
  y += 32;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("WEIGHT & AMOUNT CALCULATION", 14, y);
  y += 4;

  const gross = Number(bill.gross_weight) || 0;
  const tare = Number(bill.tare_weight) || 0;
  const net = Number(bill.net_weight) || Math.max(0, gross - tare);
  const rate = Number(bill.rate) || 0;
  const amt = Number(bill.gross_amount) || Number(bill.amount) || (net * rate);
  const labor = Number(bill.labor_charges) || 0;
  const vatav = Number(bill.vatav) || 0;
  const netPay = Number(bill.net_amount) || Math.max(0, amt - labor - vatav);

  const calcRows = [
    ["7. Cotton Type", String(bill.cotton_type || bill.commodity || "Kapash")],
    ["8. Gross Weight", `${gross.toFixed(2)} Quintals`],
    ["9. Tare Weight", `${tare.toFixed(2)} Quintals`],
    ["10. Net Weight (Gross - Tare)", `${net.toFixed(2)} Quintals`],
    ["11. Rate per Quintal", `Rs. ${rate.toFixed(2)}`],
    ["12. Total Amount (Net Wt x Rate)", `Rs. ${amt.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`],
    ["13. Labor / Deductions", `Rs. ${labor.toFixed(2)}`],
    ["14. Net Payable to Farmer", `Rs. ${netPay.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`]
  ];

  calcRows.forEach(([lbl, val], idx) => {
    pdf.setFillColor(idx % 2 === 0 ? 255 : 248, 250, 252);
    pdf.rect(14, y, w - 28, 7, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text(lbl, 18, y + 5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(val, w - 20, y + 5, { align: "right" });
    y += 7;
  });

  // Section: Settlement Details
  y += 6;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text(isDebit ? "DEBIT SETTLEMENT DETAILS" : "CASH DENOMINATIONS BREAKDOWN", 14, y);
  y += 4;

  if (isDebit) {
    pdf.setFillColor(241, 245, 249);
    pdf.rect(14, y, w - 28, 22, "F");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.text(`15. Due Date: ${bill.due_date || bill.debit_due_date || "—"} (${bill.total_credit_days || bill.debit_days || "0"} Days)`, 18, y + 7);
    pdf.text(`16. Cheque / NEFT Ref: ${bill.cheque_number || bill.cheque_no || bill.neft_reference || bill.neft_ref || "—"}`, 18, y + 14);
    y += 28;
  } else {
    // Currency notes drawer table
    const denoms = bill.currency_drawer || bill.denominations || { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0 };
    pdf.setFillColor(241, 245, 249);
    pdf.rect(14, y, w - 28, 6, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text("Note (Rs.)", 20, y + 4.5);
    pdf.text("Count", 60, y + 4.5);
    pdf.text("Total (Rs.)", 100, y + 4.5);
    y += 6;

    let drawerTotal = 0;
    const noteKeys = [500, 200, 100, 50, 20, 10, 5];
    noteKeys.forEach((note) => {
      const count = Number(denoms[note] || denoms[String(note)]) || 0;
      const sub = count * Number(note);
      drawerTotal += sub;
      pdf.setFont("helvetica", "normal");
      pdf.text(`Rs. ${note}`, 20, y + 4.5);
      pdf.text(String(count), 60, y + 4.5);
      pdf.text(`Rs. ${sub.toLocaleString("en-IN")}`, 100, y + 4.5);
      y += 5.5;
    });

    pdf.setFillColor(226, 232, 240);
    pdf.rect(14, y, w - 28, 6, "F");
    pdf.setFont("helvetica", "bold");
    pdf.text("Cash Paid Total", 20, y + 4.5);
    pdf.text(`Rs. ${drawerTotal.toLocaleString("en-IN")}`, 100, y + 4.5);
    y += 12;
  }

  // Triplicate Stamp Footnote
  y = Math.max(y + 10, 240);
  pdf.setDrawColor(148, 163, 184);
  pdf.line(18, y, 70, y);
  pdf.line(w - 70, y, w - 18, y);

  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(51, 65, 85);
  pdf.text("Farmer Signature / Thumb Impression", 18, y + 6);
  pdf.text("Authorized Factory Sign & Stamp", w - 70, y + 6);

  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text("Triplicate Copies: Copy 1: Farmer Copy | Copy 2: Accounts Dept | Copy 3: Factory Gate / Audit", 14, 285);

  pdf.save(`Triplicate-Bill-${bill.bill_no || "draft"}.pdf`);
}



// 5. Consolidated Party Statement / Commercial Ledger PDF
export function generatePartyStatementPdf(partyName, partyContracts = [], partyPasses = []) {
  const pdf = new jsPDF("p", "mm", "a4");
  const w = pdf.internal.pageSize.getWidth();
  let y = 14;

  drawHeader(pdf, "COMMERCIAL DISPATCH & CONTRACT STATEMENT");
  y = 48;

  pdf.setFillColor(241, 245, 249);
  pdf.roundedRect(14, y, w - 28, 22, 2, 2, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(15, 23, 42);
  pdf.text(`Party: ${partyName}`, 18, y + 7);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Statement Date: ${new Date().toLocaleDateString("en-IN")}`, 18, y + 14);
  pdf.text(`Total Contracts Signed: ${partyContracts.length}`, 120, y + 7);
  pdf.text(`Total Dispatches Recorded: ${partyPasses.length}`, 120, y + 14);
  y += 28;

  // Contracts Section
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(15, 23, 42);
  pdf.text("1. Signed Contracts Summary", 14, y);
  y += 5;

  let totalContractedQty = 0;
  partyContracts.forEach((c) => {
    const rawQty = String(c.quantity || "").match(/[\d.]+/);
    totalContractedQty += rawQty ? parseFloat(rawQty[0]) : 0;
  });

  pdf.setFillColor(226, 232, 240);
  pdf.rect(14, y, w - 28, 6.5, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.text("Contract No.", 16, y + 4.5);
  pdf.text("Date", 50, y + 4.5);
  pdf.text("Commodity", 80, y + 4.5);
  pdf.text("Quantity", 125, y + 4.5);
  pdf.text("Rate", 155, y + 4.5);
  pdf.text("Status", 185, y + 4.5);
  y += 7;

  partyContracts.forEach((c) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(String(c.contract_number || "Draft"), 16, y + 4);
    pdf.text(String(c.contract_date || "-"), 50, y + 4);
    pdf.text(String(c.commodity || "COTTON SEED"), 80, y + 4);
    pdf.text(String(c.quantity || "-"), 125, y + 4);
    pdf.text(c.rate_per_candy ? `Rs.${c.rate_per_candy}/Candy` : `Rs.${c.rate_per_quintal || 0}/Qtl`, 155, y + 4);
    pdf.text(String(c.status || "confirmed"), 185, y + 4);
    y += 5.5;
  });

  y += 6;
  // Dispatches Section
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(15, 23, 42);
  pdf.text("2. Truck Dispatches & Gate Clearances", 14, y);
  y += 5;

  let totalDispatchedQty = 0;
  pdf.setFillColor(226, 232, 240);
  pdf.rect(14, y, w - 28, 6.5, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.text("Gate Pass", 16, y + 4.5);
  pdf.text("Date", 48, y + 4.5);
  pdf.text("Vehicle No.", 75, y + 4.5);
  pdf.text("Net Weight", 115, y + 4.5);
  pdf.text("Transporter", 145, y + 4.5);
  pdf.text("LR No.", 182, y + 4.5);
  y += 7;

  partyPasses.forEach((p) => {
    const l = p.loading_details || {};
    const wt = Number(l.net_weight_quintals || 0);
    totalDispatchedQty += wt;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(String(p.gate_pass_number || "-"), 16, y + 4);
    pdf.text(p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN") : "-", 48, y + 4);
    pdf.text(String(l.vehicle_number || "-"), 75, y + 4);
    pdf.text(`${wt.toFixed(2)} Qtl`, 115, y + 4);
    pdf.text(String(l.transport_name || "-").slice(0, 18), 145, y + 4);
    pdf.text(String(l.lr_number || "-"), 182, y + 4);
    y += 5.5;
  });

  // Balance Summary Card
  y += 8;
  const pendingQty = Math.max(0, totalContractedQty - totalDispatchedQty);
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(203, 213, 225);
  pdf.roundedRect(14, y, w - 28, 16, 2, 2, "FD");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(15, 23, 42);
  pdf.text(`Total Contracted: ${totalContractedQty.toFixed(2)} Qtl`, 20, y + 6);
  pdf.text(`Total Dispatched: ${totalDispatchedQty.toFixed(2)} Qtl`, 80, y + 6);
  pdf.setTextColor(pendingQty > 0 ? 180 : 22, pendingQty > 0 ? 83 : 163, pendingQty > 0 ? 9 : 74);
  pdf.text(`Outstanding Balance: ${pendingQty.toFixed(2)} Qtl Pending`, 135, y + 6);

  // Signatures
  y += 28;
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.line(20, y, 70, y);
  pdf.line(w - 70, y, w - 20, y);
  pdf.text("Party Authorized Signatory", 24, y + 5);
  pdf.text("For Shree Jagdamba Factory", w - 66, y + 5);

  pdf.save(`Statement-${partyName.replace(/\s+/g, "_")}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
