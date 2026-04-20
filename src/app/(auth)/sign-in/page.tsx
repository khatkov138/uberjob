import type { Metadata } from "next";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Вход - ZWORK",
};

export default function SignIn() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-20 relative overflow-hidden">
      {/* Декоративный элемент на фоне */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-600/5 to-transparent -z-10" />
      
      <div className="w-full max-w-[440px] animate-in fade-in zoom-in duration-500">
        <SignInForm />
      </div>
    </main>
  );
}
