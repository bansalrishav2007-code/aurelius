export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 pt-2">
      <span className="text-xs text-muted-foreground">Aurelius is thinking</span>
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-gold animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
    </div>
  );
}
