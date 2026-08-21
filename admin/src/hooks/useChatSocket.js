import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import useSocket from './useSocket';
import {
  applyMessageSeen,
  clearTypingStatus,
  fetchChatPreview,
  fetchMessages,
  receiveMessage,
  setTypingStatus,
} from '../redux/slices/chat/chatSlice';

const useChatSocket = () => {
  const socket = useSocket();
  const dispatch = useDispatch();
  const currentChatId = useSelector((state) => state.chat.currentChat?.id);
  const chats = useSelector((state) => state.chat.chats);
  const user = useSelector((state) => state.auth.user);
  const userId = user?._id || user?.id;

  useEffect(() => {
    if (!socket || !userId) return;

    const handleReceiveMessage = (message) => {
      dispatch(receiveMessage(message));
      const chatExists = chats.some((chat) => chat.id === message.chatId);
      if (!chatExists) {
        dispatch(fetchChatPreview(message.chatId));
      }
    };

    const handleTyping = ({ chatId, userId: typingUserId }) => {
      if (typingUserId === userId) return;
      const chat = chats.find((item) => item.id === chatId);
      const participant = chat?.participants?.find((member) => member.id === typingUserId);
      dispatch(setTypingStatus({ chatId, userId: typingUserId, name: participant?.name }));
    };

    const handleStopTyping = ({ chatId, userId }) => {
      dispatch(clearTypingStatus({ chatId, userId }));
    };

    const handleMessageSeen = (payload) => {
      dispatch(applyMessageSeen(payload));
    };

    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('typing', handleTyping);
    socket.on('stopTyping', handleStopTyping);
    socket.on('messageSeen', handleMessageSeen);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('typing', handleTyping);
      socket.off('stopTyping', handleStopTyping);
      socket.off('messageSeen', handleMessageSeen);
    };
  }, [socket, userId, dispatch, chats]);

  useEffect(() => {
    if (!socket || !currentChatId) return;
    socket.emit('joinChat', { chatId: currentChatId });
    dispatch(fetchMessages({ chatId: currentChatId }));
    return () => {
      socket.emit('leaveChat', { chatId: currentChatId });
      dispatch(clearTypingStatus({ chatId: currentChatId }));
    };
  }, [socket, currentChatId, dispatch]);

  return socket;
};

export default useChatSocket;
