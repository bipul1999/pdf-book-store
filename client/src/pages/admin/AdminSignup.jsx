import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/client.js";

export default function AdminSignup() {
  const navigate = useNavigate();
  const [adminExists, setAdminExists] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });

  useEffect(() => {
    api.get("/auth/admin/status").then(({ data }) => {
      setAdminExists(data.adminExists);
      setAdminEmail(data.adminEmail || "");
    }).catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!form.email.endsWith("@gmail.com")) {
      toast.error("Admin signup requires a Gmail address");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/admin/signup", form);
      toast.success("OTP sent to Gmail");
      navigate(`/admin/verify-otp?email=${encodeURIComponent(form.email)}`);
    } catch (error) {
      const apiError = error.response?.data;
      const validationMessage = apiError?.errors?.[0]?.msg;
      toast.error(validationMessage || apiError?.message || "Admin signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
      <form onSubmit={submit} className="panel w-full space-y-4 p-6">
        <div>
          <ShieldCheck className="mb-3 text-orange-600" />
          <h1 className="text-2xl font-black">Create Admin Profile</h1>
          <p className="text-sm text-gray-600">First verified Gmail stays permanent. Same Gmail can reset its admin password with OTP.</p>
        </div>
        {adminExists ? (
          <div className="rounded-md bg-orange-50 p-4 text-sm font-semibold text-orange-800">
            Admin already exists. Enter the same Gmail{adminEmail ? ` (${adminEmail})` : ""} to reset and verify again.
          </div>
        ) : null}
        <input className="input" placeholder="Admin name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="input" type="email" placeholder="Gmail address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value.toLowerCase() })} required />
        <input className="input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
        <input className="input" type="password" minLength={8} placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Sending OTP..." : "Send Gmail OTP"}</button>
        <p className="text-center text-sm text-gray-600">
          Already verified? <Link className="font-bold text-orange-600" to="/admin/login">Admin login</Link>
        </p>
      </form>
    </main>
  );
}
