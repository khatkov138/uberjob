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
import { cn } from "@/lib/utils";

const AVAILABLE_SKILLS = [
  "Электрик", "Сантехник", "Сборка мебели",
  "Клининг", "Общие работы", "Маляр", "Плотник"
];


export function ProfileDetailsForm({ user }: { user: any }) {

  const router = useRouter()


  const form = useForm<UpdateProfileValues>({
    resolver: zodResolver(updateProfileSchema),
   defaultValues: {
      name: user?.name || "",
      image: user?.image || null,
      bio: user?.workerProfile?.bio || "",
      // ВАЖНО: берем сохраненные навыки из базы, если их нет — пустой массив
      skills: user?.workerProfile?.skills || [], 
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
      <Controller
        control={form.control}
        name="skills"
        render={({ field }) => (
          <Field>
            <FieldLabel className="font-bold">Ваши специализации</FieldLabel>
            <div className="flex flex-wrap gap-2 mt-2">
              {AVAILABLE_SKILLS.map((skill) => {
                const isActive = field.value?.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => {
                      const current = field.value || [];
                      const next = isActive
                        ? current.filter((s) => s !== skill)
                        : [...current, skill];
                      field.onChange(next);
                    }}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-black transition-all border-2 uppercase tracking-tighter",
                      isActive
                        ? "bg-blue-600 border-blue-600 text-white shadow-md scale-105"
                        : "bg-slate-50 border-slate-200 text-slate-500 hover:border-blue-300"
                    )}
                  >
                    {skill}
                    {isActive && " ✓"}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 italic font-medium">
              Выберите навыки, чтобы мы могли подсвечивать подходящие заказы в вашей ленте.
            </p>
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
