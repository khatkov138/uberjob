import type { Metadata } from "next";
import { EmailForm } from "./email-form";
import { LogoutEverywhereButton } from "./logout-everywhere-button";
import { PasswordForm } from "./password-form";
import { ProfileDetailsForm } from "./profile-details-form";
import { getServerSession } from "@/lib/get-session";
import { unauthorized } from "next/navigation";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MailIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {

  const session = await getServerSession();
  const user = session?.user;

  if (!user) unauthorized()

  return (
    <main>

      <div className="space-y-6">
        {!user.emailVerified && <EmailVerificationAlert />}
      

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Profile</h1>
          <p className="text-muted-foreground">
            Update your account details, email, and password.
          </p>
        </div>
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1">
            <ProfileDetailsForm user={user} />
          </div>
          <div className="flex-1 space-y-6">
            <EmailForm currentEmail={user.email} />
            <PasswordForm />
            <LogoutEverywhereButton />
          </div>
        </div>
      </div>


    </main>
  );
}



function EmailVerificationAlert() {
  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800/50 dark:bg-yellow-950/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MailIcon className="size-5 text-yellow-600 dark:text-yellow-400" />
          <span className="text-yellow-800 dark:text-yellow-200">
            Please verify your email address to access all features.
          </span>
        </div>
        <Button size="sm" asChild>
          <Link href="/verify-email">Verify Email</Link>
        </Button>
      </div>
    </div>
  );
}