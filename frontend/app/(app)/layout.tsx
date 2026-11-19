import { AppShell } from "@/components/layout/AppShell";
import { serverFetch } from "@/lib/session";
import type { Board } from "@/lib/types";

/** Signed-in area: fetches the user's Boards once for the Nav_Tree (B4) and renders the shell. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const boards = await serverFetch<Board[]>("/api/boards");
  return <AppShell boards={boards}>{children}</AppShell>;
}
