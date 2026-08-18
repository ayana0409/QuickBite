import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const identityUrl = process.env.OIDC_ISSUER || process.env.NEXT_PUBLIC_IDENTITY_URL || "https://quick-bite-identity.onrender.com";

export function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    // 1. Password Credentials Provider (Directly authenticates with Identity Service /connect/token)
    CredentialsProvider({
      id: "credentials",
      name: "QuickBite Account",
      credentials: {
        username: { label: "Username / Email", type: "text", placeholder: "admin / merchant / your email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu");
        }

        const params = new URLSearchParams();
        params.append("grant_type", "password");
        params.append("client_id", process.env.OIDC_CLIENT_ID || "quickbite_web");
        params.append("client_secret", process.env.OIDC_CLIENT_SECRET || "1q2w3e*");
        params.append("scope", "openid profile email phone roles Identity");
        params.append("username", credentials.username.trim());
        params.append("password", credentials.password);

        try {
          const res = await fetch(`${identityUrl}/connect/token`, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(
              err.error_description || "Đăng nhập thất bại. Kiểm tra lại thông tin tài khoản!"
            );
          }

          const tokenData = await res.json();
          console.log("🔑 [NextAuth Credentials] Token received from /connect/token. Has access_token:", !!tokenData?.access_token);
          const claims =
            parseJwt(tokenData.access_token) || parseJwt(tokenData.id_token) || {};

          const rawRoles = claims.role || claims.roles;
          const roles = Array.isArray(rawRoles)
            ? rawRoles
            : rawRoles
            ? [rawRoles]
            : ["Customer"];

          const username =
            claims.preferred_username || claims.given_name || claims.sub || credentials.username;
          const fullName = claims.name || claims.given_name || username;

          return {
            id: claims.sub || "user-id",
            name: fullName,
            email: claims.email || `${username}@quickbite.internal`,
            role: roles[0] || "Customer",
            roles: roles,
            accessToken: tokenData.access_token,
            idToken: tokenData.id_token,
            refreshToken: tokenData.refresh_token,
          };
        } catch (e: any) {
          console.error("❌ [NextAuth Credentials Error]:", e.message);
          throw new Error(e.message || "Không thể kết nối đến Identity Service");
        }
      },
    }),

    // 2. OpenID Connect OAuth Provider (SSO)
    {
      id: "oidc",
      name: "QuickBite SSO",
      type: "oauth",
      issuer: identityUrl.endsWith("/") ? identityUrl : `${identityUrl}/`,
      authorization: {
        url: `${identityUrl}/connect/authorize`,
        params: {
          scope: "openid email profile roles",
          response_type: "code",
        },
      },
      token: {
        url: `${identityUrl}/connect/token`
      },
      userinfo: {
        url: `${identityUrl}/connect/userinfo`
      },
      jwks_endpoint: `${identityUrl}/.well-known/jwks`,
      client: {
        token_endpoint_auth_method: "client_secret_post",
      },
      clientId: process.env.OIDC_CLIENT_ID || "quickbite_web",
      clientSecret: process.env.OIDC_CLIENT_SECRET || "1q2w3e*",
      idToken: true,
      checks: ["pkce", "state"],
      profile(profile) {
        const roles = Array.isArray(profile.role)
          ? profile.role
          : Array.isArray(profile.roles)
          ? profile.roles
          : profile.role
          ? [profile.role]
          : profile.roles
          ? [profile.roles]
          : [];

        return {
          id: profile.sub,
          name: profile.name || profile.preferred_username || profile.email || "User",
          email: profile.email,
          image: profile.picture || null,
          role: roles[0] || "Customer",
          roles: roles,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Credentials provider: accessToken is on the user object returned from authorize()
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.roles = user.roles;
        token.accessToken = (user as any).accessToken;
        token.idToken = (user as any).idToken;
        token.refreshToken = (user as any).refreshToken;
        console.log("🎫 [JWT Callback] User logged in. Token has accessToken:", !!token.accessToken);
      }

      // SSO provider: accessToken comes from account.access_token — only overwrite when it exists.
      // CredentialsProvider does NOT provide account.access_token, so skipping it prevents
      // accidentally overwriting the accessToken set above with undefined.
      if (account && account.access_token) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : 0;
        console.log("🎫 [JWT Callback] SSO Account connected. Token has accessToken:", !!token.accessToken);
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.roles = token.roles as string[];
      }

      session.accessToken = token.accessToken as string;
      session.idToken = token.idToken as string;
      session.error = token.error as string;

      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || "quickbite-super-secret-key-for-nextauth-2026-f8a7e3d2",
  debug: true,
};
