const DB_NAME = "asnor-studio-local-assets";
const DB_VERSION = 1;
const STORE_NAME = "assets";
const REF_PREFIX = "asnor-local-asset:";
const MAX_CACHED_DATA_URL_CHARS = 24 * 1024 * 1024;

type StoredAsset = { key: string; dataUrl: string; updatedAt: number };
type CachedReference = { projectId: string; reference: string };

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

    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error("Could not open local asset storage."));
    };
    request.onblocked = () => {
      reject(new Error("Local asset storage is busy in another browser tab."));
    };
  });
}

/** Resolve only after the IndexedDB transaction has committed successfully. */
function transact<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openAssetDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        let result: T;
        let settled = false;

        const fail = (error: Error) => {
          if (settled) return;
          settled = true;
          db.close();
          reject(error);
        };

        try {
          const tx = db.transaction(STORE_NAME, mode);
          const request = operation(tx.objectStore(STORE_NAME));

          request.onsuccess = () => {
            result = request.result;
          };
          request.onerror = () => {
            fail(request.error ?? new Error("Local asset operation failed."));
          };
          tx.oncomplete = () => {
            if (settled) return;
            settled = true;
            db.close();
            resolve(result);
          };
          tx.onerror = () => {
            fail(tx.error ?? new Error("Local asset transaction failed."));
          };
          tx.onabort = () => {
            fail(tx.error ?? new Error("Local asset transaction was cancelled."));
          };
        } catch (error) {
          fail(
            error instanceof Error
              ? error
              : new Error("Local asset transaction failed."),
          );
        }
      }),
  );
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Could not read local asset."));
    reader.readAsDataURL(blob);
  });
}

// Keep a bounded LRU cache so autosave does not repeatedly write the same
// large data URL to IndexedDB, without retaining an unlimited number of images.
const assetReferenceCache = new Map<string, CachedReference>();
let cachedDataUrlChars = 0;

function getCachedReference(dataUrl: string, projectId: string) {
  const cached = assetReferenceCache.get(dataUrl);
  if (!cached || cached.projectId !== projectId) return null;

  assetReferenceCache.delete(dataUrl);
  assetReferenceCache.set(dataUrl, cached);
  return cached.reference;
}

function rememberReference(
  dataUrl: string,
  projectId: string,
  reference: string,
) {
  if (dataUrl.length > MAX_CACHED_DATA_URL_CHARS) return;

  const previous = assetReferenceCache.get(dataUrl);
  if (previous) {
    cachedDataUrlChars -= dataUrl.length;
    assetReferenceCache.delete(dataUrl);
  }

  while (cachedDataUrlChars + dataUrl.length > MAX_CACHED_DATA_URL_CHARS) {
    const oldestDataUrl = assetReferenceCache.keys().next().value;
    if (oldestDataUrl === undefined) break;
    assetReferenceCache.delete(oldestDataUrl);
    cachedDataUrlChars -= oldestDataUrl.length;
  }

  assetReferenceCache.set(dataUrl, { projectId, reference });
  cachedDataUrlChars += dataUrl.length;
}

async function storeDataUrl(projectId: string, dataUrl: string): Promise<string> {
  const cached = getCachedReference(dataUrl, projectId);
  if (cached) return cached;

  const key = `${projectId}:${crypto.randomUUID()}`;
  await transact("readwrite", (store) =>
    store.put({
      key,
      dataUrl,
      updatedAt: Date.now(),
    } satisfies StoredAsset),
  );

  const reference = REF_PREFIX + encodeURIComponent(key);
  rememberReference(dataUrl, projectId, reference);
  return reference;
}

async function resolveReference(reference: string): Promise<string> {
  let key: string;

  try {
    key = decodeURIComponent(reference.slice(REF_PREFIX.length));
  } catch {
    return "";
  }

  const record = await transact<StoredAsset | undefined>("readonly", (store) =>
    store.get(key),
  );

  if (!record?.dataUrl) return "";

  const separator = key.indexOf(":");
  const projectId = separator > 0 ? key.slice(0, separator) : "";
  if (projectId) rememberReference(record.dataUrl, projectId, reference);

  return record.dataUrl;
}

async function transformValues(
  value: unknown,
  transform: (text: string) => Promise<string>,
): Promise<unknown> {
  if (typeof value === "string") return transform(value);

  if (Array.isArray(value)) {
    return Promise.all(value.map((item) => transformValues(item, transform)));
  }

  if (value && typeof value === "object") {
    const entries = await Promise.all(
      Object.entries(value).map(async ([key, item]) => [
        key,
        await transformValues(item, transform),
      ] as const),
    );
    return Object.fromEntries(entries);
  }

  return value;
}

/** Save image bytes in this browser's IndexedDB and persist only local references. */
export async function externalizeLocalImages(
  projectId: string,
  projectData: object,
): Promise<object> {
  return (await transformValues(projectData, async (text) => {
    if (!text.startsWith("data:image/")) return text;
    return storeDataUrl(projectId, text);
  })) as object;
}

/** Resolve browser-local image references before loading the GrapesJS project. */
export async function hydrateLocalImages(projectData: object): Promise<object> {
  return (await transformValues(projectData, async (text) => {
    if (!text.startsWith(REF_PREFIX)) return text;
    return resolveReference(text);
  })) as object;
}

function hasSupportedImageSignature(type: string, bytes: Uint8Array) {
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.slice(start, end));

  switch (type) {
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return ascii(0, 8) === "\x89PNG\r\n\x1a\n";
    case "image/gif":
      return ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a";
    case "image/webp":
      return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
    case "image/avif":
      return ascii(4, 8) === "ftyp" &&
        (ascii(8, 12) === "avif" || ascii(8, 12) === "avis");
    default:
      return false;
  }
}

export async function readImageFile(file: File): Promise<string> {
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Images must be 8 MB or smaller.");
  }

  const supportedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
  ];

  if (!supportedTypes.includes(file.type.toLowerCase())) {
    throw new Error("Use a JPEG, PNG, WebP, GIF, or AVIF image.");
  }

  const signature = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!hasSupportedImageSignature(file.type.toLowerCase(), signature)) {
    throw new Error("This file doesn't appear to be a valid supported image.");
  }

  return blobToDataUrl(file);
}
