# Chat Functionality Documentation

## Overview
The chat system in Setuna provides real-time messaging between users with a WhatsApp/LinkedIn-like experience. It includes conversation management, message sending/receiving, and real-time updates.

## Features

### ✅ Real-time Messaging
- Messages are delivered in real-time using efficient polling
- Automatic message synchronization between devices
- Optimistic UI updates for immediate feedback

### ✅ Message Status Indicators
- **Sending**: Message is being sent to server
- **Sent**: Message successfully delivered to server
- **Delivered**: Message received by recipient's device
- **Read**: Message has been read by recipient

### ✅ Conversation Management
- Create new conversations with any user
- View conversation history
- Mark messages as read automatically
- Unread message counters

### ✅ User Experience
- Profile pictures and names displayed
- Message timestamps
- Auto-scroll to latest messages
- Error handling with retry options

## Technical Implementation

### Architecture
1. **ChatContext**: Central state management for chat data
2. **RealtimeChatManager**: Handles polling and real-time updates
3. **API Integration**: Backend communication for messages and conversations
4. **Local Storage**: AsyncStorage for offline message persistence

### Real-time Updates
- **Messages**: Polled every 3 seconds for new messages
- **Conversations**: Polled every 5 seconds for updates
- **Smart Polling**: Only updates when new data is available
- **Retry Logic**: Exponential backoff for failed requests

### Message Flow
1. User types message and hits send
2. Optimistic message appears immediately (with "sending" status)
3. Message sent to backend API
4. Server confirms message and returns real message ID
5. Optimistic message replaced with confirmed message
6. Real-time polling detects new messages from other users

### Data Validation
- All messages and conversations are validated before processing
- Malformed data is filtered out to prevent crashes
- Type-safe interfaces ensure data consistency

## API Endpoints

### Conversations
- `GET /conversations/` - List user's conversations
- `POST /conversations/create/` - Create new conversation
- `GET /conversations/{id}/` - Get conversation details
- `POST /conversations/{id}/mark-read/` - Mark messages as read

### Messages
- `GET /conversations/{id}/messages/` - Get conversation messages
- `POST /messages/send/` - Send new message

## Usage Examples

### Starting a Conversation
```typescript
const conversation = await createOrGetConversation(userId);
if (conversation) {
  router.push(`/chat?conversationId=${conversation.id}&userId=${userId}&userName=${userName}`);
}
```

### Sending a Message
```typescript
await sendMessage(recipientId, messageContent);
```

### Joining a Conversation
```typescript
await joinConversation(conversationId);
```

## Error Handling

### Network Issues
- Automatic retry with exponential backoff
- Fallback to cached messages when offline
- User-friendly error messages with retry options

### Data Validation
- Invalid messages are filtered out
- Graceful degradation when data is malformed
- Console logging for debugging

## Performance Optimizations

### Polling Strategy
- Efficient polling intervals (3s for messages, 5s for conversations)
- Only polls active conversations
- Stops polling when leaving conversations

### Caching
- In-memory message cache for fast access
- AsyncStorage for offline persistence
- Optimistic updates for immediate UI feedback

### Memory Management
- Automatic cleanup of polling timers
- Proper component unmounting
- Efficient state updates

## Troubleshooting

### Common Issues

1. **Messages not appearing**
   - Check network connection
   - Verify conversation ID is correct
   - Check console for error messages

2. **Real-time updates not working**
   - Ensure user is authenticated
   - Check if polling is active
   - Verify backend API is responding

3. **Chat screen errors**
   - Check required parameters (userId, conversationId)
   - Verify user permissions
   - Check backend logs for errors

### Debug Mode
Enable console logging to see detailed chat operations:
- Message sending/receiving
- Conversation joining/leaving
- Polling status
- Error details

## Future Enhancements

### Planned Features
- **Push Notifications**: Real-time message notifications
- **File Sharing**: Image and document support
- **Group Chats**: Multi-user conversations
- **Message Reactions**: Like, heart, etc.
- **Typing Indicators**: Show when user is typing

### Technical Improvements
- **WebSocket Support**: Replace polling with WebSockets
- **Message Encryption**: End-to-end encryption
- **Offline Support**: Better offline message handling
- **Message Search**: Search through conversation history

## Security Considerations

### User Privacy
- Messages are only visible to conversation participants
- Blocked users cannot send/receive messages
- User profiles are validated before messaging

### Data Protection
- API authentication required for all chat operations
- User permissions verified on backend
- Input validation and sanitization

## Testing

### Manual Testing
1. Create a conversation between two users
2. Send messages and verify real-time delivery
3. Test error scenarios (network issues, invalid data)
4. Verify message status indicators

### Automated Testing
- Unit tests for message validation
- Integration tests for API endpoints
- E2E tests for complete chat flow

## Support

For technical issues or questions about the chat functionality:
1. Check console logs for error details
2. Verify backend API is running and accessible
3. Check network connectivity
4. Review this documentation for common solutions

