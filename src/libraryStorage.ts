export type StoredAudioTrack = {
  id: number;
  title: string;
  artist: string;
  album: string;
  duration: string;
  cover: string;
  file: Blob;
};

const DB_NAME = "nexmusic-library";
const STORE_NAME = "audio-tracks";
const DB_VERSION = 1;

function openLibrary(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Локальное хранилище недоступно в этом браузере."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Не удалось открыть медиатеку."));
  });
}

export async function saveAudioFiles(files: File[]): Promise<StoredAudioTrack[]> {
  const db = await openLibrary();
  const records = files.map((file, index) => ({
    id: Date.now() + index + Math.floor(Math.random() * 1000),
    title: file.name.replace(/\.[^.]+$/, ""),
    artist: "Локальный файл",
    album: "Моя музыка",
    duration: "—",
    cover: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=500&q=85",
    file
  }));
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    records.forEach(record => store.put(record));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Не удалось сохранить аудиофайлы."));
    tx.onabort = () => reject(tx.error ?? new Error("Сохранение аудиофайлов отменено."));
  });
  db.close();
  return records;
}

export async function loadAudioFiles(): Promise<Array<Omit<StoredAudioTrack, "file"> & { src: string }>> {
  const db = await openLibrary();
  const records = await new Promise<StoredAudioTrack[]>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as StoredAudioTrack[]);
    request.onerror = () => reject(request.error ?? new Error("Не удалось прочитать медиатеку."));
  });
  db.close();
  return records.map(({ file, ...track }) => ({ ...track, src: URL.createObjectURL(file) }));
}

export async function updateAudioMetadata(
  id: number,
  metadata: { title: string; artist: string; album: string }
): Promise<void> {
  const db = await openLibrary();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => {
      const record = request.result as StoredAudioTrack | undefined;
      if (record) store.put({ ...record, ...metadata });
    };
    request.onerror = () => reject(request.error ?? new Error("Не удалось обновить теги трека."));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Не удалось обновить теги трека."));
    tx.onabort = () => reject(tx.error ?? new Error("Обновление тегов отменено."));
  });
  db.close();
}

export async function deleteAudioFile(id: number): Promise<void> {
  const db = await openLibrary();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Не удалось удалить трек."));
  });
  db.close();
}
