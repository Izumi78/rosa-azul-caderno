const DB_NAME = "rosa-azul-media";
const STORE_NAME = "attachments";
const DB_VERSION = 1;

function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("O armazenamento de mídia não está disponível neste navegador."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Não foi possível abrir o armazenamento de mídia."));
  });
}

export function noteMediaRef(id: string): string {
  return `rosa-media:${id}`;
}

/** Saves binary media separately from note text so localStorage never contains Base64 payloads. */
export async function saveNoteMedia(blob: Blob): Promise<string> {
  const db = await openMediaDb();
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `media-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(blob, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Não foi possível salvar a mídia."));
      tx.onabort = () => reject(tx.error || new Error("O armazenamento foi interrompido."));
    });
    return id;
  } finally {
    db.close();
  }
}

export async function getNoteMedia(id: string): Promise<Blob | null> {
  const db = await openMediaDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(id);
      request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null);
      request.onerror = () => reject(request.error || new Error("Não foi possível carregar a mídia."));
    });
  } finally {
    db.close();
  }
}
