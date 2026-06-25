import { Sidebar } from "@/components/sidebar";
import { requireUser } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <div className="dashboard-shell"><Sidebar userName={user.name} career={user.career?.acronym} /><main className="dashboard-main">{children}</main></div>;
}
