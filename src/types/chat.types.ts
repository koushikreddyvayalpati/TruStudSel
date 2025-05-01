export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  SENDING = 'SENDING'
}

// Message receipt status
export enum ReceiptStatus {
  NONE = 'NONE',        // No receipt info
  SENT = 'SENT',        // Message was sent to the server
  DELIVERED = 'DELIVERED', // Message was delivered to recipient's device
  READ = 'READ',         // Message was read by recipient
  SENDING = 'SENDING'    // Message is currently being sent
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  status?: MessageStatus;
  receiptStatus?: ReceiptStatus; // Status of message receipt
  readAt?: string;              // Timestamp when message was read
  createdAt: string;
  updatedAt?: string;
  isPending?: boolean;         // Indicates if this message has pending writes
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
  owner?: string;
  unreadCount?: number;     // Number of unread messages
  lastReadMessageId?: string; // ID of the last message read by current user
  blockedBy?: string;       // Email of the user who has blocked the conversation
  deletedBy?: string[];     // Array of user emails who have deleted this conversation
  // Add dynamic index signature for user-specific name mappings
  [key: string]: any;
}

export interface ChatState {
  conversations: Conversation[];
  selectedConversation?: Conversation;
  messages: Record<string, Message[]>;
  loading: boolean;
  error?: string;
}
