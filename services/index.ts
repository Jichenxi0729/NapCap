export { supabase, isSupabaseConfigured } from './supabaseClient';
export {
  getCollection,
  getCachedCollection,
  addToCollection,
  removeFromCollection,
  getItemById,
  importItems,
  migrateFromLocalStorage,
  clearCache,
  removeDuplicates,
  debugCollection,
} from './supabaseService';
export { getItemsByTmdbId, saveCollection } from './storageService';