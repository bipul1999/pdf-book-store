import { MailCheck } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { formatSeconds, otpToastMessage } from "../../utils/otpUi.js";

export default function AdminVerifyOtp() {
  const [params] = useSearchParams();
  const [code, setCode] = useState("");
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
      const { data } = await api.post("/auth/admin/verify-otp", { email, code });
      saveSession(data);
      toast.success("Admin profile verified");
      navigate("/admin");
    } catch (error) {
      toast.error(otpToastMessage(error, "OTP verification failed"));
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/admin/resend-otp", { email });
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
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
      <form onSubmit={submit} className="panel w-full space-y-4 p-6">
        <div>
          <MailCheck className="mb-3 text-orange-600" />
          <h1 className="text-2xl font-black">Verify Admin Gmail</h1>
          <p className="text-sm text-gray-600">Enter the 6 digit OTP sent to your Gmail address.</p>
        </div>
        <input className="input" value={email} readOnly />
        <input className="input" maxLength={6} placeholder="6 digit OTP" value={code} onChange={(e) => setCode(e.target.value)} required />
        <p className="text-sm font-semibold text-gray-600">OTP expires in {formatSeconds(expiresIn)}</p>
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Please wait..." : "Verify admin"}</button>
        <button className="btn-secondary w-full" type="button" disabled={loading || resendIn > 0} onClick={resendOtp}>
          {resendIn > 0 ? `Resend OTP in ${formatSeconds(resendIn)}` : "Resend OTP"}
        </button>
      </form>
    </main>
  );
}
