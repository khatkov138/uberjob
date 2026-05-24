"use client";

import { LoadingButton } from "@/components/loading-button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";

import { updateProfileSchema, UpdateProfileValues } from "@/lib/validation";
import { toast } from "sonner";
import { updateProfile } from "../actions";
import { AvatarUpload } from "./avatar-upload";

export function ProfileDetailsForm({ user }: { user: any }) {
  const router = useRouter();

  const form = useForm<UpdateProfileValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user?.name || "",
      image: user?.image || null,
      bio: user?.workerProfile?.bio || "",
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
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      
      {/* АВАТАР ПО ЦЕНТРУ */}
      <div className="pb-4 border-b border-slate-100 flex justify-center w-full">
        <AvatarUpload
          initialImage={form.getValues("image")}
          userName={user.name || "User"}
          onUploadComplete={(url) => form.setValue("image", url, { shouldDirty: true })}
        />
      </div>

      {/* ИМЯ С КРАСИВЫМ ТРЕНДОВЫМ ИНПУТОМ */}
      <Controller
        control={form.control}
        name="name"
        render={({ field }) => (
          <Field className="space-y-2">
            <FieldLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Имя
            </FieldLabel>
            <Input 
              {...field} 
              className="h-14 px-5 rounded-2xl border border-slate-200 bg-white/50 font-medium text-slate-900 focus:bg-white focus:border-blue-600 transition-all outline-none shadow-sm placeholder:text-slate-300" 
            />
          </Field>
        )}
      />
      
      {/* МОНОЛИТНАЯ ВЫЛИЗАННАЯ КНОПКА КЛИКА */}
      <LoadingButton 
        type="submit" 
        loading={form.formState.isSubmitting}
        className="h-14 bg-slate-950 hover:bg-blue-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all shadow-md active:scale-98 w-full mt-2"
      >
        Сохранить все изменения
      </LoadingButton>
    </form>
  );
}
