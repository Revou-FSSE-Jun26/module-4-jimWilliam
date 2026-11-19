"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Field } from "@/components/forms/Field";
import { Avatar } from "@/components/layout/Avatar";
import { BaseBadge } from "@/components/shared/BaseBadge";
import { BaseButton } from "@/components/shared/BaseButton";
import { BaseModal } from "@/components/shared/BaseModal";
import { useAuth } from "@/context/AuthContext";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { apiClient } from "@/lib/apiClient";
import { notify } from "@/lib/toast";
import type { Member, Role } from "@/lib/types";

/** Admin-only members panel (R31.12, R31.13): list, add by email, remove. */
export function MembersPanel({ boardId, open, onClose }: { boardId: string; open: boolean; onClose: () => void }) {
  const { token, user } = useAuth();
  const handleError = useErrorHandler();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    apiClient<Member[]>(`/api/boards/${boardId}/members`, { token })
      .then((list) => !cancelled && setMembers(list))
      .catch((err) => !cancelled && handleError(err));
    return () => {
      cancelled = true;
    };
  }, [open, boardId, token, handleError]);

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    try {
      const member = await apiClient<Member>(`/api/boards/${boardId}/members`, { method: "POST", token, body: { email: email.trim(), role } });
      setMembers((list) => [...(list ?? []), member]);
      setEmail("");
      notify.success(`${member.name} added to the board`);
    } catch (err) {
      handleError(err);
    } finally {
      setAdding(false);
    }
  }

  async function remove(member: Member) {
    try {
      await apiClient(`/api/boards/${boardId}/members/${member.user_id}`, { method: "DELETE", token });
      setMembers((list) => (list ?? []).filter((m) => m.user_id !== member.user_id));
      notify.success(`${member.name} removed from the board`);
    } catch (err) {
      handleError(err);
    }
  }

  return (
    <BaseModal open={open} title="Board members" onClose={onClose}>
      <ul className="grid gap-2" aria-busy={members === null}>
        {(members ?? []).map((m) => (
          <li key={m.user_id} className="glass-pebble enter flex items-center gap-3 rounded-pebble p-2.5">
            <Avatar id={m.user_id} name={m.name} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{m.name}{m.user_id === user?.id ? " (you)" : ""}</span>
              <span className="block truncate text-sm text-muted">{m.email}</span>
            </span>
            <BaseBadge color={m.role === "admin" ? "info" : "neutral"}>{m.role === "admin" ? "Admin" : "Member"}</BaseBadge>
            <BaseButton size="sm" variant="ghost" className="text-danger-text" onClick={() => void remove(m)} aria-label={`Remove ${m.name}`}>Remove</BaseButton>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
        <Field label="Member's email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <div className="field">
          <select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value as Role)} className="field-input py-3!">
            <option value="member" className="bg-(--raised-solid)">Member</option>
            <option value="admin" className="bg-(--raised-solid)">Admin</option>
          </select>
        </div>
        <BaseButton type="submit" loading={adding} loadingLabel="Adding…" className="sm:col-span-2">Add member</BaseButton>
      </form>
    </BaseModal>
  );
}
