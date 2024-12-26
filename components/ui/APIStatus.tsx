import React from 'react';
import { CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';

type APIStatus = 'active' | 'needs_update' | 'missing';

interface APIStatusProps {
  status: APIStatus;
}

const statusConfig = {
  active: {
    icon: CheckCircle,
    text: 'Active & Working',
    className: 'text-green-600',
  },
  needs_update: {
    icon: AlertTriangle,
    text: 'Needs Update',
    className: 'text-yellow-500',
  },
  missing: {
    icon: AlertCircle,
    text: 'API Keys Missing',
    className: 'text-red-500',
  },
};

export function APIStatus({ status }: APIStatusProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="w-full bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold">API Information</h2>
          {status !== 'active' && (
            <Icon className={`w-6 h-6 ${config.className}`} />
          )}
        </div>
        <div className={`px-4 py-1.5 rounded-full border ${config.className} border-current`}>
          {config.text}
        </div>
      </div>
    </div>
  );
} 