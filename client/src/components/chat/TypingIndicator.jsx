const TypingIndicator = ({ names = [] }) => {
  if (!names.length) return null;
  const label = names.length === 1 ? `${names[0]} is typing...` : 'Several people are typing...';
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 px-3">
      <div className="flex gap-1">
        <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.2s]" />
        <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.1s]" />
        <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" />
      </div>
      <span>{label}</span>
    </div>
  );
};

export default TypingIndicator;

