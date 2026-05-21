import { LockKeyhole } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { saveSession } = useAuth();
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", {
        identifier: form.identifier.trim(),
        password: form.password
      });
      if (data.user.role !== "admin") {
        toast.error("Admin access required");
        return;
      }
      saveSession(data);
      toast.success("Welcome back, admin");
      navigate("/admin");
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
      <form onSubmit={submit} className="panel w-full space-y-4 p-6">
        <div>
          <LockKeyhole className="mb-3 text-orange-600" />
          <h1 className="text-2xl font-black">Admin Login</h1>
          <p className="text-sm text-gray-600">Hidden admin route for catalog and order management.</p>
        </div>
        <input className="input" placeholder="Email or phone" value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} required />
        <input className="input" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Signing in..." : "Login"}</button>
        <p className="text-center text-sm text-gray-600">
          First time setup? <Link className="font-bold text-orange-600" to="/admin/signup">Create admin profile</Link>
        </p>
      </form>
    </main>
  );
}
