import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { Rol } from "@/lib/rbac";
import { resolveEntraLogin } from "@/lib/auth/entra-provision";

// Fase 1 — el provider Entra solo se activa si está configurado (env). En dev sin
// credenciales Entra, el login sigue 100% por credenciales/mock, sin romperse.
const entraConfigured = !!process.env.ENTRA_CLIENT_ID && !!process.env.ENTRA_CLIENT_SECRET;
const entraProviders = entraConfigured
  ? [MicrosoftEntraID({
      clientId: process.env.ENTRA_CLIENT_ID!,
      clientSecret: process.env.ENTRA_CLIENT_SECRET!,
      // Multi-tenant: autoridad /organizations (work/school). Configurable por env:
      // ENTRA_ISSUER=.../common/v2.0 admite también cuentas Microsoft personales
      // (solo para demo; requiere App Registration con audiencia que incluya MSA).
      issuer: process.env.ENTRA_ISSUER ?? "https://login.microsoftonline.com/organizations/v2.0",
      authorization: { params: { scope: "openid profile email" } },
    })]
  : [];

// ────────────────────────────────────────────────────────────────────
// Tipos extendidos en sesión y JWT
// ────────────────────────────────────────────────────────────────────
declare module "next-auth" {
  interface Session {
    user: {
      id: string; // auth.js native (stringified usuario.id)
      userId: number;
      nombre: string;
      correo: string;
      rol: Rol;
      organizacion_id: number;
      tenant_id: number;
      azure_oid: string | null;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId: number;
    nombre: string;
    correo: string;
    rol: Rol;
    organizacion_id: number;
    tenant_id: number;
    azure_oid: string | null;
  }
}

// ────────────────────────────────────────────────────────────────────
// Schemas de input
// ────────────────────────────────────────────────────────────────────
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ────────────────────────────────────────────────────────────────────
// HU01 — auth.ts (next-auth v5)
//   - CredentialsProvider "credentials": email + password con bcrypt
//   - MicrosoftEntraID: login empresarial real (OIDC multi-tenant), env-gated.
// El provider "ms-simulated" (mock de dev) fue retirado: era un login sin
// contraseña por correo (backdoor) que no debe existir con Entra real activo.
// ────────────────────────────────────────────────────────────────────
export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      id: "credentials",
      name: "Email y contraseña",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const u = await prisma.usuario.findUnique({
          where: { correo: email.toLowerCase().trim() },
          include: { organizacion: { select: { id: true, tenant_id: true } } },
        });
        if (!u || u.estado !== "activo") return null;
        // Usuarios solo-Entra (sin password) NO pueden autenticar por credenciales.
        if (!u.password_hash) return null;

        const ok = await bcrypt.compare(password, u.password_hash);
        if (!ok) return null;

        // Update ultimo_acceso_at (fire-and-forget no es buena idea con Prisma; await)
        await prisma.usuario.update({
          where: { id: u.id },
          data: { ultimo_acceso_at: new Date() },
        });

        return {
          id: String(u.id),
          name: u.nombre,
          email: u.correo,
          // Extra fields propagados al JWT vía callback
          _userId: u.id,
          _rol: u.rol as Rol,
          _organizacion_id: u.organizacion_id,
          _tenant_id: u.organizacion.tenant_id,
          _azure_oid: u.azure_oid,
        } as never;
      },
    }),

    ...entraProviders,
  ],
  callbacks: {
    // Fase 1 — provisioning/resolución del login Entra (multi-tenant + JIT).
    // Para credentials/mock no hace nada (deja pasar). Para Entra resuelve el
    // Usuario y adjunta los campos que el callback jwt ya espera (_userId, etc.).
    async signIn({ user, account, profile }) {
      if (account?.provider !== "microsoft-entra-id") return true;
      const c = (profile ?? {}) as Record<string, unknown>;
      const res = await resolveEntraLogin({
        tid: String(c.tid ?? ""),
        oid: String(c.oid ?? ""),
        email: String(c.email ?? c.preferred_username ?? ""),
        name: String(c.name ?? ""),
      });
      if (!res.ok) return `/login?error=${res.error}`;
      const u = user as Record<string, unknown>;
      u._userId = res.user.userId;
      u._rol = res.user.rol;
      u._organizacion_id = res.user.organizacion_id;
      u._tenant_id = res.user.tenant_id;
      u._azure_oid = res.user.azure_oid;
      u.name = res.user.nombre;
      u.email = res.user.correo;
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      // First sign-in: copia fields del authorize al token
      if (user) {
        const u = user as unknown as {
          _userId: number;
          _rol: Rol;
          _organizacion_id: number;
          _tenant_id: number;
          _azure_oid: string | null;
        };
        token.userId = u._userId;
        token.nombre = user.name ?? "";
        token.correo = user.email ?? "";
        token.rol = u._rol;
        token.organizacion_id = u._organizacion_id;
        token.tenant_id = u._tenant_id;
        token.azure_oid = u._azure_oid;
      }
      // Update session: permitir refresh del azure_oid después de vincular MS (HU05)
      if (trigger === "update" && session?.user) {
        const sessUser = session.user as { azure_oid?: string | null };
        if ("azure_oid" in sessUser) token.azure_oid = sessUser.azure_oid ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: String(token.userId),
        userId: token.userId,
        nombre: token.nombre,
        correo: token.correo,
        rol: token.rol,
        organizacion_id: token.organizacion_id,
        tenant_id: token.tenant_id,
        azure_oid: token.azure_oid,
      };
      return session;
    },
  },
});
