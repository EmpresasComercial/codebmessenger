const DATABASE_NAME = 'teggram-recent-images';
const DATABASE_VERSION = 1;
const STORE_NAME = 'images';
const MAX_RECENT_IMAGES = 4;

export interface RecentImageRecord {
  id: string;
  name: string;
  type: string;
  lastModified: number;
  createdAt: number;
  blob: Blob;
}

function openRecentImagesDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is unavailable.'));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open recent images.'));
    request.onblocked = () => reject(new Error('Recent images storage is blocked.'));
  });
}

export async function loadRecentImages(): Promise<RecentImageRecord[]> {
  const database = await openRecentImagesDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).getAll();
      request.onsuccess = () => {
        const images = (request.result as RecentImageRecord[])
          .sort((first, second) => second.createdAt - first.createdAt)
          .slice(0, MAX_RECENT_IMAGES);
        resolve(images);
      };
      request.onerror = () => reject(request.error ?? new Error('Could not load recent images.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Could not load recent images.'));
    });
  } finally {
    database.close();
  }
}

export async function rememberRecentImage(file: File): Promise<void> {
  const database = await openRecentImagesDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const previousImages = (request.result as RecentImageRecord[])
          .sort((first, second) => second.createdAt - first.createdAt);
        const createdAt = Date.now();
        store.put({
          id: `${createdAt}-${Math.random().toString(36).slice(2)}`,
          name: file.name,
          type: file.type,
          lastModified: file.lastModified,
          createdAt,
          blob: file,
        } satisfies RecentImageRecord);
        previousImages.slice(MAX_RECENT_IMAGES - 1).forEach((image) => store.delete(image.id));
      };
      request.onerror = () => reject(request.error ?? new Error('Could not update recent images.'));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not update recent images.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Could not update recent images.'));
    });
  } finally {
    database.close();
  }
}
