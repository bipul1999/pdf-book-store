import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/client.js";
import { AuthCard } from "./Login.jsx";
import { formatSeconds, otpInlineMessage, otpToastMessage } from "../utils/otpUi.js";

export default function ResetPassword() {
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
      toast.success("Password reset");
      navigate("/login");
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
      toast.success("OTP resent if email exists");
    } catch (error) {
      toast.error(otpToastMessage(error, "Could not resend OTP"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Reset password">
      <form onSubmit={submit} className="space-y-3">
        <input className="input" value={email} readOnly />
        <input className="input" placeholder="OTP" value={form.code} onChange={(e) => { setForm({ ...form, code: e.target.value }); setOtpError(""); }} required />
        {otpError && <p className="text-sm font-bold text-red-600">{otpError}</p>}
        <input className="input" type="password" placeholder="New password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <p className="text-sm font-semibold text-gray-600">OTP expires in {formatSeconds(expiresIn)}</p>
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Please wait..." : "Reset"}</button>
        <button className="btn-secondary w-full" type="button" disabled={loading || resendIn > 0} onClick={resendOtp}>
          {resendIn > 0 ? `Resend OTP in ${formatSeconds(resendIn)}` : "Resend OTP"}
        </button>
      </form>
    </AuthCard>
  );
}
