export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ'
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  status?: MessageStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface Conversation {
  id: string;
  name?: string;
  participants: string[];
  lastMessageContent?: string;
  lastMessageTime?: string;
  productId?: string;
  productName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ChatState {
  conversations: Conversation[];
  selectedConversation?: Conversation;
  messages: Record<string, Message[]>;
  loading: boolean;
  error?: string;
} 