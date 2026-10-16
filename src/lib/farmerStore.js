// Local & Supabase Store for Farmer Procurement Module ("Make differ section")

export const INITIAL_FARMERS = [
  { id: "f-1", farmer_name: "Anilbhai", village: "Fetapura", vehicle_number: "GJ 06 AA 1101", contact_number: "+91 98250 11001", land_record: "7/12-101", aadhaar_card_number: "2345 6789 0101" },
  { id: "f-2", farmer_name: "Ukedbhai Suka", village: "Fetapura", vehicle_number: "GJ 06 AA 1102", contact_number: "+91 98250 11002", land_record: "7/12-102", aadhaar_card_number: "2345 6789 0102" },
  { id: "f-3", farmer_name: "Chandrashi", village: "Rampura", vehicle_number: "GJ 06 AA 1103", contact_number: "+91 98250 11003", land_record: "7/12-103", aadhaar_card_number: "2345 6789 0103" },
  { id: "f-4", farmer_name: "Bhikhabhai", village: "Kadvakoi", vehicle_number: "GJ 06 AA 1104", contact_number: "+91 98250 11004", land_record: "7/12-104", aadhaar_card_number: "2345 6789 0104" },
  { id: "f-5", farmer_name: "Chimanbhai", village: "Sarsinda", vehicle_number: "GJ 06 AA 1105", contact_number: "+91 98250 11005", land_record: "7/12-105", aadhaar_card_number: "2345 6789 0105" },
  { id: "f-6", farmer_name: "Jitubhai Mohanbhai", village: "Sarsinda", vehicle_number: "GJ 06 AA 1106", contact_number: "+91 98250 11006", land_record: "7/12-106", aadhaar_card_number: "2345 6789 0106" },
  { id: "f-7", farmer_name: "Bachubhai", village: "Sarsinda", vehicle_number: "GJ 06 AA 1107", contact_number: "+91 98250 11007", land_record: "7/12-107", aadhaar_card_number: "2345 6789 0107" },
  { id: "f-8", farmer_name: "Sankarbhai", village: "Sarsinda", vehicle_number: "GJ 06 AA 1108", contact_number: "+91 98250 11008", land_record: "7/12-108", aadhaar_card_number: "2345 6789 0108" },
  { id: "f-9", farmer_name: "Ambubhai", village: "Sarsinda", vehicle_number: "GJ 06 AA 1109", contact_number: "+91 98250 11009", land_record: "7/12-109", aadhaar_card_number: "2345 6789 0109" },
  { id: "f-10", farmer_name: "Mahindrabhai", village: "Gundicha", vehicle_number: "GJ 06 AA 1110", contact_number: "+91 98250 11010", land_record: "7/12-110", aadhaar_card_number: "2345 6789 0110" },
  { id: "f-11", farmer_name: "Laljibhai", village: "Damapura", vehicle_number: "GJ 06 AA 1111", contact_number: "+91 98250 11011", land_record: "7/12-111", aadhaar_card_number: "2345 6789 0111" },
  { id: "f-12", farmer_name: "Sureshbhai", village: "Vanmala", vehicle_number: "GJ 06 AA 1112", contact_number: "+91 98250 11012", land_record: "7/12-112", aadhaar_card_number: "2345 6789 0112" },
  { id: "f-13", farmer_name: "Jashubhai", village: "Sandhra", vehicle_number: "GJ 06 AA 1113", contact_number: "+91 98250 11013", land_record: "7/12-113", aadhaar_card_number: "2345 6789 0113" },
  { id: "f-14", farmer_name: "Laxmanbhai", village: "Vadiya", vehicle_number: "GJ 06 AA 1114", contact_number: "+91 98250 11014", land_record: "7/12-114", aadhaar_card_number: "2345 6789 0114" },
  { id: "f-15", farmer_name: "Manubhai", village: "Piparsat", vehicle_number: "GJ 06 AA 1115", contact_number: "+91 98250 11015", land_record: "7/12-115", aadhaar_card_number: "2345 6789 0115" },
  { id: "f-16", farmer_name: "Nareshbhai", village: "Piparsat", vehicle_number: "GJ 06 AA 1116", contact_number: "+91 98250 11016", land_record: "7/12-116", aadhaar_card_number: "2345 6789 0116" }
];

// Matches Page 3 legacy software screenshot (Total Weight: 943.50, Total Amount: 70022.50)
export const INITIAL_DAILY_PURCHASES = [
  { id: "dp-1", sr_no: 9, farmer_name: "Anilbhai", village_name: "Fetapura", cotton_type: "S/6", weight: 30.00, rate: 74.00, amount: 2220.00 },
  { id: "dp-2", sr_no: 10, farmer_name: "Ukedbhai Suka", village_name: "Fetapura", cotton_type: "S/6", weight: 72.50, rate: 74.00, amount: 5365.00 },
  { id: "dp-3", sr_no: 11, farmer_name: "Chandrashi", village_name: "Rampura", cotton_type: "S/6", weight: 16.00, rate: 74.00, amount: 1184.00 },
  { id: "dp-4", sr_no: 12, farmer_name: "Bhikhabhai", village_name: "Kadvakoi", cotton_type: "S/6", weight: 24.00, rate: 74.00, amount: 1776.00 },
  { id: "dp-5", sr_no: 13, farmer_name: "Chimanbhai", village_name: "Sarsinda", cotton_type: "S/6", weight: 8.00, rate: 74.00, amount: 592.00 },
  { id: "dp-6", sr_no: 14, farmer_name: "Jitubhai Mohanbhai", village_name: "Sarsinda", cotton_type: "S/6", weight: 39.00, rate: 74.00, amount: 2886.00 },
  { id: "dp-7", sr_no: 15, farmer_name: "Bachubhai", village_name: "Sarsinda", cotton_type: "S/6", weight: 21.00, rate: 74.00, amount: 1554.00 },
  { id: "dp-8", sr_no: 16, farmer_name: "Sankarbhai", village_name: "Sarsinda", cotton_type: "S/6", weight: 33.00, rate: 74.00, amount: 2442.00 },
  { id: "dp-9", sr_no: 17, farmer_name: "Ambubhai", village_name: "Sarsinda", cotton_type: "S/6", weight: 58.50, rate: 74.00, amount: 4329.00 },
  { id: "dp-10", sr_no: 18, farmer_name: "Sarda", village_name: "Sarsinda", cotton_type: "S/6", weight: 5.00, rate: 74.00, amount: 370.00 },
  { id: "dp-11", sr_no: 19, farmer_name: "Mahindrabhai", village_name: "Gundicha", cotton_type: "S/6", weight: 38.00, rate: 74.00, amount: 2812.00 },
  { id: "dp-12", sr_no: 20, farmer_name: "Laljibhai", village_name: "Damapura", cotton_type: "S/6", weight: 39.00, rate: 74.00, amount: 2886.00 },
  { id: "dp-13", sr_no: 21, farmer_name: "Sureshbhai", village_name: "Vanmala", cotton_type: "S/6", weight: 38.50, rate: 74.00, amount: 2849.00 },
  { id: "dp-14", sr_no: 22, farmer_name: "Jashubhai", village_name: "Sandhra", cotton_type: "S/6", weight: 24.50, rate: 74.00, amount: 1813.00 },
  { id: "dp-15", sr_no: 23, farmer_name: "Laxmanbhai", village_name: "Vadiya", cotton_type: "S/6", weight: 15.50, rate: 74.00, amount: 1147.00 },
  { id: "dp-16", sr_no: 24, farmer_name: "Manubhai", village_name: "Piparsat", cotton_type: "S/6", weight: 14.26, rate: 74.00, amount: 1054.50 },
  { id: "dp-17", sr_no: 26, farmer_name: "Nareshbhai", village_name: "Piparsat", cotton_type: "S/6", weight: 14.00, rate: 74.00, amount: 1036.00 }
];

// Matches Page 4, 6 & 8 legacy software screenshots (Triplicate Cash & Debit bills)
export const INITIAL_TRIPLICATE_BILLS = [
  {
    id: "tb-101",
    bill_number: "TB-1001",
    seller_name: "Jagdishbhai Shankar",
    village_name: "Ambapura",
    vehicle_number: "GJ 06 T 8871",
    bill_date: "2026-10-13",
    bill_time: "10:30 AM",
    commodity: "Kapash",
    cotton_type: "S/6",
    heap_number: "6",
    gate_pass_number: "GP-101",
    gross_weight: 4.20,
    tare_weight: 0.50,
    net_weight: 3.70,
    rate: 7800.00,
    gross_amount: 28860.00,
    labor_charges: 0,
    net_amount: 28860.00,
    payment_mode: "CASH",
    currency_drawer: { "500": 57, "200": 1, "100": 1, "50": 1, "20": 0, "10": 1, "5": 0 },
    status: "completed"
  },
  {
    id: "tb-102",
    bill_number: "TB-1002",
    seller_name: "Rajubhai Sanabhai",
    village_name: "Sankhedaa",
    vehicle_number: "GJ 06 T 8872",
    bill_date: "2026-10-13",
    bill_time: "11:15 AM",
    commodity: "Kapash",
    cotton_type: "S/6",
    heap_number: "7",
    gate_pass_number: "GP-102",
    gross_weight: 4.80,
    tare_weight: 0.60,
    net_weight: 4.20,
    rate: 7800.00,
    gross_amount: 32760.00,
    labor_charges: 0,
    net_amount: 32760.00,
    payment_mode: "CASH",
    currency_drawer: { "500": 65, "200": 1, "100": 0, "50": 1, "20": 0, "10": 1, "5": 0 },
    status: "completed"
  },
  {
    id: "tb-103",
    bill_number: "TB-1003",
    seller_name: "Bharatbhai Kantibh",
    village_name: "Gundichaa",
    vehicle_number: "GJ 06 T 8873",
    bill_date: "2026-10-13",
    bill_time: "12:00 PM",
    commodity: "Kapash",
    cotton_type: "S/6",
    heap_number: "8",
    gate_pass_number: "GP-103",
    gross_weight: 2.90,
    tare_weight: 0.50,
    net_weight: 2.40,
    rate: 7725.00,
    gross_amount: 18540.00,
    labor_charges: 40.00,
    net_amount: 18500.00,
    payment_mode: "DEBIT",
    due_date: "2026-10-28",
    total_credit_days: 15,
    cheque_number: "CHQ-778812",
    bank_name: "SBI Handod",
    status: "pending_debit"
  },
  {
    id: "tb-104",
    bill_number: "TB-1004",
    seller_name: "Dilepbhai",
    village_name: "Pipariya",
    vehicle_number: "GJ 06 T 8874",
    bill_date: "2026-10-13",
    bill_time: "01:20 PM",
    commodity: "Kapash",
    cotton_type: "S/6",
    heap_number: "9",
    gate_pass_number: "GP-104",
    gross_weight: 8.80,
    tare_weight: 1.00,
    net_weight: 7.80,
    rate: 7800.00,
    gross_amount: 60840.00,
    labor_charges: 0,
    net_amount: 60840.00,
    payment_mode: "CASH",
    currency_drawer: { "500": 121, "200": 1, "100": 1, "50": 0, "20": 2, "10": 0, "5": 0 },
    status: "completed"
  },
  {
    id: "tb-105",
    bill_number: "TB-1005",
    seller_name: "Kashirambhai Devda",
    village_name: "Sitpur",
    vehicle_number: "GJ 06 T 8875",
    bill_date: "2026-10-13",
    bill_time: "02:40 PM",
    commodity: "Kapash",
    cotton_type: "S/6",
    heap_number: "10",
    gate_pass_number: "GP-105",
    gross_weight: 10.90,
    tare_weight: 1.20,
    net_weight: 9.70,
    rate: 7600.00,
    gross_amount: 73720.00,
    labor_charges: 120.00,
    net_amount: 73600.00,
    payment_mode: "DEBIT",
    due_date: "2026-11-02",
    total_credit_days: 20,
    neft_reference: "NEFT-SBIN2026101389",
    bank_name: "Bank of Baroda",
    status: "pending_debit"
  }
];

export function getLocalFarmers() {
  try {
    const s = localStorage.getItem("sj_farmers");
    return s ? JSON.parse(s) : INITIAL_FARMERS;
  } catch { return INITIAL_FARMERS; }
}

export function saveLocalFarmers(list) {
  try { localStorage.setItem("sj_farmers", JSON.stringify(list)); } catch {}
}

export function getLocalDailyPurchases() {
  try {
    const s = localStorage.getItem("sj_daily_purchases");
    return s ? JSON.parse(s) : INITIAL_DAILY_PURCHASES;
  } catch { return INITIAL_DAILY_PURCHASES; }
}

export function saveLocalDailyPurchases(list) {
  try { localStorage.setItem("sj_daily_purchases", JSON.stringify(list)); } catch {}
}

export function getLocalTriplicateBills() {
  try {
    const s = localStorage.getItem("sj_triplicate_bills");
    return s ? JSON.parse(s) : INITIAL_TRIPLICATE_BILLS;
  } catch { return INITIAL_TRIPLICATE_BILLS; }
}

export function saveLocalTriplicateBills(list) {
  try { localStorage.setItem("sj_triplicate_bills", JSON.stringify(list)); } catch {}
}
