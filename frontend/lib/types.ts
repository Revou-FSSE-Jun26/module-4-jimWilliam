/** API shapes, declared once (FE-11). Field names match the Flask schemas. */

export type Role = "admin" | "member";

export interface User {
  id: string;
  name: string;
  email: string;
  /** Signed, short-lived URL of the AVIF avatar (R41); null when the user has none. */
  avatar_url?: string | null;
  created_at?: string;
}

/** The small user shape embedded in cards, comments and attachments. */
export interface UserBrief {
  id: string;
  name: string;
  avatar_url?: string | null;
}

export interface LoginResult {
  token: string;
  expires_at: string;
  user: User;
}

export type CardAssignee = UserBrief;

export interface Card {
  id: string;
  column_id: string;
  title: string;
  /** Sanitised HTML from the rich-text editor (R40). */
  description: string | null;
  /** Plain-text copy of the description, for previews. */
  description_text?: string | null;
  assignee_id: string | null;
  assignee: CardAssignee | null;
  order: number;
  comment_count?: number;
  attachment_count?: number;
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
  avatar_url?: string | null;
  role: Role;
}

export interface Comment {
  id: string;
  card_id: string;
  user_id: string;
  author: UserBrief;
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

/** An image attached to a card, stored as AVIF (R42). */
export interface Attachment {
  id: string;
  card_id: string;
  filename: string;
  content_type: string;
  width: number;
  height: number;
  byte_size: number;
  uploaded_by: UserBrief | null;
  url: string;
  thumb_url: string;
  created_at: string;
}
