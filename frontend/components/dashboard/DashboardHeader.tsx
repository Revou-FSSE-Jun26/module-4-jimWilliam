"use client";

import { PageHeader } from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";

function greeting(): string {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export function DashboardHeader() {
  const { user } = useAuth();
  const first = user?.name.split(/\s+/)[0];
  return <PageHeader title="Your boards" subtitle={first ? `${greeting()}, ${first}.` : undefined} />;
}
