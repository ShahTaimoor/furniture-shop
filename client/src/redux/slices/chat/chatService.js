import axiosInstance from '../auth/axiosInstance';

const chatService = {
  async fetchChats() {
    const { data } = await axiosInstance.get('/pg/chats');
    return data.chats || [];
  },
  async startOrGetChat(participantIds, options = {}) {
    const payload = {
      participantIds,
      isGroup: options.isGroup ?? false,
      title: options.title,
      targetRole: options.targetRole,
    };
    const { data } = await axiosInstance.post('/pg/chats', payload);
    return data.chat;
  },
  async fetchMessages({ chatId, before, limit = 50 }) {
    const params = {};
    if (before) params.before = before;
    params.limit = limit;
    const { data } = await axiosInstance.get(`/pg/chats/${chatId}/messages`, {
      params,
    });
    return data.messages || [];
  },
  async fetchChatPreview(chatId) {
    const { data } = await axiosInstance.get(`/pg/chats/${chatId}/preview`);
    return data.chat;
  },
  async sendMessage(payload) {
    const { data } = await axiosInstance.post('/pg/messages', payload);
    return data.message;
  },
  async markMessageSeen(messageId) {
    const { data } = await axiosInstance.patch(`/pg/messages/${messageId}/seen`);
    return data.message;
  },
  async searchUsers(query) {
    const { data } = await axiosInstance.get('/pg/chats/users/search', {
      params: { q: query },
    });
    return data.users || [];
  },
};

export default chatService;
