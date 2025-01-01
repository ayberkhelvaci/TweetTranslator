import React, { useState, useEffect } from 'react';

interface ConfigurationFormProps {
  onSubmit: () => Promise<void>;
}

interface ConfigData {
  source_account: string;
  target_language: string;
  check_interval: number;
  registration_timestamp?: string;
}

export function ConfigurationForm({ onSubmit }: ConfigurationFormProps) {
  const [sourceAccount, setSourceAccount] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [checkInterval, setCheckInterval] = useState(30);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monitoringStarted, setMonitoringStarted] = useState<string | null>(null);

  // Load existing configuration
  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await fetch('/api/config');
        if (!response.ok) {
          throw new Error('Failed to load configuration');
        }
        const data: ConfigData = await response.json();
        
        setSourceAccount(data.source_account || '');
        setTargetLanguage(data.target_language || 'en');
        setCheckInterval(data.check_interval || 30);
        setMonitoringStarted(data.registration_timestamp || null);
      } catch (error) {
        console.error('Error loading configuration:', error);
        setError(error instanceof Error ? error.message : 'Failed to load configuration');
      } finally {
        setIsLoading(false);
      }
    }

    loadConfig();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_account: sourceAccount.replace(/^@/, ''), // Remove @ if present
          target_language: targetLanguage,
          check_interval: checkInterval,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save configuration');
      }

      await onSubmit();
    } catch (error) {
      console.error('Error saving configuration:', error);
      setError(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFetchTweets = async () => {
    setIsFetching(true);
    setError(null);

    try {
      const response = await fetch('/api/tweets/fetch', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch tweets');
      }

      await onSubmit();
    } catch (error) {
      console.error('Error fetching tweets:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch tweets');
    } finally {
      setIsFetching(false);
    }
  };

  const handleCancelMonitoring = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      const response = await fetch('/api/config', {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to cancel monitoring');
      }

      setMonitoringStarted(null);
      setSourceAccount('');
      setCheckInterval(30);
      setTargetLanguage('en');
      await onSubmit();
    } catch (error) {
      console.error('Error canceling monitoring:', error);
      setError(error instanceof Error ? error.message : 'Failed to cancel monitoring');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="bg-white rounded-2xl p-6 h-20" />
        <div className="bg-black rounded-2xl p-6 h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* API Information Section */}
      <div className="bg-white rounded-2xl p-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-black">API Information</h2>
          <div className="flex items-center space-x-4">
            <div className="px-4 py-1 bg-green-50 text-green-700 rounded-full text-sm">
              Active & Working
            </div>
            <a
              href="/settings/api-keys"
              className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-medium hover:bg-blue-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <span>Go to Credentials</span>
            </a>
          </div>
        </div>
      </div>

      {/* Configuration Section */}
      <div className="bg-black rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Configuration</h2>
        
        {/* Monitoring Status */}
        <div className="mb-8 border border-gray-800 rounded-xl p-6 bg-[#1a1d21]">
          {monitoringStarted ? (
            <div className="text-gray-300">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    <div className="absolute -inset-1 bg-green-500/20 rounded-full animate-ping" />
                  </div>
                  <span className="text-lg font-medium">Monitoring Active</span>
                </div>
                <button
                  onClick={handleCancelMonitoring}
                  disabled={isSaving}
                  className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-full text-sm hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Canceling...' : 'Cancel Monitoring'}
                </button>
              </div>
              <div className="space-y-2 ml-6">
                <div className="flex items-center space-x-2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Started on {formatDate(monitoringStarted)}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Checking every {checkInterval} minutes</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Monitoring {sourceAccount.startsWith('@') ? '' : '@'}{sourceAccount}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-300">
              <div className="flex items-center space-x-3 mb-3">
                <div className="relative">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                  <div className="absolute -inset-1 bg-yellow-500/20 rounded-full" />
                </div>
                <span className="text-lg font-medium">Monitoring Not Started</span>
              </div>
              <div className="ml-6 space-y-2">
                <div className="flex items-center space-x-2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Configure the settings below and save to start monitoring</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-gray-400 text-sm">
                Source Account
              </label>
              <input
                type="text"
                value={sourceAccount}
                onChange={(e) => setSourceAccount(e.target.value)}
                placeholder="@username"
                className="w-full px-4 py-2 bg-[#1a1d21] text-white rounded-lg placeholder-gray-500"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-gray-400 text-sm">
                Check Interval
              </label>
              <select
                value={checkInterval}
                onChange={(e) => setCheckInterval(Number(e.target.value))}
                className="w-full px-4 py-2 bg-[#1a1d21] text-white rounded-lg appearance-none"
                required
              >
                <option value={30}>Every 30 Minutes</option>
                <option value={5}>Every 5 Minutes</option>
                <option value={15}>Every 15 Minutes</option>
                <option value={60}>Every Hour</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-gray-400 text-sm">
              Target Language
            </label>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="w-full px-4 py-2 bg-[#1a1d21] text-white rounded-lg appearance-none"
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

          {error && (
            <div className="p-3 bg-red-900/10 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={handleFetchTweets}
              disabled={isFetching}
              className="px-6 py-2 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {isFetching ? 'Fetching...' : 'Fetch Tweets'}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 