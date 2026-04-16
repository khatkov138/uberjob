"use client";

import { LoadingButton } from "@/components/loading-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";

export const updateEmailSchema = z.object({
  newEmail: z.email({ message: "Enter a valid email" }),
});

export type UpdateEmailValues = z.infer<typeof updateEmailSchema>;

interface EmailFormProps {
  currentEmail: string;
}

export function EmailForm({ currentEmail }: EmailFormProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<UpdateEmailValues>({
    resolver: zodResolver(updateEmailSchema),
    defaultValues: {
      newEmail: currentEmail,
    },
  });

  async function onSubmit({ newEmail }: UpdateEmailValues) {

    setStatus(null)
    setError(null)

    const { error } = await authClient.changeEmail({
      newEmail, callbackURL: "/email-verified"
    })

    if (error) {
      setError(error.message || "Failed to initiate email change");
    } else {
      setStatus("Verification email sent to your current address")

    }
  }
  const loading = form.formState.isSubmitting;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Email</CardTitle>
      </CardHeader>
      <CardContent>
       
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <Controller
              control={form.control}
              name="newEmail"
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel>New Email</FieldLabel>
                
                    <Input
                      type="email"
                      placeholder="new@email.com"
                      {...field}
                    />
                  
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
              Request change
            </LoadingButton>
          </form>
       
      </CardContent>
    </Card>
  );
}
