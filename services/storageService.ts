import { SavedMedia } from '../types';

const STORAGE_KEY = 'cinekeep_collection_v2';

export const getCollection = (): SavedMedia[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveCollection = (collection: SavedMedia[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
  } catch {
    // Silently fail
  }
};

export const addToCollection = (item: SavedMedia) => {
  const collection = getCollection();
  const exists = collection.find(c => c.id === item.id);
  if (exists) {
    const updated = collection.map(c => c.id === item.id ? { ...c, ...item } : c);
    saveCollection(updated);
  } else {
    saveCollection([...collection, item]);
  }
};

export const updateItem = (id: string, updates: Partial<SavedMedia>) => {
  const collection = getCollection();
  const updated = collection.map(item => item.id === id ? { ...item, ...updates } : item);
  saveCollection(updated);
};

export const removeFromCollection = (id: string) => {
  const collection = getCollection();
  saveCollection(collection.filter(item => item.id !== id));
};

export const getItemById = (id: string): SavedMedia | undefined => {
  return getCollection().find(item => item.id === id);
};

export const getItemsByTmdbId = (tmdbId: number): SavedMedia[] => {
  return getCollection().filter(item => item.tmdbId === tmdbId);
};

export const importItems = (items: SavedMedia[]) => {
  const collection = getCollection();
  const existingIds = new Set(collection.map(c => c.id));
  const newItems = items.filter(item => !existingIds.has(item.id));
  if (newItems.length > 0) {
    saveCollection([...collection, ...newItems]);
  }
};