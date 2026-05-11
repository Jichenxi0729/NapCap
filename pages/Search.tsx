import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchMulti, getImageUrl, getTrendingAll } from '../services/tmdbService';
import { TMDbMovieSummary, TMDbTvSummary, MediaType } from '../types';
import { getItemsByTmdbId } from '../services/storageService';
import { Icons } from '../components/Icon';

function SearchPage() {
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState<TMDbMovieSummary[]>([]);
  const [tvShows, setTvShows] = useState<TMDbTvSummary[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<TMDbMovieSummary[]>([]);
  const [trendingTv, setTrendingTv] = useState<TMDbTvSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const navigate = useNavigate();

  const [manualTitle, setManualTitle] = useState('');
  const [manualType, setManualType] = useState<MediaType>('short_drama');

  useEffect(() => {
    getTrendingAll().then(({ movies, tvShows }) => {
      setTrendingMovies(movies);
      setTrendingTv(tvShows);
    }).catch(() => {});
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setIsLoading(true);
    setSearched(true);
    try {
      const { movies: m, tvShows: t } = await searchMulti(query);
      setMovies(m);
      setTvShows(t);
    } catch {
      setMovies([]);
      setTvShows([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (tmdbId: number, mediaType: MediaType, title: string, posterPath: string | null, backdropPath: string | null, releaseYear: string) => {
    navigate(`/media/new?tmdbId=${tmdbId}&type=${mediaType}&title=${encodeURIComponent(title)}&poster=${encodeURIComponent(posterPath || '')}&backdrop=${encodeURIComponent(backdropPath || '')}&year=${releaseYear}`);
  };

  const handleManualAdd = () => {
    if (!manualTitle.trim()) return;
    navigate(`/media/new?manual=true&title=${encodeURIComponent(manualTitle)}&type=${manualType}`);
  };

  const ResultCard = ({
    id, title, poster, year, vote, mediaType,
  }: {
    id: number; title: string; poster: string | null; year: string; vote: number; mediaType: MediaType;
  }) => {
    const existingItems = getItemsByTmdbId(id);
    const hasItems = existingItems.length > 0;
    return (
      <button
        onClick={() => handleSelect(id, mediaType, title, poster, null, year)}
        className="flex bg-surface rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-200 text-left w-full border border-divider/30"
      >
        <img src={getImageUrl(poster)} alt={title} className="w-20 h-28 object-cover flex-shrink-0 bg-surface-hover" />
        <div className="p-3 flex flex-col justify-between flex-1 min-w-0">
          <div>
            <h3 className="font-medium text-sm text-text-primary line-clamp-1">{title}</h3>
            <p className="text-xs text-text-tertiary mt-0.5">{year || 'N/A'}</p>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1 text-xs text-orange font-medium">
              <Icons.Star size={11} className="fill-orange text-orange" />
              {vote.toFixed(1)}
            </div>
            {hasItems && (
              <span className="text-[10px] text-green bg-green/10 px-1.5 py-0.5 rounded font-medium">
                已收录 {existingItems.length} 集
              </span>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">发现作品</h1>
        <p className="text-sm text-text-secondary">搜索电视剧、电影，或手动添加</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Icons.Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
          <input
            type="text"
            className="w-full h-11 bg-surface border border-divider/50 rounded-2xl pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition-all"
            placeholder="搜索作品名称..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="h-11 px-5 rounded-2xl bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-40 flex-shrink-0"
        >
          {isLoading ? '搜索中...' : '搜索'}
        </button>
      </form>

      {!showManual && (
        <button
          onClick={() => setShowManual(true)}
          className="w-full text-center text-sm text-text-secondary hover:text-accent transition-colors py-1"
        >
          或手动添加作品（无需TMDb匹配）
        </button>
      )}

      {showManual && (
        <div className="bg-surface rounded-2xl p-4 shadow-card border border-divider/30 space-y-3">
          <h3 className="font-medium text-sm text-text-primary">手动添加</h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="作品名称"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              className="flex-1 h-9 bg-bg border border-divider/50 rounded-xl px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/40"
            />
            <select
              value={manualType}
              onChange={(e) => setManualType(e.target.value as MediaType)}
              className="h-9 bg-bg border border-divider/50 rounded-xl px-3 text-sm text-text-primary focus:outline-none"
            >
              <option value="tv">电视剧</option>
              <option value="short_drama">短剧</option>
              <option value="movie">电影</option>
            </select>
            <button
              onClick={handleManualAdd}
              disabled={!manualTitle.trim()}
              className="h-9 px-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-40 flex-shrink-0"
            >
              添加
            </button>
          </div>
          <button onClick={() => setShowManual(false)} className="text-xs text-text-tertiary hover:text-text-secondary transition-colors">
            收起
          </button>
        </div>
      )}

      {searched && !isLoading && movies.length === 0 && tvShows.length === 0 && (
        <div className="text-center py-10">
          <p className="text-text-secondary text-sm">未找到 "{query}" 相关结果</p>
        </div>
      )}

      {tvShows.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Icons.Tv size={15} className="text-accent" />
            电视剧
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {tvShows.slice(0, 10).map(tv => (
              <ResultCard
                key={`tv-${tv.id}`}
                id={tv.id}
                title={tv.name}
                poster={tv.poster_path}
                year={tv.first_air_date ? tv.first_air_date.split('-')[0] : 'N/A'}
                vote={tv.vote_average}
                mediaType="tv"
              />
            ))}
          </div>
        </div>
      )}

      {movies.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Icons.Film size={15} className="text-purple" />
            电影
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {movies.slice(0, 10).map(movie => (
              <ResultCard
                key={`movie-${movie.id}`}
                id={movie.id}
                title={movie.title}
                poster={movie.poster_path}
                year={movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}
                vote={movie.vote_average}
                mediaType="movie"
              />
            ))}
          </div>
        </div>
      )}

      {!searched && (trendingMovies.length > 0 || trendingTv.length > 0) && (
        <>
          {trendingTv.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Icons.Tv size={15} className="text-accent" />
                热门电视剧
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {trendingTv.slice(0, 6).map(tv => (
                  <ResultCard
                    key={`trend-tv-${tv.id}`}
                    id={tv.id}
                    title={tv.name}
                    poster={tv.poster_path}
                    year={tv.first_air_date ? tv.first_air_date.split('-')[0] : 'N/A'}
                    vote={tv.vote_average}
                    mediaType="tv"
                  />
                ))}
              </div>
            </div>
          )}
          {trendingMovies.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Icons.Film size={15} className="text-purple" />
                热门电影
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {trendingMovies.slice(0, 6).map(movie => (
                  <ResultCard
                    key={`trend-movie-${movie.id}`}
                    id={movie.id}
                    title={movie.title}
                    poster={movie.poster_path}
                    year={movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}
                    vote={movie.vote_average}
                    mediaType="movie"
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SearchPage;