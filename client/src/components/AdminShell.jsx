import { ExternalLink } from "lucide-react";
import { Link, Outlet } from "react-router-dom";

export default function AdminShell() {
  return (
    <main className="mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:py-8 md:grid-cols-[240px_1fr] md:gap-6">
      <aside className="panel h-fit overflow-x-auto p-3 md:overflow-visible">
        <Link className="btn-primary mb-3 w-full" to="/"><ExternalLink size={16} /> View Store</Link>
        <div className="flex gap-2 md:block">
          {[
            ["/admin", "Dashboard"],
            ["/admin/books/new", "Add Book"],
            ["/admin/books", "Manage Books"],
            ["/admin/orders", "Manage Orders"],
            ["/admin/support", "Support Chats"],
            ["/admin/payment", "Payment Options"],
            ["/admin/quote", "Quote Section"],
            ["/admin/users", "Manage Users"]
          ].map(([to, label]) => <Link key={to} className="block shrink-0 rounded-xl px-3 py-2 text-sm font-bold hover:bg-orange-50 hover:text-orange-700 md:shrink" to={to}>{label}</Link>)}
        </div>
      </aside>
      <Outlet />
    </main>
  );
}
