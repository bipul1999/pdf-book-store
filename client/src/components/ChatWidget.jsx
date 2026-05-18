import { Bot, MessageCircle, Send, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState("Hi, tell me what problem you are facing. I will inform the admin.");

  async function submitIssue(event) {
    event.preventDefault();
    if (message.trim().length < 8) {
      toast.error("Please write your problem in a little more detail.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/support/tickets", {
        name,
        email,
        phone,
        message,
        pageUrl: window.location.href
      });
      setReply(data.reply || "Your problem has been sent to admin.");
      setMessage("");
      toast.success("Admin ko problem send ho gaya");
    } catch (error) {
      toast.error(error.response?.data?.message || "Support message send nahi ho paya");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {open && (
        <section className="fixed bottom-24 right-3 z-50 w-[calc(100vw-1.5rem)] max-w-sm overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,.25)] sm:bottom-6 sm:right-6">
          <div className="flex items-center justify-between bg-gradient-to-r from-[#073b3a] to-[#b45309] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
                <Bot size={20} />
              </span>
              <div>
                <p className="font-black">AI Help</p>
                <p className="text-xs text-orange-100">Admin ko direct notify karega</p>
              </div>
            </div>
            <button className="rounded-full p-2 hover:bg-white/10" onClick={() => setOpen(false)} aria-label="Close chat">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3 p-4">
            <div className="rounded-2xl bg-orange-50 px-3 py-2 text-sm font-semibold leading-6 text-slate-700">
              {reply}
            </div>
            <form className="space-y-3" onSubmit={submitIssue}>
              {!user && (
                <div className="grid gap-2">
                  <input className="input !min-h-10" placeholder="Your name" value={name} onChange={(event) => setName(event.target.value)} />
                  <input className="input !min-h-10" placeholder="Email for reply" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                  <input className="input !min-h-10" placeholder="Mobile number" value={phone} onChange={(event) => setPhone(event.target.value)} />
                </div>
              )}
              <textarea
                className="input min-h-28 resize-none"
                placeholder="Problem likhiye, jaise OTP nahi aa raha, payment issue, PDF download nahi ho raha..."
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
              <button className="btn-primary w-full" disabled={loading}>
                <Send size={16} /> {loading ? "Sending..." : "Send to admin"}
              </button>
            </form>
          </div>
        </section>
      )}
      <button
        className="fixed bottom-24 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-orange-500 text-white shadow-[0_12px_30px_rgba(249,115,22,.35)] transition hover:bg-orange-600 sm:bottom-6 sm:right-6"
        onClick={() => setOpen((value) => !value)}
        aria-label="Open AI help chat"
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </>
  );
}
