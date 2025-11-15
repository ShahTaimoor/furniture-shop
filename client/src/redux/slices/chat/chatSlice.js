import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import chatService from './chatService';

const initialState = {
  chats: [],
  chatsLoading: false,
  messages: [],
  messagesLoading: false,
  currentChat: null,
  typingStatus: {},
  unreadCounts: {},
  searchResults: [],
  error: null,
  hasMoreMessages: true,
};

export const fetchChats = createAsyncThunk('chat/fetchChats', async (_, thunkAPI) => {
  try {
    return await chatService.fetchChats();
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Unable to load chats');
  }
});

export const startChat = createAsyncThunk(
  'chat/startChat',
  async ({ participantIds, options }, thunkAPI) => {
    try {
      return await chatService.startOrGetChat(participantIds, options);
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Unable to start chat');
    }
  }
);

export const fetchMessages = createAsyncThunk(
  'chat/fetchMessages',
  async ({ chatId, before }, thunkAPI) => {
    try {
      const messages = await chatService.fetchMessages({ chatId, before });
      return { chatId, messages };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Unable to load messages');
    }
  }
);

export const fetchChatPreview = createAsyncThunk(
  'chat/fetchChatPreview',
  async (chatId, thunkAPI) => {
    try {
      return await chatService.fetchChatPreview(chatId);
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Unable to load chat');
    }
  }
);

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ chatId, content, messageType, attachments }, thunkAPI) => {
    try {
      const message = await chatService.sendMessage({
        chatId,
        content,
        messageType,
        attachments,
      });
      return message;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Unable to send message');
    }
  }
);

export const markMessageSeen = createAsyncThunk(
  'chat/markMessageSeen',
  async ({ messageId }, thunkAPI) => {
    try {
      const message = await chatService.markMessageSeen(messageId);
      return message;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Unable to mark message');
    }
  }
);

export const searchChatUsers = createAsyncThunk(
  'chat/searchUsers',
  async (query, thunkAPI) => {
    try {
      const users = await chatService.searchUsers(query);
      return users;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Unable to search users');
    }
  }
);

const sortChats = (chats = []) =>
  [...chats].sort(
    (a, b) => new Date(b.updatedAt || b.lastMessage?.createdAt) - new Date(a.updatedAt || a.lastMessage?.createdAt)
  );

const upsertChat = (state, chatPayload) => {
  if (!chatPayload) return;
  const idx = state.chats.findIndex((chat) => chat.id === chatPayload.id);
  if (idx >= 0) {
    state.chats[idx] = { ...state.chats[idx], ...chatPayload };
  } else {
    state.chats.push(chatPayload);
  }
  state.chats = sortChats(state.chats);
  state.unreadCounts[chatPayload.id] = chatPayload.unreadCount ?? state.unreadCounts[chatPayload.id] ?? 0;
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setCurrentChat(state, action) {
      const chatId = action.payload;
      state.currentChat = state.chats.find((chat) => chat.id === chatId) || null;
      state.messages = [];
      state.hasMoreMessages = true;
      if (chatId) {
        state.unreadCounts[chatId] = 0;
      }
    },
    receiveMessage(state, action) {
      const message = action.payload;
      if (!message?.chatId) return;
      if (state.currentChat?.id === message.chatId) {
        const exists = state.messages.some((msg) => msg.id === message.id);
        if (!exists) {
          state.messages = [...state.messages, message];
        }
        state.unreadCounts[message.chatId] = 0;
      } else {
        state.unreadCounts[message.chatId] =
          (state.unreadCounts[message.chatId] || 0) + 1;
      }
      upsertChat(state, {
        ...state.chats.find((chat) => chat.id === message.chatId),
        id: message.chatId,
        lastMessage: message,
        updatedAt: message.createdAt,
      });
    },
    setTypingStatus(state, action) {
      const { chatId, userId, name } = action.payload;
      if (!chatId || !userId) return;
      if (!state.typingStatus[chatId]) {
        state.typingStatus[chatId] = {};
      }
      state.typingStatus[chatId][userId] = name || true;
    },
    clearTypingStatus(state, action) {
      const { chatId, userId } = action.payload;
      if (!chatId || !state.typingStatus[chatId]) return;
      if (userId) {
        delete state.typingStatus[chatId][userId];
      } else {
        delete state.typingStatus[chatId];
      }
    },
    applyMessageSeen(state, action) {
      const { chatId, messageId, seenBy } = action.payload;
      if (!chatId || !messageId) return;
      state.messages = state.messages.map((message) => {
        if (message.id === messageId) {
          return {
            ...message,
            seenBy: seenBy || Array.from(new Set([...(message.seenBy || []), action.payload.userId])),
          };
        }
        return message;
      });
      if (chatId) {
        state.unreadCounts[chatId] = 0;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChats.pending, (state) => {
        state.chatsLoading = true;
        state.error = null;
      })
      .addCase(fetchChats.fulfilled, (state, action) => {
        state.chatsLoading = false;
        state.chats = sortChats(action.payload);
        state.unreadCounts = action.payload.reduce((acc, chat) => {
          acc[chat.id] = chat.unreadCount || 0;
          return acc;
        }, {});
      })
      .addCase(fetchChats.rejected, (state, action) => {
        state.chatsLoading = false;
        state.error = action.payload;
      })
      .addCase(startChat.fulfilled, (state, action) => {
        upsertChat(state, action.payload);
        state.currentChat = action.payload;
        state.unreadCounts[action.payload.id] = 0;
      })
      .addCase(fetchMessages.pending, (state) => {
        state.messagesLoading = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.messagesLoading = false;
        const { chatId, messages } = action.payload;
        if (state.currentChat?.id === chatId) {
          state.messages = messages;
        }
        state.hasMoreMessages = messages.length >= 50;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.messagesLoading = false;
        state.error = action.payload;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        const message = action.payload;
        if (state.currentChat?.id === message.chatId) {
          const exists = state.messages.some((msg) => msg.id === message.id);
          if (!exists) {
            state.messages.push(message);
          }
        }
        upsertChat(state, {
          ...state.chats.find((chat) => chat.id === message.chatId),
          id: message.chatId,
          lastMessage: message,
          updatedAt: message.createdAt,
        });
      })
      .addCase(markMessageSeen.fulfilled, (state, action) => {
        const message = action.payload;
        state.messages = state.messages.map((msg) =>
          msg.id === message.id ? { ...msg, seenBy: message.seenBy } : msg
        );
        if (message.chatId) {
          state.unreadCounts[message.chatId] = 0;
        }
      })
      .addCase(fetchChatPreview.fulfilled, (state, action) => {
        upsertChat(state, action.payload);
      })
      .addCase(searchChatUsers.fulfilled, (state, action) => {
        state.searchResults = action.payload;
      });
  },
});

export const {
  setCurrentChat,
  receiveMessage,
  setTypingStatus,
  clearTypingStatus,
  applyMessageSeen,
} = chatSlice.actions;

export default chatSlice.reducer;

