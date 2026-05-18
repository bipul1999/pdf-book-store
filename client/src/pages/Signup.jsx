import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/client.js";
import { AuthCard } from "./Login.jsx";

export default function Signup() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/signup", form);
      if (data.loginOtp) {
        toast.success("Account exists. Login OTP sent");
        navigate(`/login?email=${encodeURIComponent(data.email)}&identifier=${encodeURIComponent(form.email)}&otpSent=true${data.devOtp ? `&otp=${encodeURIComponent(data.devOtp)}` : ""}`);
        return;
      }
      toast.success("OTP sent");
      navigate(`/verify-otp?email=${encodeURIComponent(form.email)}${data.devOtp ? `&otp=${encodeURIComponent(data.devOtp)}` : ""}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }
  return <AuthCard title="Create account"><form onSubmit={submit} className="space-y-3">{["name", "email", "phone"].map((field) => <input key={field} required className="input" placeholder={field} onChange={(e) => setForm({ ...form, [field]: e.target.value })} />)}<input required minLength={8} className="input" type="password" placeholder="password" onChange={(e) => setForm({ ...form, password: e.target.value })} /><button className="btn-primary w-full" disabled={loading}>{loading ? "Sending OTP..." : "Sign up"}</button></form></AuthCard>;
}
