import { TMDbMovieDetail, TMDbMovieSummary, TMDbTvSummary, TMDbTvDetail } from '../types';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY || '4682c1bc83053424d2897bd268c953dd';
const BASE_URL = 'https://api.tmdb.org/3';
export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
export const IMAGE_ORIGINAL_URL = 'https://image.tmdb.org/t/p/original';

const fetchTMDb = async <T,>(endpoint: string, params: Record<string, string> = {}): Promise<T> => {
  const queryParams = new URLSearchParams({
    api_key: API_KEY,
    language: 'zh-CN',
    ...params,
  });

  const response = await fetch(`${BASE_URL}${endpoint}?${queryParams.toString()}`);

  if (!response.ok) {
    throw new Error(`TMDb API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

export const searchMulti = async (query: string): Promise<{ movies: TMDbMovieSummary[]; tvShows: TMDbTvSummary[] }> => {
  if (!query) return { movies: [], tvShows: [] };
  try {
    const [movieRes, tvRes] = await Promise.all([
      fetchTMDb<{ results: TMDbMovieSummary[] }>('/search/movie', { query }),
      fetchTMDb<{ results: TMDbTvSummary[] }>('/search/tv', { query }),
    ]);
    return {
      movies: movieRes.results || [],
      tvShows: tvRes.results || [],
    };
  } catch {
    return { movies: [], tvShows: [] };
  }
};

export const searchMovies = async (query: string): Promise<TMDbMovieSummary[]> => {
  if (!query) return [];
  try {
    const data = await fetchTMDb<{ results: TMDbMovieSummary[] }>('/search/movie', { query });
    return data.results || [];
  } catch {
    return [];
  }
};

export const searchTvShows = async (query: string): Promise<TMDbTvSummary[]> => {
  if (!query) return [];
  try {
    const data = await fetchTMDb<{ results: TMDbTvSummary[] }>('/search/tv', { query });
    return data.results || [];
  } catch {
    return [];
  }
};

export const getMovieDetails = async (id: number): Promise<TMDbMovieDetail> => {
  return fetchTMDb<TMDbMovieDetail>(`/movie/${id}`, {
    append_to_response: 'credits',
  });
};

export const getTvDetails = async (id: number): Promise<TMDbTvDetail> => {
  return fetchTMDb<TMDbTvDetail>(`/tv/${id}`, {
    append_to_response: 'credits',
  });
};

export const getTrendingAll = async (): Promise<{ movies: TMDbMovieSummary[]; tvShows: TMDbTvSummary[] }> => {
  try {
    const [movieRes, tvRes] = await Promise.all([
      fetchTMDb<{ results: TMDbMovieSummary[] }>('/trending/movie/week'),
      fetchTMDb<{ results: TMDbTvSummary[] }>('/trending/tv/week'),
    ]);
    return {
      movies: movieRes.results || [],
      tvShows: tvRes.results || [],
    };
  } catch {
    return { movies: [], tvShows: [] };
  }
};

export const getImageUrl = (path: string | null, size: 'w500' | 'original' = 'w500') => {
  if (!path) return 'https://placehold.co/400x600/1e293b/FFF?text=No+Image';
  return size === 'original' ? `${IMAGE_ORIGINAL_URL}${path}` : `${IMAGE_BASE_URL}${path}`;
};

export const getTMDbUrl = (type: 'movie' | 'tv', id: number) => {
  return `https://www.themoviedb.org/${type}/${id}`;
};