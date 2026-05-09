import { useCallback, useEffect, useState } from "react";

export interface AuditEntry {
  id: string;
  entity: string;
  action: "criação" | "edição" | "exclusão";
  recordId: string;
  recordLabel: string;
  actor: string;
  at: string;
}

const AUDIT_KEY = "imts.audit-log";
const DEFAULT_ACTOR = "Felipe Miranda";

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function appendAudit(entry: Omit<AuditEntry, "id" | "actor" | "at">) {
  const current = readStorage<AuditEntry[]>(AUDIT_KEY, []);
  const next: AuditEntry[] = [
    {
      ...entry,
      id: `AUD-${Date.now()}`,
      actor: DEFAULT_ACTOR,
      at: new Date().toISOString(),
    },
    ...current,
  ].slice(0, 80);
  writeStorage(AUDIT_KEY, next);
  window.dispatchEvent(new Event("imts-audit-updated"));
}

export function getAuditLog() {
  return readStorage<AuditEntry[]>(AUDIT_KEY, []);
}

export function useAuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>(() => getAuditLog());

  useEffect(() => {
    const sync = () => setEntries(getAuditLog());
    window.addEventListener("storage", sync);
    window.addEventListener("imts-audit-updated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("imts-audit-updated", sync);
    };
  }, []);

  return entries;
}

export function usePersistentCollection<T extends { id: string }>(
  storageKey: string,
  initialData: T[],
  entity: string,
  labelOf: (item: T) => string,
) {
  const [items, setItems] = useState<T[]>(() => readStorage(storageKey, initialData));

  useEffect(() => {
    writeStorage(storageKey, items);
  }, [items, storageKey]);

  const save = useCallback((item: T) => {
    setItems(prev => {
      const exists = prev.some(current => current.id === item.id);
      const next = exists ? prev.map(current => current.id === item.id ? item : current) : [...prev, item];
      appendAudit({
        entity,
        action: exists ? "edição" : "criação",
        recordId: item.id,
        recordLabel: labelOf(item),
      });
      return next;
    });
  }, [entity, labelOf]);

  const remove = useCallback((item: T) => {
    setItems(prev => prev.filter(current => current.id !== item.id));
    appendAudit({
      entity,
      action: "exclusão",
      recordId: item.id,
      recordLabel: labelOf(item),
    });
  }, [entity, labelOf]);

  return { items, setItems, save, remove };
}