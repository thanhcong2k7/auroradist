import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface MaintenanceBarProps {
  isActive: boolean;
  message: string;
  onDismiss?: () => void;
  type?: 'maintenance' | 'warning' | 'info';
}

const MaintenanceBar: React.FC<MaintenanceBarProps> = ({
  isActive,
  message,
  onDismiss,
  type = 'maintenance',
}) => {
  if (!isActive) return null;

  const bgColor =
    type === 'maintenance'
      ? 'bg-yellow-900/80 border-yellow-700'
      : type === 'warning'
      ? 'bg-red-900/80 border-red-700'
      : 'bg-blue-900/80 border-blue-700';

  const textColor =
    type === 'maintenance'
      ? 'text-yellow-200'
      : type === 'warning'
      ? 'text-red-200'
      : 'text-blue-200';

  const iconColor =
    type === 'maintenance'
      ? 'text-yellow-400'
      : type === 'warning'
      ? 'text-red-400'
      : 'text-blue-400';

  return (
    <div
      className={`fixed top-0 left-0 right-0 ${bgColor} border-b ${textColor} px-4 py-3 flex items-center justify-between gap-4 z-[9999]`}
    >
      <div className="flex items-center gap-3 flex-1">
        <AlertCircle className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
        <span className="text-sm font-medium">{message}</span>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={`flex-shrink-0 p-1 hover:bg-black/20 rounded transition-colors ${iconColor}`}
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default MaintenanceBar;
