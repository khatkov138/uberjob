"use client";

import { LoadingButton } from "@/components/loading-button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import { cn } from "@/lib/utils";
import { Mail, CheckCircle, AlertTriangle } from "lucide-react";

export const updateEmailSchema = z.object({
  newEmail: z.email({ message: "Укажите корректный email адрес" }),
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
    setStatus(null);
    setError(null);

    const { error } = await authClient.changeEmail({
      newEmail, 
      callbackURL: "/email-verified"
    });

    if (error) {
      setError(error.message || "Не удалось запустить смену почты");
    } else {
      setStatus("Письмо с подтверждением отправлено на ваш текущий адрес");
    }
  }

  const loading = form.formState.isSubmitting;

  return (
    <div className="space-y-6">
      {/* МИНИ-ХЭДЕР БЛОКА В ТВОЕМ ДИЗАЙН-КОДЕ */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-blue-600" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 leading-none">
            Электронная почта
          </h3>
        </div>
        <span className="text-[8px] font-mono font-black text-slate-400 uppercase tracking-widest">
          Email Config
        </span>
      </div>
       
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5">
        <Controller
          control={form.control}
          name="newEmail"
          render={({ field, fieldState }) => (
            <Field className="space-y-2">
              <FieldLabel className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Новый email адрес
              </FieldLabel>
            
              <Input
                type="email"
                placeholder="new@email.com"
                {...field}
                className="h-14 px-5 rounded-2xl border border-slate-200 bg-white/50 font-medium text-slate-900 focus:bg-white focus:border-blue-600 transition-all outline-none shadow-sm placeholder:text-slate-300"
              />
              
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* ПРЕМИАЛЬНЫЕ ПЛАШКИ СТАТУСОВ */}
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

        {/* ТОПОВАЯ КОНТРАСТНАЯ КНОПКА КЛИКА */}
        <LoadingButton 
          type="submit" 
          loading={loading}
          className="h-14 bg-slate-950 hover:bg-blue-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all shadow-md active:scale-98 w-full"
        >
          Запросить изменения
        </LoadingButton>
      </form>
    </div>
  );
}
