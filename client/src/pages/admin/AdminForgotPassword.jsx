import { LockKeyhole } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/client.js";
import { otpToastMessage } from "../../utils/otpUi.js";

export default function AdminForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
      toast.success("OTP sent if admin email exists");
      navigate(`/admin/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (error) {
      toast.error(otpToastMessage(error, "Could not send OTP"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
      <form onSubmit={submit} className="panel w-full space-y-4 p-6">
        <div>
          <LockKeyhole className="mb-3 text-orange-600" />
          <h1 className="text-2xl font-black">Admin Password Reset</h1>
          <p className="text-sm text-gray-600">Enter admin Gmail to receive OTP.</p>
        </div>
        <input className="input" type="email" placeholder="Admin Gmail" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Sending OTP..." : "Send OTP"}</button>
        <p className="text-center text-sm text-gray-600">
          <Link className="font-bold text-orange-600" to="/admin/login">Back to admin login</Link>
        </p>
      </form>
    </main>
  );
}
