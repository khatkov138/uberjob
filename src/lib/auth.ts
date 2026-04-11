import { APIError, betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { createAuthMiddleware } from "better-auth/api"
import { sendEmail } from "./email";
import { passwordSchema } from "./validation";

import prisma from "./prisma";


export const auth = betterAuth({

    database: prismaAdapter(prisma, {
        provider: "postgresql"
    }),
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!
        },
        github: {
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!
        },
    },
    emailAndPassword: {
        // minPasswordLength:8,
        // requireEmailVerification:true // only if you want to block login completely
        enabled: true,
        async sendResetPassword({ user, url }) {
            await sendEmail({
                to: user.email,
                subject: "Reset your password",
                text: `Click the link to reset your password: ${url}`
            })
        }
    },
    emailVerification: {

        // sendOnSignUp: true,
        autoSignInAfterVerification: true,
        async sendVerificationEmail({ user, url, }) {
           
            await sendEmail({
                to: user.email,
                subject: "Verify your email",
                text: `Click the link to verify your email: ${url}`
            })
        }
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24 * 1, // 1 day
    },
    user: {
        changeEmail: {
            enabled: true,
            async sendChangeEmailConfirmation({ user, newEmail, url }) {
                await sendEmail({
                    to: user.email,
                    subject: "Approve email change",
                    text: `Your email has been changed to "${newEmail}. Click the link to approve the change: ${url}`
                })
            },
        },
        additionalFields: {
            role: {
                type: "string",
                input: false
            }
        }
    },
    hooks: {
        before: createAuthMiddleware(async ctx => {
            if (
                ctx.path === "/sign-up/email" ||
                ctx.path === "/reset-password" ||
                ctx.path === "/change-password"
            ) {
                const password = ctx.body.password || ctx.body.newPassword;
                const { error } = passwordSchema.safeParse(password)
                if (error) {
                    throw new APIError("BAD_REQUEST", {
                        message: "Password not strong enough"
                    })
                }

            }
        })
    }
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;