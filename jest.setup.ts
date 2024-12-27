import '@testing-library/jest-dom';

// Mock crypto for Twitter webhook tests
const mockCrypto = {
  createHmac: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mock-signature'),
  }),
  timingSafeEqual: jest.fn().mockReturnValue(true),
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

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    };
  },
  useSearchParams() {
    return {
      get: jest.fn(),
    };
  },
})); 