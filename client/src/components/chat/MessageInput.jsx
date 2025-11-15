import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Paperclip, Smile, Send } from 'lucide-react';
import { toast } from 'sonner';
import useSocket from '@/hooks/useSocket';
import { sendMessage } from '@/redux/slices/chat/chatSlice';

const MessageInput = ({ chatId, disabled }) => {
  const dispatch = useDispatch();
  const socket = useSocket();
  const [value, setValue] = useState('');
  const typingTimeout = useRef(null);

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
    if (!value.trim() || !chatId) return;
    const payload = {
      chatId,
      content: value.trim(),
      messageType: 'text',
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
    } catch (error) {
      try {
        await dispatch(sendMessage(payload)).unwrap();
        resetInput();
      } catch (fallbackError) {
        toast.error(fallbackError?.message || error.message || 'Failed to send message');
      }
    }
  };

  return (
    <form onSubmit={handleSend} className="flex items-center gap-2 rounded-2xl border bg-background px-4 py-2">
      <button
        type="button"
        className="text-muted-foreground hover:text-primary transition"
        title="Coming soon: Attach files"
      >
        <Paperclip className="h-5 w-5" />
      </button>
      <button
        type="button"
        className="text-muted-foreground hover:text-primary transition"
        title="Coming soon: Emoji picker"
      >
        <Smile className="h-5 w-5" />
      </button>
      <input
        type="text"
        placeholder="Type a message"
        className="flex-1 border-none bg-transparent text-sm focus:outline-none"
        value={value}
        disabled={disabled}
        onChange={(event) => {
          setValue(event.target.value);
          handleTyping();
        }}
      />
      <button
        type="submit"
        disabled={!value.trim() || disabled}
        className="rounded-full bg-primary p-2 text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
};

export default MessageInput;

