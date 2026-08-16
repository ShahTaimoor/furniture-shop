import { useEffect, useMemo } from 'react';
import { getSocket } from '../lib/socket';

const useSocket = () => {
  const socket = useMemo(() => getSocket(), []);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      // Leave connection open for other hooks but remove listeners added elsewhere
    };
  }, [socket]);

  return socket;
};

export default useSocket;

