import { useEffect, useState } from "react";
import api from "../../api/client.js";

export default function ManageUsers() {
  const [users, setUsers] = useState([]);

  useEffect(() => { api.get("/admin/users").then(({ data }) => setUsers(data.users)); }, []);

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-gray-200 p-5"><h1 className="text-2xl font-black">Manage Users</h1></div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600"><tr><th className="p-3">User</th><th className="p-3">Phone</th><th className="p-3">Role</th><th className="p-3">Verified</th></tr></thead>
          <tbody>
            {users.map((user) => (
              <tr className="border-t border-gray-100" key={user._id}>
                <td className="p-3"><strong>{user.name}</strong><p className="text-gray-600">{user.email}</p></td>
                <td className="p-3">{user.phone}</td>
                <td className="p-3">{user.role}</td>
                <td className="p-3">{user.isVerified ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
