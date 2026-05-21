import { MailCheck } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/client.js";
import { formatSeconds, otpInlineMessage, otpToastMessage } from "../../utils/otpUi.js";

export default function AdminResetPassword() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({ code: "", password: "" });
  const [resendIn, setResendIn] = useState(60);
  const [expiresIn, setExpiresIn] = useState(600);
  const [otpError, setOtpError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const email = params.get("email") || "";

  useEffect(() => {
    const timer = setInterval(() => {
      setResendIn((value) => Math.max(0, value - 1));
      setExpiresIn((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setOtpError("");
    try {
      await api.post("/auth/reset-password", { email, ...form });
      toast.success("Admin password reset");
      navigate("/admin/login");
    } catch (error) {
      setOtpError(otpInlineMessage(error, "Invalid OTP"));
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setResendIn(data.resendAfterSeconds || 60);
      setExpiresIn(data.otpExpiresInSeconds || 600);
      toast.success("OTP resent if admin email exists");
    } catch (error) {
      toast.error(otpToastMessage(error, "Could not resend OTP"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
      <form onSubmit={submit} className="panel w-full space-y-4 p-6">
        <div>
          <MailCheck className="mb-3 text-orange-600" />
          <h1 className="text-2xl font-black">Reset Admin Password</h1>
          <p className="text-sm text-gray-600">Enter OTP and your new admin password.</p>
        </div>
        <input className="input" value={email} readOnly />
        <input className="input" maxLength={6} placeholder="6 digit OTP" value={form.code} onChange={(e) => { setForm({ ...form, code: e.target.value }); setOtpError(""); }} required />
        {otpError && <p className="text-sm font-bold text-red-600">{otpError}</p>}
        <input className="input" type="password" minLength={8} placeholder="New password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <p className="text-sm font-semibold text-gray-600">OTP expires in {formatSeconds(expiresIn)}</p>
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Please wait..." : "Reset password"}</button>
        <button className="btn-secondary w-full" type="button" disabled={loading || resendIn > 0} onClick={resendOtp}>
          {resendIn > 0 ? `Resend OTP in ${formatSeconds(resendIn)}` : "Resend OTP"}
        </button>
        <p className="text-center text-sm text-gray-600">
          <Link className="font-bold text-orange-600" to="/admin/login">Back to admin login</Link>
        </p>
      </form>
    </main>
  );
}
