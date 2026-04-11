"use client";

import { LoadingButton } from "@/components/loading-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/user-avatar";
import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { User } from "better-auth";
import { XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().trim().min(1, { message: "Name is required" }).max(50),
  image: z.string().optional().nullable(),
});

export type UpdateProfileValues = z.infer<typeof updateProfileSchema>;


interface ProfileDetailsFormProps {
  user: User
}

export function ProfileDetailsForm({ user }: ProfileDetailsFormProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();


  const form = useForm<UpdateProfileValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user.name ?? "",
      image: user.image ?? null,
    },
  });

  async function onSubmit({ name, image }: UpdateProfileValues) {
    setStatus(null)
    setError(null)

    const { error } = await authClient.updateUser({ name, image })

    if (error) {
      setError(error.message || "Something went wrong");
    } else {
      setStatus("Profile updated")
      router.refresh();
    }

  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        form.setValue("image", base64, { shouldDirty: true });
      };
      reader.readAsDataURL(file);
    }
  }

  const imagePreview = form.watch("image");

  const loading = form.formState.isSubmitting;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Details</CardTitle>
      </CardHeader>
      <CardContent>

        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel>Name</FieldLabel>
                <Input {...field} placeholder="Full name" />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="image"
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel>Profile image</FieldLabel>

                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(e)}
                />

                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {imagePreview && (
            <div className="relative size-16">
              <UserAvatar
                name={user.name}
                image={imagePreview}
                className="size-16"
              />
              <Button
                type="button"
                variant="ghost"
                className="absolute -top-2 -right-2 size-6 rounded-full"
                onClick={() => form.setValue("image", null)}
                aria-label="Remove image"
              >
                <XIcon className="size-4" />
              </Button>
            </div>
          )}

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
            Save changes
          </LoadingButton>
        </form>

      </CardContent>
    </Card>
  );
}
