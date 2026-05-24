import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Dashboard() {
  const { user, logout } = useAuth();
  return <main className="mx-auto max-w-5xl px-4 py-5 sm:py-9"><span className="badge mb-3">Your account</span><h1 className="text-2xl font-black sm:text-3xl">My Dashboard</h1><section className="panel mt-5 bg-[#fffaf5] p-4 sm:p-6"><p className="text-lg font-black">{user.name}</p><p className="mt-1 break-words text-sm leading-6 text-gray-600">{user.email}<br className="sm:hidden" /> <span className="hidden sm:inline">|</span> {user.phone}</p><div className="mt-5 grid gap-3 sm:flex sm:flex-wrap"><Link className="btn-primary w-full sm:w-auto" to="/dashboard/library">My Purchased Books</Link><Link className="btn-secondary w-full sm:w-auto" to="/dashboard/orders">My Orders</Link><button onClick={logout} className="btn-secondary w-full sm:w-auto">Logout</button></div></section></main>;
}
