import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { formatSeconds, otpInlineMessage, otpToastMessage } from "../utils/otpUi.js";

export default function Login() {
  const [params] = useSearchParams();
  const redirectTo = params.get("redirect") || "/dashboard";
  const [identifier, setIdentifier] = useState(params.get("identifier") || "");
  const [email, setEmail] = useState(params.get("email") || "");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(params.get("otpSent") === "true");
  const [resendIn, setResendIn] = useState(params.get("otpSent") === "true" ? 60 : 0);
  const [expiresIn, setExpiresIn] = useState(params.get("otpSent") === "true" ? 600 : 0);
  const [otpError, setOtpError] = useState("");
  const [loading, setLoading] = useState(false);
  const { saveSession } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (params.get("otpSent") === "true") toast.success("Login OTP sent");
  }, [params]);

  useEffect(() => {
    if (!otpSent) return;
    const timer = setInterval(() => {
      setResendIn((value) => Math.max(0, value - 1));
      setExpiresIn((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpSent]);

  function startOtpTimers(data) {
    setResendIn(data.resendAfterSeconds || 60);
    setExpiresIn(data.otpExpiresInSeconds || 600);
  }

  async function requestOtp(e) {
    e?.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login/request-otp", { identifier });
      setEmail(data.email);
      setOtpSent(true);
      setOtpError("");
      startOtpTimers(data);
      toast.success("OTP sent");
    } catch (error) {
      const data = error.response?.data;
      toast.error(otpToastMessage(error, "Could not send OTP"));
      if (data?.signupOtp && data.email) navigate(`/verify-otp?email=${encodeURIComponent(data.email)}`);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    setLoading(true);
    setOtpError("");
    try {
      const { data } = await api.post("/auth/login/verify-otp", { email, code });
      saveSession(data);
      navigate(redirectTo);
    } catch (error) {
      setOtpError(otpInlineMessage(error, "Invalid OTP"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Login with OTP">
      {!otpSent ? (
        <form onSubmit={requestOtp} className="space-y-3">
          <input className="input" placeholder="Email or phone" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
          <button className="btn-primary w-full" disabled={loading}>{loading ? "Sending..." : "Send OTP"}</button>
          <div className="text-sm"><Link to="/signup">Create account</Link></div>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-3">
          <input className="input" value={email} readOnly />
          <input className="input" maxLength={6} placeholder="6 digit OTP" value={code} onChange={(e) => { setCode(e.target.value); setOtpError(""); }} required />
          {otpError && <p className="text-sm font-bold text-red-600">{otpError}</p>}
          <p className="text-sm font-semibold text-gray-600">OTP expires in {formatSeconds(expiresIn)}</p>
          <button className="btn-primary w-full" disabled={loading}>{loading ? "Verifying..." : "Verify and login"}</button>
          <button className="btn-secondary w-full" type="button" disabled={loading || resendIn > 0} onClick={requestOtp}>
            {resendIn > 0 ? `Resend OTP in ${formatSeconds(resendIn)}` : "Resend OTP"}
          </button>
          <button className="btn-secondary w-full" type="button" onClick={() => setOtpSent(false)}>Use another email or phone</button>
        </form>
      )}
    </AuthCard>
  );
}

export function AuthCard({ title, children }) {
  return <main className="store-page mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-8 sm:py-12"><section className="panel relative w-full overflow-hidden p-5 sm:p-7"><div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#d97706] via-amber-400 to-amber-200" /><span className="badge mb-3 mt-1">Account access</span><h1 className="mb-5 text-2xl font-black sm:text-3xl">{title}</h1>{children}</section></main>;
}
