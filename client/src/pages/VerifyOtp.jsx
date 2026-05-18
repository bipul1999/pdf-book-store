import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { AuthCard } from "./Login.jsx";
import { formatSeconds, otpToastMessage } from "../utils/otpUi.js";

export default function VerifyOtp() {
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get("otp") || "");
  const [visibleOtp, setVisibleOtp] = useState(params.get("otp") || "");
  const [resendIn, setResendIn] = useState(60);
  const [expiresIn, setExpiresIn] = useState(600);
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
    try {
      const { data } = await api.post("/auth/verify-otp", { email, code });
      saveSession(data);
      navigate("/dashboard");
    } catch (error) {
      toast.error(otpToastMessage(error, "OTP failed"));
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/signup/resend-otp", { email });
      if (data.devOtp) {
        setCode(data.devOtp);
        setVisibleOtp(data.devOtp);
      }
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
        {visibleOtp && (
          <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-center">
            <p className="text-xs font-bold uppercase text-orange-700">Your OTP</p>
            <p className="mt-1 text-2xl font-black tracking-widest text-ink">{visibleOtp}</p>
          </div>
        )}
        <input className="input" maxLength={6} placeholder="6 digit OTP" value={code} onChange={(e) => setCode(e.target.value)} required />
        <p className="text-sm font-semibold text-gray-600">OTP expires in {formatSeconds(expiresIn)}</p>
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Please wait..." : "Verify"}</button>
        <button className="btn-secondary w-full" type="button" disabled={loading || resendIn > 0} onClick={resendOtp}>
          {resendIn > 0 ? `Resend OTP in ${formatSeconds(resendIn)}` : "Resend OTP"}
        </button>
      </form>
    </AuthCard>
  );
}
