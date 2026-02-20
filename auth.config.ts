import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAuthPage = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register');
      
      // Allow access to public API routes and static files (handled by matcher in middleware, but double check here if needed)
      // Actually, middleware matcher is the primary guard. 
      // This callback is for the "authorized" check.

      if (isOnAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL('/', nextUrl));
        }
        return true;
      }

      // Provide more specific logic if needed, but for now:
      // If not logged in, return false (which redirects to login)
      return isLoggedIn;
    },
  },
  providers: [], // Providers added in auth.ts
  secret: process.env.AUTH_SECRET,
} satisfies NextAuthConfig;
