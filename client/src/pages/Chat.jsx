import { useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import ChatList from '@/components/chat/ChatList';
import ChatWindow from '@/components/chat/ChatWindow';
import useChatSocket from '@/hooks/useChatSocket';
import { useAuthDrawer } from '@/contexts/AuthDrawerContext';
import { Button } from '@/components/ui/button';
import {
  fetchChats,
  setCurrentChat,
  startChat,
} from '@/redux/slices/chat/chatSlice';

const ChatPage = () => {
  const dispatch = useDispatch();
  const socket = useChatSocket();
  const { openAuthDrawer } = useAuthDrawer();
  const { chats, currentChat, unreadCounts, typingStatus, chatsLoading } = useSelector(
    (state) => state.chat
  );
  const currentUser = useSelector((state) => state.auth.user);
  const currentUserId = currentUser?._id || currentUser?.id || null;
  const isAdmin = currentUser?.role === 1 || currentUser?.role === 2;
  const supportChatRequested = useRef(false);

  const visibleChats = useMemo(() => {
    if (isAdmin) return chats;
    return chats.filter((chat) =>
      chat.participants?.some((participant) => participant.role === 1 || participant.role === 2)
    );
  }, [chats, isAdmin]);

  useEffect(() => {
    if (!currentUserId) return; // Avoid unauthorized calls redirecting guests
    dispatch(fetchChats());
  }, [dispatch, currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
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
  }, [dispatch, isAdmin, visibleChats.length, currentUserId]);

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
        startChat({ participantIds: [user._id || user.id], options: { isGroup: false } })
      ).unwrap();
      dispatch(setCurrentChat(chat.id));
    } catch (error) {
      toast.error(error || 'Unable to start chat');
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 py-6">
      {!currentUserId ? (
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-4 rounded-3xl border bg-background p-10 text-center shadow-lg">
          <h2 className="text-xl font-semibold">Sign in to chat with support</h2>
          <p className="text-sm text-muted-foreground">Create a conversation with our team and track replies.</p>
          <Button className="bg-black text-white hover:bg-black/90" onClick={() => openAuthDrawer('login', { redirectTo: '/chat' })}>
            Sign in
          </Button>
        </div>
      ) : (
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
      )}
    </div>
  );
};

export default ChatPage;

