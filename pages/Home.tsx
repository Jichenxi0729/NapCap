import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SavedMedia, MediaType } from '../types';
import { getCollection, getCachedCollection } from '../services';
import { getImageUrl } from '../services/tmdbService';
import { Icons } from '../components/Icon';
import { useSearchContext } from '../components/Layout';
import * as eventBus from '../services/eventBus';
import { usePagination } from '../hooks/usePagination';

type ViewType = 'list' | 'grid' | 'gallery';

const TYPE_LABELS: Record<MediaType, string> = {
  movie: '电影',
  tv: '电视剧',
  short_drama: '短剧',
};

function Home() {
  const [items, setItems] = useState<SavedMedia[]>(() => getCachedCollection());
  const [typeFilter, setTypeFilter] = useState<MediaType | 'all'>(() => {
    return (localStorage.getItem('homeTypeFilter') as MediaType | 'all') || 'all';
  });
  const [gridColumns, setGridColumns] = useState(() => {
    const saved = localStorage.getItem('gridColumns');
    return saved ? parseInt(saved) : 2;
  });
  const [viewType, setViewType] = useState<ViewType>(() => {
    const saved = localStorage.getItem('viewType');
    return (saved as ViewType) || 'grid';
  });
  const [showFilter, setShowFilter] = useState(false);
  const [filterYear, setFilterYear] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('homeFilterYear') || '[]');
    } catch { return []; }
  });
  const [filterGenres, setFilterGenres] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('homeFilterGenres') || '[]');
    } catch { return []; }
  });
  const [filterGrade, setFilterGrade] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('homeFilterGrade') || '[]');
    } catch { return []; }
  });
  const { filterText, sortBy } = useSearchContext();
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('viewType', viewType);
  }, [viewType]);

  useEffect(() => {
    localStorage.setItem('homeTypeFilter', typeFilter);
  }, [typeFilter]);

  useEffect(() => {
    localStorage.setItem('homeFilterYear', JSON.stringify(filterYear));
  }, [filterYear]);

  useEffect(() => {
    localStorage.setItem('homeFilterGenres', JSON.stringify(filterGenres));
  }, [filterGenres]);

  useEffect(() => {
    localStorage.setItem('homeFilterGrade', JSON.stringify(filterGrade));
  }, [filterGrade]);

  useEffect(() => {
    const loadItems = async () => {
      const collection = await getCollection();
      setItems(collection);
    };
    loadItems();
  }, []);

  useEffect(() => {
    const unsubscribe = eventBus.subscribe(() => {
      setItems(getCachedCollection());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('homeTypeFilter');
    if (saved) setTypeFilter(saved as MediaType | 'all');
    const handler = () => {
      const updated = localStorage.getItem('homeTypeFilter');
      if (updated) setTypeFilter(updated as MediaType | 'all');
    };
    window.addEventListener('homeTypeFilterChange', handler);
    return () => window.removeEventListener('homeTypeFilterChange', handler);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('gridColumns');
    if (saved) setGridColumns(parseInt(saved));
    const handler = () => {
      const updated = localStorage.getItem('gridColumns');
      if (updated) setGridColumns(parseInt(updated));
    };
    window.addEventListener('gridColumnsChange', handler);
    return () => window.removeEventListener('gridColumnsChange', handler);
  }, []);

  useEffect(() => {
    const handler = () => {
      const updated = localStorage.getItem('viewType');
      if (updated) setViewType(updated as ViewType);
    };
    window.addEventListener('viewTypeChange', handler);
    return () => window.removeEventListener('viewTypeChange', handler);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('homeScrollPos');
    if (saved) {
      requestAnimationFrame(() => {
        window.scrollTo(0, parseInt(saved));
      });
    }
    return () => {
      localStorage.setItem('homeScrollPos', String(window.scrollY));
    };
  }, []);

  const gradeOrder: Record<string, number> = { 'S+': 7, 'S': 6, 'A+': 5, 'A': 4, 'B+': 3, 'B': 2, 'C': 1 };

  const allYears = [...new Set(items.map(i => i.releaseYear).filter(y => y && y !== 'N/A'))].sort().reverse();
  const allGenres = [...new Set(items.flatMap(i => i.genres || []).filter(Boolean))].sort();
  const allGrades = Object.keys(gradeOrder).filter(g => items.some(i => i.grade === g));

  const activeFilterCount = (filterYear.length > 0 ? 1 : 0) + (filterGenres.length > 0 ? 1 : 0) + (filterGrade.length > 0 ? 1 : 0);

  const filteredItems = items
    .filter(item => {
      if (typeFilter !== 'all' && item.mediaType !== typeFilter) return false;
      if (filterText && !item.title.toLowerCase().includes(filterText.toLowerCase())) return false;
      if (filterYear.length > 0 && !filterYear.includes(item.releaseYear)) return false;
      if (filterGenres.length > 0) {
        const itemGenres = item.genres || [];
        if (!filterGenres.some(g => itemGenres.includes(g))) return false;
      }
      if (filterGrade.length > 0 && !filterGrade.includes(item.grade)) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating': return (gradeOrder[b.grade] || 0) - (gradeOrder[a.grade] || 0);
        case 'year': return b.releaseYear.localeCompare(a.releaseYear);
        case 'title': return a.title.localeCompare(b.title);
        case 'episode': return a.episodeNumber.localeCompare(b.episodeNumber, undefined, { numeric: true });
        default: return b.addedAt - a.addedAt;
      }
    });

  const {
    pageData,
    hasNextPage,
    totalPages,
    currentPage,
    totalItems: paginatedTotal,
    reset: resetPagination,
    loadMoreRef,
    goNext,
  } = usePagination<SavedMedia>({ data: filteredItems, pageSize: 24 });

  useEffect(() => {
    resetPagination();
  }, [typeFilter, filterText, sortBy, filterYear, filterGenres]);

  const counts = {
    all: items.length,
    movie: items.filter(i => i.mediaType === 'movie').length,
    tv: items.filter(i => i.mediaType === 'tv').length,
    short_drama: items.filter(i => i.mediaType === 'short_drama').length,
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-5 px-5">
        <div className="w-16 h-16 rounded-2xl bg-surface shadow-card flex items-center justify-center">
          <Icons.ListVideo size={28} className="text-text-tertiary" />
        </div>
        <div className="max-w-xs space-y-1.5">
          <h2 className="text-lg font-semibold text-text-primary">收藏列表为空</h2>
          <p className="text-text-secondary text-sm leading-relaxed">
            搜索电视剧、短剧或电影，记录你喜欢的每一集。
          </p>
        </div>
        <div className="flex gap-3 mt-1">
          <Link to="/search">
            <button className="inline-flex items-center gap-2 h-10 px-6 rounded-full bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-all shadow-sm active:scale-95">
              <Icons.Search size={16} />
              发现作品
            </button>
          </Link>
          <Link to="/import">
            <button className="inline-flex items-center gap-2 h-10 px-6 rounded-full bg-surface hover:bg-surface-hover text-text-primary text-sm font-medium border border-divider transition-all shadow-sm active:scale-95">
              <Icons.Upload size={16} />
              导入CSV
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1.5 flex-wrap">
        {(['all', 'tv', 'short_drama', 'movie'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              typeFilter === t
                ? 'bg-accent text-white shadow-sm'
                : 'bg-surface text-text-secondary hover:text-text-primary'
            }`}
          >
            {t === 'all' ? `全部` : TYPE_LABELS[t]}
            <span className={`ml-1 ${typeFilter === t ? 'text-white/70' : 'text-text-tertiary'}`}>{counts[t]}</span>
          </button>
        ))}

        <button
          onClick={() => {
            const candidate = filteredItems.length > 0 ? filteredItems : items;
            if (candidate.length === 0) return;
            const randomItem = candidate[Math.floor(Math.random() * candidate.length)];
            navigate(`/media/${randomItem.id}`);
          }}
          className="ml-auto p-2 rounded-full bg-surface hover:bg-surface-hover text-text-secondary hover:text-accent transition-colors active:scale-90"
          title="随机预览"
        >
          <Icons.Shuffle size={15} />
        </button>

        <button
          onClick={() => setShowFilter(!showFilter)}
          className={`relative p-2 rounded-full transition-colors active:scale-90 ${
            showFilter || activeFilterCount > 0
              ? 'bg-accent text-white'
              : 'bg-surface hover:bg-surface-hover text-text-secondary hover:text-accent'
          }`}
          title="筛选"
        >
          <Icons.Filter size={15} />
          {activeFilterCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red text-white text-[9px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-0.5 ml-2 p-0.5 bg-surface rounded-lg">
          <button
            onClick={() => setViewType('list')}
            className={`p-1.5 rounded-md transition-all ${
              viewType === 'list'
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
            title="列表视图"
          >
            <Icons.ListVideo size={14} />
          </button>
          <button
            onClick={() => setViewType('grid')}
            className={`p-1.5 rounded-md transition-all ${
              viewType === 'grid'
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
            title="网格视图"
          >
            <Icons.Image size={14} />
          </button>
          <button
            onClick={() => setViewType('gallery')}
            className={`p-1.5 rounded-md transition-all ${
              viewType === 'gallery'
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
            title="画廊视图"
          >
            <Icons.Film size={14} />
          </button>
        </div>
      </div>

      {showFilter && (
        <div className="bg-surface rounded-2xl p-4 space-y-4 shadow-card border border-divider/20">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">筛选条件</h3>
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setFilterYear([]); setFilterGenres([]); setFilterGrade([]); }}
                className="text-xs text-accent hover:text-accent-hover transition-colors"
              >
                恢复默认
              </button>
            )}
          </div>

          {allYears.length > 0 && (
            <div>
              <p className="text-[11px] text-text-tertiary mb-2">年份</p>
              <div className="flex flex-wrap gap-1.5">
                {allYears.map(year => (
                  <button
                    key={year}
                    onClick={() => {
                      setFilterYear(prev =>
                        prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
                      );
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                      filterYear.includes(year)
                        ? 'bg-accent text-white'
                        : 'bg-bg text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          )}

          {allGenres.length > 0 && (
            <div>
              <p className="text-[11px] text-text-tertiary mb-2">类型</p>
              <div className="flex flex-wrap gap-1.5">
                {allGenres.map(genre => (
                  <button
                    key={genre}
                    onClick={() => {
                      setFilterGenres(prev =>
                        prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
                      );
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                      filterGenres.includes(genre)
                        ? 'bg-accent text-white'
                        : 'bg-bg text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          )}

          {allGrades.length > 0 && (
            <div>
              <p className="text-[11px] text-text-tertiary mb-2">等级</p>
              <div className="flex flex-wrap gap-1.5">
                {allGrades.map(grade => (
                  <button
                    key={grade}
                    onClick={() => {
                      setFilterGrade(prev =>
                        prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]
                      );
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      filterGrade.includes(grade)
                        ? 'bg-accent text-white'
                        : 'bg-bg text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {grade}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-divider/20">
            <span className="text-xs text-text-tertiary">
              共 {filteredItems.length} 条结果
            </span>
            <button
              onClick={() => setShowFilter(false)}
              className="h-8 px-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-colors"
            >
              完成
            </button>
          </div>
        </div>
      )}

      {filteredItems.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-text-secondary text-sm">没有匹配的记录</p>
        </div>
      ) : (
        <>
          {viewType === 'list' && (
            <div className={`grid gap-2 ${
              gridColumns === 1 ? 'grid-cols-1' :
              gridColumns === 2 ? 'grid-cols-2' :
              gridColumns === 3 ? 'grid-cols-3' :
              gridColumns === 4 ? 'grid-cols-4' :
              gridColumns === 5 ? 'grid-cols-5' :
              'grid-cols-6'
            }`}>
              {pageData.map(item => (
                <Link
                  key={item.id}
                  to={`/media/${item.id}`}
                  className="group flex items-center gap-3 p-3 rounded-xl bg-surface hover:bg-surface-hover transition-colors"
                >
                  <div className="w-12 h-16 flex-shrink-0 overflow-hidden rounded-lg bg-surface-hover">
                    <img
                      src={getImageUrl(item.posterPath)}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm text-text-primary truncate" title={item.title}>
                        {item.title}
                      </h3>
                      {item.favorite && (
                        <Icons.Heart size={12} className="fill-red text-red flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-accent/10 text-accent">
                        {TYPE_LABELS[item.mediaType]}
                      </span>
                      {item.episodeNumber && (
                        <span className="text-text-tertiary">
                          {item.episodeNumber.includes('E') || item.episodeNumber.includes('第')
                            ? item.episodeNumber
                            : `第${item.episodeNumber}集`}
                        </span>
                      )}
                      {item.releaseYear && item.releaseYear !== 'N/A' && (
                        <span className="text-text-tertiary">{item.releaseYear}</span>
                      )}
                      {item.grade && (
                        <span className="text-[10px] font-bold text-accent">{item.grade}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {viewType === 'grid' && (
            <div className={`grid gap-x-2 sm:gap-x-3 gap-y-4 sm:gap-y-5 ${
              gridColumns === 1 ? 'grid-cols-1' :
              gridColumns === 2 ? 'grid-cols-2' :
              gridColumns === 3 ? 'grid-cols-3' :
              gridColumns === 4 ? 'grid-cols-4' :
              gridColumns === 5 ? 'grid-cols-5' :
              'grid-cols-6'
            }`}>
              {pageData.map(item => {
                return (
                  <Link
                    key={item.id}
                    to={`/media/${item.id}`}
                    className="group block"
                  >
                    <div className="aspect-[2/3] w-full overflow-hidden relative bg-surface-hover rounded-2xl shadow-card">
                      <img
                        src={getImageUrl(item.posterPath)}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent rounded-b-2xl" />
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/20 backdrop-blur-sm text-white">
                          {TYPE_LABELS[item.mediaType]}
                        </span>
                        {item.grade && (
                          <span className="text-[11px] font-bold text-accent bg-black/30 backdrop-blur-sm px-1.5 py-0.5 rounded-md">
                            {item.grade}
                          </span>
                        )}
                      </div>
                      {item.favorite && (
                        <div className="absolute top-2.5 right-2.5">
                          <Icons.Heart size={13} className="fill-red text-red drop-shadow-sm" />
                        </div>
                      )}
                    </div>
                    <div className="pt-2 px-0.5 space-y-1">
                      <h3 className="font-medium text-sm text-text-primary leading-snug line-clamp-1" title={item.title}>
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-text-secondary">
                        {item.episodeNumber && (
                          <span className="text-text-tertiary">
                            {item.episodeNumber.includes('E') || item.episodeNumber.includes('第')
                              ? item.episodeNumber
                              : `第${item.episodeNumber}集`}
                          </span>
                        )}
                        {item.releaseYear && item.releaseYear !== 'N/A' && (
                          <span className="text-text-tertiary">· {item.releaseYear}</span>
                        )}
                        {item.characterName && (
                          <span className="text-text-tertiary truncate">· {item.characterName}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {viewType === 'gallery' && (
            <div className={`grid gap-3 sm:gap-4 ${
              gridColumns === 1 ? 'grid-cols-1' :
              gridColumns === 2 ? 'grid-cols-2' :
              gridColumns === 3 ? 'grid-cols-3' :
              gridColumns === 4 ? 'grid-cols-4' :
              gridColumns === 5 ? 'grid-cols-5' :
              'grid-cols-6'
            }`}>
              {pageData.map(item => (
                <Link
                  key={item.id}
                  to={`/media/${item.id}`}
                  className="group relative aspect-video overflow-hidden rounded-2xl shadow-card"
                >
                  <img
                    src={getImageUrl(item.backdropPath || item.posterPath)}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/20 backdrop-blur-sm text-white">
                        {TYPE_LABELS[item.mediaType]}
                      </span>
                      {item.grade && (
                        <span className="text-[11px] font-bold text-accent bg-white/20 backdrop-blur-sm px-1.5 py-0.5 rounded-md">
                          {item.grade}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-white text-base leading-snug line-clamp-1" title={item.title}>
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-white/70">
                      {item.episodeNumber && (
                        <span>
                          {item.episodeNumber.includes('E') || item.episodeNumber.includes('第')
                            ? item.episodeNumber
                            : `第${item.episodeNumber}集`}
                        </span>
                      )}
                      {item.releaseYear && item.releaseYear !== 'N/A' && (
                        <span>· {item.releaseYear}</span>
                      )}
                    </div>
                  </div>
                  {item.favorite && (
                    <div className="absolute top-3 right-3">
                      <Icons.Heart size={16} className="fill-red text-red drop-shadow-md" />
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}

          {hasNextPage && (
            <div ref={loadMoreRef} className="flex justify-center py-8">
              <button
                onClick={goNext}
                className="inline-flex items-center gap-2 h-10 px-8 rounded-full bg-surface hover:bg-surface-hover text-text-secondary text-sm font-medium border border-divider transition-all shadow-sm active:scale-95"
              >
                加载更多
                <span className="text-text-tertiary text-xs">
                  ({pageData.length}/{paginatedTotal})
                </span>
              </button>
            </div>
          )}

          {!hasNextPage && paginatedTotal > 24 && (
            <div className="text-center py-6 text-xs text-text-tertiary">
              已显示全部 {paginatedTotal} 条记录
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Home;
