// Utility to export table data to clean CSV (compatible with Excel, Numbers, and Google Sheets)
export function exportToCsv(filename, rows) {
  if (!rows || !rows.length) return;
  const separator = ",";
  const keys = Object.keys(rows[0]);
  const csvContent =
    keys.map(k => `"${String(k).replace(/"/g, '""')}"`).join(separator) +
    "\n" +
    rows.map(row => {
      return keys.map(k => {
        let cell = row[k] === null || row[k] === undefined ? "" : String(row[k]);
        cell = cell.replace(/"/g, '""');
        return `"${cell}"`;
      }).join(separator);
    }).join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 1-Click Backup Full Database Snapshot
export function exportFullBackup() {
  try {
    const backup = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      factory: "Shree Jagdamba Cotton Ginning & Pressing Factory",
      contracts: JSON.parse(localStorage.getItem("seedledger_contracts_v3") || "[]"),
      gate_passes: JSON.parse(localStorage.getItem("seedledger_gate_passes_v4") || localStorage.getItem("seedledger_gate_passes_v3") || "[]"),
      daily_purchases: JSON.parse(localStorage.getItem("seedledger_daily_purchases") || "[]"),
      triplicate_bills: JSON.parse(localStorage.getItem("seedledger_triplicate_bills") || "[]"),
      farmers: JSON.parse(localStorage.getItem("seedledger_farmers") || "[]")
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jagdamba_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch (err) {
    console.error("Backup failed:", err);
    return false;
  }
}

// Restore Full Database Snapshot
export function restoreFullBackup(file, onSuccess, onError) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.contracts) localStorage.setItem("seedledger_contracts_v3", JSON.stringify(data.contracts));
      if (data.gate_passes) localStorage.setItem("seedledger_gate_passes_v4", JSON.stringify(data.gate_passes));
      if (data.daily_purchases) localStorage.setItem("seedledger_daily_purchases", JSON.stringify(data.daily_purchases));
      if (data.triplicate_bills) localStorage.setItem("seedledger_triplicate_bills", JSON.stringify(data.triplicate_bills));
      if (data.farmers) localStorage.setItem("seedledger_farmers", JSON.stringify(data.farmers));
      if (onSuccess) onSuccess(data);
    } catch (err) {
      if (onError) onError(err);
    }
  };
  reader.readAsText(file);
}

