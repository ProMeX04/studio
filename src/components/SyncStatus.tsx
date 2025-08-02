import React from 'react';
import { Cloud, CloudOff, Wifi, WifiOff, RefreshCw, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { useFirebaseSync } from '@/hooks/use-firebase-sync';
import { useNetworkState } from '@/hooks/use-network-state';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

export function SyncStatus() {
  const { syncState, forceSyncNow, canSync } = useFirebaseSync();
  const { isOnline, isSlowConnection, connectionType } = useNetworkState();

  const getSyncStatusIcon = () => {
    if (!isOnline) {
      return <CloudOff className="w-4 h-4 text-muted-foreground" />;
    }
    
    if (syncState.isSyncing) {
      return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
    }
    
    if (Object.keys(syncState.pendingSync).length > 0) {
      return <Cloud className="w-4 h-4 text-yellow-500" />;
    }
    
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const getSyncStatusText = () => {
    if (!isOnline) return 'Offline';
    if (syncState.isSyncing) return 'Đang đồng bộ...';
    
    const pendingCount = Object.keys(syncState.pendingSync).length;
    if (pendingCount > 0) return `${pendingCount} thay đổi chờ đồng bộ`;
    
    return 'Đã đồng bộ';
  };

  const getNetworkIcon = () => {
    if (!isOnline) {
      return <WifiOff className="w-4 h-4 text-red-500" />;
    }
    
    if (isSlowConnection) {
      return <Wifi className="w-4 h-4 text-yellow-500" />;
    }
    
    return <Wifi className="w-4 h-4 text-green-500" />;
  };

  const formatLastSyncTime = () => {
    if (!syncState.lastSyncTime) return 'Chưa đồng bộ';
    
    const now = Date.now();
    const diff = now - syncState.lastSyncTime;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 text-xs">
        {/* Network Status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              {getNetworkIcon()}
              <span className="hidden sm:inline">
                {isOnline ? (isSlowConnection ? 'Mạng chậm' : 'Online') : 'Offline'}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <div>Trạng thái: {isOnline ? 'Có mạng' : 'Không có mạng'}</div>
              <div>Kết nối: {connectionType}</div>
              {isSlowConnection && <div>⚠️ Kết nối chậm</div>}
            </div>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-border" />

        {/* Sync Status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              {getSyncStatusIcon()}
              <span className="hidden sm:inline">{getSyncStatusText()}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <div>Lần cuối: {formatLastSyncTime()}</div>
              <div>Đang đồng bộ: {syncState.isSyncing ? 'Có' : 'Không'}</div>
              <div>Chờ đồng bộ: {Object.keys(syncState.pendingSync).length} mục</div>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Force Sync Button */}
        {canSync && !syncState.isSyncing && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={forceSyncNow}
                disabled={syncState.isSyncing}
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Đồng bộ ngay</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Status Badge */}
        {Object.keys(syncState.pendingSync).length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {Object.keys(syncState.pendingSync).length}
          </Badge>
        )}
      </div>
    </TooltipProvider>
  );
}
