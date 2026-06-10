export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-muted/40" />
      <div className="h-4 w-72 max-w-full rounded bg-muted/30" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="glass rounded-2xl p-6 space-y-3">
          <div className="h-4 w-1/3 rounded bg-muted/40" />
          <div className="h-3 w-full rounded bg-muted/25" />
          <div className="h-3 w-5/6 rounded bg-muted/25" />
        </div>
      ))}
    </div>
  );
}
