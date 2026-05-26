"use client";

export const LIBRARY_STORAGE_KEY = "carcrafter_library";

export type LibraryItem = {
  id: string;
  prompt: string;
  originalImage: string | null;
  resultImage: string;
  createdAt: string;
};

function canUseStorage() {
  return typeof window !== "undefined";
}

export function readLibrary(): LibraryItem[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LibraryItem[]) : [];
  } catch (err) {
    console.error("Failed to read library", err);
    return [];
  }
}

export function writeLibrary(items: LibraryItem[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(items));
}

export function saveLibraryItem(item: LibraryItem): LibraryItem[] {
  const existing = readLibrary();
  const next = [item, ...existing.filter((entry) => entry.id !== item.id)];
  writeLibrary(next);
  return next;
}

export function deleteLibraryItem(id: string): LibraryItem[] {
  const next = readLibrary().filter((item) => item.id !== id);
  writeLibrary(next);
  return next;
}

export function clearLibrary() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(LIBRARY_STORAGE_KEY);
}
