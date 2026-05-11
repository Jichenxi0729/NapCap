import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchMovies, searchTvShows, getMovieDetails, getTvDetails } from '../services/tmdbService';
import { importItems, getCollection, clearCache, removeDuplicates } from '../services';
import { SavedMedia, CsvRow, ImportResult, MediaType } from '../types';
import { Icons } from '../components/Icon';

function ImportPage() {
  const [results, setResults] = useState<ImportResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [imported, setImported] = useState(false);
  const [fileType, setFileType] = useState<'csv' | 'json'>('csv');
  const [importMode, setImportMode] = useState<'smart' | 'direct'>('smart');
  const [overwriteMode, setOverwriteMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const parseCSV = (text: string): CsvRow[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());

    const titleIdx = headers.findIndex(h => h.includes('title') || h.includes('剧名') || h.includes('名称') || h.includes('作品'));
    const episodeIdx = headers.findIndex(h => h.includes('episode') || h.includes('集数') || h.includes('集'));
    const characterIdx = headers.findIndex(h => h.includes('character') || h.includes('角色') || h.includes('人物'));
    const identityIdx = headers.findIndex(h => h.includes('identity') || h.includes('身份'));
    const sceneIdx = headers.findIndex(h => h.includes('scene') || h.includes('场景'));
    const typeIdx = headers.findIndex(h => h.includes('type') || h.includes('类型') || h.includes('分类'));
    const gradeIdx = headers.findIndex(h => h.includes('grade') || h.includes('评级'));
    const appearanceTimeIdx = headers.findIndex(h => h.includes('time') || h.includes('时间') || h.includes('出场时间'));
    const behaviorIdx = headers.findIndex(h => h.includes('behavior') || h.includes('行为'));
    const outfitIdx = headers.findIndex(h => h.includes('outfit') || h.includes('穿搭') || h.includes('服装'));
    const postureIdx = headers.findIndex(h => h.includes('posture') || h.includes('姿势') || h.includes('姿态'));
    const tmdbUrlIdx = headers.findIndex(h => h.includes('tmdb') || h.includes('链接') || h.includes('url'));
    const reviewIdx = headers.findIndex(h => h.includes('review') || h.includes('笔记') || h.includes('评价'));
    const dateIdx = headers.findIndex(h => h.includes('date') || h.includes('日期') || h.includes('创建时间'));

    const rows: CsvRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]).map(c => c.replace(/^"|"$/g, ''));
      if (cols.length === 0 || !cols.some(c => c)) continue;

      const row = {
        title: titleIdx >= 0 && titleIdx < cols.length ? cols[titleIdx] || '' : '',
        episode: episodeIdx >= 0 && episodeIdx < cols.length ? cols[episodeIdx] || '' : '',
        character: characterIdx >= 0 && characterIdx < cols.length ? cols[characterIdx] || '' : '',
        identity: identityIdx >= 0 && identityIdx < cols.length ? cols[identityIdx] || '' : '',
        scene: sceneIdx >= 0 && sceneIdx < cols.length ? cols[sceneIdx] || '' : '',
        type: typeIdx >= 0 && typeIdx < cols.length ? cols[typeIdx] || '' : '',
        grade: gradeIdx >= 0 && gradeIdx < cols.length ? cols[gradeIdx] || '' : '',
        appearanceTime: appearanceTimeIdx >= 0 && appearanceTimeIdx < cols.length ? cols[appearanceTimeIdx] || '' : '',
        behavior: behaviorIdx >= 0 && behaviorIdx < cols.length ? cols[behaviorIdx] || '' : '',
        outfit: outfitIdx >= 0 && outfitIdx < cols.length ? cols[outfitIdx] || '' : '',
        posture: postureIdx >= 0 && postureIdx < cols.length ? cols[postureIdx] || '' : '',
        tmdbUrl: tmdbUrlIdx >= 0 && tmdbUrlIdx < cols.length ? cols[tmdbUrlIdx] || '' : '',
        review: reviewIdx >= 0 && reviewIdx < cols.length ? cols[reviewIdx] || '' : '',
        date: dateIdx >= 0 && dateIdx < cols.length ? cols[dateIdx] || '' : '',
      };
      rows.push(row);
    }
    return rows;
  };

  const parseJSON = (text: string): SavedMedia[] => {
    try {
      const data = JSON.parse(text);
      if (Array.isArray(data)) {
        return data.map(item => ({
          id: item.id || crypto.randomUUID(),
          tmdbId: item.tmdbId || 0,
          mediaType: (item.mediaType as MediaType) || 'tv',
          title: item.title || '',
          posterPath: item.posterPath || item.poster_path || null,
          backdropPath: item.backdropPath || item.backdrop_path || null,
          releaseYear: item.releaseYear || item.release_year || '',
          addedAt: item.addedAt || item.added_at || Date.now(),
          episodeNumber: item.episodeNumber || item.episode_number || '',
          characterName: item.characterName || item.character_name || item.character || '',
          identity: item.identity || '',
          scene: item.scene || '',
          appearanceTime: item.appearanceTime || item.appearance_time || '',
          behavior: item.behavior || '',
          outfit: item.outfit || '',
          posture: item.posture || '',
          grade: item.grade || '',
          userReview: item.userReview || item.user_review || item.review || '',
          watchedDate: item.watchedDate || item.watched_date || item.date || '',
          favorite: item.favorite || false,
          genres: item.genres || [],
          overview: item.overview || '',
        }));
      }
      if (typeof data === 'object' && data !== null) {
        return [{
          id: data.id || crypto.randomUUID(),
          tmdbId: data.tmdbId || 0,
          mediaType: (data.mediaType as MediaType) || 'tv',
          title: data.title || '',
          posterPath: data.posterPath || data.poster_path || null,
          backdropPath: data.backdropPath || data.backdrop_path || null,
          releaseYear: data.releaseYear || data.release_year || '',
          addedAt: data.addedAt || data.added_at || Date.now(),
          episodeNumber: data.episodeNumber || data.episode_number || '',
          characterName: data.characterName || data.character_name || data.character || '',
          identity: data.identity || '',
          scene: data.scene || '',
          appearanceTime: data.appearanceTime || data.appearance_time || '',
          behavior: data.behavior || '',
          outfit: data.outfit || '',
          posture: data.posture || '',
          grade: data.grade || '',
          userReview: data.userReview || data.user_review || data.review || '',
          watchedDate: data.watchedDate || data.watched_date || data.date || '',
          favorite: data.favorite || false,
          genres: data.genres || [],
          overview: data.overview || '',
        }];
      }
    } catch (error) {
      console.error('[导入] JSON解析失败:', error);
    }
    return [];
  };

  const detectMediaType = (typeStr: string): MediaType => {
    const t = typeStr.toLowerCase();
    if (t.includes('电影') || t.includes('movie')) return 'movie';
    if (t.includes('短剧') || t.includes('short')) return 'short_drama';
    return 'tv';
  };

  const parseTMDbUrl = (url: string): { id: number; type: 'tv' | 'movie' } | null => {
    if (!url) return null;
    const match = url.match(/tmdb\.org\/(tv|movie)\/(\d+)/);
    if (match) {
      return {
        id: parseInt(match[2], 10),
        type: match[1] as 'tv' | 'movie',
      };
    }
    return null;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const isJson = file.name.toLowerCase().endsWith('.json');
    setFileType(isJson ? 'json' : 'csv');

    const processed: ImportResult[] = [];

    if (isJson) {
      const items = parseJSON(text);
      if (items.length === 0) {
        alert('无法解析JSON文件，请检查格式。\nJSON应为数组或单个对象。');
        return;
      }

      setIsProcessing(true);
      setImported(false);
      setProgress({ current: 0, total: items.length });

      const existingCollection = await getCollection();
      const existingIds = new Set(existingCollection.map(c => c.id));
      const existingKeys = new Set(existingCollection.map(c => {
        const char = (c.characterName || '').trim();
        return `${c.tmdbId}|${c.episodeNumber}|${char}`;
      }));

      const toImportItems: SavedMedia[] = [];

      const makeRow = (item: SavedMedia) => ({
        title: item.title,
        episode: item.episodeNumber,
        character: item.characterName,
        identity: item.identity,
        scene: item.scene,
        type: item.mediaType === 'movie' ? '电影' : item.mediaType === 'short_drama' ? '短剧' : '电视剧',
        grade: item.grade,
        appearanceTime: item.appearanceTime,
        behavior: item.behavior,
        outfit: item.outfit,
        posture: item.posture,
        tmdbUrl: '',
        review: item.userReview,
        date: item.watchedDate,
      });

      for (const savedItem of items) {
        if (!savedItem.title) {
          processed.push({ row: makeRow({ ...savedItem, title: '(无标题)' }), status: 'skipped', message: '缺少标题' });
          continue;
        }

        const char = (savedItem.characterName || '').trim();
        const uniqueKey = `${savedItem.tmdbId}|${savedItem.episodeNumber}|${char}`;
        if (existingIds.has(savedItem.id) || existingKeys.has(uniqueKey)) {
          processed.push({ row: makeRow(savedItem), status: 'skipped', message: '已存在' });
          continue;
        }

        toImportItems.push({
          ...savedItem,
          id: crypto.randomUUID(),
          addedAt: Date.now(),
        });
      }

      if (toImportItems.length > 0) {
        await importItems(toImportItems);
      }

      for (const item of toImportItems) {
        processed.push({
          row: makeRow(item),
          status: 'matched',
          matchedTitle: item.title,
          tmdbId: item.tmdbId,
          mediaType: item.mediaType,
          message: '直接导入',
        });
      }

      setProgress({ current: items.length, total: items.length });
      setResults(processed);
      setIsProcessing(false);
      setImported(true);
    } else {
      const rows = parseCSV(text);
      if (rows.length === 0) {
        alert('无法解析CSV文件，请检查格式。\n第一行应为表头，包含标题/剧名等列。');
        return;
      }

      setIsProcessing(true);
      setImported(false);
      setProgress({ current: 0, total: rows.length });

      const existingCollection = await getCollection();
      const existingIds = new Set(existingCollection.map(c => c.id));
      const existingKeys = new Set(existingCollection.map(c => {
        const char = (c.characterName || '').trim();
        return `${c.tmdbId}|${c.episodeNumber}|${char}`;
      }));

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        setProgress({ current: i + 1, total: rows.length });

        if (!row.title) {
          processed.push({ row, status: 'skipped', message: '缺少标题' });
          continue;
        }

        let matchFound = false;

        try {
          let savedItem: SavedMedia | null = null;
          let matchedTitle = '';
          let tmdbId = 0;

          if (importMode === 'smart') {
            const tmdbInfo = parseTMDbUrl(row.tmdbUrl);

            if (tmdbInfo) {
              let details = null;
              const maxRetries = 2;

              for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                  if (tmdbInfo.type === 'tv') {
                    details = await getTvDetails(tmdbInfo.id);
                  } else {
                    details = await getMovieDetails(tmdbInfo.id);
                  }
                  break;
                } catch (err) {
                  if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                  }
                }
              }

              if (!details) {
                processed.push({
                  row,
                  status: 'skipped',
                  message: `TMDB获取失败 [ID:${tmdbInfo.id}]`
                });
                matchFound = true;
                continue;
              }

              matchedTitle = 'title' in details ? details.title : details.name;
              tmdbId = details.id;
              savedItem = {
                id: crypto.randomUUID(),
                tmdbId: details.id,
                mediaType: tmdbInfo.type,
                title: matchedTitle,
                posterPath: details.poster_path || null,
                backdropPath: details.backdrop_path || null,
                releaseYear: 'release_date' in details
                  ? (details.release_date ? details.release_date.split('-')[0] : '')
                  : ('first_air_date' in details ? (details.first_air_date ? details.first_air_date.split('-')[0] : '') : ''),
                addedAt: Date.now(),
                episodeNumber: row.episode,
                characterName: row.character,
                identity: row.identity,
                scene: row.scene,
                appearanceTime: row.appearanceTime,
                behavior: row.behavior || '',
                outfit: row.outfit || '',
                posture: row.posture || '',
                grade: row.grade,
                userReview: row.review,
                watchedDate: row.date,
                favorite: false,
                genres: details.genres?.map(g => g.name) || [],
                overview: details.overview || '',
              };
            } else {
              const [movies, tvShows] = await Promise.all([
                searchMovies(row.title),
                searchTvShows(row.title),
              ]);

              const bestMatch = (() => {
                const query = row.title.toLowerCase();
                // 优先匹配电视剧
                for (const t of tvShows) {
                  if (t.name.toLowerCase().includes(query) || query.includes(t.name.toLowerCase())) {
                    return { result: t, type: 'tv' as const };
                  }
                }
                for (const m of movies) {
                  if (m.title.toLowerCase().includes(query) || query.includes(m.title.toLowerCase())) {
                    return { result: m, type: 'movie' as const };
                  }
                }
                // 默认也优先电视剧
                if (tvShows.length > 0) return { result: tvShows[0], type: 'tv' as const };
                if (movies.length > 0) return { result: movies[0], type: 'movie' as const };
                return null;
              })();

              if (bestMatch) {
                const mediaType = bestMatch.type;
                const result = bestMatch.result;
                matchedTitle = 'title' in result ? result.title : result.name;
                tmdbId = result.id;

                savedItem = {
                  id: crypto.randomUUID(),
                  tmdbId: result.id,
                  mediaType: row.type ? detectMediaType(row.type) : mediaType,
                  title: matchedTitle,
                  posterPath: result.poster_path,
                  backdropPath: result.backdrop_path,
                  releaseYear: 'release_date' in result
                    ? (result.release_date ? result.release_date.split('-')[0] : '')
                    : ('first_air_date' in result ? (result.first_air_date ? result.first_air_date.split('-')[0] : '') : ''),
                  addedAt: Date.now(),
                  episodeNumber: row.episode,
                  characterName: row.character,
                  identity: row.identity,
                  scene: row.scene,
                  appearanceTime: row.appearanceTime,
                  behavior: row.behavior || '',
                  outfit: row.outfit || '',
                  posture: row.posture || '',
                  grade: row.grade,
                  userReview: row.review,
                  watchedDate: row.date,
                  favorite: false,
                  genres: [],
                  overview: '',
                };
              }
            }
          } else {
            // 直接导入模式：不调用TMDB，直接创建记录
            const mediaType = row.type ? detectMediaType(row.type) : 'tv';
            matchedTitle = row.title;
            tmdbId = 0;

            savedItem = {
              id: crypto.randomUUID(),
              tmdbId: 0,
              mediaType: mediaType,
              title: row.title,
              posterPath: null,
              backdropPath: null,
              releaseYear: row.date ? row.date.split('/')[0] : '',
              addedAt: Date.now(),
              episodeNumber: row.episode,
              characterName: row.character,
              identity: row.identity,
              scene: row.scene,
              appearanceTime: row.appearanceTime,
              behavior: row.behavior || '',
              outfit: row.outfit || '',
              posture: row.posture || '',
              grade: row.grade,
              userReview: row.review,
              watchedDate: row.date,
              favorite: false,
              genres: [],
              overview: '',
            };
          }

          if (savedItem) {
            let isDuplicate = false;
            let uniqueKey = '';
            const charForDedup = (savedItem.characterName || '').trim();
            
            if (importMode === 'smart' && savedItem.tmdbId > 0) {
              uniqueKey = `${savedItem.tmdbId}|${savedItem.episodeNumber}|${charForDedup}`;
              isDuplicate = existingKeys.has(uniqueKey);
            } else {
              uniqueKey = `${savedItem.title}|${savedItem.episodeNumber}|${charForDedup}`;
              isDuplicate = existingKeys.has(uniqueKey);
            }
            
            if (!isDuplicate) {
              await importItems([savedItem]);
              existingIds.add(savedItem.id);
              existingKeys.add(uniqueKey);
            } else if (overwriteMode) {
              await importItems([savedItem]);
              existingKeys.add(uniqueKey);
            } else {
              processed.push({
                row,
                status: 'skipped',
                message: '已存在',
              });
              matchFound = true;
              continue;
            }

            const isUpdate = isDuplicate && overwriteMode;
            processed.push({
              row,
              status: 'matched',
              matchedTitle,
              tmdbId,
              mediaType: savedItem.mediaType,
              message: isUpdate 
                ? `已更新: ${matchedTitle}`
                : importMode === 'smart' 
                  ? (tmdbId ? `搜索匹配: ${matchedTitle}` : `TMDB直连: ${matchedTitle}`) 
                  : '直接导入',
            });
            matchFound = true;
          }
        } catch {
          // process failed
        }

        if (!matchFound && importMode === 'smart') {
          processed.push({ row, status: 'skipped', message: '未在TMDb中找到匹配' });
        }

        if (i < rows.length - 1 && importMode === 'smart') {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      setResults(processed);
      setIsProcessing(false);
      setImported(true);
      clearCache();
    }
  };

  const matched = results.filter(r => r.status === 'matched');
  const skipped = results.filter(r => r.status === 'skipped');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">导入数据</h1>
        <p className="text-sm text-text-secondary">
          批量导入你的收藏数据，支持 CSV 和 JSON 格式
        </p>
      </div>

      <div className="bg-surface rounded-2xl p-6 shadow-card border border-divider/30 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-3">格式选择</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setFileType('csv')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                fileType === 'csv'
                  ? 'bg-accent text-white'
                  : 'bg-bg text-text-secondary hover:bg-surface-hover'
              }`}
            >
              CSV
            </button>
            <button
              onClick={() => setFileType('json')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                fileType === 'json'
                  ? 'bg-accent text-white'
                  : 'bg-bg text-text-secondary hover:bg-surface-hover'
              }`}
            >
              JSON
            </button>
          </div>
        </div>

        {fileType === 'csv' && (
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3">导入模式</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setImportMode('smart')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  importMode === 'smart'
                    ? 'bg-accent text-white'
                    : 'bg-bg text-text-secondary hover:bg-surface-hover'
                }`}
              >
                智能匹配
              </button>
              <button
                onClick={() => setImportMode('direct')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  importMode === 'direct'
                    ? 'bg-accent text-white'
                    : 'bg-bg text-text-secondary hover:bg-surface-hover'
                }`}
              >
                直接导入
              </button>
            </div>
            <p className="text-xs text-text-tertiary mt-2">
              {importMode === 'smart' 
                ? '💡 智能匹配：自动搜索TMDB获取海报、简介等信息（较慢）' 
                : '💡 直接导入：仅导入CSV中的基础数据，后期可手动更新TMDB信息（快速）'}
            </p>
            
            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input
                type="checkbox"
                checked={overwriteMode}
                onChange={(e) => setOverwriteMode(e.target.checked)}
                className="w-4 h-4 rounded border-divider/40 text-accent focus:ring-accent/40"
              />
              <span className="text-xs text-text-secondary">覆盖更新已存在的记录</span>
            </label>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-2">
            {fileType === 'csv' ? 'CSV 格式说明' : 'JSON 格式说明'}
          </h3>
          {fileType === 'csv' ? (
            <>
              <p className="text-xs text-text-secondary leading-relaxed mb-3">
                CSV文件第一行为表头，支持的列名：<br />
                <code className="bg-bg px-1.5 py-0.5 rounded text-[11px] text-accent">
                  名称/标题, 集数, 人物/角色, 身份, 时间/出场时间, 场景, 评级(S+/S/A+...), 行为, 穿搭, 姿势, TMDB链接(可选), 类型(电视剧/短剧/电影), 笔记, 日期
                </code>
              </p>
              <p className="text-xs text-text-tertiary">
                💡 如果提供 TMDB 链接（如 https://www.themoviedb.org/tv/12345），将直接获取完整信息（海报、简介、类型等），更快速准确！
              </p>
            </>
          ) : (
            <>
              <p className="text-xs text-text-secondary leading-relaxed mb-3">
                JSON 支持数组或单个对象格式，字段对应数据模型：<br />
                <code className="bg-bg px-1.5 py-0.5 rounded text-[11px] text-accent">
                  {`{ title, episodeNumber, characterName, identity, scene, appearanceTime, behavior, outfit, posture, grade, tmdbId, mediaType }`}
                </code>
              </p>
              <p className="text-xs text-text-tertiary">
                💡 JSON 数据直接导入，不调用 TMDB，瞬间完成！支持从 localStorage 导出的数据格式！
              </p>
            </>
          )}
        </div>

        <div className="border-2 border-dashed border-divider rounded-2xl p-8 text-center hover:border-accent/40 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-accent-light flex items-center justify-center">
              <Icons.Upload size={22} className="text-accent" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">点击选择文件</p>
              <p className="text-xs text-text-tertiary mt-0.5">支持 .csv 和 .json 格式</p>
            </div>
          </div>
        </div>
      </div>

      {isProcessing && (
        <div className="bg-surface rounded-2xl p-5 shadow-card text-center space-y-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <div>
            <p className="text-sm font-medium text-text-primary">正在处理中...</p>
            <p className="text-xs text-text-secondary mt-0.5">
              正在处理数据 ({progress.current}/{progress.total})
            </p>
          </div>
          <div className="w-full bg-bg rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {imported && (
        <div className="bg-surface rounded-2xl p-5 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">导入结果</h3>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const count = await removeDuplicates();
                  alert(`已清理 ${count} 条重复数据！`);
                }}
                className="text-sm text-red hover:text-red-hover font-medium transition-colors"
              >
                清理重复
              </button>
              <button
                onClick={() => navigate('/')}
                className="text-sm text-accent hover:text-accent-hover font-medium transition-colors"
              >
                返回首页
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-green/5 rounded-xl p-3">
              <p className="text-2xl font-bold text-green">{matched.length}</p>
              <p className="text-[10px] text-text-tertiary mt-0.5">导入成功</p>
            </div>
            <div className="bg-orange/5 rounded-xl p-3">
              <p className="text-2xl font-bold text-orange">{skipped.length}</p>
              <p className="text-[10px] text-text-tertiary mt-0.5">跳过</p>
            </div>
            <div className="bg-bg rounded-xl p-3">
              <p className="text-2xl font-bold text-text-primary">{results.length}</p>
              <p className="text-[10px] text-text-tertiary mt-0.5">总计</p>
            </div>
          </div>

          {results.length > 0 && (
            <div className="max-h-80 overflow-y-auto space-y-1">
              {results.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${
                    r.status === 'matched' ? 'bg-green/5' : 'bg-bg'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    r.status === 'matched' ? 'bg-green' : 'bg-text-tertiary'
                  }`} />
                  <span className="text-text-primary font-medium truncate">{r.row.title}</span>
                  {r.row.episode && (
                    <span className="text-text-tertiary flex-shrink-0">第{r.row.episode}集</span>
                  )}
                  <span className="text-text-tertiary ml-auto flex-shrink-0">
                    {r.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ImportPage;
