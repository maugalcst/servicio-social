import Image from "next/image";

export function DashboardHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="dashboard-header">
      <div><h1>{title}</h1><p>{subtitle}</p></div>
      <div className="header-brand">
        <Image src="/images/fime-formal.png" alt="FIME" width={150} height={70} />
      </div>
    </header>
  );
}
