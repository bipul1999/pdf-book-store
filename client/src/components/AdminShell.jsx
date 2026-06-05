import { ExternalLink, LogOut } from "lucide-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function AdminShell() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/admin/login", { replace: true });
  }

  return (
    <main className="mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:py-8 md:grid-cols-[240px_1fr] md:gap-6">
      <aside className="panel h-fit overflow-x-auto p-3 md:sticky md:top-24 md:overflow-visible">
        <Link className="btn-primary mb-3 w-full" to="/"><ExternalLink size={16} /> View Store</Link>
        <div className="flex gap-2 md:block">
          {[
            ["/admin", "Dashboard"],
            ["/admin/books/new", "Add Book"],
            ["/admin/books", "Manage Books"],
            ["/admin/order-book-prices", "Order Book Prices"],
            ["/admin/orders", "Manage Orders"],
            ["/admin/support", "Support Chats"],
            ["/admin/feedback", "User Feedback"],
            ["/admin/payment", "Payment Options"],
            ["/admin/quote", "Quote Section"],
            ["/admin/users", "Manage Users"],
            ["/admin/visitors", "Visitors"]
          ].map(([to, label]) => <NavLink key={to} end={to === "/admin"} className={({ isActive }) => `block shrink-0 rounded-xl px-3 py-2 text-sm font-bold transition md:shrink ${isActive ? "bg-orange-50 text-orange-800" : "hover:bg-orange-50 hover:text-orange-700"}`} to={to}>{label}</NavLink>)}
        </div>
        <button className="btn-secondary mt-3 w-full" onClick={handleLogout}><LogOut size={16} /> Logout</button>
      </aside>
      <Outlet />
    </main>
  );
}
