export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8 pb-6 border-b border-border/40">
      <div className="min-w-0">
        <p className="text-caption mb-2.5">Aurelius Private</p>
        <h1 className="font-display text-3xl sm:text-4xl tracking-tight leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-2.5 max-w-2xl leading-relaxed">{subtitle}</p>
        )}
      </div>
      {children && <div className="shrink-0 flex flex-wrap gap-2">{children}</div>}
    </header>
  );
}
