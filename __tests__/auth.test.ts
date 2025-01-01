import { authOptions } from '../app/api/auth/options';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';

// Mock environment variables
process.env.TWITTER_CLIENT_ID = 'mock_client_id';
process.env.TWITTER_CLIENT_SECRET = 'mock_client_secret';
process.env.NEXTAUTH_URL = 'http://localhost:3000';

describe('Authentication Configuration', () => {
  it('should have correct Twitter provider configuration', () => {
    const provider = authOptions.providers[0] as any;
    expect(provider.id).toBe('twitter');
    expect(provider.version).toBe('2.0');
    expect(provider.authorization?.params?.scope).toBe('tweet.read tweet.write users.read offline.access');
  });

  it('should have correct callback configuration', () => {
    const callbacks = authOptions.callbacks;
    expect(callbacks).toBeDefined();
    if (callbacks) {
      expect(callbacks.jwt).toBeDefined();
      expect(callbacks.session).toBeDefined();
    }
  });

  it('should have correct pages configuration', () => {
    expect(authOptions.pages).toEqual({
      signIn: '/auth/signin',
      error: '/auth/error',
    });
  });

  it('should use JWT strategy', () => {
    const session = authOptions.session;
    expect(session).toBeDefined();
    if (session) {
      expect(session.strategy).toBe('jwt');
    }
  });
});

// Test the session handling
describe('Session Handling', () => {
  it('should handle missing session correctly', async () => {
    const mockReq = new NextRequest('http://localhost:3000');
    const session = await getServerSession(authOptions);
    expect(session).toBeNull();
  });
}); 