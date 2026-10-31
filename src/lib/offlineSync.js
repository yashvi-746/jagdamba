// Offline sync manager for Factory Yard operations
import { supabase } from "./supabase.js";

const OFFLINE_QUEUE_KEY = "sj_offline_sync_queue";

// Get pending offline changes
export function getOfflineQueue() {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Queue an action to sync when back online
export function queueOfflineAction(table, action, payload) {
  const queue = getOfflineQueue();
  queue.push({
    id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    table,
    action, // 'insert' | 'update' | 'upsert'
    payload,
    timestamp: new Date().toISOString()
  });
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new Event("offline-queue-changed"));
  } catch (e) {
    console.error("Failed to queue offline action", e);
  }
}

// Sync all queued items to Supabase when internet is restored
export async function syncOfflineQueue() {
  if (!navigator.onLine) return { synced: 0, pending: getOfflineQueue().length };
  
  const queue = getOfflineQueue();
  if (queue.length === 0) return { synced: 0, pending: 0 };

  const remaining = [];
  let syncedCount = 0;

  for (const item of queue) {
    try {
      if (item.action === "insert") {
        const { error } = await supabase.from(item.table).insert([item.payload]);
        if (error) throw error;
      } else if (item.action === "upsert") {
        const { error } = await supabase.from(item.table).upsert(item.payload);
        if (error) throw error;
      }
      syncedCount++;
    } catch (err) {
      console.warn("Could not sync item, retrying later:", item, err);
      remaining.push(item);
    }
  }

  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  window.dispatchEvent(new Event("offline-queue-changed"));
  return { synced: syncedCount, pending: remaining.length };
}

// Auto-sync listener on window reconnect
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    console.log("Internet connection re-established. Syncing factory yard queue...");
    syncOfflineQueue();
  });
}
