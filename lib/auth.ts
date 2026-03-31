import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { hasGoogleAuth, env } from "@/lib/env";
import { adminDb } from "@/lib/firebase-admin";
import { verifyOtpInMemory } from "@/lib/otp-store";

// Helper to safely check if we want to use DB (always yes if env set)
const useDatabase = env.FIREBASE_PROJECT_ID !== undefined || env.DATABASE_URL?.length > 0 !== undefined;

export const authOptions: NextAuthOptions = {
  debug: false,
  useSecureCookies:
    process.env.NODE_ENV === "production" || env.NEXTAUTH_URL.startsWith("https://"),
  session: {
    strategy: "jwt",
  },
  secret: env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    ...(hasGoogleAuth
      ? [
          GoogleProvider({
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
            authorization: {
              params: {
                prompt: "consent",
                access_type: "offline",
                response_type: "code",
                scope: "openid email profile https://www.googleapis.com/auth/calendar.events",
              },
            },
          }),
        ]
      : []),
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const email = credentials.email.toLowerCase();

        if (!useDatabase) return null;

        const usersRef = adminDb.collection("users");
        const snapshot = await usersRef.where("email", "==", email).limit(1).get();

        if (snapshot.empty) return null;

        const userDoc = snapshot.docs[0];
        const user = userDoc.data();

        if (!user.passwordHash) return null;

        const passwordValid = await compare(credentials.password, user.passwordHash);
        if (!passwordValid) return null;

        return {
          id: userDoc.id,
          email: user.email,
          name: user.name ?? user.email.split("@")[0],
        };
      },
    }),
    CredentialsProvider({
      id: "otp",
      name: "One-Time Password",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.code || credentials.code.length !== 6) {
          return null;
        }

        const email = credentials.email.toLowerCase();
        const code = credentials.code;

        if (!useDatabase) {
          const valid = await verifyOtpInMemory(email, code);
          if (!valid) return null;
          return {
            id: `otp:${email}`,
            email,
            name: email.split("@")[0],
          };
        }

        const otpRef = adminDb.collection("otpCodes");
        const snapshot = await otpRef
          .where("email", "==", email)
          .where("consumedAt", "==", null)
          .orderBy("createdAt", "desc")
          .limit(1)
          .get();

        if (snapshot.empty) return null;

        const otpDoc = snapshot.docs[0];
        const otp = otpDoc.data();

        // Check expiration manually since Firestore where('expiresAt', '>', date) 
        // conflicts with orderBy('createdAt', 'desc') without an index.
        // Convert Firestore Timestamp to Date if needed, else assume it's valid if it has toDate().
        let isExpired = true;
        if (otp.expiresAt && typeof otp.expiresAt.toDate === 'function') {
           isExpired = otp.expiresAt.toDate() <= new Date();
        } else if (otp.expiresAt) {
           isExpired = new Date(otp.expiresAt) <= new Date();
        }
        
        if (isExpired) return null;

        const valid = await compare(code, otp.codeHash);
        if (!valid) return null;

        await otpRef.doc(otpDoc.id).update({ consumedAt: new Date() });

        const usersRef = adminDb.collection("users");
        const userSnapshot = await usersRef.where("email", "==", email).limit(1).get();

        let userId = "";
        let userName = email.split("@")[0];

        if (userSnapshot.empty) {
          const newUserRef = await usersRef.add({
            email,
            name: userName,
            tier: "FREE",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          userId = newUserRef.id;
        } else {
          const existingUserDoc = userSnapshot.docs[0];
          userId = existingUserDoc.id;
          userName = existingUserDoc.data().name ?? userName;
        }

        return {
          id: userId,
          email: email,
          name: userName,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Manual mapping of OAuth users to Firestore
      if (account && account.provider === "google") {
        const email = user.email?.toLowerCase();
        if (!email) return false;

        const usersRef = adminDb.collection("users");
        const snapshot = await usersRef.where("email", "==", email).limit(1).get();

        if (snapshot.empty) {
          const newUser = await usersRef.add({
            email,
            name: user.name ?? email.split("@")[0],
            image: user.image ?? null,
            tier: "FREE",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          user.id = newUser.id;
        } else {
          user.id = snapshot.docs[0].id;
        }
      }
      return true;
    },
    async redirect({ url, baseUrl }) {
      const dashboardPath = "/dashboard";
      try {
        const callbackWasRelative = url.startsWith("/");
        const normalized = callbackWasRelative ? new URL(url, baseUrl) : new URL(url);

        if (!callbackWasRelative && normalized.origin !== baseUrl) return dashboardPath;

        const normalizedPath = normalized.pathname.replace(/^\/{2,}/, "/");
        const nextPath = `${normalizedPath}${normalized.search}${normalized.hash}`;

        if (
          normalizedPath === "/" ||
          normalizedPath === "/login" ||
          normalizedPath === "/signup" ||
          normalizedPath.startsWith("/api/auth")
        ) {
          return dashboardPath;
        }

        return nextPath.startsWith("/") ? nextPath : dashboardPath;
      } catch {
        return dashboardPath;
      }
    },
    async session({ session, user, token }) {
      if (session.user) {
        session.user.id = user?.id ?? (token.sub as string | undefined) ?? "";
        // @ts-ignore
        session.accessToken = token.accessToken;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id;
      }
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
  },
};


