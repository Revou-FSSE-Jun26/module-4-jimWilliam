/** API shapes, declared once (FE-11). Field names match the Flask schemas. */

export type Role = "admin" | "member";

export interface User {
  id: string;
  name: string;
  email: string;
  created_at?: string;
}

export interface LoginResult {
  token: string;
  expires_at: string;
  user: User;
}

export interface CardAssignee {
  id: string;
  name: string;
}

export interface Card {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  assignee: CardAssignee | null;
  order: number;
  comment_count?: number;
  board_id?: string;
  board_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Column {
  id: string;
  board_id: string;
  name: string;
  order: number;
  cards?: Card[];
}

export interface Board {
  id: string;
  name: string;
  created_by: string | null;
  role: Role;
  member_count?: number;
  card_count?: number;
  created_at: string;
  updated_at: string;
}

export interface BoardDetail extends Board {
  columns: (Column & { cards: Card[] })[];
}

export interface Member {
  user_id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Comment {
  id: string;
  card_id: string;
  user_id: string;
  author: { id: string; name: string };
  text: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  message: string;
  card_id: string | null;
  board_id: string | null;
  read: boolean;
  created_at: string;
}

export interface NotificationPage {
  items: Notification[];
  page: number;
  per_page: number;
  total: number;
  unread_count: number;
}

export interface Analytics {
  cards_per_column: { column_id: string; name: string; count: number }[];
  completed_this_week: number;
  activity_per_member: { user_id: string; name: string; comments: number; cards_assigned: number }[];
  week_start: string;
}
