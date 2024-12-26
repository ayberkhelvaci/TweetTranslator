import NextAuth, { NextAuthOptions, User } from 'next-auth';
import TwitterProvider from 'next-auth/providers/twitter';
import { supabase } from '@/lib/supabase';

interface TwitterProfile {
  data: {
    id: string;
    name: string;
    username: string;
    profile_image_url: string;
  };
}

export const authOptions: NextAuthOptions = {
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: "2.0",
      authorization: {
        url: "https://twitter.com/i/oauth2/authorize",
        params: {
          scope: "users.read tweet.read tweet.write offline.access",
          prompt: "login consent",
          access_type: "offline",
          force_login: "true"
        }
      },
      profile(profile: TwitterProfile): User {
        return {
          id: profile.data.id,
          name: profile.data.name,
          email: `${profile.data.username}@twitter.com`,
          image: profile.data.profile_image_url,
          twitter_username: profile.data.username,
          twitter_id: profile.data.id,
        };
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        console.log('Sign in attempt:', { user, profile });

        if (!user?.id) {
          console.error('Missing user ID from Twitter');
          return false;
        }

        const twitterId = user.id;
        const twitterUsername = user.twitter_username;
        
        if (!twitterId || !twitterUsername) {
          console.error('Missing Twitter profile data');
          return '/auth/error?error=AccessDenied';
        }

        // Check if user exists
        console.log('Checking if user exists:', { twitterId });
        let { data: existingUser, error: selectError } = await supabase
          .from('users')
          .select('*')
          .eq('twitter_id', twitterId)
          .single();

        console.log('Existing user check result:', { existingUser, error: selectError });

        if (selectError && selectError.code !== 'PGRST116') {
          console.error('Error checking user:', selectError);
          return '/auth/error?error=Database';
        }

        if (!existingUser) {
          console.log('Creating new user');
          // Create new user
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
              twitter_username: twitterUsername,
              twitter_id: twitterId,
              name: user.name || null,
              email: user.email,
              image: user.image || null,
            })
            .select()
            .single();

          console.log('New user creation result:', { newUser, error: insertError });

          if (insertError) {
            console.error('Error creating user:', insertError);
            return '/auth/error?error=Database';
          }

          existingUser = newUser;

          // Create initial config for new user
          console.log('Creating initial config for user:', existingUser.id);
          const { error: configError } = await supabase
            .from('config')
            .insert({
              user_id: existingUser.id,
              source_account: twitterUsername,
              target_language: 'en',
              check_interval: 5
            });

          console.log('Config creation result:', { error: configError });

          if (configError) {
            console.error('Error creating config:', configError);
          }
        }

        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return '/auth/error?error=Callback';
      }
    },
    async session({ session, token }) {
      try {
        console.log('Session callback:', { token });
        
        if (!token.sub) {
          console.log('No token.sub found');
          return session;
        }

        // Get user by twitter_id
        console.log('Looking up user by twitter_id:', token.sub);
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('twitter_id', token.sub)
          .single();

        console.log('User lookup result:', { user, error });

        if (error) {
          console.error('Error in session callback:', error);
          return session;
        }

        return {
          ...session,
          user: {
            ...session.user,
            id: user.id,
            twitter_username: user.twitter_username,
            twitter_id: user.twitter_id,
          },
        };
      } catch (error) {
        console.error('Error in session callback:', error);
        return session;
      }
    },
    async jwt({ token, account, profile, user }) {
      if (profile) {
        console.log('JWT callback with profile:', { profile, user });
        token.sub = user.id;
      }
      console.log('JWT token:', token);
      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  debug: true,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 