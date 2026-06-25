export function DashboardHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="dashboard-header">
      <div><h1>{title}</h1><p>{subtitle}</p></div>
      <div className="header-brand"><span>◉</span><strong>FIME</strong></div>
    </header>
  );
}
