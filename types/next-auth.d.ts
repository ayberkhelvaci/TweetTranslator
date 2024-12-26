import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface User {
    twitter_username?: string;
    twitter_id?: string;
  }

  interface Session {
    user: User & {
      id: string;
      twitter_username?: string;
      twitter_id?: string;
    };
  }
} 