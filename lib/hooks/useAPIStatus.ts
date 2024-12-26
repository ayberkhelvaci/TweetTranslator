import { useEffect, useState } from 'react';

export type APIStatus = 'active' | 'needs_update' | 'missing';

export function useAPIStatus() {
  const [status, setStatus] = useState<APIStatus>('missing');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAPIStatus() {
      try {
        console.log('Checking API status on client...');
        
        // Check if required environment variables are set
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          console.log('Missing Supabase environment variables');
          setStatus('missing');
          return;
        }

        // Make API call to check API keys
        const response = await fetch('/api/check-api-status');
        const data = await response.json();

        console.log('API status response:', data);

        if (!data.success) {
          console.log('API check failed:', data);
          setStatus('missing');
          return;
        }

        setStatus(data.status);
      } catch (error) {
        console.error('Error checking API status:', error);
        setStatus('needs_update');
      } finally {
        setIsLoading(false);
      }
    }

    checkAPIStatus();
  }, []);

  return { status, isLoading };
} 