interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-40 bg-header-bg backdrop-blur-sm border-b border-border px-4 py-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}
