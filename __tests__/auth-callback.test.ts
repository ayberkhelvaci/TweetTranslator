import { GET } from '../app/api/auth/callback/route';
import { NextResponse } from 'next/server';

describe('Auth Callback Route', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      NEXTAUTH_URL: 'http://localhost:3000',
      VERCEL_URL: 'test-app.vercel.app'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should handle missing parameters', async () => {
    const request = new Request('http://localhost:3000/api/auth/callback');
    const response = await GET(request);

    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(302); // Redirect status
    expect(response.headers.get('Location')).toContain('/auth/error?error=missing_params');
  });

  it('should handle valid parameters', async () => {
    const url = 'http://localhost:3000/api/auth/callback?code=test_code&state=test_state';
    const request = new Request(url);
    const response = await GET(request);

    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(302); // Redirect status
    expect(response.headers.get('Location')).toBe('http://localhost:3000');
  });

  it('should use correct base URL in production', async () => {
    process.env.NEXTAUTH_URL = undefined; // Simulate production where NEXTAUTH_URL might not be set
    const url = 'http://test-app.vercel.app/api/auth/callback?code=test_code&state=test_state';
    const request = new Request(url);
    const response = await GET(request);

    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('https://test-app.vercel.app');
  });

  it('should handle errors gracefully', async () => {
    const request = new Request('http://localhost:3000/api/auth/callback?error=access_denied');
    const response = await GET(request);

    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toContain('/auth/error');
  });
}); 