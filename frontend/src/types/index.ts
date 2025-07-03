export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  is_active: boolean;
  is_online: boolean;
  last_seen?: string;
  created_at: string;
}

export interface Team {
  id: number;
  name: string;
  description?: string;
  avatar_url?: string;
  is_public: boolean;
  created_by: number;
  created_at: string;
  members: User[];
}

export interface Channel {
  id: number;
  name: string;
  description?: string;
  is_private: boolean;
  team_id: number;
  created_by: number;
  created_at: string;
  members: User[];
}

export interface Message {
  id: number;
  content: string;
  message_type: string;
  file_url?: string;
  channel_id?: number;
  sender_id: number;
  parent_message_id?: number;
  is_edited: boolean;
  edited_at?: string;
  created_at: string;
  sender: User;
}

export interface DirectMessage {
  id: number;
  content: string;
  message_type: string;
  file_url?: string;
  sender_id: number;
  receiver_id: number;
  is_read: boolean;
  read_at?: string;
  is_edited: boolean;
  edited_at?: string;
  created_at: string;
  sender: User;
  receiver: User;
}

export interface UserPresence {
  user_id: number;
  status: 'online' | 'offline' | 'away' | 'busy';
  last_activity: string;
  socket_id?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  full_name?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface CreateTeamRequest {
  name: string;
  description?: string;
  is_public: boolean;
}

export interface CreateChannelRequest {
  name: string;
  description?: string;
  is_private: boolean;
  team_id: number;
}

export interface SendMessageRequest {
  content: string;
  message_type?: string;
  file_url?: string;
  channel_id?: number;
  parent_message_id?: number;
}

export interface SendDirectMessageRequest {
  content: string;
  message_type?: string;
  file_url?: string;
  receiver_id: number;
}

export interface SearchRequest {
  query: string;
  channel_id?: number;
  user_id?: number;
  start_date?: string;
  end_date?: string;
}

export interface SearchResult {
  messages: Message[];
  total_count: number;
  page: number;
  per_page: number;
}

export interface WebSocketMessage {
  type: string;
  data: any;
}

export interface ChatMessageData {
  message_id: number;
  content: string;
  sender: User;
  channel_id?: number;
  receiver_id?: number;
  message_type: string;
  created_at: string;
}

export interface TypingData {
  user_id: number;
  channel_id?: number;
  typing: boolean;
}

export interface UserStatusData {
  user_id: number;
  status: string;
}
