# Setting up Real-Time Chat with AWS AppSync

This document provides instructions for setting up the real-time chat functionality using AWS AppSync and AWS Cognito.

## Prerequisites

1. AWS Account
2. AWS Amplify CLI installed globally
   ```bash
   npm install -g @aws-amplify/cli
   ```

## Implementation Steps

### 1. Initialize Amplify in the Project

```bash
amplify init
```

Follow the prompts to set up a new Amplify project.

### 2. Add Authentication

```bash
amplify add auth
```

Choose the options that match your project requirements. For most cases, the defaults will work.

### 3. Add GraphQL API

```bash
amplify add api
```

Choose the following options:
- Service: GraphQL
- Authorization type: Amazon Cognito User Pool
- Do you have an annotated GraphQL schema? No
- Do you want a guided schema creation? No
- Choose a schema template: Single object with fields

### 4. Update the GraphQL Schema

Replace the contents of `amplify/backend/api/[YOUR_API_NAME]/schema.graphql` with the following:

```graphql
type Conversation @model 
@auth(rules: [
  { allow: owner, operations: [create, update, delete] },
  { allow: private, operations: [read] }
])
{
  id: ID!
  name: String
  participants: [String!]!
  messages: [Message] @hasMany(indexName: "byConversation", fields: ["id"])
  lastMessageContent: String
  lastMessageTime: AWSDateTime
  productId: String
  productName: String
  createdAt: AWSDateTime
  updatedAt: AWSDateTime
}

type Message @model 
@auth(rules: [
  { allow: owner, ownerField: "senderId", operations: [create, update, delete] },
  { allow: private, operations: [read] }
])
{
  id: ID!
  conversationId: ID! @index(name: "byConversation", sortKeyFields: ["createdAt"])
  senderId: String!
  senderName: String!
  content: String!
  status: MessageStatus
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime
}

enum MessageStatus {
  SENT
  DELIVERED
  READ
}

type Subscription {
  onCreateMessageByConversationId(conversationId: ID!): Message
    @aws_subscribe(mutations: ["createMessage"])
}
```

### 5. Push the Changes to AWS

```bash
amplify push
```

When prompted to generate code, select Yes and choose TypeScript.

### 6. Configure Your App to Use the API

Update your `App.tsx` to configure Amplify:

```typescript
import { Amplify } from 'aws-amplify';
import awsconfig from './aws-exports';

Amplify.configure(awsconfig);
```

## Using the Chat Service

The chat service implementation provides the following functions:

1. `getCurrentUser()`: Get the current authenticated user
2. `getConversations()`: Get all conversations for the current user
3. `getConversation(conversationId)`: Get a specific conversation
4. `getOrCreateConversation(otherUserId, otherUserName, productId, productName)`: Get or create a conversation
5. `getMessages(conversationId)`: Get messages for a conversation
6. `sendMessage(conversationId, content)`: Send a message in a conversation
7. `updateMessageStatus(messageId, conversationId, status)`: Update message status
8. `subscribeToMessages(conversationId, callback)`: Subscribe to new messages in a conversation

## Testing Real-Time Functionality

1. Open two browser windows or devices
2. Log in with different users in each
3. Start a conversation between them
4. Send messages back and forth to verify real-time updates

## Troubleshooting

### Common Issues

1. **Authentication errors**: Make sure the user is authenticated before trying to access chat functionality
2. **Missing subscriptions**: Verify that the subscription is properly set up in the schema
3. **Permission errors**: Check the auth rules in your schema to ensure users can access each other's messages

### Debugging

To debug subscription issues:

1. Enable verbose logging in Amplify:
   ```typescript
   Amplify.Logger.LOG_LEVEL = 'DEBUG';
   ```
2. Check the AWS AppSync console to verify queries and mutations
3. Verify that the subscription is properly established by checking network requests

## Security Considerations

1. Always use authentication for your API
2. Apply proper authorization rules to restrict access to messages
3. Validate user input before sending messages
4. Consider implementing message encryption for sensitive conversations 