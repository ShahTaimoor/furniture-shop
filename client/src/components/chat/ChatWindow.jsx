import { useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import OneLoader from '@/components/ui/OneLoader';
import TypingIndicator from './TypingIndicator';
import MessageInput from './MessageInput';
import { markMessageSeen } from '@/redux/slices/chat/chatSlice';

const ChatWindow = ({ socket }) => {
  const dispatch = useDispatch();
  const { currentChat, messages, messagesLoading, typingStatus } = useSelector((state) => state.chat);
  const user = useSelector((state) => state.auth.user);
  const userId = user?._id || user?.id;
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  useEffect(() => {
    if (!currentChat || !messages.length || !userId) return;
    const latestMessage = messages[messages.length - 1];
    const alreadySeen = latestMessage.seenBy?.includes(String(userId));
    if (latestMessage.sender.id !== userId && !alreadySeen) {
      dispatch(markMessageSeen({ messageId: latestMessage.id }));
      socket?.emit?.('messageSeen', { messageId: latestMessage.id });
    }
  }, [currentChat, messages, dispatch, socket, userId]);

  const typingNames = useMemo(() => {
    const status = typingStatus[currentChat?.id] || {};
    return Object.entries(status)
      .filter(([id]) => id !== String(userId))
      .map(([, name]) => (typeof name === 'string' ? name : 'User'));
  }, [typingStatus, currentChat, userId]);

  if (!currentChat) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground">Select a chat to get started.</p>
      </div>
    );
  }

  const isMessageOwn = (message) => message.sender?.id === userId;

  const otherParticipants = currentChat.participants.filter((participant) => participant.id !== userId);

  const lastOwnMessage = [...messages]
    .reverse()
    .find((message) => message.sender?.id === userId);

  const everyoneSeen =
    lastOwnMessage &&
    currentChat.participants.every((participant) =>
      lastOwnMessage.seenBy?.includes(participant.id?.toString())
    );

  return (
    <div className="flex h-full flex-1 flex-col bg-muted/10">
      <div className="border-b bg-background/80 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold uppercase text-primary">
            {otherParticipants[0]?.name?.[0] || currentChat.metadata?.title?.[0] || '?'}
          </div>
          <div>
            <h3 className="text-sm font-semibold">
              {currentChat.metadata?.title ||
                otherParticipants.map((participant) => participant.name).join(', ')}
            </h3>
            {typingNames.length > 0 ? (
              <p className="text-xs text-primary">Typing...</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {otherParticipants.length
                  ? `${otherParticipants.length} participant${otherParticipants.length > 1 ? 's' : ''}`
                  : 'No participants'}
              </p>
            )}
          </div>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messagesLoading && !messages.length ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <OneLoader size="tiny" inline className="mr-2" />
            Loading messages...
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${isMessageOwn(message) ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-sm rounded-2xl px-4 py-2 text-sm shadow ${
                  isMessageOwn(message)
                    ? 'rounded-br-none bg-primary text-primary-foreground'
                    : 'rounded-bl-none bg-background/80'
                }`}
              >
                {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
                {message.attachments?.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {message.attachments.map((att, idx) =>
                      att.type === 'image' ? (
                        <a key={idx} href={att.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md">
                          <img src={att.url} alt={att.name || 'image'} className="max-h-56 rounded-md object-contain bg-white" />
                        </a>
                      ) : (
                        <a
                          key={idx}
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs hover:bg-muted/40"
                          title={att.name}
                        >
                          <span className="truncate max-w-[200px]">{att.name || 'File'}</span>
                          <span className="opacity-60">{Math.ceil((att.size || 0) / 1024)}KB</span>
                        </a>
                      )
                    )}
                  </div>
                )}
                <div className="mt-1 text-[10px] opacity-70">
                  {new Date(message.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="px-6">
        <TypingIndicator names={typingNames} />
      </div>

      {lastOwnMessage && (
        <div className="px-6 pb-1 text-right text-[11px] text-muted-foreground">
          {everyoneSeen ? 'Seen' : 'Sent'}
        </div>
      )}

      <div className="border-t bg-background/90 px-6 py-3 backdrop-blur">
        <MessageInput chatId={currentChat.id} disabled={messagesLoading} />
      </div>
    </div>
  );
};

export default ChatWindow;

