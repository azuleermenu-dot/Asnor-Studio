const DB_NAME = "asnor-studio-local-assets";
const DB_VERSION = 1;
const STORE_NAME = "assets";
const REF_PREFIX = "asnor-local-asset:";

type StoredAsset = { key: string; dataUrl: string; updatedAt: number };

function openAssetDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Local asset storage is unavailable in this browser."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local asset storage."));
  });
}

function transact<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openAssetDb().then((db) => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const request = operation(tx.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Local asset operation failed."));
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("Local asset transaction failed."));
    };
  }));
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, encoded] = dataUrl.split(",", 2);
  const mime = header.match(/^data:([^;]+)/)?.[1] ?? "application/octet-stream";
  const binary = atob(encoded ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read local asset."));
    reader.readAsDataURL(blob);
  });
}

async function storeDataUrl(projectId: string, dataUrl: string): Promise<string> {
  const key = `${projectId}:${crypto.randomUUID()}`;
  await transact("readwrite", (store) => store.put({
    key,
    dataUrl,
    updatedAt: Date.now(),
  } satisfies StoredAsset));
  return REF_PREFIX + encodeURIComponent(key);
}

async function resolveReference(reference: string): Promise<string> {
  const key = decodeURIComponent(reference.slice(REF_PREFIX.length));
  const record = await transact<StoredAsset | undefined>("readonly", (store) => store.get(key));
  if (!record?.dataUrl) return "";
  return record.dataUrl;
}

async function transformValues(value: unknown, transform: (text: string) => Promise<string>): Promise<unknown> {
  if (typeof value === "string") return transform(value);
  if (Array.isArray(value)) return Promise.all(value.map((item) => transformValues(item, transform)));
  if (value && typeof value === "object") {
    const entries = await Promise.all(Object.entries(value).map(async ([key, item]) => [
      key,
      await transformValues(item, transform),
    ] as const));
    return Object.fromEntries(entries);
  }
  return value;
}

/** Save image bytes in this browser's IndexedDB and keep only local references in project JSON. */
export async function externalizeLocalImages(projectId: string, projectData: object): Promise<object> {
  return await transformValues(projectData, async (text) => {
    if (!text.startsWith("data:image/")) return text;
    return storeDataUrl(projectId, text);
  }) as object;
}

/** Resolve browser-local image references before loading the GrapesJS project. */
export async function hydrateLocalImages(projectData: object): Promise<object> {
  return await transformValues(projectData, async (text) => {
    if (!text.startsWith(REF_PREFIX)) return text;
    return resolveReference(text);
  }) as object;
}

export async function readImageFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Images must be 8 MB or smaller.");
  return blobToDataUrl(file);
}
