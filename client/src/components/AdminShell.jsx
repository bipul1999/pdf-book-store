import { ExternalLink } from "lucide-react";
import { Link, Outlet } from "react-router-dom";

export default function AdminShell() {
  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:grid-cols-[240px_1fr]">
      <aside className="panel h-fit p-3">
        <Link className="btn-primary mb-3 w-full" to="/"><ExternalLink size={16} /> View Store</Link>
        {[
          ["/admin", "Dashboard"],
          ["/admin/books/new", "Add Book"],
          ["/admin/books", "Manage Books"],
          ["/admin/orders", "Manage Orders"],
          ["/admin/payment", "Payment Options"],
          ["/admin/quote", "Quote Section"],
          ["/admin/users", "Manage Users"]
        ].map(([to, label]) => <Link key={to} className="block rounded-md px-3 py-2 text-sm font-semibold hover:bg-gray-50" to={to}>{label}</Link>)}
      </aside>
      <Outlet />
    </main>
  );
}
