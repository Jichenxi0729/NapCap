import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SavedMedia, MediaType } from '../types';
import { getCollection, getCachedCollection } from '../services';
import { getImageUrl } from '../services/tmdbService';
import { Icons } from '../components/Icon';
import { useSearchContext } from '../components/Layout';
import * as eventBus from '../services/eventBus';
import { usePagination } from '../hooks/usePagination';

const TYPE_LABELS: Record<MediaType, string> = {
  movie: '电影',
  tv: '电视剧',
  short_drama: '短剧',
};

function Home() {
  const [items, setItems] = useState<SavedMedia[]>(() => getCachedCollection());
  const [typeFilter, setTypeFilter] = useState<MediaType | 'all'>('all');
  const [gridColumns, setGridColumns] = useState(() => {
    const saved = localStorage.getItem('gridColumns');
    return saved ? parseInt(saved) : 2;
  });
  const { filterText, sortBy } = useSearchContext();
  const navigate = useNavigate();

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
    const saved = localStorage.getItem('gridColumns');
    if (saved) setGridColumns(parseInt(saved));
    const handler = () => {
      const updated = localStorage.getItem('gridColumns');
      if (updated) setGridColumns(parseInt(updated));
    };
    window.addEventListener('gridColumnsChange', handler);
    return () => window.removeEventListener('gridColumnsChange', handler);
  }, []);

  const gradeOrder: Record<string, number> = { 'S+': 7, 'S': 6, 'A+': 5, 'A': 4, 'B+': 3, 'B': 2, 'C': 1 };

  const filteredItems = items
    .filter(item => {
      if (typeFilter !== 'all' && item.mediaType !== typeFilter) return false;
      if (filterText && !item.title.toLowerCase().includes(filterText.toLowerCase())) return false;
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
  }, [typeFilter, filterText, sortBy]);

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
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-text-secondary text-sm">没有匹配的记录</p>
        </div>
      ) : (
        <>
          <div className={`grid gap-x-3 gap-y-5 ${
            gridColumns === 2 ? 'grid-cols-2' :
            gridColumns === 3 ? 'grid-cols-3' :
            'grid-cols-4'
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
