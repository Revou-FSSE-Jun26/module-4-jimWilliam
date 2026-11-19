"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { createSession } from "@/app/actions/session";
import { Field } from "@/components/forms/Field";
import { BaseButton } from "@/components/shared/BaseButton";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/apiClient";
import { ApiError, messageForStatus } from "@/lib/errors";
import { notify } from "@/lib/toast";
import type { LoginResult, User } from "@/lib/types";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = Partial<Record<"name" | "email" | "password" | "form", string>>;

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? messageForStatus(err.statusCode, err.message) : messageForStatus(500);
}

function PasswordToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <BaseButton variant="ghost" size="sm" onClick={onToggle} aria-pressed={shown} aria-label={shown ? "Hide password" : "Show password"} className="min-h-10! px-2.5!">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        {shown ? <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A9.7 9.7 0 0112 5c5 0 9 5 9 7a11 11 0 01-2.3 3.2M6.6 6.6C4.3 8 3 10.3 3 12c0 2 4 7 9 7a9.6 9.6 0 004.4-1" /> : <path d="M3 12c0-2 4-7 9-7s9 5 9 7-4 7-9 7-9-5-9-7zm9 3a3 3 0 100-6 3 3 0 000 6z" />}
      </svg>
    </BaseButton>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="glass-raised rounded-shell p-6 sm:p-8">
      <h1 className="text-3xl">{title}</h1>
      <p className="mt-1.5 mb-6 text-muted">{subtitle}</p>
      {children}
    </div>
  );
}

/** /login (R12.2, R12.4, R12.5, R12.7). */
export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Errors = {};
    if (!EMAIL.test(email.trim())) next.email = "Enter an email address like name@example.com.";
    if (!password) next.password = "Enter your password.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setPending(true);
    try {
      const result = await apiClient<LoginResult>("/api/auth/login", { method: "POST", body: { email: email.trim(), password } });
      const user = await createSession(result.token, result.expires_at);
      login(result.token, user);
      router.replace("/");
      router.refresh();
    } catch (err) {
      const message = errorMessage(err);
      setErrors({ form: message });
      notify.error(message);
      setPending(false);
    }
  }

  return (
    <Card title="Log in" subtitle="Welcome back. Pick up where your team left off.">
      <form noValidate onSubmit={onSubmit} className="grid gap-4">
        <Field label="Email" type="email" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required style={{ ["--i" as string]: 0 }} />
        <Field label="Password" type={shown ? "text" : "password"} name="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} required trailing={<PasswordToggle shown={shown} onToggle={() => setShown((s) => !s)} />} style={{ ["--i" as string]: 1 }} />
        {errors.form && <p role="alert" className="field-error">{errors.form}</p>}
        <BaseButton type="submit" loading={pending} loadingLabel="Logging in…" className="mt-1 w-full">Log in</BaseButton>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        New to RevoTask? <Link href="/register" className="font-semibold text-seaglass underline-offset-4 hover:underline">Create an account</Link>
      </p>
    </Card>
  );
}

/** /register (R12.1, R12.3, R12.5, R12.7). */
export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Errors = {};
    if (!name.trim()) next.name = "Enter your name.";
    if (!EMAIL.test(email.trim())) next.email = "Enter an email address like name@example.com.";
    if (password.length < 8) next.password = "Use at least 8 characters.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setPending(true);
    try {
      await apiClient<User>("/api/auth/register", { method: "POST", body: { name: name.trim(), email: email.trim(), password } });
      notify.success("Account created. Log in to continue.");
      router.push("/login");
    } catch (err) {
      const message = errorMessage(err);
      setErrors(err instanceof ApiError && err.statusCode === 409 ? { email: message } : { form: message });
      notify.error(message);
      setPending(false);
    }
  }

  return (
    <Card title="Create your account" subtitle="Start a board in under a minute.">
      <form noValidate onSubmit={onSubmit} className="grid gap-4">
        <Field label="Name" name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} required style={{ ["--i" as string]: 0 }} />
        <Field label="Email" type="email" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required style={{ ["--i" as string]: 1 }} />
        <Field label="Password" type={shown ? "text" : "password"} name="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} required minLength={8} trailing={<PasswordToggle shown={shown} onToggle={() => setShown((s) => !s)} />} style={{ ["--i" as string]: 2 }} />
        {errors.form && <p role="alert" className="field-error">{errors.form}</p>}
        <BaseButton type="submit" loading={pending} loadingLabel="Creating account…" className="mt-1 w-full">Create account</BaseButton>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account? <Link href="/login" className="font-semibold text-seaglass underline-offset-4 hover:underline">Log in</Link>
      </p>
    </Card>
  );
}
