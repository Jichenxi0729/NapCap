import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getMovieDetails, getTvDetails, getImageUrl, getTMDbUrl, searchMovies, searchTvShows } from '../services/tmdbService';
import { getItemById, addToCollection, removeFromCollection } from '../services';
import { TMDbMovieDetail, TMDbTvDetail, SavedMedia, MediaType, TMDbMovieSummary, TMDbTvSummary } from '../types';
import { Icons } from '../components/Icon';
import StarRating from '../components/StarRating';

const TYPE_LABELS: Record<MediaType, string> = {
  movie: '电影',
  tv: '电视剧',
  short_drama: '短剧',
};

function MediaDetails() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const tmdbId = searchParams.get('tmdbId');
  const mediaTypeParam = searchParams.get('type') as MediaType | null;
  const titleParam = searchParams.get('title') || '';
  const posterParam = searchParams.get('poster') || '';
  const backdropParam = searchParams.get('backdrop') || '';
  const yearParam = searchParams.get('year') || '';
  const isManual = searchParams.get('manual') === 'true';

  const [tmdbMovie, setTmdbMovie] = useState<TMDbMovieDetail | null>(null);
  const [tmdbTv, setTmdbTv] = useState<TMDbTvDetail | null>(null);
  const [savedItem, setSavedItem] = useState<SavedMedia | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formEpisode, setFormEpisode] = useState('');
  const [formCharacter, setFormCharacter] = useState('');
  const [formIdentity, setFormIdentity] = useState('');
  const [formScene, setFormScene] = useState('');
  const [formAppearanceTime, setFormAppearanceTime] = useState('');
  const [formBehavior, setFormBehavior] = useState('');
  const [formOutfit, setFormOutfit] = useState('');
  const [formPosture, setFormPosture] = useState('');
  const [formGrade, setFormGrade] = useState('');
  const [formReview, setFormReview] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formFavorite, setFormFavorite] = useState(false);
  const [formMediaType, setFormMediaType] = useState<MediaType>('short_drama');
  const [formTitle, setFormTitle] = useState('');
  const [formPosterPath, setFormPosterPath] = useState('');
  const [formBackdropPath, setFormBackdropPath] = useState('');

  const [showTmdbUpdate, setShowTmdbUpdate] = useState(false);
  const [tmdbSearchQuery, setTmdbSearchQuery] = useState('');
  const [tmdbSearchResults, setTmdbSearchResults] = useState<{ movies: TMDbMovieSummary[]; tvShows: TMDbTvSummary[] }>({ movies: [], tvShows: [] });
  const [isSearchingTmdb, setIsSearchingTmdb] = useState(false);
  const [isUpdatingTmdb, setIsUpdatingTmdb] = useState(false);

  const mediaType: MediaType = savedItem?.mediaType || mediaTypeParam || formMediaType || 'short_drama';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (!isNew && id) {
          const item = await getItemById(id);
          if (item) {
            setSavedItem(item);
            setFormTitle(item.title);
            setFormEpisode(item.episodeNumber);
            setFormCharacter(item.characterName);
            setFormIdentity(item.identity);
            setFormScene(item.scene);
            setFormAppearanceTime(item.appearanceTime || '');
            setFormBehavior(item.behavior || '');
            setFormOutfit(item.outfit || '');
            setFormPosture(item.posture || '');
            setFormGrade(item.grade || '');
            setFormReview(item.userReview);
            setFormDate(item.watchedDate);
            setFormFavorite(item.favorite);
            setFormMediaType(item.mediaType);
            setFormPosterPath(item.posterPath || '');
            setFormBackdropPath(item.backdropPath || '');
          }
          const numId = item?.tmdbId || parseInt(id);
          if (numId && !isNaN(numId)) {
            try {
              const fetchAsTv = item?.mediaType !== 'movie';
              if (fetchAsTv) {
                const tv = await getTvDetails(numId);
                setTmdbTv(tv);
              } else {
                const movie = await getMovieDetails(numId);
                setTmdbMovie(movie);
              }
            } catch {
            }
          }
        } else if (isNew && tmdbId) {
          const numId = parseInt(tmdbId);
          if (mediaTypeParam === 'tv') {
            const tv = await getTvDetails(numId);
            setTmdbTv(tv);
          } else {
            const movie = await getMovieDetails(numId);
            setTmdbMovie(movie);
          }
        }
      } catch {
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isNew, tmdbId, mediaTypeParam]);

  const getDisplayTitle = () => {
    if (savedItem) return savedItem.title;
    if (tmdbMovie) return tmdbMovie.title;
    if (tmdbTv) return tmdbTv.name;
    if (titleParam) return decodeURIComponent(titleParam);
    return '未知作品';
  };

  const getDisplayPoster = () => {
    if (savedItem?.posterPath) return getImageUrl(savedItem.posterPath);
    if (tmdbMovie?.poster_path) return getImageUrl(tmdbMovie.poster_path);
    if (tmdbTv?.poster_path) return getImageUrl(tmdbTv.poster_path);
    if (posterParam) return getImageUrl(decodeURIComponent(posterParam));
    return getImageUrl(null);
  };

  const getDisplayBackdrop = () => {
    if (savedItem?.backdropPath) return getImageUrl(savedItem.backdropPath, 'original');
    if (tmdbMovie?.backdrop_path) return getImageUrl(tmdbMovie.backdrop_path, 'original');
    if (tmdbTv?.backdrop_path) return getImageUrl(tmdbTv.backdrop_path, 'original');
    if (backdropParam) return getImageUrl(decodeURIComponent(backdropParam), 'original');
    const posterUrl = getDisplayPoster();
    if (posterUrl && !posterUrl.includes('null')) return posterUrl;
    return null;
  };

  const getDisplayYear = () => {
    if (savedItem) return savedItem.releaseYear;
    if (tmdbMovie) return tmdbMovie.release_date ? tmdbMovie.release_date.split('-')[0] : '';
    if (tmdbTv) return tmdbTv.first_air_date ? tmdbTv.first_air_date.split('-')[0] : '';
    if (yearParam) return decodeURIComponent(yearParam);
    return '';
  };

  const getTmdbLink = () => {
    const tid = savedItem?.tmdbId || (tmdbId ? parseInt(tmdbId) : null);
    if (!tid || isManual) return null;
    const type = mediaType === 'movie' ? 'movie' : 'tv';
    return getTMDbUrl(type, tid);
  };

  const handleSave = () => {
    const baseData = {
      id: savedItem?.id || crypto.randomUUID(),
      tmdbId: savedItem?.tmdbId || (tmdbId ? parseInt(tmdbId) : 0),
      mediaType: formMediaType,
      title: formTitle || getDisplayTitle(),
      posterPath: formPosterPath || savedItem?.posterPath || (tmdbMovie?.poster_path || tmdbTv?.poster_path || (posterParam ? decodeURIComponent(posterParam) : null)),
      backdropPath: formBackdropPath || savedItem?.backdropPath || (tmdbMovie?.backdrop_path || tmdbTv?.backdrop_path || (backdropParam ? decodeURIComponent(backdropParam) : null)),
      releaseYear: getDisplayYear(),
      addedAt: savedItem?.addedAt || Date.now(),
      episodeNumber: formEpisode,
      characterName: formCharacter,
      identity: formIdentity,
      scene: formScene,
      appearanceTime: formAppearanceTime,
      behavior: formBehavior,
      outfit: formOutfit,
      posture: formPosture,
      grade: formGrade,
      userReview: formReview,
      watchedDate: formDate,
      favorite: formFavorite,
      genres: tmdbMovie?.genres.map(g => g.name) || tmdbTv?.genres.map(g => g.name) || [],
      overview: tmdbMovie?.overview || tmdbTv?.overview || '',
    };

    addToCollection(baseData);
    setSavedItem(baseData);
    setIsEditing(false);

    if (isNew && !savedItem) {
      navigate(`/media/${baseData.id}`, { replace: true });
    }
  };

  const handleDelete = () => {
    const itemId = savedItem?.id || id;
    if (itemId && window.confirm('确定要删除这条记录吗？')) {
      removeFromCollection(itemId);
      navigate('/');
    }
  };

  const handleTmdbSearch = async (query?: string) => {
    const searchQuery = query || tmdbSearchQuery;
    if (!searchQuery.trim()) return;
    setIsSearchingTmdb(true);
    try {
      const [movies, tvShows] = await Promise.all([
        searchMovies(searchQuery),
        searchTvShows(searchQuery),
      ]);
      setTmdbSearchResults({ movies, tvShows });
    } catch {
      setTmdbSearchResults({ movies: [], tvShows: [] });
    }
    setIsSearchingTmdb(false);
  };

  const handleSelectTmdbResult = async (result: TMDbMovieSummary | TMDbTvSummary, type: 'movie' | 'tv') => {
    if (!savedItem) return;
    setIsUpdatingTmdb(true);
    try {
      let details;
      if (type === 'tv') {
        details = await getTvDetails(result.id);
      } else {
        details = await getMovieDetails(result.id);
      }

      const updatedItem: SavedMedia = {
        ...savedItem,
        tmdbId: details.id,
        posterPath: details.poster_path,
        backdropPath: details.backdrop_path,
        releaseYear: 'release_date' in details
          ? (details.release_date ? details.release_date.split('-')[0] : '')
          : (details.first_air_date ? details.first_air_date.split('-')[0] : ''),
        overview: details.overview,
      };

      await addToCollection(updatedItem);
      setSavedItem(updatedItem);
      setShowTmdbUpdate(false);
      setTmdbSearchQuery('');
      setTmdbSearchResults({ movies: [], tvShows: [] });
    } catch {
      alert('更新失败，请重试');
    }
    setIsUpdatingTmdb(false);
  };

  const backdropUrl = getDisplayBackdrop();
  const tmdbLink = getTmdbLink();
  const posterUrl = getDisplayPoster();
  const usePosterAsBackdrop = backdropUrl && posterUrl && backdropUrl === posterUrl;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1a1c' }}>
        <div className="w-7 h-7 border-[2.5px] border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      {backdropUrl ? (
        <div className="relative w-full overflow-hidden" style={{ maxHeight: '50vh', aspectRatio: usePosterAsBackdrop ? '16/9' : undefined }}>
          <img
            src={backdropUrl}
            alt=""
            className={`w-full ${usePosterAsBackdrop ? 'h-full object-center' : 'h-auto'} object-cover`}
            style={usePosterAsBackdrop ? { objectPosition: 'center' } : undefined}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-bg/80" />
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-bg to-transparent" style={{ maskImage: 'linear-gradient(to top, black 0%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 100%)' }} />

          <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-black/25 backdrop-blur-sm flex items-center justify-center hover:bg-black/40 transition-colors active:scale-90"
            >
              <Icons.Back size={17} className="text-white" />
            </button>
            {savedItem && !isEditing && (
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    const searchTitle = savedItem?.title || tmdbMovie?.title || tmdbTv?.name || '';
                    setTmdbSearchQuery(searchTitle);
                    setShowTmdbUpdate(true);
                    if (searchTitle) {
                      handleTmdbSearch(searchTitle);
                    }
                  }}
                  className="w-9 h-9 rounded-full bg-black/25 backdrop-blur-sm flex items-center justify-center hover:bg-black/40 transition-colors active:scale-90"
                  title="更新 TMDB 信息"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                    <polyline points="21 3 21 9 15 9"/>
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setFormTitle(savedItem.title);
                    setFormEpisode(savedItem.episodeNumber);
                    setFormCharacter(savedItem.characterName);
                    setFormIdentity(savedItem.identity);
                    setFormScene(savedItem.scene);
                    setFormAppearanceTime(savedItem.appearanceTime || '');
                    setFormBehavior(savedItem.behavior || '');
                    setFormOutfit(savedItem.outfit || '');
                    setFormPosture(savedItem.posture || '');
                    setFormGrade(savedItem.grade || '');
                    setFormReview(savedItem.userReview);
                    setFormDate(savedItem.watchedDate);
                    setFormFavorite(savedItem.favorite);
                    setFormMediaType(savedItem.mediaType);
                    setFormPosterPath(savedItem.posterPath || '');
                    setFormBackdropPath(savedItem.backdropPath || '');
                    setIsEditing(true);
                  }}
                  className="w-9 h-9 rounded-full bg-black/25 backdrop-blur-sm flex items-center justify-center hover:bg-black/40 transition-colors active:scale-90"
                >
                  <Icons.Edit size={14} className="text-white" />
                </button>
                <button
                  onClick={handleDelete}
                  className="w-9 h-9 rounded-full bg-black/25 backdrop-blur-sm flex items-center justify-center hover:bg-red/40 transition-colors active:scale-90"
                >
                  <Icons.Trash size={14} className="text-white" />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-3 border-b border-divider/40 bg-surface relative z-20">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-bg transition-colors active:scale-95"
          >
            <Icons.Back size={16} className="text-text-secondary" />
          </button>
          {savedItem && !isEditing && (
            <div className="flex gap-1">
              <button
                onClick={() => {
                  const searchTitle = savedItem?.title || tmdbMovie?.title || tmdbTv?.name || '';
                  setTmdbSearchQuery(searchTitle);
                  setShowTmdbUpdate(true);
                  if (searchTitle) {
                    handleTmdbSearch(searchTitle);
                  }
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-bg transition-colors active:scale-95"
                title="更新 TMDB 信息"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                  <polyline points="21 3 21 9 15 9"/>
                </svg>
              </button>
              <button
                onClick={() => {
                  setFormTitle(savedItem.title);
                  setFormEpisode(savedItem.episodeNumber);
                  setFormCharacter(savedItem.characterName);
                  setFormIdentity(savedItem.identity);
                  setFormScene(savedItem.scene);
                  setFormAppearanceTime(savedItem.appearanceTime || '');
                  setFormBehavior(savedItem.behavior || '');
                  setFormOutfit(savedItem.outfit || '');
                  setFormPosture(savedItem.posture || '');
                  setFormGrade(savedItem.grade || '');
                  setFormReview(savedItem.userReview);
                  setFormDate(savedItem.watchedDate);
                  setFormFavorite(savedItem.favorite);
                  setFormMediaType(savedItem.mediaType);
                  setFormPosterPath(savedItem.posterPath || '');
                  setFormBackdropPath(savedItem.backdropPath || '');
                  setIsEditing(true);
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-bg transition-colors active:scale-95"
              >
                <Icons.Edit size={14} className="text-text-secondary" />
              </button>
              <button
                onClick={handleDelete}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red/10 text-text-secondary hover:text-red transition-colors active:scale-95"
              >
                <Icons.Trash size={14} />
              </button>
            </div>
          )}
          {(!savedItem || isEditing) && !isNew && (
            <div className="flex gap-1">
              {!isEditing && (
                <button
                  onClick={handleDelete}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red/10 text-text-secondary hover:text-red transition-colors active:scale-95"
                  title="删除记录"
                >
                  <Icons.Trash size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ====== 白色内容区域 ====== */}
      <div className="px-4 sm:px-6 pb-32 relative z-10 -mt-12 sm:-mt-16">
        <div className="flex gap-4 sm:gap-5 mb-6">
          <div className="flex-shrink-0">
            <div className="w-[100px] sm:w-[120px] aspect-[2/3] rounded-xl overflow-hidden bg-surface-hover">
              <img src={posterUrl} alt={getDisplayTitle()} className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-start gap-2 py-0.5">
            <h1 className="text-base sm:text-lg font-bold text-text-primary leading-snug">{getDisplayTitle()}</h1>
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-accent-light text-accent">
                {TYPE_LABELS[mediaType]}
              </span>
              {getDisplayYear() && (
                <span className="text-xs text-text-tertiary">{getDisplayYear()}</span>
              )}
              {tmdbLink && (
                <a
                  href={tmdbLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-text-tertiary hover:text-accent transition-colors"
                >
                  <Icons.ExternalLink size={10} />
                  TMDb
                </a>
              )}
            </div>

            {savedItem && !isEditing ? (
              <>
                {savedItem.episodeNumber && (
                  <div className="inline-flex self-start mt-1 px-4 py-1.5 rounded-lg bg-accent text-white">
                    <span className="text-[13px]">{savedItem.episodeNumber}</span>
                  </div>
                )}
                {(savedItem.characterName || savedItem.identity || savedItem.scene || savedItem.appearanceTime || savedItem.behavior || savedItem.outfit || savedItem.posture) && (
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {savedItem.characterName && (
                      <span className="inline-flex items-center px-4 py-1.5 rounded-lg bg-surface border border-divider/30 text-[12px] text-text-secondary truncate max-w-[140px]">
                        {savedItem.characterName}
                      </span>
                    )}
                    {savedItem.identity && (
                      <span className="inline-flex items-center px-4 py-1.5 rounded-lg bg-surface border border-divider/30 text-[12px] text-text-secondary truncate max-w-[140px]">
                        {savedItem.identity}
                      </span>
                    )}
                    {savedItem.appearanceTime && (
                      <span className="inline-flex items-center px-4 py-1.5 rounded-lg bg-surface border border-divider/30 text-[12px] text-text-secondary truncate max-w-[140px]">
                        {savedItem.appearanceTime}
                      </span>
                    )}
                    {savedItem.behavior && (
                      <span className="inline-flex items-center px-4 py-1.5 rounded-lg bg-surface border border-divider/30 text-[12px] text-text-secondary truncate max-w-[140px]">
                        {savedItem.behavior}
                      </span>
                    )}
                    {savedItem.outfit && (
                      <span className="inline-flex items-center px-4 py-1.5 rounded-lg bg-surface border border-divider/30 text-[12px] text-text-secondary truncate max-w-[140px]">
                        {savedItem.outfit}
                      </span>
                    )}
                    {savedItem.posture && (
                      <span className="inline-flex items-center px-4 py-1.5 rounded-lg bg-surface border border-divider/30 text-[12px] text-text-secondary truncate max-w-[140px]">
                        {savedItem.posture}
                      </span>
                    )}
                    {savedItem.scene && (
                      <span className="inline-flex self-start px-4 py-1.5 rounded-lg bg-surface border border-divider/30 text-[12px] text-text-secondary">
                        {savedItem.scene}
                      </span>
                    )}
                  </div>
                )}
                {(savedItem.watchedDate || savedItem.favorite || savedItem.grade) && (
                  <div className="flex items-center gap-3 mt-2 text-xs text-text-tertiary">
                    {savedItem.grade && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md font-bold text-accent bg-accent/10">
                        {savedItem.grade}
                      </span>
                    )}
                    {savedItem.watchedDate && (
                      <span className="flex items-center gap-1">
                        <Icons.Calendar size={11} />
                        {savedItem.watchedDate}
                      </span>
                    )}
                    {savedItem.favorite && (
                      <Icons.Heart size={13} className="fill-red text-red" />
                    )}
                  </div>
                )}
              </>
            ) : (
              !isNew && !savedItem && (
                <div className="mt-4 p-4 rounded-xl bg-yellow/5 border border-yellow/20 text-center">
                  <p className="text-sm text-text-secondary mb-3">⚠️ 数据加载异常</p>
                  <p className="text-xs text-text-tertiary mb-4">此记录可能已损坏或不存在</p>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent/90 transition-colors"
                    >
                      刷新页面
                    </button>
                    <button
                      onClick={handleDelete}
                      className="px-4 py-2 rounded-lg bg-red/10 text-red text-sm hover:bg-red/20 transition-colors"
                    >
                      删除此记录
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="bg-surface rounded-2xl p-5 space-y-4 shadow-panel border border-divider/30">
            <h3 className="text-sm font-semibold text-text-primary">编辑记录</h3>

            <div>
              <label className="block text-[11px] text-text-secondary mb-1.5">作品名称</label>
              <input
                type="text"
                placeholder="作品名称"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full h-9 bg-bg border border-divider/40 rounded-xl px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-text-secondary mb-1.5">封面图片URL</label>
                <input
                  type="text"
                  placeholder="海报图片链接"
                  value={formPosterPath}
                  onChange={(e) => setFormPosterPath(e.target.value)}
                  className="w-full h-9 bg-bg border border-divider/40 rounded-xl px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/40"
                />
              </div>
              <div>
                <label className="block text-[11px] text-text-secondary mb-1.5">背景图片URL</label>
                <input
                  type="text"
                  placeholder="背景图片链接"
                  value={formBackdropPath}
                  onChange={(e) => setFormBackdropPath(e.target.value)}
                  className="w-full h-9 bg-bg border border-divider/40 rounded-xl px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-text-secondary mb-1.5">类型</label>
                <select
                  value={formMediaType}
                  onChange={(e) => setFormMediaType(e.target.value as MediaType)}
                  className="w-full h-9 bg-bg border border-divider/40 rounded-xl px-3 text-sm text-text-primary focus:outline-none focus:border-accent/40 appearance-none"
                >
                  <option value="tv">电视剧</option>
                  <option value="short_drama">短剧</option>
                  <option value="movie">电影</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-text-secondary mb-1.5">集数</label>
                <input
                  type="text"
                  placeholder="如：E03"
                  value={formEpisode}
                  onChange={(e) => setFormEpisode(e.target.value)}
                  className="w-full h-9 bg-bg border border-divider/40 rounded-xl px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/40"
                />
              </div>
              <div>
                <label className="block text-[11px] text-text-secondary mb-1.5">角色名</label>
                <input
                  type="text"
                  placeholder="角色名称"
                  value={formCharacter}
                  onChange={(e) => setFormCharacter(e.target.value)}
                  className="w-full h-9 bg-bg border border-divider/40 rounded-xl px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/40"
                />
              </div>
              <div>
                <label className="block text-[11px] text-text-secondary mb-1.5">身份</label>
                <input
                  type="text"
                  placeholder="如：医生"
                  value={formIdentity}
                  onChange={(e) => setFormIdentity(e.target.value)}
                  className="w-full h-9 bg-bg border border-divider/40 rounded-xl px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/40"
                />
              </div>
              <div>
                <label className="block text-[11px] text-text-secondary mb-1.5">出场时间</label>
                <input
                  type="text"
                  placeholder="如：第10分钟"
                  value={formAppearanceTime}
                  onChange={(e) => setFormAppearanceTime(e.target.value)}
                  className="w-full h-9 bg-bg border border-divider/40 rounded-xl px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/40"
                />
              </div>
              <div>
                <label className="block text-[11px] text-text-secondary mb-1.5">行为</label>
                <input
                  type="text"
                  placeholder="如：哭泣、奔跑"
                  value={formBehavior}
                  onChange={(e) => setFormBehavior(e.target.value)}
                  className="w-full h-9 bg-bg border border-divider/40 rounded-xl px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/40"
                />
              </div>
              <div>
                <label className="block text-[11px] text-text-secondary mb-1.5">穿搭</label>
                <input
                  type="text"
                  placeholder="如：白衬衫"
                  value={formOutfit}
                  onChange={(e) => setFormOutfit(e.target.value)}
                  className="w-full h-9 bg-bg border border-divider/40 rounded-xl px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/40"
                />
              </div>
              <div>
                <label className="block text-[11px] text-text-secondary mb-1.5">姿势</label>
                <input
                  type="text"
                  placeholder="如：跪坐、倚靠"
                  value={formPosture}
                  onChange={(e) => setFormPosture(e.target.value)}
                  className="w-full h-9 bg-bg border border-divider/40 rounded-xl px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/40"
                />
              </div>
              <div>
                <label className="block text-[11px] text-text-secondary mb-1.5">场景</label>
                <input
                  type="text"
                  placeholder="关键词..."
                  value={formScene}
                  onChange={(e) => setFormScene(e.target.value)}
                  className="w-full h-9 bg-bg border border-divider/40 rounded-xl px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-text-secondary mb-1.5">评级</label>
                <select
                  value={formGrade}
                  onChange={(e) => setFormGrade(e.target.value)}
                  className="w-full h-9 bg-bg border border-divider/40 rounded-xl px-3 text-sm text-text-primary focus:outline-none focus:border-accent/40 appearance-none"
                >
                  <option value="">选择评级</option>
                  <option value="S+">S+</option>
                  <option value="S">S</option>
                  <option value="A+">A+</option>
                  <option value="A">A</option>
                  <option value="B+">B+</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-text-secondary mb-1.5">观看日期</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full h-9 bg-bg border border-divider/40 rounded-xl px-3 text-sm text-text-primary focus:outline-none focus:border-accent/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-text-secondary mb-1.5">笔记</label>
              <textarea
                rows={2}
                placeholder="个人笔记..."
                value={formReview}
                onChange={(e) => setFormReview(e.target.value)}
                className="w-full bg-bg border border-divider/40 rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/40 resize-none"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formFavorite}
                onChange={(e) => setFormFavorite(e.target.checked)}
                className="w-4 h-4 rounded border-divider text-accent focus:ring-accent"
              />
              <span className="text-sm text-text-secondary">标记为收藏</span>
            </label>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setIsEditing(false)}
                className="h-9 px-4 rounded-xl bg-bg hover:bg-surface-hover text-text-secondary text-sm font-medium border border-divider/60 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="h-9 px-5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors shadow-sm"
              >
                保存
              </button>
            </div>
          </div>
        ) : savedItem ? (
          <div className="space-y-3">
            {savedItem.userReview && (
              <div className="bg-surface rounded-2xl p-5 shadow-card border border-divider/20">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-2 font-medium">笔记</p>
                <p className="text-sm text-text-secondary leading-relaxed italic">"{savedItem.userReview}"</p>
              </div>
            )}

            {(savedItem?.overview || tmdbMovie?.overview || tmdbTv?.overview) && (
              <div className="bg-surface rounded-2xl p-5 shadow-card border border-divider/20">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-2 font-medium">剧情简介</p>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {savedItem?.overview || tmdbMovie?.overview || tmdbTv?.overview}
                </p>
                {(tmdbMovie?.tagline || tmdbTv?.tagline) && (
                  <p className="text-xs text-accent italic mt-2">
                    "{(tmdbMovie?.tagline || tmdbTv?.tagline)}"
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-surface rounded-2xl p-5 space-y-4 shadow-panel border border-divider/30">
            <p className="text-sm text-text-secondary text-center">填写信息以添加到收藏：</p>

            <div>
              <label className="block text-[11px] text-text-secondary mb-1.5">作品名称</label>
              <input
                type="text"
                placeholder="作品名称"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full h-9 bg-bg border border-divider/40 rounded-xl px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-text-secondary mb-1.5">类型</label>
                <select
                  value={formMediaType}
                  onChange={(e) => setFormMediaType(e.target.value as MediaType)}
                  className="w-full h-9 bg-bg border border-divider/40 rounded-xl px-3 text-sm text-text-primary focus:outline-none focus:border-accent/40 appearance-none"
                >
                  <option value="tv">电视剧</option>
                  <option value="short_drama">短剧</option>
                  <option value="movie">电影</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-text-secondary mb-1.5">集数</label>
                <input
                  type="text"
                  placeholder="如：E03"
                  value={formEpisode}
                  onChange={(e) => setFormEpisode(e.target.value)}
                  className="w-full h-9 bg-bg border border-divider/40 rounded-xl px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/40"
                />
              </div>
              <div>
                <label className="block text-[11px] text-text-secondary mb-1.5">角色名</label>
                <input
                  type="text"
                  placeholder="角色名称"
                  value={formCharacter}
                  onChange={(e) => setFormCharacter(e.target.value)}
                  className="w-full h-9 bg-bg border border-divider/40 rounded-xl px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/40"
                />
              </div>
              <div>
                <label className="block text-[11px] text-text-secondary mb-1.5">身份</label>
                <input
                  type="text"
                  placeholder="如：医生"
                  value={formIdentity}
                  onChange={(e) => setFormIdentity(e.target.value)}
                  className="w-full h-9 bg-bg border border-divider/40 rounded-xl px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/40"
                />
              </div>
              <div>
                <label className="block text-[11px] text-text-secondary mb-1.5">出场时间</label>
                <input
                  type="text"
                  placeholder="如：第10分钟"
                  value={formAppearanceTime}
                  onChange={(e) => setFormAppearanceTime(e.target.value)}
                  className="w-full h-9 bg-bg border border-divider/40 rounded-xl px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/40"
                />
              </div>
              <div>
                <label className="block text-[11px] text-text-secondary mb-1.5">行为</label>
                <input
                  type="text"
                  placeholder="如：哭泣、奔跑"
                  value={formBehavior}
                  onChange={(e) => setFormBehavior(e.target.value)}
                  className="w-full h-9 bg-bg border border-divider/40 rounded-xl px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/40"
                />
              </div>
              <div>
                <label className="block text-[11px] text-text-secondary mb-1.5">穿搭</label>
                <input
                  type="text"
                  placeholder="如：白衬衫"
                  value={formOutfit}
                  onChange={(e) => setFormOutfit(e.target.value)}
                  className="w-full h-9 bg-bg border border-divider/40 rounded-xl px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/40"
                />
              </div>
              <div>
                <label className="block text-[11px] text-text-secondary mb-1.5">姿势</label>
                <input
                  type="text"
                  placeholder="如：跪坐、倚靠"
                  value={formPosture}
                  onChange={(e) => setFormPosture(e.target.value)}
                  className="w-full h-9 bg-bg border border-divider/40 rounded-xl px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/40"
                />
              </div>
              <div>
                <label className="block text-[11px] text-text-secondary mb-1.5">场景</label>
                <input
                  type="text"
                  placeholder="关键词..."
                  value={formScene}
                  onChange={(e) => setFormScene(e.target.value)}
                  className="w-full h-9 bg-bg border border-divider/40 rounded-xl px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/40"
                />
              </div>
            </div>
            <div className="flex justify-center pt-1">
              <button
                onClick={handleSave}
                className="h-10 px-7 rounded-full bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors shadow-sm"
              >
                添加到收藏
              </button>
            </div>
          </div>
        )}
      </div>

      {showTmdbUpdate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowTmdbUpdate(false)}>
          <div className="bg-surface rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-divider/40">
              <h2 className="text-base font-bold text-text-primary">更新 TMDB 信息</h2>
              <button
                onClick={() => setShowTmdbUpdate(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-bg transition-colors"
              >
                <Icons.Close size={16} className="text-text-secondary" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <p className="text-xs text-text-secondary mb-2">
                  搜索并选择正确的作品，将更新：海报、背景图、简介、类型等信息
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="输入作品名称搜索..."
                    value={tmdbSearchQuery}
                    onChange={(e) => setTmdbSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTmdbSearch()}
                    className="flex-1 h-10 bg-bg border border-divider/40 rounded-xl px-3.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/40"
                  />
                  <button
                    onClick={handleTmdbSearch}
                    disabled={isSearchingTmdb || !tmdbSearchQuery.trim()}
                    className="h-10 px-5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSearchingTmdb ? '搜索中...' : '搜索'}
                  </button>
                </div>
              </div>

              {tmdbSearchResults.movies.length > 0 && tmdbSearchResults.tvShows.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-text-secondary mb-2">电视剧 ({tmdbSearchResults.tvShows.length})</p>
                  <div className="space-y-2 mb-4">
                    {tmdbSearchResults.tvShows.map((tv) => (
                      <button
                        key={`tv-${tv.id}`}
                        onClick={() => handleSelectTmdbResult(tv, 'tv')}
                        disabled={isUpdatingTmdb}
                        className="w-full flex gap-3 p-2.5 rounded-xl bg-bg hover:bg-accent/5 transition-colors text-left disabled:opacity-50"
                      >
                        <img
                          src={getImageUrl(tv.poster_path)}
                          alt={tv.name}
                          className="w-10 h-[60px] object-cover rounded-lg flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{tv.name}</p>
                          {tv.first_air_date && (
                            <p className="text-[11px] text-text-tertiary mt-0.5">{tv.first_air_date.split('-')[0]}</p>
                          )}
                        </div>
                        <span className="self-center text-[10px] font-medium bg-green-light text-green px-2 py-0.5 rounded-md">电视剧</span>
                      </button>
                    ))}
                  </div>

                  <p className="text-xs font-medium text-text-secondary mb-2">电影 ({tmdbSearchResults.movies.length})</p>
                  <div className="space-y-2">
                    {tmdbSearchResults.movies.map((movie) => (
                      <button
                        key={`movie-${movie.id}`}
                        onClick={() => handleSelectTmdbResult(movie, 'movie')}
                        disabled={isUpdatingTmdb}
                        className="w-full flex gap-3 p-2.5 rounded-xl bg-bg hover:bg-accent/5 transition-colors text-left disabled:opacity-50"
                      >
                        <img
                          src={getImageUrl(movie.poster_path)}
                          alt={movie.title}
                          className="w-10 h-[60px] object-cover rounded-lg flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{movie.title}</p>
                          {movie.release_date && (
                            <p className="text-[11px] text-text-tertiary mt-0.5">{movie.release_date.split('-')[0]}</p>
                          )}
                        </div>
                        <span className="self-center text-[10px] font-medium bg-blue-light text-blue px-2 py-0.5 rounded-md">电影</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tmdbSearchResults.tvShows.length > 0 && tmdbSearchResults.movies.length === 0 && (
                <div>
                  <p className="text-xs font-medium text-text-secondary mb-2">电视剧 ({tmdbSearchResults.tvShows.length})</p>
                  <div className="space-y-2">
                    {tmdbSearchResults.tvShows.map((tv) => (
                      <button
                        key={`tv-${tv.id}`}
                        onClick={() => handleSelectTmdbResult(tv, 'tv')}
                        disabled={isUpdatingTmdb}
                        className="w-full flex gap-3 p-2.5 rounded-xl bg-bg hover:bg-accent/5 transition-colors text-left disabled:opacity-50"
                      >
                        <img
                          src={getImageUrl(tv.poster_path)}
                          alt={tv.name}
                          className="w-10 h-[60px] object-cover rounded-lg flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{tv.name}</p>
                          {tv.first_air_date && (
                            <p className="text-[11px] text-text-tertiary mt-0.5">{tv.first_air_date.split('-')[0]}</p>
                          )}
                        </div>
                        <span className="self-center text-[10px] font-medium bg-green-light text-green px-2 py-0.5 rounded-md">电视剧</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tmdbSearchResults.movies.length > 0 && tmdbSearchResults.tvShows.length === 0 && (
                <div>
                  <p className="text-xs font-medium text-text-secondary mb-2">电影 ({tmdbSearchResults.movies.length})</p>
                  <div className="space-y-2">
                    {tmdbSearchResults.movies.map((movie) => (
                      <button
                        key={`movie-${movie.id}`}
                        onClick={() => handleSelectTmdbResult(movie, 'movie')}
                        disabled={isUpdatingTmdb}
                        className="w-full flex gap-3 p-2.5 rounded-xl bg-bg hover:bg-accent/5 transition-colors text-left disabled:opacity-50"
                      >
                        <img
                          src={getImageUrl(movie.poster_path)}
                          alt={movie.title}
                          className="w-10 h-[60px] object-cover rounded-lg flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{movie.title}</p>
                          {movie.release_date && (
                            <p className="text-[11px] text-text-tertiary mt-0.5">{movie.release_date.split('-')[0]}</p>
                          )}
                        </div>
                        <span className="self-center text-[10px] font-medium bg-blue-light text-blue px-2 py-0.5 rounded-md">电影</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tmdbSearchResults.movies.length === 0 && tmdbSearchResults.tvShows.length === 0 && !isSearchingTmdb && tmdbSearchQuery && (
                <div className="text-center py-8">
                  <Icons.Search size={32} className="mx-auto text-text-tertiary mb-2" />
                  <p className="text-sm text-text-secondary">未找到匹配结果</p>
                  <p className="text-xs text-text-tertiary mt-1">尝试使用其他关键词搜索</p>
                </div>
              )}

              {isUpdatingTmdb && (
                <div className="flex items-center justify-center py-6 gap-2">
                  <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-text-secondary">正在更新信息...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MediaDetails;