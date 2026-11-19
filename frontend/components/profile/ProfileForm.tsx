"use client";

import { useState, type FormEvent } from "react";

import { Field } from "@/components/forms/Field";
import { BaseButton } from "@/components/shared/BaseButton";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ProfileFormProps {
  saved: { name: string; email: string };
  name: string;
  email: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onSave: () => Promise<void>;
  onReset: () => void;
}

/** Controlled profile form (R18, R36.10): Save is enabled only when something changed. */
export function ProfileForm({ saved, name, email, onNameChange, onEmailChange, onSave, onReset }: ProfileFormProps) {
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [saving, setSaving] = useState(false);
  const dirty = name.trim() !== saved.name || email.trim().toLowerCase() !== saved.email;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Enter your name.";
    if (!EMAIL.test(email.trim())) next.email = "Enter an email address like name@example.com.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    await onSave();
    setSaving(false);
  }

  return (
    <form noValidate onSubmit={submit} className="glass-pane enter mt-5 grid gap-4 rounded-pane p-6 md:p-8" aria-labelledby="profile-form-title">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="profile-form-title" className="text-xl">Account details</h2>
        {dirty && (
          <span className="inline-flex items-center gap-2 text-sm text-buoy" role="status">
            <span aria-hidden="true" className="size-2 rounded-full bg-buoy" />
            Unsaved changes
          </span>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name" name="name" autoComplete="name" value={name} onChange={(e) => onNameChange(e.target.value)} error={errors.name} maxLength={120} />
        <Field label="Email" type="email" name="email" autoComplete="email" value={email} onChange={(e) => onEmailChange(e.target.value)} error={errors.email} />
      </div>
      <p className="text-sm text-muted">Your password can&apos;t be changed here.</p>
      <div className="flex flex-wrap gap-2">
        <BaseButton type="submit" disabled={!dirty} loading={saving} loadingLabel="Saving…">Save changes</BaseButton>
        <BaseButton variant="secondary" disabled={!dirty || saving} onClick={() => { setErrors({}); onReset(); }}>Reset</BaseButton>
      </div>
    </form>
  );
}
