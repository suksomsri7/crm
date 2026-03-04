import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log("[auth] Missing credentials");
            return null;
          }

          console.log("[auth] Attempting login for:", credentials.email);

          const user = await db.user.findUnique({
            where: { email: credentials.email as string },
            include: {
              userBrands: {
                include: {
                  brand: true,
                  role: {
                    include: {
                      rolePermissions: {
                        include: { permission: true },
                      },
                    },
                  },
                },
              },
            },
          });

          if (!user) {
            console.log("[auth] User not found");
            return null;
          }
          if (!user.isActive) {
            console.log("[auth] User is inactive");
            return null;
          }

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );
          if (!isValid) {
            console.log("[auth] Invalid password");
            return null;
          }

          console.log("[auth] Login successful for:", user.email);

          return {
            id: user.id,
            email: user.email,
            name: user.fullName,
            image: user.avatarUrl,
            isSuperAdmin: user.isSuperAdmin,
            brands: user.userBrands.map((ub) => ({
              id: ub.brand.id,
              name: ub.brand.name,
              logoUrl: ub.brand.logoUrl,
              roleId: ub.role.id,
              roleName: ub.role.name,
              permissions: ub.role.rolePermissions.map(
                (rp) => `${rp.permission.resource}:${rp.permission.action}`
              ),
            })),
          };
        } catch (error) {
          console.error("[auth] Authorize error:", error);
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as any;
        token.id = u.id;
        token.isSuperAdmin = u.isSuperAdmin;
        token.brands = u.brands;
        if (u.brands?.length > 0) {
          token.activeBrandId = u.brands[0].id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).isSuperAdmin = token.isSuperAdmin;
        (session.user as any).brands = token.brands;
        (session.user as any).activeBrandId = token.activeBrandId;
      }
      return session;
    },
  },
});
