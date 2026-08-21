import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search, UserPlus } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { searchChatUsers } from '@/redux/slices/chat/chatSlice';

const SearchUser = ({ onSelectUser }) => {
  const dispatch = useDispatch();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const results = useSelector((state) => state.chat.searchResults);

  useEffect(() => {
    if (debouncedQuery && debouncedQuery.length >= 2) {
      dispatch(searchChatUsers(debouncedQuery));
    }
  }, [debouncedQuery, dispatch]);

  const handleSelect = (user) => {
    if (!user) return;
    onSelectUser?.(user);
    setQuery('');
  };

  return (
    <div className="p-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search users..."
          className="w-full rounded-full bg-muted/50 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {query.length >= 2 && results.length > 0 && (
        <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border bg-background shadow">
          {results.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => handleSelect(user)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/40"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold uppercase">
                {user.name?.[0] || '?'}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user.name}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <UserPlus className="h-3 w-3" /> Start chat
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchUser;
