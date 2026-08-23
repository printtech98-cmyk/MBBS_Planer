export interface NoteAttachment {
  fileBlob: Blob;
  fileName: string;
  mimeType: string;
  fileType: 'pdf' | 'image';
  pageNumber?: number;
  pageImageBlob?: Blob;
}

const DB_NAME = 'note-attachments';
const STORE = 'attachments';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAttachment(noteId: string, attachment: NoteAttachment): Promise<void> {
  console.log('[Attachment] Saving attachment for note:', noteId, {
    fileName: attachment.fileName,
    fileType: attachment.fileType,
    fileBlobSize: attachment.fileBlob.size,
    pageImageBlobSize: attachment.pageImageBlob?.size,
  });
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(attachment, noteId);
    tx.oncomplete = () => {
      db.close();
      console.log('[Attachment] Save completed for note:', noteId);
      resolve();
    };
    tx.onerror = () => {
      db.close();
      console.error('[Attachment] Save failed for note:', noteId, tx.error);
      reject(tx.error);
    };
  });
}

export async function getAttachment(noteId: string): Promise<NoteAttachment | null> {
  console.log('[Attachment] Looking up attachment for note:', noteId);
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(noteId);
      req.onsuccess = () => {
        db.close();
        const result = req.result ?? null;
        console.log('[Attachment] Lookup result for note:', noteId, result ? 'found' : 'not found', result ? {
          fileName: result.fileName,
          fileType: result.fileType,
          fileBlobSize: result.fileBlob.size,
          pageImageBlobSize: result.pageImageBlob?.size,
        } : null);
        resolve(result);
      };
      req.onerror = () => {
        db.close();
        console.error('[Attachment] Lookup error for note:', noteId, req.error);
        reject(req.error);
      };
    });
  } catch (err) {
    console.error('[Attachment] Lookup exception for note:', noteId, err);
    return null;
  }
}

export async function deleteAttachment(noteId: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(noteId);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    // best-effort
  }
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mimeType });
}
