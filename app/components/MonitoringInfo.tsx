import React from 'react';
import { format } from 'date-fns';

interface MonitoringInfoProps {
  sourceAccount: string;
  startDate: string;
  onCancel: () => void;
}

export function MonitoringInfo({ sourceAccount, startDate, onCancel }: MonitoringInfoProps) {
  return (
    <div className="bg-gray-900 rounded-xl p-4 mb-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-sm font-medium text-white">Active Monitoring</h3>
          <p className="mt-1 text-sm text-gray-400">
            Monitoring tweets from <span className="font-medium text-white">{sourceAccount.startsWith('@') ? sourceAccount : `@${sourceAccount}`}</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Started on {format(new Date(startDate), 'MMMM d, yyyy h:mm a')}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-sm text-red-400 hover:text-red-300 font-medium transition-colors"
        >
          Cancel Monitoring
        </button>
      </div>
    </div>
  );
} 