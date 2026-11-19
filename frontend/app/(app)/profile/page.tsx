"use client";

import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/AppShell";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ProfileHero, type ProfileStats } from "@/components/profile/ProfileHero";
import { useAuth } from "@/context/AuthContext";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { apiClient } from "@/lib/apiClient";
import { notify } from "@/lib/toast";
import type { Board, Card, User } from "@/lib/types";

/** /profile (R18, R36.8–R36.10): pre-filled from AuthContext, refreshed from GET /api/users/me. */
export default function ProfilePage() {
  const { token, user, setUser } = useAuth();
  const handleError = useErrorHandler();
  const [saved, setSaved] = useState({ name: user?.name ?? "", email: user?.email ?? "" });
  const [name, setName] = useState(saved.name);
  const [email, setEmail] = useState(saved.email);
  const [stats, setStats] = useState<ProfileStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiClient<User>("/api/users/me", { token }),
      apiClient<Board[]>("/api/boards", { token }),
      apiClient<Card[]>("/api/cards?assignee=me", { token }),
    ])
      .then(([me, boards, cards]) => {
        if (cancelled) return;
        setSaved({ name: me.name, email: me.email });
        setName(me.name);
        setEmail(me.email);
        setStats({ boards: boards.length, admin: boards.filter((b) => b.role === "admin").length, openTasks: cards.length });
      })
      .catch((err) => !cancelled && handleError(err));
    return () => {
      cancelled = true;
    };
  }, [token, handleError]);

  async function save() {
    try {
      const updated = await apiClient<User>("/api/users/me", { method: "PATCH", token, body: { name: name.trim(), email: email.trim() } });
      setSaved({ name: updated.name, email: updated.email });
      setName(updated.name);
      setEmail(updated.email);
      setUser(updated);
      notify.success("Profile saved");
    } catch (err) {
      handleError(err);
    }
  }

  if (!user) return null;

  return (
    <>
      <PageHeader title="Profile" subtitle="How your teammates see you" />
      <div className="mx-auto mt-4 max-w-5xl">
        <ProfileHero id={user.id} name={name} email={email} stats={stats} />
        <ProfileForm
          saved={saved}
          name={name}
          email={email}
          onNameChange={setName}
          onEmailChange={setEmail}
          onSave={save}
          onReset={() => { setName(saved.name); setEmail(saved.email); }}
        />
      </div>
    </>
  );
}
