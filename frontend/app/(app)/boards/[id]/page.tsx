import type { Metadata } from "next";

import { KanbanBoard } from "@/components/board/KanbanBoard";
import { serverFetch } from "@/lib/session";
import type { BoardDetail } from "@/lib/types";

export const metadata: Metadata = { title: "Board" };

/**
 * /boards/[id]: a Server Component that reads the JWT from the Session_Cookie and fetches the
 * board with its columns and cards (B5), so a reload shows the persisted positions (R14.1, R14.6).
 */
export default async function BoardPage(props: PageProps<"/boards/[id]">) {
  const { id } = await props.params;
  const board = await serverFetch<BoardDetail>(`/api/boards/${id}`);
  return <KanbanBoard key={board.id} initialBoard={board} />;
}
