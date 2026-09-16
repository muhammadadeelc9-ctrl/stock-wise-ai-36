/**
 * Offline-first local database (IndexedDB).
 *
 * Every piece of app data — account, business profile, products, sales,
 * inventory movements, alerts, recommendation states and settings — lives on
 * the device. Nothing here touches the network, so the whole app keeps working
 * with no internet connection.
 */

export const DB_NAME = "stockwise-ai";
export const DB_VERSION = 1;

export const STORES = [
  "accounts",
  "businesses",
  "products",
  "sales",
  "movements",
  "alerts",
  "recommendation_states",
  "settings",
] as const;

export type StoreName = (typeof STORES)[number];

export const SESSION_KEY = "swai.session.user";

function isBrowser() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (!isBrowser()) return Promise.reject(new Error("Local storage is only available in the browser"));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: name === "settings" ? "user_id" : "id" });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local database"));
  });
  return dbPromise;
}

function tx<T>(store: StoreName, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>) {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(store, mode);
        const request = run(transaction.objectStore(store));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("Local database error"));
      }),
  );
}

export function getAll<T>(store: StoreName): Promise<T[]> {
  return tx<T[]>(store, "readonly", (s) => s.getAll() as IDBRequest<T[]>);
}

export function getOne<T>(store: StoreName, key: string): Promise<T | undefined> {
  return tx<T | undefined>(store, "readonly", (s) => s.get(key) as IDBRequest<T | undefined>);
}

export function put<T>(store: StoreName, value: T): Promise<T> {
  return tx(store, "readwrite", (s) => s.put(value as unknown as object) as IDBRequest<IDBValidKey>).then(
    () => value,
  );
}

export async function putMany<T>(store: StoreName, values: T[]): Promise<void> {
  if (values.length === 0) return;
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(store, "readwrite");
    const objectStore = transaction.objectStore(store);
    for (const value of values) objectStore.put(value as unknown as object);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Local database error"));
  });
}

export function remove(store: StoreName, key: string): Promise<void> {
  return tx(store, "readwrite", (s) => s.delete(key) as IDBRequest<undefined>).then(() => undefined);
}

export async function removeWhere<T extends { id: string }>(
  store: StoreName,
  predicate: (row: T) => boolean,
): Promise<number> {
  const rows = await getAll<T>(store);
  const doomed = rows.filter(predicate);
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(store, "readwrite");
    const objectStore = transaction.objectStore(store);
    for (const row of doomed) objectStore.delete(row.id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Local database error"));
  });
  return doomed.length;
}

export async function clearStore(store: StoreName): Promise<void> {
  await tx(store, "readwrite", (s) => s.clear() as IDBRequest<undefined>);
}

export async function clearAll(): Promise<void> {
  for (const store of STORES) await clearStore(store);
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/* --------------------------- local account --------------------------- */

export type LocalAccount = {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  created_at: string;
};

async function hash(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createAccount(email: string, password: string, fullName: string) {
  const accounts = await getAll<LocalAccount>("accounts");
  const normalized = email.trim().toLowerCase();
  if (accounts.some((a) => a.email === normalized)) {
    throw new Error("An account with this email already exists on this device");
  }
  const account: LocalAccount = {
    id: newId(),
    email: normalized,
    full_name: fullName.trim() || normalized,
    password_hash: await hash(password, normalized),
    created_at: nowIso(),
  };
  await put("accounts", account);
  setSession(account.id);
  return account;
}

export async function signIn(email: string, password: string) {
  const accounts = await getAll<LocalAccount>("accounts");
  const normalized = email.trim().toLowerCase();
  const account = accounts.find((a) => a.email === normalized);
  if (!account) throw new Error("No account with that email exists on this device");
  const candidate = await hash(password, normalized);
  if (candidate !== account.password_hash) throw new Error("Incorrect password");
  setSession(account.id);
  return account;
}

export async function resetPassword(email: string, password: string) {
  const accounts = await getAll<LocalAccount>("accounts");
  const normalized = email.trim().toLowerCase();
  const account = accounts.find((a) => a.email === normalized);
  if (!account) throw new Error("No account with that email exists on this device");
  account.password_hash = await hash(password, normalized);
  await put("accounts", account);
  return account;
}

export function setSession(userId: string) {
  if (typeof localStorage !== "undefined") localStorage.setItem(SESSION_KEY, userId);
}

export function clearSession() {
  if (typeof localStorage !== "undefined") localStorage.removeItem(SESSION_KEY);
}

export function getSessionUserId(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}

export async function currentAccount(): Promise<LocalAccount | null> {
  const id = getSessionUserId();
  if (!id) return null;
  return (await getOne<LocalAccount>("accounts", id)) ?? null;
}

export async function hasAnyAccount(): Promise<boolean> {
  const accounts = await getAll<LocalAccount>("accounts");
  return accounts.length > 0;
}

export async function requireUserId(): Promise<string> {
  const id = getSessionUserId();
  if (!id) throw new Error("Not signed in");
  return id;
}

/* --------------------------- backup / restore --------------------------- */

export type Backup = {
  app: "stockwise-ai";
  version: number;
  exported_at: string;
  data: Record<string, unknown[]>;
};

export async function exportBackup(): Promise<Backup> {
  const data: Record<string, unknown[]> = {};
  for (const store of STORES) data[store] = await getAll(store);
  return { app: "stockwise-ai", version: DB_VERSION, exported_at: nowIso(), data };
}

export async function importBackup(raw: unknown): Promise<{ restored: number }> {
  const backup = raw as Backup;
  if (!backup || backup.app !== "stockwise-ai" || typeof backup.data !== "object") {
    throw new Error("This file is not a Stock Wise AI backup");
  }
  let restored = 0;
  for (const store of STORES) {
    const rows = backup.data[store];
    if (!Array.isArray(rows)) continue;
    await clearStore(store);
    await putMany(store, rows);
    restored += rows.length;
  }
  return { restored };
}
