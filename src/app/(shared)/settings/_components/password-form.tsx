"use client";

import { LoadingButton } from "@/components/loading-button";
import { PasswordInput } from "@/components/password-input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";
import { passwordSchema } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { KeyRound, CheckCircle, AlertTriangle } from "lucide-react";

const updatePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, { message: "Укажите текущий пароль" }),
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
    setStatus(null);
    setError(null);

    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true
    });

    if (error) {
      setError(error.message || "Не удалось изменить пароль");
    } else {
      setStatus("Пароль успешно изменен");
      form.reset();
    }
  }

  const loading = form.formState.isSubmitting;

  return (
    <div className="space-y-6">
      {/* МИНИ-ХЭДЕР БЛОКА В СТИЛЕ НАШЕЙ EMAIL ФОРМЫ */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-blue-600" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 leading-none">
            Безопасность пароля
          </h3>
        </div>
        <span className="text-[8px] font-mono font-black text-slate-400 uppercase tracking-widest">
          Security Token
        </span>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5">
        
        {/* ТЕКУЩИЙ ПАРОЛЬ */}
        <Controller
          control={form.control}
          name="currentPassword"
          render={({ field, fieldState }) => (
            <Field className="space-y-2">
              <FieldLabel className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Текущий пароль
              </FieldLabel>

              <PasswordInput 
                {...field} 
                placeholder="Введи текущий пароль" 
                className="h-14 px-5 rounded-2xl border border-slate-200 bg-white/50 font-medium text-slate-900 focus:bg-white focus:border-blue-600 transition-all outline-none shadow-sm placeholder:text-slate-300"
              />

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* НОВЫЙ ПАРОЛЬ */}
        <Controller
          control={form.control}
          name="newPassword"
          render={({ field, fieldState }) => (
            <Field className="space-y-2">
              <FieldLabel className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Новый пароль
              </FieldLabel>

              <PasswordInput 
                {...field} 
                placeholder="Придумай сложный пароль" 
                className="h-14 px-5 rounded-2xl border border-slate-200 bg-white/50 font-medium text-slate-900 focus:bg-white focus:border-blue-600 transition-all outline-none shadow-sm placeholder:text-slate-300"
              />

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* ПЛАШКИ СТАТУСОВ И ОШИБОК */}
        {error && (
          <div role="alert" className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-100 text-xs font-bold uppercase tracking-tight text-red-600 animate-in fade-in duration-200">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        {status && (
          <div role="status" className="flex items-center gap-2 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-xs font-bold uppercase tracking-tight text-emerald-600 animate-in fade-in duration-200">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{status}</span>
          </div>
        )}

        {/* УЛЬТИМАТИВНАЯ КНОПКА ОТПРАВКИ ФОРМЫ */}
        <LoadingButton 
          type="submit" 
          loading={loading}
          className="h-14 bg-slate-950 hover:bg-blue-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all shadow-md active:scale-98 w-full mt-2"
        >
          Обновить пароль
        </LoadingButton>
      </form>
    </div>
  );
}
