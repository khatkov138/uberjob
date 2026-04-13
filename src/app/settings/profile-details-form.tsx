"use client";

import { LoadingButton } from "@/components/loading-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { AvatarUpload } from "./avatar-upload";
import { Textarea } from "@/components/ui/textarea";
import { updateProfile } from "./actions";
import { updateProfileSchema, UpdateProfileValues } from "@/lib/validation";
import { toast } from "sonner";

export function ProfileDetailsForm({ user }: { user: any }) {

  const router = useRouter()


  const form = useForm<UpdateProfileValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user.name ?? "",
      image: user.image ?? null,
      bio: user.workerProfile?.bio ?? "",
      skills: user.workerProfile?.skills ?? [], // Убедись, что тут массив
    },
  });
  const onSubmit = async (data: UpdateProfileValues) => {
    try {
      const result = await updateProfile(data);
      if (result.success) {
        toast.success("Изменения сохранены");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (e) {
      toast.error("Произошла ошибка");
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {/* 
         Передаем в AvatarUpload функцию setValue. 
         Когда фото загрузится в UploadThing, URL запишется в поле 'image' формы.
      */}
      <AvatarUpload
        initialImage={form.getValues("image")}
        userName={user.name || "User"}
        onUploadComplete={(url) => form.setValue("image", url, { shouldDirty: true })}
      />

      <Controller
        control={form.control}
        name="name"
        render={({ field }) => (
          <Field>
            <FieldLabel className="font-bold">Имя</FieldLabel>
            <Input {...field} className="h-12 rounded-xl" />
          </Field>
        )}
      />

      {/* Кнопка сохранить теперь одна для всей формы */}
      <LoadingButton type="submit" loading={form.formState.isSubmitting}>
        Сохранить все изменения
      </LoadingButton>
    </form>
  )
}
