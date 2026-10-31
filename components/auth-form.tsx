"use client";

import { useActionState, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import type { AuthState } from "@/app/(auth)/actions";

type Props = { title: string; subtitle: string; action: (state: AuthState, formData: FormData) => Promise<AuthState>; submitLabel: string; footer: ReactNode; mode: "login" | "signup" | "reset" };
const initialState: AuthState = {};

export function AuthForm({ title, subtitle, action, submitLabel, footer, mode }: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const needsPassword = mode !== "reset";
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10 sm:px-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,.16),transparent_55%)]" />
      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-8 inline-flex items-center gap-3 text-sm font-semibold tracking-wide">
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-violet-300 to-indigo-500 text-lg font-black text-zinc-950 shadow-lg shadow-violet-950/30">A</span>
          <span>ASNOR <span className="text-zinc-500">STUDIO</span></span>
        </Link>
        <section className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
          <div className="mb-7">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[.22em] text-violet-300">{mode === "signup" ? "Start creating" : mode === "reset" ? "Account recovery" : "Your workspace"}</p>
            <h1 className="text-3xl font-semibold tracking-tight text-white">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{subtitle}</p>
          </div>
          <form action={formAction} className="space-y-4">
            <label className="block text-sm font-medium text-zinc-300">Email address
              <input required type="email" name="email" autoComplete="email" inputMode="email" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3.5 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10" placeholder="you@example.com" />
            </label>
            {needsPassword && <>
              <label className="block text-sm font-medium text-zinc-300">Password
                <span className="relative mt-2 block">
                  <input required type={showPassword ? "text" : "password"} name="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3.5 pr-20 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10" placeholder={mode === "login" ? "Your password" : "At least 8 characters"} />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute inset-y-0 right-3 my-auto text-xs font-semibold text-zinc-400 hover:text-white" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button>
                </span>
              </label>
              {mode === "signup" && <label className="block text-sm font-medium text-zinc-300">Confirm password
                <input required type={showPassword ? "text" : "password"} name="confirmPassword" minLength={8} autoComplete="new-password" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3.5 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10" placeholder="Enter your password again" />
              </label>}
            </>}
            {state.error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm leading-5 text-red-200">{state.error}</p>}
            {state.success && <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm leading-5 text-emerald-200">{state.success}</p>}
            <button disabled={pending} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3.5 font-semibold text-zinc-950 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Please wait…" : submitLabel}{!pending && <span aria-hidden className="transition group-hover:translate-x-1">→</span>}</button>
          </form>
          {mode === "login" && <p className="mt-4 text-center text-sm text-zinc-500">Forgot your password? <Link href="/reset-password" className="font-medium text-violet-300 hover:text-violet-200">Reset it</Link></p>}
          <p className="mt-6 text-center text-sm text-zinc-400">{footer}</p>
        </section>
        <p className="mt-5 text-center text-xs text-zinc-600"><Link href="/" className="transition hover:text-zinc-400">← Back to Asnor Studio</Link></p>
      </div>
    </main>
  );
}
