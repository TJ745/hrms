import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { twoFactor } from "better-auth/plugins";
import { prisma } from "@/lib/prisma";
import { emailTemplates, sendMail } from "./nodemailer";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      const template = emailTemplates.resetPassword(user.name, url);
      await sendMail({
        to:      user.email,
        subject: template.subject,
        html:    template.html,
      });
    },
    password: {
      hash: async (password) => {
        const argon2 = await import("argon2");
        return argon2.hash(password);
      },
      verify: async ({ hash, password }) => {
        const argon2 = await import("argon2");
        return argon2.verify(hash, password);
      },
    },
  },

  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      const template = emailTemplates.verifyEmail(user.name, url);
      await sendMail({
        to:      user.email,
        subject: template.subject,
        html:    template.html,
      });
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24, // 24 hours
  },

  plugins: [
    twoFactor({
      issuer: "HRMS",
    }),
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,     // refresh if 1 day old
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },

  user: {
    additionalFields: {
      organizationId: { type: "string", required: false },
      branchId:       { type: "string", required: false },
      systemRole:     { type: "string", required: false, defaultValue: "EMPLOYEE" },
      preferredLanguage: { type: "string", required: false, defaultValue: "en" },
      timezone:       { type: "string", required: false },
      isActive:       { type: "boolean", required: false, defaultValue: true },
    },
  },

  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL!],
});

export type Session = typeof auth.$Infer.Session;
export type User    = typeof auth.$Infer.Session.user;
