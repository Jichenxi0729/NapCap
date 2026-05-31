import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SavedMedia } from '../types';
import { getCollection, getCachedCollection, clearCache, debugCollection, removeDuplicates, addToCollection } from '../services';
import { getTvDetails, getTvEpisodeDetails } from '../services/tmdbService';
import { getCurrentUser, signOut } from '../services/authService';
import { Icons } from '../components/Icon';
import * as eventBus from '../services/eventBus';

type ViewType = 'list' | 'grid' | 'gallery';

function Profile() {
  const navigate = useNavigate();
  const [items, setItems] = useState<SavedMedia[]>(() => getCachedCollection());
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [gridColumns, setGridColumns] = useState(() => {
    const saved = localStorage.getItem('gridColumns');
    return saved ? parseInt(saved) : 2;
  });
  const [viewType, setViewType] = useState<ViewType>(() => {
    const saved = localStorage.getItem('viewType');
    return (saved as ViewType) || 'grid';
  });
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState('');

  useEffect(() => {
    const load = async () => {
      const user = await getCurrentUser();
      setIsLoggedIn(user.isLoggedIn);
      setUserEmail(user.email);
      const collection = await getCollection();
      setItems(collection);
    };
    load();
  }, []);

  useEffect(() => {
    const unsubscribe = eventBus.subscribe(() => {
      setItems(getCachedCollection());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    localStorage.setItem('gridColumns', gridColumns.toString());
    window.dispatchEvent(new Event('gridColumnsChange'));
  }, [gridColumns]);

  useEffect(() => {
    localStorage.setItem('viewType', viewType);
    window.dispatchEvent(new Event('viewTypeChange'));
  }, [viewType]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleExport = () => {
    setExporting(true);
    try {
      const data = JSON.stringify(items, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().split('T')[0];
      a.download = `cinekeep_backup_${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('[导出] 失败:', e);
    }
    setExporting(false);
  };

  const handleRefreshTmdbInfo = async () => {
    const tvItems = items.filter(i => i.mediaType === 'tv');
    if (tvItems.length === 0) {
      alert('没有电视剧数据');
      return;
    }

    const needOverview = tvItems.filter(i => !i.overview && i.tmdbId);
    const needEpisodeOverview = tvItems.filter(i => {
      if (!i.tmdbId || !i.episodeNumber) return false;
      if (i.episodeOverview && i.episodeName) return false;
      const epNum = parseInt(i.episodeNumber.replace(/[^0-9]/g, ''));
      return !isNaN(epNum) && epNum > 0;
    });
    const total = needOverview.length + needEpisodeOverview.length;

    if (total === 0) {
      alert('所有电视剧的剧情信息已完整，无需刷新');
      return;
    }

    if (!confirm(`找到 ${tvItems.length} 部电视剧，其中 ${needOverview.length} 部缺剧情简介，${needEpisodeOverview.length} 条缺分集剧情。\n\n将从 TMDB 获取数据，是否继续？`)) {
      return;
    }

    setRefreshing(true);
    let successCount = 0;
    let failCount = 0;

    const tvDetailsCache = new Map<number, any>();

    const getTvDetailCached = async (tmdbId: number) => {
      if (tvDetailsCache.has(tmdbId)) return tvDetailsCache.get(tmdbId);
      const detail = await getTvDetails(tmdbId);
      tvDetailsCache.set(tmdbId, detail);
      return detail;
    };

    for (let i = 0; i < needOverview.length; i++) {
      const item = needOverview[i];
      setRefreshProgress(`(${i + 1}/${total}) 获取剧情简介: ${item.title}`);
      try {
        const detail = await getTvDetailCached(item.tmdbId);
        await addToCollection({ ...item, overview: detail.overview || '' });
        successCount++;
      } catch {
        failCount++;
      }
      await new Promise(r => setTimeout(r, 200));
    }

    for (let i = 0; i < needEpisodeOverview.length; i++) {
      const item = needEpisodeOverview[i];
      setRefreshProgress(`(${needOverview.length + i + 1}/${total}) 获取分集剧情: ${item.title} ${item.episodeNumber}`);
      try {
        const epNum = parseInt(item.episodeNumber.replace(/[^0-9]/g, ''));
        const seasonNum = item.seasonNumber || 1;
        if (!isNaN(epNum) && epNum > 0) {
          const epDetail = await getTvEpisodeDetails(item.tmdbId, seasonNum, epNum);
          await addToCollection({ ...item, seasonNumber: seasonNum, episodeOverview: epDetail.overview || '', episodeName: epDetail.name || '' });
          successCount++;
        }
      } catch {
        failCount++;
      }
      await new Promise(r => setTimeout(r, 200));
    }

    tvDetailsCache.clear();
    clearCache();
    const collection = await getCollection();
    setItems(collection);
    setRefreshing(false);
    setRefreshProgress('');
    alert(`刷新完成！成功 ${successCount} 条${failCount > 0 ? `，失败 ${failCount} 条` : ''}`);
  };

  const typeCounts = {
    all: items.length,
    tv: items.filter(i => i.mediaType === 'tv').length,
    short_drama: items.filter(i => i.mediaType === 'short_drama').length,
    movie: items.filter(i => i.mediaType === 'movie').length,
  };

  return (
    <div className="space-y-6">
      {/* 用户信息卡片 */}
      <div className="bg-surface rounded-2xl p-6 shadow-card border border-divider/30">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center flex-shrink-0">
            <Icons.User size={24} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-text-primary">
              {isLoggedIn ? (userEmail || '用户') : '未登录'}
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {isLoggedIn ? '已登录' : '部分功能（如云端同步）需要登录'}
            </p>
          </div>
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-surface hover:bg-surface-hover text-text-secondary hover:text-red text-xs font-medium transition-colors border border-divider/30 flex-shrink-0"
            >
              <Icons.LogOut size={13} />
              退出
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-colors shadow-sm flex-shrink-0"
            >
              <Icons.LogIn size={13} />
              登录
            </button>
          )}
        </div>
      </div>

      {/* 数据概览 */}
      <div className="grid grid-cols-4 gap-2">
        {([
          { label: '全部', key: 'all' as const },
          { label: '电视剧', key: 'tv' as const },
          { label: '短剧', key: 'short_drama' as const },
          { label: '电影', key: 'movie' as const },
        ]).map(({ label, key }) => (
          <div key={key} className="bg-surface rounded-xl p-3 shadow-card border border-divider/20 text-center">
            <p className="text-xl font-bold text-text-primary">{typeCounts[key]}</p>
            <p className="text-[10px] text-text-tertiary mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* 显示设置 */}
      <div className="bg-surface rounded-2xl p-5 shadow-card border border-divider/30">
        <h3 className="text-sm font-semibold text-text-primary mb-4">显示设置</h3>
        
        {/* 视图类型 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">视图类型</span>
          </div>
          <div className="flex items-center bg-bg rounded-xl p-1 border border-divider/30">
            <button
              onClick={() => setViewType('list')}
              className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-medium transition-all duration-200 ${
                viewType === 'list'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icons.ListVideo size={13} />
              列表
            </button>
            <button
              onClick={() => setViewType('grid')}
              className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-medium transition-all duration-200 ${
                viewType === 'grid'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icons.Image size={13} />
              网格
            </button>
            <button
              onClick={() => setViewType('gallery')}
              className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-medium transition-all duration-200 ${
                viewType === 'gallery'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icons.Film size={13} />
              画廊
            </button>
          </div>
        </div>

        {/* 列数设置 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">显示列数</span>
          </div>
          <div className="flex items-center bg-bg rounded-full p-0.5 border border-divider/30">
            {[1, 2, 3, 4, 5, 6].map(num => (
              <button
                key={num}
                onClick={() => setGridColumns(num)}
                className={`flex-1 h-9 rounded-full text-xs font-medium transition-all duration-200 ${
                  gridColumns === num
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {num}列
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 数据管理 */}
      <div className="bg-surface rounded-2xl p-5 shadow-card border border-divider/30">
        <h3 className="text-sm font-semibold text-text-primary mb-3">数据管理</h3>
        <div className="space-y-2">
          <button
            onClick={async () => {
              clearCache();
              const collection = await getCollection();
              setItems(collection);
            }}
            className="w-full flex items-center gap-3 h-11 px-4 rounded-xl bg-bg hover:bg-surface-hover text-text-primary text-sm font-medium transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Icons.RefreshCw size={14} className="text-accent" />
            </div>
            <span>刷新数据</span>
            <span className="ml-auto text-text-tertiary text-xs">从云端重新拉取</span>
          </button>

          <button
            onClick={async () => {
              const deleted = await removeDuplicates();
              alert(`已清理 ${deleted} 条重复数据`);
              clearCache();
              const collection = await getCollection();
              setItems(collection);
            }}
            className="w-full flex items-center gap-3 h-11 px-4 rounded-xl bg-bg hover:bg-surface-hover text-text-primary text-sm font-medium transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-orange/10 flex items-center justify-center flex-shrink-0">
              <Icons.Trash size={14} className="text-orange" />
            </div>
            <span>清理重复</span>
            <span className="ml-auto text-text-tertiary text-xs">基于标题+集数+角色</span>
          </button>

          <button
            onClick={handleRefreshTmdbInfo}
            disabled={refreshing}
            className="w-full flex items-center gap-3 h-11 px-4 rounded-xl bg-bg hover:bg-surface-hover text-text-primary text-sm font-medium transition-colors disabled:opacity-50"
          >
            <div className="w-8 h-8 rounded-lg bg-purple/10 flex items-center justify-center flex-shrink-0">
              {refreshing ? (
                <Icons.Loading size={14} className="text-purple animate-spin" />
              ) : (
                <Icons.RefreshCw size={14} className="text-purple" />
              )}
            </div>
            <span className="flex-1 text-left">
              {refreshing ? refreshProgress || '刷新中...' : '刷新剧情信息'}
            </span>
            {!refreshing && <span className="text-text-tertiary text-xs">电视剧</span>}
          </button>

          <button
            onClick={async () => {
              await debugCollection();
            }}
            className="w-full flex items-center gap-3 h-11 px-4 rounded-xl bg-bg hover:bg-surface-hover text-text-primary text-sm font-medium transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-green/10 flex items-center justify-center flex-shrink-0">
              <Icons.CloudUpload size={14} className="text-green" />
            </div>
            <span>检查数据</span>
            <span className="ml-auto text-text-tertiary text-xs">查看控制台输出</span>
          </button>

          <div className="border-t border-divider/20 my-2" />

          <button
            onClick={() => navigate('/import')}
            className="w-full flex items-center gap-3 h-11 px-4 rounded-xl bg-bg hover:bg-surface-hover text-text-primary text-sm font-medium transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Icons.Upload size={14} className="text-accent" />
            </div>
            <span>导入数据</span>
            <span className="ml-auto text-text-tertiary text-xs">CSV / JSON</span>
          </button>

          <button
            onClick={handleExport}
            disabled={exporting || items.length === 0}
            className="w-full flex items-center gap-3 h-11 px-4 rounded-xl bg-bg hover:bg-surface-hover text-text-primary text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              {exporting ? (
                <Icons.Loading size={14} className="text-accent animate-spin" />
              ) : (
                <Icons.Download size={14} className="text-accent" />
              )}
            </div>
            <span>导出数据</span>
            <span className="ml-auto text-text-tertiary text-xs">
              {items.length > 0 ? `${items.length} 条记录` : '暂无数据'}
            </span>
          </button>
        </div>
      </div>

      {/* 关于 */}
      <div className="bg-surface rounded-2xl p-5 shadow-card border border-divider/30">
        <h3 className="text-sm font-semibold text-text-primary mb-3">关于</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between py-2">
            <span className="text-text-secondary">应用版本</span>
            <span className="text-text-primary font-medium">1.0.0</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-text-secondary">数据提供</span>
            <span className="text-text-primary">TMDb</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-text-secondary">存储方式</span>
            <span className="text-text-primary">{isLoggedIn ? 'Supabase 云端' : '本地存储'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
