"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { GitHubIcon } from "@/components/icons/GitHubIcon";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowRight } from "lucide-react";

const signInSchema = z.object({
  email: z.string().email({ message: "Введите корректный email" }),
  password: z.string().min(1, { message: "Введите пароль" }),
  rememberMe: z.boolean().optional(),
});

type SignInValues = z.infer<typeof signInSchema>;

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const loginMutation = useMutation({
    mutationFn: async (values: SignInValues) => {
      const { data, error } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
        rememberMe: values.rememberMe,
      });
      if (error) throw new Error(error.message || "Ошибка входа");
      return data;
    },
    onSuccess: () => {
      toast.success("С возвращением!");
      router.push(redirect ?? "/");
      router.refresh();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const socialMutation = useMutation({
    mutationFn: async (provider: "google" | "github") => {
      await authClient.signIn.social({
        provider,
        callbackURL: redirect ?? "/dashboard",
      });
    },
  });

  return (
    <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-[0_32px_64px_-15px_rgba(0,0,0,0.08)] p-6 md:p-10 relative">
      
      {/* HEADER: Уменьшили mb с 10 до 6 */}
      <div className="mb-6 text-center md:text-left">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-none mb-2">
          Вход <span className="text-blue-600">.</span>
        </h1>
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
          Добро пожаловать в систему
        </p>
      </div>

      <form onSubmit={form.handleSubmit((v) => loginMutation.mutate(v))} className="space-y-4">
        
        {/* Email: Поправили контраст лейбла (slate-500) */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-4">Email адрес</label>
          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <>
                <Input
                  {...field}
                  type="email"
                  placeholder="name@example.com"
                  className={cn(
                    "h-12 px-6 rounded-[1.5rem] bg-slate-50 border-2 border-transparent focus:border-blue-600 focus:bg-white transition-all font-bold italic",
                    fieldState.invalid && "border-red-500 bg-red-50"
                  )}
                />
                {fieldState.error && <p className="text-[9px] font-bold text-red-500 ml-4 uppercase">{fieldState.error.message}</p>}
              </>
            )}
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center px-4">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Пароль</label>
            <Link href="/forgot-password" className="text-[9px] font-black uppercase text-blue-600 hover:underline tracking-widest">Забыли?</Link>
          </div>
          <Controller
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <>
                <PasswordInput
                  {...field}
                  placeholder="••••••••"
                  className={cn(
                    "h-12 px-6 rounded-[1.5rem] bg-slate-50 border-2 border-transparent focus:border-blue-600 focus:bg-white transition-all font-bold italic",
                    fieldState.invalid && "border-red-500 bg-red-50"
                  )}
                />
                {fieldState.error && <p className="text-[9px] font-bold text-red-500 ml-4 uppercase">{fieldState.error.message}</p>}
              </>
            )}
          />
        </div>

        {/* Remember Me */}
        <div className="flex items-center space-x-3 px-4 pt-1">
          <Controller
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <Checkbox
                id="remember"
                checked={field.value}
                onCheckedChange={field.onChange}
                className="w-4 h-4 rounded border-2 border-slate-200 data-[state=checked]:bg-blue-600"
              />
            )}
          />
          <label htmlFor="remember" className="text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer">
            Запомнить меня
          </label>
        </div>

        {/* Submit: h-14 вместо h-16 для компактности */}
        <Button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full h-14 bg-slate-900 hover:bg-blue-600 text-white rounded-[1.5rem] text-xs font-black uppercase italic tracking-widest shadow-lg shadow-slate-200 transition-all active:scale-95 group mt-2"
        >
          {loginMutation.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <span className="flex items-center gap-2">
              Войти в аккаунт <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </span>
          )}
        </Button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div>
          <div className="relative flex justify-center text-[8px] font-black uppercase tracking-[0.4em] text-slate-300">
            <span className="bg-white px-4">Или через соцсети</span>
          </div>
        </div>

        {/* Socials: h-12 для баланса */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={socialMutation.isPending}
            onClick={() => socialMutation.mutate("google")}
            className="h-12 rounded-[1.2rem] border-2 border-slate-100 hover:bg-slate-50 hover:border-slate-200 font-bold gap-2 transition-all"
          >
            <GoogleIcon width="1.1em" height="1.1em" />
            <span className="text-[9px] font-black uppercase italic">Google</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={socialMutation.isPending}
            onClick={() => socialMutation.mutate("github")}
            className="h-12 rounded-[1.2rem] border-2 border-slate-100 hover:bg-slate-50 hover:border-slate-200 font-bold gap-2 transition-all"
          >
            <GitHubIcon width="1.1em" height="1.1em" />
            <span className="text-[9px] font-black uppercase italic">Github</span>
          </Button>
        </div>
      </form>

      {/* FOOTER: Уменьшили mt с 10 до 6 */}
      <div className="mt-6 pt-6 border-t border-slate-50 text-center">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
          Нет аккаунта?{" "}
          <Link href="/sign-up" className="text-blue-600 hover:underline">
            Создать сейчас
          </Link>
        </p>
      </div>
    </div>
  );
}
