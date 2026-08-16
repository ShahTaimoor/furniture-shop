import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Paperclip, Smile, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import useSocket from '@/hooks/useSocket';
import { sendMessage } from '@/redux/slices/chat/chatSlice';
import axios from '@/redux/slices/auth/axiosInstance';

const MessageInput = ({ chatId, disabled }) => {
  const dispatch = useDispatch();
  const socket = useSocket();
  const [value, setValue] = useState('');
  const typingTimeout = useRef(null);
  const user = useSelector((s) => s.auth.user);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef(null);
  const [pendingAttachments, setPendingAttachments] = useState([]);

  useEffect(() => {
    return () => {
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
    };
  }, []);

  const emitStopTyping = () => {
    if (!socket || !chatId) return;
    socket.emit('stopTyping', { chatId });
  };

  const handleTyping = () => {
    if (!socket || !chatId) return;
    socket.emit('typing', { chatId });
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }
    typingTimeout.current = setTimeout(emitStopTyping, 1500);
  };

  const resetInput = () => {
    setValue('');
    emitStopTyping();
  };

  const handleSend = async (event) => {
    event.preventDefault();
    if ((!value.trim() && pendingAttachments.length === 0) || !chatId) return;
    const payload = {
      chatId,
      content: value.trim(),
      messageType: pendingAttachments.length > 0
        ? (pendingAttachments.every((a) => a.type === 'image') ? 'image' : 'file')
        : 'text',
      attachments: pendingAttachments,
    };

    const sendViaSocket = () =>
      new Promise((resolve, reject) => {
        if (!socket?.connected) {
          reject(new Error('Socket disconnected'));
          return;
        }
        socket.emit('sendMessage', payload, (response) => {
          if (response?.success) {
            resolve(response.message);
          } else {
            reject(new Error(response?.message || 'Unable to send message'));
          }
        });
      });

    try {
      if (socket?.connected) {
        await sendViaSocket();
      } else {
        await dispatch(sendMessage(payload)).unwrap();
      }
      resetInput();
      setPendingAttachments([]);
    } catch (error) {
      try {
        await dispatch(sendMessage(payload)).unwrap();
        resetInput();
        setPendingAttachments([]);
      } catch (fallbackError) {
        toast.error(fallbackError?.message || error.message || 'Failed to send message');
      }
    }
  };

  const handlePickFiles = async () => {
    try {
      if (!chatId || !user) {
        toast.error('Please sign in to send attachments');
        return;
      }
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt';
      input.onchange = async () => {
        if (!input.files || input.files.length === 0) return;
        const formData = new FormData();
        Array.from(input.files).forEach((file) => formData.append('files', file));
        setIsUploading(true);
        try {
          const { data } = await axios.post(`/pg/chats/${chatId}/attachments`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          const attachments = data?.attachments || [];
          if (attachments.length === 0) {
            toast.error('Upload failed');
            return;
          }
          // Queue attachments to be sent on pressing Send
          setPendingAttachments((prev) => [...prev, ...attachments]);
          toast.success(`Attached ${attachments.length} file${attachments.length > 1 ? 's' : ''}`);
        } catch (err) {
          const apiMsg = err?.response?.data?.message || err?.message;
          toast.error(apiMsg || 'Attachment upload failed');
        } finally {
          setIsUploading(false);
        }
      };
      input.click();
    } catch (e) {
      toast.error('Unable to open file picker');
    }
  };

  const commonEmojis = ['😀','😂','😍','🤩','🥳','😎','👍','🙏','🔥','🎉','❤️','✨','✅','🙌','😇','😅','😢','👀','💡','📦'];
  const insertEmoji = (emoji) => {
    const el = inputRef.current;
    if (!el) {
      setValue((prev) => (prev || '') + emoji);
      return;
    }
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const next = (value || '').slice(0, start) + emoji + (value || '').slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + emoji.length;
      el.setSelectionRange(caret, caret);
    });
  };

  return (
    <form onSubmit={handleSend} className="flex flex-col gap-2 rounded-2xl border bg-background px-4 py-2">
      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {pendingAttachments.map((att, idx) => (
            <div key={`${att.url}-${idx}`} className="group flex items-center gap-2 rounded-md border px-2 py-1 text-xs">
              {att.type === 'image' ? (
                <img src={att.url} alt={att.name || 'image'} className="h-10 w-10 rounded object-cover bg-white" />
              ) : (
                <span className="max-w-[160px] truncate">{att.name || 'File'}</span>
              )}
              <button
                type="button"
                className="rounded px-1 py-0.5 text-muted-foreground hover:bg-muted/40"
                onClick={() => setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))}
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
      <button
        type="button"
        className="relative text-muted-foreground hover:text-primary transition disabled:opacity-50"
        title={isUploading ? 'Uploading…' : 'Attach files'}
        onClick={handlePickFiles}
        disabled={disabled || isUploading}
        aria-busy={isUploading ? 'true' : 'false'}
      >
        {isUploading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Paperclip className="h-5 w-5" />
        )}
      </button>
      <div className="relative">
        <button
          type="button"
          className="text-muted-foreground hover:text-primary transition"
          title="Emoji picker"
          onClick={() => setShowEmoji((v) => !v)}
        >
          <Smile className="h-5 w-5" />
        </button>
        {showEmoji && (
          <div className="absolute left-0 top-8 z-10 grid max-h-44 w-56 grid-cols-8 gap-1 overflow-auto rounded-md border bg-background p-2 shadow">
            {commonEmojis.map((e) => (
              <button
                type="button"
                key={e}
                className="text-base hover:scale-110 transition"
                onClick={() => insertEmoji(e)}
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
      <input
        type="text"
        placeholder="Type a message"
        className="flex-1 border-none bg-transparent text-sm focus:outline-none"
        value={value}
        disabled={disabled}
        ref={inputRef}
        onChange={(event) => {
          setValue(event.target.value);
          handleTyping();
        }}
      />
      <button
        type="submit"
        disabled={(!value.trim() && pendingAttachments.length === 0) || disabled}
        className="rounded-full bg-primary p-2 text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
      </button>
      </div>
    </form>
  );
};

export default MessageInput;

