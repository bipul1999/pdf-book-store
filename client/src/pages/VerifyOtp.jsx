import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { AuthCard } from "./Login.jsx";
import { formatSeconds, otpInlineMessage, otpToastMessage } from "../utils/otpUi.js";

export default function VerifyOtp() {
  const [params] = useSearchParams();
  const [code, setCode] = useState("");
  const [resendIn, setResendIn] = useState(60);
  const [expiresIn, setExpiresIn] = useState(600);
  const [otpError, setOtpError] = useState("");
  const [loading, setLoading] = useState(false);
  const { saveSession } = useAuth();
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
      const { data } = await api.post("/auth/verify-otp", { email, code });
      saveSession(data);
      navigate("/dashboard");
    } catch (error) {
      setOtpError(otpInlineMessage(error, "Invalid OTP"));
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/signup/resend-otp", { email });
      setResendIn(data.resendAfterSeconds || 60);
      setExpiresIn(data.otpExpiresInSeconds || 600);
      toast.success("OTP resent");
    } catch (error) {
      toast.error(otpToastMessage(error, "Could not resend OTP"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Verify OTP">
      <form onSubmit={submit} className="space-y-3">
        <input className="input" value={email} readOnly />
        <input className="input" maxLength={6} placeholder="6 digit OTP" value={code} onChange={(e) => { setCode(e.target.value); setOtpError(""); }} required />
        {otpError && <p className="text-sm font-bold text-red-600">{otpError}</p>}
        <p className="text-sm font-semibold text-gray-600">OTP expires in {formatSeconds(expiresIn)}</p>
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Please wait..." : "Verify"}</button>
        <button className="btn-secondary w-full" type="button" disabled={loading || resendIn > 0} onClick={resendOtp}>
          {resendIn > 0 ? `Resend OTP in ${formatSeconds(resendIn)}` : "Resend OTP"}
        </button>
      </form>
    </AuthCard>
  );
}
