import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcrypt';
import sql from './lib/db';

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string;
        const password = credentials?.password as string;

        if (!email || !password) {
            return null;
        }

        try {
            const users = await sql`SELECT * FROM users WHERE email = ${email}`;
            const user = users[0];

            if (!user) {
              return null;
            }

            const isPasswordValid = await compare(password, user.password_hash);

            if (!isPasswordValid) {
              return null;
            }

            return {
                id: user.id,
                email: user.email,
                name: user.name,
            };
        } catch (error) {
             console.error("Auth error:", error);
             return null;
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});

