import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client.js";

export default function ManageUsers() {
  const [users, setUsers] = useState([]);

  useEffect(() => { api.get("/admin/users").then(({ data }) => setUsers(data.users)); }, []);

  function formatDate(value) {
    if (!value) return "Never logged in";
    return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  }

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-gray-200 p-5"><h1 className="text-2xl font-black">Manage Users</h1></div>
      <div className="grid gap-3 p-3 sm:hidden">
        {users.map((user) => (
          <Link className="block rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition hover:border-orange-200" key={user._id} to={`/admin/users/${user._id}`}>
            <strong>{user.name}</strong>
            <p className="break-words text-sm text-gray-600">{user.email}</p>
            <p className="mt-2 text-sm">Phone: {user.phone}</p>
            <p className="mt-2 text-sm">Last login: {formatDate(user.lastLoginAt)}</p>
            <p className="mt-1 text-xs text-gray-600">Login count: {user.loginCount || 0}</p>
            {user.lastLoginIp && <p className="mt-1 break-words text-xs text-gray-600">IP: {user.lastLoginIp}</p>}
            <div className="mt-2 flex gap-2 text-xs font-bold">
              <span className="rounded-full bg-orange-50 px-2 py-1 text-orange-700">{user.role}</span>
              <span className="rounded-full bg-orange-50 px-2 py-1 text-orange-700">{user.isVerified ? "Verified" : "Not verified"}</span>
            </div>
          </Link>
        ))}
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600"><tr><th className="p-3">User</th><th className="p-3">Phone</th><th className="p-3">Role</th><th className="p-3">Verified</th><th className="p-3">Last login</th><th className="p-3">Login info</th></tr></thead>
          <tbody>
            {users.map((user) => (
              <tr className="border-t border-gray-100 hover:bg-orange-50/40" key={user._id}>
                <td className="p-3"><Link className="block" to={`/admin/users/${user._id}`}><strong className="text-orange-700">{user.name}</strong><p className="text-gray-600">{user.email}</p></Link></td>
                <td className="p-3">{user.phone}</td>
                <td className="p-3">{user.role}</td>
                <td className="p-3">{user.isVerified ? "Yes" : "No"}</td>
                <td className="p-3 whitespace-nowrap">{formatDate(user.lastLoginAt)}</td>
                <td className="p-3">
                  <p>Count: {user.loginCount || 0}</p>
                  <p className="max-w-40 break-words text-xs text-gray-600">{user.lastLoginIp || "IP not available"}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
