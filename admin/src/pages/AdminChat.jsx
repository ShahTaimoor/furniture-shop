import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import ChatList from '@/components/chat/ChatList';
import ChatWindow from '@/components/chat/ChatWindow';
import useChatSocket from '@/hooks/useChatSocket';
import SEO from '@/components/seo/SEO';
import {
  fetchChats,
  setCurrentChat,
  startChat,
} from '@/redux/slices/chat/chatSlice';

const AdminChat = () => {
  const dispatch = useDispatch();
  const socket = useChatSocket();
  const { chats, currentChat, unreadCounts, typingStatus, chatsLoading } = useSelector(
    (state) => state.chat
  );
  const currentUser = useSelector((state) => state.auth.user);
  const currentUserId = currentUser?._id || currentUser?.id || null;

  useEffect(() => {
    if (!currentUserId) return;
    dispatch(fetchChats());
  }, [dispatch, currentUserId]);

  useEffect(() => {
    const currentExists = chats.some((chat) => chat.id === currentChat?.id);
    if (currentChat && !currentExists) {
      if (chats.length) {
        dispatch(setCurrentChat(chats[0].id));
      } else {
        dispatch(setCurrentChat(null));
      }
      return;
    }
    if (!currentChat && chats.length) {
      dispatch(setCurrentChat(chats[0].id));
    }
  }, [chats, currentChat, dispatch]);

  const handleSelectChat = (chatId) => {
    dispatch(setCurrentChat(chatId));
  };

  const handleStartChat = async (user) => {
    try {
      const chat = await dispatch(
        startChat({ participantIds: [user._id || user.id], options: { isGroup: false } })
      ).unwrap();
      dispatch(setCurrentChat(chat.id));
    } catch (error) {
      toast.error(error || 'Unable to start chat');
    }
  };

  return (
    <>
      <SEO title="Admin Chat" description="Message customers and teammates in real time." noIndex />
      <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Chat</h1>
          <p className="text-sm text-slate-600 mt-1">
            Message customers and teammates in real time, without leaving the admin console.
          </p>
        </div>
        <div className="flex flex-1 min-h-0 overflow-hidden rounded-3xl border shadow-sm">
          <div className="w-full md:w-[320px] lg:w-[360px] shrink-0">
            <ChatList
              chats={chats}
              currentChatId={currentChat?.id}
              unreadCounts={unreadCounts}
              typingStatus={typingStatus}
              onSelectChat={handleSelectChat}
              onStartChat={handleStartChat}
              currentUserId={currentUserId}
              showSearch
              emptyStateMessage="No chats yet. Use the search bar to start a conversation."
            />
          </div>
          <div className="flex-1 border-l bg-muted/10">
            {chatsLoading && !chats.length ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Loading conversations...
              </div>
            ) : (
              <ChatWindow socket={socket} />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminChat;
