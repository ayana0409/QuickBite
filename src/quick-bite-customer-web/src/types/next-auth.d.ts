import { DefaultSession, DefaultUser } from "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    idToken?: string;
    refreshToken?: string;
    error?: string;
    user: {
      id?: string;
      role?: string;
      roles?: string[];
      provider?: string;
      isGoogle?: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id?: string;
    role?: string;
    roles?: string[];
    accessToken?: string;
    idToken?: string;
    refreshToken?: string;
    provider?: string;
    isGoogle?: boolean;
  }
}

declare module "next-auth/adapters" {
  interface AdapterUser {
    id?: string;
    role?: string;
    roles?: string[];
    accessToken?: string;
    idToken?: string;
    refreshToken?: string;
    provider?: string;
    isGoogle?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    idToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: string;
    roles?: string[];
    role?: string;
    id?: string;
    provider?: string;
    isGoogle?: boolean;
  }
}
