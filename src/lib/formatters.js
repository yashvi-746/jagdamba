// Dedicated High-Precision Indian Financial & Cotton Metric Formatter

// Commercial weight rounding strictly to 2 decimal places (eliminates 100.00000000000001 Qtl)
export function formatQtl(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return "0.00";
  return (Math.round(num * 100) / 100).toFixed(2);
}

// Indian Numbering System Currency Formatter (Lakhs & Crores)
export function formatINR(val, { withSymbol = true, decimals = 2 } = {}) {
  const num = parseFloat(val);
  if (isNaN(num)) return withSymbol ? "₹0.00" : "0.00";
  const formatted = num.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  return withSymbol ? `₹${formatted}` : formatted;
}

// Net Cotton Candy to Quintal & 20kg Maund Converter
export function convertCandyToQuintal(ratePerCandy) {
  const candyRate = parseFloat(ratePerCandy);
  if (!candyRate || candyRate <= 0) return { qtlRate: 0, maundRate: 0 };
  // Standard MCX / Indian Trade Ratio: 1 Candy = 355.6 kg = 3.556 Quintals = 17.78 Maunds (20kg)
  const qtlRate = Math.round(candyRate / 3.556);
  const maundRate = Math.round(candyRate / 17.78);
  return { qtlRate, maundRate };
}

