import { SavedMedia } from '../types';
import { supabase, isSupabaseConfigured, getCurrentUserId } from './supabaseClient';
import { getCollection as getLocalCollection, saveCollection } from './storageService';
import { refreshSession } from './authService';
import * as eventBus from './eventBus';

let cachedCollection: SavedMedia[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60000;
let localCache: SavedMedia[] | null = null;

export const clearCache = () => {
  cachedCollection = null;
  cacheTimestamp = 0;
  localCache = null;
  eventBus.notify();
};

const getUserId = async (): Promise<string | null> => {
  const userId = await getCurrentUserId();
  console.log('[Supabase] 当前用户ID:', userId);
  return userId || null;
};

export const debugCollection = async (): Promise<void> => {
  const userId = await getUserId();
  console.log('[Debug] 用户ID:', userId);
  console.log('[Debug] Supabase配置:', isSupabaseConfigured());
  
  if (isSupabaseConfigured()) {
    // 查询所有用户的数据总数
    const { data: allData, error: allError } = await supabase
      .from('media_collection')
      .select('*', { count: 'exact' });
    
    if (allError) {
      console.error('[Debug] 查询所有数据失败:', allError.message);
    } else {
      console.log('[Debug] Supabase所有数据总数:', allData?.length || 0);
    }
    
    // 查询当前用户的数据
    if (userId) {
      const { data, error } = await supabase
        .from('media_collection')
        .select('media_type')
        .eq('user_id', userId);
      
      if (error) {
        console.error('[Debug] 查询当前用户数据失败:', error.message);
      } else {
        const counts: Record<string, number> = {};
        data.forEach(item => {
          const type = item.media_type || 'unknown';
          counts[type] = (counts[type] || 0) + 1;
        });
        console.log('[Debug] 当前用户数据总数:', data.length);
        console.log('[Debug] 当前用户数据分布:', counts);
      }
    }
  }
};

export const getCachedCollection = (): SavedMedia[] => {
  if (cachedCollection) {
    return cachedCollection;
  }
  if (!localCache) {
    localCache = getLocalCollection();
  }
  return localCache;
};

export const getCollection = async (): Promise<SavedMedia[]> => {
  if (!isSupabaseConfigured()) {
    const local = getLocalCollection();
    localCache = local;
    return local;
  }

  if (cachedCollection && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedCollection;
  }

  const userId = await getUserId();
  if (!userId) {
    console.warn('[Supabase] 用户未登录，回退到本地存储');
    const local = getLocalCollection();
    localCache = local;
    return local;
  }

  try {
    const { data, error } = await supabase
      .from('media_collection')
      .select('*')
      .eq('user_id', userId)
      .order('added_at', { ascending: false })
      .limit(5000);

    if (error) {
      console.warn('[Supabase] 获取数据失败，回退到本地存储:', error.message);
      const local = getLocalCollection();
      localCache = local;
      return local;
    }

    console.log(`[Supabase] 首次获取 ${data.length} 条数据`);
    
    // 如果返回了1000条，可能有更多数据，尝试分批获取
    if (data.length === 1000) {
      console.log('[Supabase] 检测到可能有更多数据，尝试分批获取...');
      let offset = 1000;
      const batchSize = 1000;
      
      while (true) {
        const { data: batchData, error: batchError } = await supabase
          .from('media_collection')
          .select('*')
          .eq('user_id', userId)
          .order('added_at', { ascending: false })
          .range(offset, offset + batchSize - 1);
        
        if (batchError || !batchData || batchData.length === 0) {
          break;
        }
        
        console.log(`[Supabase] 批量获取 ${batchData.length} 条数据，偏移量: ${offset}`);
        data.push(...batchData);
        offset += batchSize;
        
        if (batchData.length < batchSize) {
          break;
        }
      }
      
      console.log(`[Supabase] 分批获取完成，总计 ${data.length} 条数据`);
    }
    
    const typeCounts: Record<string, number> = {};
    data.forEach(item => {
      const type = item.media_type || 'unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    console.log(`[Supabase] 原始类型分布:`, typeCounts);
    
    const tvCount = data.filter(item => item.media_type === 'tv').length;
    const movieCount = data.filter(item => item.media_type === 'movie').length;
    const shortCount = data.filter(item => item.media_type === 'short_drama').length;
    console.log(`[Supabase] 类型分布 - 电视剧: ${tvCount}, 电影: ${movieCount}, 短剧: ${shortCount}`);

    const collection = data.map(item => ({
      ...item,
      tmdbId: item.tmdb_id,
      mediaType: item.media_type,
      posterPath: item.poster_path,
      backdropPath: item.backdrop_path,
      releaseYear: item.release_year,
      addedAt: typeof item.added_at === 'string' ? parseInt(item.added_at, 10) : item.added_at,
      episodeNumber: item.episode_number,
      characterName: item.character_name,
      identity: item.identity,
      appearanceTime: item.appearance_time,
      behavior: item.behavior,
      outfit: item.outfit,
      posture: item.posture,
      grade: item.grade,
      userReview: item.user_review,
      watchedDate: item.watched_date ? String(item.watched_date) : '',
      favorite: item.favorite || false,
      genres: item.genres || [],
      overview: item.overview,
    }));

    cachedCollection = collection;
    cacheTimestamp = Date.now();
    return collection;
  } catch (error) {
    console.warn('[Supabase] 获取数据异常，回退到本地存储:', error);
    const local = getLocalCollection();
    localCache = local;
    return local;
  }
};

const formatWatchedDate = (dateValue: string | number | undefined): string | null => {
  if (!dateValue) {
    return null;
  }
  
  let timestamp: number;
  if (typeof dateValue === 'string') {
    const trimmed = dateValue.trim();
    if (trimmed === '') {
      return null;
    }
    
    const parsed = parseInt(trimmed, 10);
    if (!isNaN(parsed) && parsed > 0) {
      timestamp = parsed;
    } else {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      return null;
    }
  } else {
    timestamp = dateValue;
  }
  
  if (timestamp < 1000000000000) {
    timestamp = timestamp * 1000;
  }
  
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    return null;
  }
  
  return date.toISOString().split('T')[0];
};

const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toISOString();
};

export const addToCollection = async (item: SavedMedia): Promise<void> => {
  if (!isSupabaseConfigured()) {
    saveCollection([...getLocalCollection(), item]);
    return;
  }

  const userId = await getUserId();
  if (!userId) {
    console.warn('[Supabase] 用户未登录，回退到本地存储');
    saveCollection([...getLocalCollection(), item]);
    return;
  }

  try {
    const { error } = await supabase
      .from('media_collection')
      .upsert({
        id: item.id,
        user_id: userId,
        tmdb_id: item.tmdbId,
        media_type: item.mediaType,
        title: item.title,
        poster_path: item.posterPath,
        backdrop_path: item.backdropPath,
        release_year: item.releaseYear,
        added_at: String(item.addedAt),
        episode_number: item.episodeNumber,
        character_name: item.characterName,
        identity: item.identity,
        scene: item.scene,
        appearance_time: item.appearanceTime,
        behavior: item.behavior,
        outfit: item.outfit,
        posture: item.posture,
        grade: item.grade,
        user_review: item.userReview,
        watched_date: formatWatchedDate(item.watchedDate),
        favorite: item.favorite,
        genres: item.genres,
        overview: item.overview,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[Supabase] 添加数据失败:', error.message);
      throw error;
    }
    clearCache();
  } catch (error) {
    console.warn('[Supabase] 添加数据异常，回退到本地存储:', error);
    const local = getLocalCollection();
    const exists = local.find(c => c.id === item.id);
    if (exists) {
      saveCollection(local.map(c => c.id === item.id ? { ...c, ...item } : c));
    } else {
      saveCollection([...local, item]);
    }
    clearCache();
  }
};

export const removeFromCollection = async (id: string): Promise<void> => {
  if (!isSupabaseConfigured()) {
    saveCollection(getLocalCollection().filter(item => item.id !== id));
    return;
  }

  const userId = await getUserId();
  if (!userId) {
    console.warn('[Supabase] 用户未登录，回退到本地存储');
    saveCollection(getLocalCollection().filter(item => item.id !== id));
    return;
  }

  try {
    const { error } = await supabase
      .from('media_collection')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('[Supabase] 删除数据失败:', error.message);
      throw error;
    }
    clearCache();
  } catch (error) {
    console.warn('[Supabase] 删除数据异常，回退到本地存储:', error);
    saveCollection(getLocalCollection().filter(item => item.id !== id));
    clearCache();
  }
};

export const getItemById = async (id: string): Promise<SavedMedia | undefined> => {
  const collection = await getCollection();
  return collection.find(item => item.id === id);
};

export const importItems = async (items: SavedMedia[]): Promise<void> => {
  if (!isSupabaseConfigured()) {
    const local = getLocalCollection();
    const existingIds = new Set(local.map(c => c.id));
    const newItems = items.filter(item => !existingIds.has(item.id));
    saveCollection([...local, ...newItems]);
    return;
  }

  const userId = await getUserId();
  if (!userId) {
    console.warn('[Supabase] 用户未登录，回退到本地存储');
    const local = getLocalCollection();
    const existingIds = new Set(local.map(c => c.id));
    const newItems = items.filter(item => !existingIds.has(item.id));
    saveCollection([...local, ...newItems]);
    return;
  }

  try {
    const insertData = items.map(item => ({
      id: item.id,
      user_id: userId,
      tmdb_id: item.tmdbId,
      media_type: item.mediaType,
      title: item.title,
      poster_path: item.posterPath,
      backdrop_path: item.backdropPath,
      release_year: item.releaseYear,
      added_at: String(item.addedAt),
      episode_number: item.episodeNumber,
      character_name: item.characterName,
      identity: item.identity,
      scene: item.scene,
      appearance_time: item.appearanceTime,
      behavior: item.behavior,
      outfit: item.outfit,
      posture: item.posture,
      grade: item.grade,
      user_review: item.userReview,
      watched_date: formatWatchedDate(item.watchedDate),
      favorite: item.favorite,
      genres: item.genres,
      overview: item.overview,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('media_collection').upsert(insertData);

    if (error) {
      console.error('[Supabase] 批量导入失败:', error.message);
      
      if (error.code === '42501' || error.code === '403') {
        console.log('[Supabase] 尝试刷新会话并重试...');
        const refreshed = await refreshSession();
        
        if (refreshed) {
          console.log('[Supabase] 会话已刷新，重新尝试导入...');
          const { error: retryError } = await supabase.from('media_collection').upsert(insertData);
          
          if (retryError) {
            console.error('[Supabase] 重试导入失败:', retryError.message);
            throw retryError;
          }
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }
    clearCache();
  } catch (error) {
    console.warn('[Supabase] 批量导入异常，回退到本地存储:', error);
    const local = getLocalCollection();
    const existingIds = new Set(local.map(c => c.id));
    const newItems = items.filter(item => !existingIds.has(item.id));
    saveCollection([...local, ...newItems]);
    clearCache();
  }
};

export const removeDuplicates = async (): Promise<number> => {
  if (!isSupabaseConfigured()) {
    return 0;
  }

  const userId = await getUserId();
  if (!userId) {
    console.warn('[Supabase] 用户未登录');
    return 0;
  }

  try {
    const { data: allItems, error } = await supabase
      .from('media_collection')
      .select('id, title, episode_number, tmdb_id, character_name')
      .eq('user_id', userId);

    if (error) {
      console.error('[Supabase] 获取数据失败:', error.message);
      return 0;
    }

    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const item of allItems) {
      const char = (item.character_name || '').trim();
      const key = item.tmdb_id && item.tmdb_id > 0
        ? `${item.tmdb_id}|${item.episode_number}|${char}`
        : `${item.title}|${item.episode_number}|${char}`;

      if (seen.has(key)) {
        duplicates.push(item.id);
      } else {
        seen.add(key);
      }
    }

    if (duplicates.length === 0) {
      console.log('[Supabase] 没有重复数据');
      return 0;
    }

    console.log(`[Supabase] 找到 ${duplicates.length} 条重复数据，正在删除...`);

    for (const id of duplicates) {
      const { error: deleteError } = await supabase
        .from('media_collection')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error(`[Supabase] 删除重复数据失败 ${id}:`, deleteError.message);
      }
    }

    clearCache();
    console.log(`[Supabase] 成功删除 ${duplicates.length} 条重复数据`);
    return duplicates.length;
  } catch (error) {
    console.error('[Supabase] 清理重复数据异常:', error);
    return 0;
  }
};

export const migrateFromLocalStorage = async (): Promise<number> => {
  if (!isSupabaseConfigured()) {
    return 0;
  }

  const localItems = getLocalCollection();
  if (localItems.length === 0) {
    return 0;
  }

  try {
    await importItems(localItems);
    saveCollection([]);
    return localItems.length;
  } catch (error) {
    console.error('[Supabase] 迁移失败:', error);
    return 0;
  }
};