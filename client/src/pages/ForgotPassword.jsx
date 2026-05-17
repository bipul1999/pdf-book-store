import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/client.js";
import { AuthCard } from "./Login.jsx";
import { otpToastMessage } from "../utils/otpUi.js";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      toast.success("OTP sent if email exists");
      navigate(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (error) {
      toast.error(otpToastMessage(error, "Could not send OTP"));
    } finally {
      setLoading(false);
    }
  }
  return <AuthCard title="Forgot password"><form onSubmit={submit} className="space-y-3"><input className="input" type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} /><button className="btn-primary w-full" disabled={loading}>{loading ? "Sending..." : "Send OTP"}</button></form></AuthCard>;
}
