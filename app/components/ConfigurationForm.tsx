import React, { useState, useEffect } from 'react';
import { MonitoringInfo } from './MonitoringInfo';
import { toast } from 'react-hot-toast';

interface ConfigFormData {
  source_account: string;
  check_interval: number;
  target_language: string;
}

interface ConfigurationFormProps {
  onSubmit: (data: ConfigFormData) => Promise<any>;
  initialData?: ConfigFormData & {
    registration_timestamp?: string;
  };
}

const CHECK_INTERVALS = [
  { label: 'Every 15 Minutes', value: 15 },
  { label: 'Every 30 Minutes', value: 30 },
  { label: 'Every Hour', value: 60 },
  { label: 'Every 2 Hours', value: 120 },
  { label: 'Every 6 Hours', value: 360 },
  { label: 'Every 12 Hours', value: 720 },
  { label: 'Every Day', value: 1440 }
];

export function ConfigurationForm({ onSubmit, initialData }: ConfigurationFormProps) {
  const [sourceAccount, setSourceAccount] = useState(initialData?.source_account?.replace(/^@+/, '') || '');
  const [checkInterval, setCheckInterval] = useState(initialData?.check_interval || 30);
  const [targetLanguage, setTargetLanguage] = useState(initialData?.target_language || 'en');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [monitoringStarted, setMonitoringStarted] = useState<string | null>(initialData?.registration_timestamp || null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [rateLimitReset, setRateLimitReset] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (initialData) {
      setSourceAccount(initialData.source_account?.replace(/^@+/, '') || '');
      setCheckInterval(initialData.check_interval || 30);
      setTargetLanguage(initialData.target_language || 'en');
      setMonitoringStarted(initialData.registration_timestamp || null);
    }
  }, [initialData]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev ? prev - 1 : null);
      }, 1000);
    } else if (countdown === 0) {
      setRateLimitReset(null);
      setCountdown(null);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData: ConfigFormData = {
        source_account: sourceAccount,
        check_interval: checkInterval,
        target_language: targetLanguage
      };
      
      await onSubmit(formData);
      setMonitoringStarted(new Date().toISOString());
      toast.success('Configuration saved successfully');
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFetchTweets = async () => {
    if (isFetching || countdown) return;
    
    setIsFetching(true);
    try {
      const response = await fetch('/api/tweets/fetch', {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || 'Failed to fetch tweets';
        
        // Check if it's a rate limit error
        if (errorMessage.includes('Rate limit exceeded')) {
          const minutes = parseInt(errorMessage.match(/(\d+) minutes/)?.[1] || '0');
          if (minutes > 0) {
            setRateLimitReset(Date.now() + minutes * 60 * 1000);
            setCountdown(minutes * 60);
            toast.error(`Rate limit exceeded. Please wait ${minutes} minutes.`);
            return;
          }
        }
        
        throw new Error(errorMessage);
      }

      toast.success(data.message || 'Successfully fetched tweets');
    } catch (error) {
      console.error('Error fetching tweets:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch tweets');
    } finally {
      setIsFetching(false);
    }
  };

  const handleCancelMonitoring = async () => {
    try {
      const response = await fetch('/api/config', {
        method: 'DELETE'
      });

      if (response.ok) {
        setMonitoringStarted(null);
        setSourceAccount('');
        setCheckInterval(30);
        setTargetLanguage('en');
        toast.success('Monitoring cancelled successfully');
      } else {
        toast.error('Failed to cancel monitoring');
      }
    } catch (error) {
      console.error('Error canceling monitoring:', error);
      toast.error('Failed to cancel monitoring');
    }
  };

  const selectedInterval = CHECK_INTERVALS.find(interval => interval.value === checkInterval);

  const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {monitoringStarted && (
        <MonitoringInfo
          sourceAccount={sourceAccount}
          startDate={monitoringStarted}
          onCancel={handleCancelMonitoring}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Source Account */}
          <div className="space-y-2">
            <label className="block text-gray-400 text-sm">
              Source Account
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-gray-400">
                @
              </span>
              <input
                type="text"
                value={sourceAccount}
                onChange={(e) => setSourceAccount(e.target.value)}
                placeholder="username"
                className="w-full pl-8 pr-4 py-2.5 bg-gray-900 text-white rounded-xl placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Check Interval */}
          <div className="space-y-2">
            <label className="block text-gray-400 text-sm">
              Check Interval
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full px-4 py-2.5 bg-gray-900 text-white rounded-xl flex items-center justify-between hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span>{selectedInterval?.label || 'Select interval'}</span>
                <svg
                  className={`w-5 h-5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-2 bg-gray-900 rounded-xl shadow-lg">
                  <div className="py-1">
                    {CHECK_INTERVALS.map((interval) => (
                      <button
                        key={interval.value}
                        type="button"
                        onClick={() => {
                          setCheckInterval(interval.value);
                          setIsDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-white hover:bg-gray-800 transition-colors"
                      >
                        {interval.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Target Language */}
        <div className="space-y-2">
          <label className="block text-gray-400 text-sm">
            Target Language
          </label>
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-900 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="pt">Portuguese</option>
            <option value="tr">Turkish</option>
          </select>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={handleFetchTweets}
            disabled={isFetching || !monitoringStarted || Boolean(countdown)}
            className="px-6 py-2.5 bg-gray-600 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isFetching ? 'Fetching...' : countdown ? `Wait ${formatCountdown(countdown)}` : 'Fetch Tweets'}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
} 