import SearchUser from './SearchUser';

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const resolveChatTitle = (chat, userId) => {
  if (chat.metadata?.title) return chat.metadata.title;
  const others = (chat.participants || []).filter((participant) => participant.id !== userId);
  return others.map((participant) => participant.name).join(', ') || 'Chat';
};

const buildPreview = (chat, typingStatus) => {
  if (typingStatus && Object.keys(typingStatus).length > 0) {
    return 'typing...';
  }
  if (chat.lastMessage?.attachments?.length) {
    const type = chat.lastMessage.messageType === 'image' ? 'Photo' : 'Attachment';
    return `[${type}]`;
  }
  return chat.lastMessage?.content || 'No messages yet';
};

const ChatList = ({
  chats,
  currentChatId,
  unreadCounts = {},
  typingStatus = {},
  onSelectChat,
  onStartChat,
  currentUserId,
  showSearch = true,
  emptyStateMessage,
}) => {
  return (
    <div className="flex h-full flex-col border-r bg-background">
      <div className="px-4 py-4 border-b">
        <h2 className="text-lg font-semibold">Chats</h2>
        <p className="text-xs text-muted-foreground">Select a conversation or start a new one.</p>
      </div>
      {showSearch ? (
        <SearchUser onSelectUser={onStartChat} />
      ) : (
        <div className="px-4 py-3 text-xs text-muted-foreground">
          {emptyStateMessage || 'You are connected directly with our admin team.'}
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {chats.map((chat) => {
          const preview = buildPreview(chat, typingStatus[chat.id]);
          const isActive = chat.id === currentChatId;
          const unread = unreadCounts[chat.id] || 0;
          const typingNames = Object.values(typingStatus[chat.id] || {});
          return (
            <button
              key={chat.id}
              type="button"
              onClick={() => onSelectChat(chat.id)}
              className={`flex w-full flex-col gap-1 border-b px-4 py-3 text-left transition ${
                isActive ? 'bg-primary/5' : 'hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold truncate">
                  {resolveChatTitle(chat, currentUserId)}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {formatTimestamp(chat.lastMessage?.createdAt || chat.updatedAt)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`text-xs ${
                    typingNames.length ? 'text-primary font-semibold' : 'text-muted-foreground'
                  } truncate`}
                >
                  {typingNames.length ? `${typingNames[0] || 'User'} is typing...` : preview}
                </span>
                {unread > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    {unread}
                  </span>
                )}
              </div>
            </button>
          );
        })}
        {chats.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {emptyStateMessage || 'No chats yet. Search for a user to start a conversation.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;

