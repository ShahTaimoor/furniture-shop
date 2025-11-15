import { useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import ChatList from '@/components/chat/ChatList';
import ChatWindow from '@/components/chat/ChatWindow';
import useChatSocket from '@/hooks/useChatSocket';
import {
  fetchChats,
  setCurrentChat,
  startChat,
} from '@/redux/slices/chat/chatSlice';

const ChatPage = () => {
  const dispatch = useDispatch();
  const socket = useChatSocket();
  const { chats, currentChat, unreadCounts, typingStatus, chatsLoading } = useSelector(
    (state) => state.chat
  );
  const currentUser = useSelector((state) => state.auth.user);
  const currentUserId = currentUser?.id;
  const isAdmin = currentUser?.role === 1 || currentUser?.role === 2;
  const supportChatRequested = useRef(false);

  const visibleChats = useMemo(() => {
    if (isAdmin) return chats;
    return chats.filter((chat) =>
      chat.participants?.some((participant) => participant.role === 1 || participant.role === 2)
    );
  }, [chats, isAdmin]);

  useEffect(() => {
    dispatch(fetchChats());
  }, [dispatch]);

  useEffect(() => {
    if (!isAdmin && !visibleChats.length && !supportChatRequested.current) {
      supportChatRequested.current = true;
      dispatch(
        startChat({
          participantIds: [],
          options: { isGroup: false, targetRole: 'admin' },
        })
      )
        .unwrap()
        .then((chat) => {
          dispatch(setCurrentChat(chat.id));
        })
        .catch((error) => {
          supportChatRequested.current = false;
          toast.error(error || 'Unable to connect to support right now');
        });
    }
  }, [dispatch, isAdmin, visibleChats.length]);

  useEffect(() => {
    const currentExists = visibleChats.some((chat) => chat.id === currentChat?.id);
    if (currentChat && !currentExists) {
      if (visibleChats.length) {
        dispatch(setCurrentChat(visibleChats[0].id));
      } else {
        dispatch(setCurrentChat(null));
      }
      return;
    }
    if (!currentChat && visibleChats.length) {
      dispatch(setCurrentChat(visibleChats[0].id));
    }
  }, [visibleChats, currentChat, dispatch]);

  const handleSelectChat = (chatId) => {
    dispatch(setCurrentChat(chatId));
  };

  const handleStartChat = async (user) => {
    if (!isAdmin) return;
    try {
      const chat = await dispatch(
        startChat({ participantIds: [user.id], options: { isGroup: false } })
      ).unwrap();
      dispatch(setCurrentChat(chat.id));
    } catch (error) {
      toast.error(error || 'Unable to start chat');
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 rounded-3xl border bg-background shadow-lg md:flex-row">
        <div className="w-full md:w-[320px] lg:w-[360px]">
          <ChatList
            chats={visibleChats}
            currentChatId={currentChat?.id}
            unreadCounts={unreadCounts}
            typingStatus={typingStatus}
            onSelectChat={handleSelectChat}
            onStartChat={handleStartChat}
            currentUserId={currentUserId}
            showSearch={isAdmin}
            emptyStateMessage={
              isAdmin
                ? 'No chats yet. Use the search bar to start a conversation.'
                : 'We will connect you with an admin shortly.'
            }
          />
        </div>
        <div className="h-[70vh] flex-1 rounded-3xl border-l bg-muted/10">
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
  );
};

export default ChatPage;

