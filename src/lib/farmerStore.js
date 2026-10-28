// Local & Supabase Store for Farmer Procurement Module ("Make differ section")

// Local & Supabase Store for Farmer Procurement Module ("Make differ section")

export const INITIAL_FARMERS = [];

// Daily Purchases (Starts completely blank for fresh user entry)
export const INITIAL_DAILY_PURCHASES = [];

// Triplicate Bills (Starts completely blank for fresh user entry)
export const INITIAL_TRIPLICATE_BILLS = [];

export function getLocalFarmers() {
  try {
    const s = localStorage.getItem("sj_farmers_v3");
    return s ? JSON.parse(s) : INITIAL_FARMERS;
  } catch { return INITIAL_FARMERS; }
}

export function saveLocalFarmers(list) {
  try { localStorage.setItem("sj_farmers_v3", JSON.stringify(list)); } catch {}
}

export function getLocalDailyPurchases() {
  try {
    const s = localStorage.getItem("sj_daily_purchases_v3");
    return s ? JSON.parse(s) : INITIAL_DAILY_PURCHASES;
  } catch { return INITIAL_DAILY_PURCHASES; }
}

export function saveLocalDailyPurchases(list) {
  try { localStorage.setItem("sj_daily_purchases_v3", JSON.stringify(list)); } catch {}
}

export function getLocalTriplicateBills() {
  try {
    const s = localStorage.getItem("sj_triplicate_bills_v3");
    return s ? JSON.parse(s) : INITIAL_TRIPLICATE_BILLS;
  } catch { return INITIAL_TRIPLICATE_BILLS; }
}

export function saveLocalTriplicateBills(list) {
  try { localStorage.setItem("sj_triplicate_bills_v3", JSON.stringify(list)); } catch {}
}
