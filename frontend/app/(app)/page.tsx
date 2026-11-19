import type { Metadata } from "next";

import { BoardGrid } from "@/components/dashboard/BoardGrid";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { serverFetch } from "@/lib/session";
import type { Board } from "@/lib/types";

export const metadata: Metadata = { title: "Your boards" };

/** Dashboard: a Server Component listing the user's boards from GET /api/boards (R13.1). */
export default async function DashboardPage() {
  const boards = await serverFetch<Board[]>("/api/boards");
  return (
    <>
      <DashboardHeader />
      <BoardGrid initialBoards={boards} />
    </>
  );
}
