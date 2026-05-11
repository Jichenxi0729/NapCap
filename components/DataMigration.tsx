import { useState } from 'react';
import { migrateFromLocalStorage, isSupabaseConfigured } from '../services';
import { getCollection as getLocalCollection } from '../services/storageService';
import { Icons } from './Icon';

function DataMigration() {
  const [isMigrating, setIsMigrating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; count: number; message: string } | null>(null);
  
  const localCount = getLocalCollection().length;
  const configured = isSupabaseConfigured();

  const handleMigrate = async () => {
    setIsMigrating(true);
    setResult(null);
    
    try {
      const count = await migrateFromLocalStorage();
      setResult({
        success: true,
        count,
        message: count > 0 
          ? `成功迁移 ${count} 条记录！` 
          : '本地没有数据需要迁移。'
      });
    } catch (error) {
      setResult({
        success: false,
        count: 0,
        message: `迁移失败: ${error instanceof Error ? error.message : '未知错误'}`
      });
    } finally {
      setIsMigrating(false);
    }
  };

  if (!configured) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
        <Icons.CloudOff className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">Supabase 未配置</p>
        <p className="text-sm">请在 .env 文件中配置 Supabase URL 和密钥</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="bg-surface rounded-2xl border border-divider/30 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Icons.CloudUpload className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-medium text-text-primary">数据迁移</h2>
            <p className="text-sm text-text-secondary">从本地存储迁移到 Supabase</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-center py-3 border-b border-divider/20">
            <span className="text-text-secondary text-sm">本地存储记录数</span>
            <span className="font-medium text-text-primary">{localCount} 条</span>
          </div>
        </div>

        {result && (
          <div className={`mb-4 p-4 rounded-xl ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <div className="flex items-center gap-2">
              {result.success ? (
                <Icons.CheckCircle className="w-5 h-5" />
              ) : (
                <Icons.XCircle className="w-5 h-5" />
              )}
              <span>{result.message}</span>
            </div>
          </div>
        )}

        <button
          onClick={handleMigrate}
          disabled={isMigrating || localCount === 0}
          className="w-full h-10 bg-accent hover:bg-accent/90 disabled:bg-divider/30 disabled:text-text-tertiary text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
        >
          {isMigrating ? (
            <>
              <Icons.Loading className="w-4 h-4 animate-spin" />
              迁移中...
            </>
          ) : localCount === 0 ? (
            '暂无数据可迁移'
          ) : (
            <>
              <Icons.CloudUpload className="w-4 h-4" />
              迁移到 Supabase
            </>
          )}
        </button>

        <p className="mt-4 text-xs text-text-tertiary text-center">
          迁移后，本地数据将被清除，所有数据将存储在云端
        </p>
      </div>
    </div>
  );
}

export default DataMigration;