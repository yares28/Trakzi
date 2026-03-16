// lib/types/chat.ts

export interface ChatHistoryMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string // ISO string
}

export interface ChatHistory {
  id: string
  user_id: string
  title: string
  messages: ChatHistoryMessage[]
  message_count: number
  created_at: string
  updated_at: string
}

export interface ChatHistoryListItem {
  id: string
  title: string
  message_count: number
  preview: string // First user message snippet
  created_at: string
  updated_at: string
}
