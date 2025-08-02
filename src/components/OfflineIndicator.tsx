import { useNetworkState } from '@/hooks/use-network-state';
import { useFirebaseConnection } from '@/hooks/use-firebase-connection';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff, Wifi } from 'lucide-react';

export function OfflineIndicator() {
  const { isOnline } = useNetworkState();
  const { isConnected, lastConnectionError } = useFirebaseConnection();

  // Show indicator if browser is offline or Firebase is disconnected
  if (isOnline && isConnected) {
    return null;
  }

  return (
    <Alert className="mb-4 border-orange-200 bg-orange-50">
      <WifiOff className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-orange-800">
        {!isOnline ? (
          "Bạn đang offline. Dữ liệu sẽ được đồng bộ khi kết nối internet được khôi phục."
        ) : !isConnected ? (
          "Kết nối Firebase tạm thời gián đoạn. Dữ liệu sẽ được lưu cục bộ và đồng bộ khi kết nối ổn định."
        ) : (
          "Đang kết nối lại..."
        )}
      </AlertDescription>
    </Alert>
  );
}

export function ConnectionStatus() {
  const { isOnline, connectionType } = useNetworkState();
  const { isConnected } = useFirebaseConnection();

  const getStatusColor = () => {
    if (!isOnline || !isConnected) return 'text-red-500';
    return 'text-green-500';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (!isConnected) return 'Disconnected';
    return `Online (${connectionType})`;
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      {isOnline && isConnected ? (
        <Wifi className={`h-4 w-4 ${getStatusColor()}`} />
      ) : (
        <WifiOff className={`h-4 w-4 ${getStatusColor()}`} />
      )}
      <span className={getStatusColor()}>{getStatusText()}</span>
    </div>
  );
}
