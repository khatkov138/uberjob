"use client";

import { GitHubIcon } from "@/components/icons/GitHubIcon";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { LoadingButton } from "@/components/loading-button";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import {
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod"; 
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const signInSchema = z.object({
  email: z.email({ message: "Please enter a valid email" }),
  password: z.string().min(1, { message: "Password is required" }),
  rememberMe: z.boolean().optional(),
});

type SignInValues = z.infer<typeof signInSchema>;

export function SignInForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  const redirect = searchParams.get("redirect")


  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  async function onSubmit({ email, password, rememberMe }: SignInValues) {

    setError(null);
    setLoading(true)

    const { error } = await authClient.signIn.email({
      email,
      password,
      rememberMe
    })
    setLoading(false)

    if (error) {
      setError(error.message || "Something went wrong")

    } else {
      toast.success("signed in successfully")
      router.push(redirect ?? "/")
      router.refresh()
    }
  }

  async function handleSocialSignIn(provider: "google" | "github") {
    setError(null);
    setLoading(true)

    const { error } = await authClient.signIn.social({
      provider,
      callbackURL: redirect ?? "/dashboard"
    })
    setLoading(false)

    if (error) {
      setError(error.message || "Something went wrong")
    }
  }


  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Sign In</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Enter your email below to login to your account
        </CardDescription>
      </CardHeader>
      <CardContent>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  {...field}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <Field>
                <div className="flex items-center">
                  <FieldLabel>Password</FieldLabel>
                  <Link
                    href="/forgot-password"
                    className="ml-auto inline-block text-sm underline"
                  >
                    Forgot your password?
                  </Link>
                </div>

                <PasswordInput
                  autoComplete="current-password"
                  placeholder="Password"
                  {...field}
                />

                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <Field orientation="horizontal">

                <Checkbox
                  id="checkbox_rememberMe"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                <FieldLabel
                  htmlFor="checkbox_rememberMe"
                >Remember me</FieldLabel>
              </Field>
            )}
          />

          {error && (
            <div role="alert" className="text-sm text-red-600">
              {error}
            </div>
          )}

          <LoadingButton type="submit" className="w-full" loading={loading}>
            Login
          </LoadingButton>

          <div className="flex w-full flex-col items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              disabled={loading}
              onClick={() => handleSocialSignIn("google")}
            >
              <GoogleIcon width="0.98em" height="1em" />
              Sign in with Google
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              disabled={loading}
              onClick={() => handleSocialSignIn("github")}
            >
              <GitHubIcon />
              Sign in with Github
            </Button>
          </div>
        </form>

      </CardContent>
      <CardFooter>
        <div className="flex w-full justify-center border-t pt-4">
          <p className="text-muted-foreground text-center text-xs">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="underline">
              Sign up
            </Link>
          </p>
        </div>
      </CardFooter>
    </Card>
  );
}
