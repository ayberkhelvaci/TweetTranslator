import '@testing-library/jest-dom';
import 'jest-environment-jsdom';

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
) as jest.Mock;

// Mock environment variables
process.env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
  OPENAI_API_KEY: 'test-openai-key',
  TWITTER_CONSUMER_SECRET: 'test-secret',
  TWITTER_CLIENT_ID: 'test-client-id',
  TWITTER_CLIENT_SECRET: 'test-client-secret',
  UPSTASH_REDIS_URL: 'test-redis-url',
  UPSTASH_REDIS_TOKEN: 'test-redis-token'
};

// Mock crypto for Twitter webhook tests
const mockCrypto = {
  createHmac: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mock-signature')
  }),
  timingSafeEqual: jest.fn().mockReturnValue(true)
};

global.crypto = mockCrypto as any;

// Mock Request/Response/Headers
if (typeof Request === 'undefined') {
  global.Request = jest.fn() as unknown as typeof Request;
}
if (typeof Response === 'undefined') {
  global.Response = jest.fn() as unknown as typeof Response;
}
if (typeof Headers === 'undefined') {
  global.Headers = jest.fn() as unknown as typeof Headers;
} 