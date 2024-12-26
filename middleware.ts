import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  matcher: [
    '/settings/:path*',
    '/api/config/:path*',
    '/api/monitor/:path*',
    '/api/keys/:path*',
  ],
}; 