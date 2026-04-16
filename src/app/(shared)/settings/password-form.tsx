"use client";

import { LoadingButton } from "@/components/loading-button";
import { PasswordInput } from "@/components/password-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

import { authClient } from "@/lib/auth-client";
import { passwordSchema } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const updatePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, { message: "Current password is required" }),
  newPassword: passwordSchema,
});

type UpdatePasswordValues = z.infer<typeof updatePasswordSchema>;

export function PasswordForm() {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<UpdatePasswordValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
    },
  });

  async function onSubmit({
    currentPassword,
    newPassword,
  }: UpdatePasswordValues) {
    setStatus(null)
    setError(null)

    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true
    })

    if (error) {
      setError(error.message || "Failed to change password")
    } else {
      setStatus("Password changed")
      form.reset()
    }
  }

  const loading = form.formState.isSubmitting;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
      </CardHeader>
      <CardContent>

        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          {/* OAuth users (without a password) can use the "forgot password" flow */}
          <Controller
            control={form.control}
            name="currentPassword"
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel>Current Password</FieldLabel>

                <PasswordInput {...field} placeholder="Current password" />

                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="newPassword"
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel>New Password</FieldLabel>

                <PasswordInput {...field} placeholder="New password" />

                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {error && (
            <div role="alert" className="text-sm text-red-600">
              {error}
            </div>
          )}
          {status && (
            <div role="status" className="text-sm text-green-600">
              {status}
            </div>
          )}
          <LoadingButton type="submit" loading={loading}>
            Change password
          </LoadingButton>
        </form>

      </CardContent>
    </Card>
  );
}
