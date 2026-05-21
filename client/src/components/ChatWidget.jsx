import { CheckCircle2, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

const welcomeText = "Namaste, main Mahesh Bharti Store AI Assistant hoon.";
const quickProblems = [
  "Payment ho gaya lekin book unlock nahi hui",
  "OTP ya login me problem aa rahi hai",
  "PDF download/open nahi ho raha",
  "Book ke price ya availability ke baare me puchna hai"
];

function GirlAssistantAvatar({ size = "md" }) {
  const boxSize = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const faceSize = size === "lg" ? "h-7 w-7" : size === "sm" ? "h-5 w-5" : "h-6 w-6";

  return (
    <span className={`relative grid ${boxSize} shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-rose-100 via-orange-100 to-amber-100 ring-1 ring-white/70`} aria-hidden="true">
      <span className={`absolute top-1 rounded-t-full bg-[#2f241f] ${faceSize}`} />
      <span className={`relative mt-1 grid ${faceSize} place-items-center rounded-full bg-[#f4c7a1] shadow-sm`}>
        <span className="absolute top-[38%] left-[28%] h-1 w-1 rounded-full bg-[#3a2a24]" />
        <span className="absolute top-[38%] right-[28%] h-1 w-1 rounded-full bg-[#3a2a24]" />
        <span className="absolute bottom-[24%] h-1 w-2 rounded-b-full border-b border-[#a84f43]" />
      </span>
      <span className="absolute bottom-0 h-2 w-7 rounded-t-full bg-[#0f5b55]" />
    </span>
  );
}

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [step, setStep] = useState("welcome");
  const [input, setInput] = useState("");
  const [started, setStarted] = useState(false);
  const timers = useRef([]);
  const chatEndRef = useRef(null);

  const placeholders = {
    name: "Apna naam likhiye",
    email: "Apna email likhiye",
    phone: "Mobile number likhiye",
    problem: "Ab apni problem detail me likhiye..."
  };

  function clearTimers() {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current = [];
  }

  function shouldUseMobileVoice() {
    return typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;
  }

  function speakAssistantText(text, interrupt = false) {
    if (!shouldUseMobileVoice() || !("speechSynthesis" in window)) return;
    if (interrupt) window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find((voice) => /hi-IN|en-IN/i.test(voice.lang) && /female|zira|heera|lekha|google/i.test(voice.name))
      || voices.find((voice) => /hi-IN/i.test(voice.lang))
      || voices.find((voice) => /en-IN/i.test(voice.lang));
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.lang = preferredVoice?.lang || "hi-IN";
    utterance.rate = 0.95;
    utterance.pitch = 1.08;
    window.speechSynthesis.speak(utterance);
  }

  function addBotMessage(text, delay = 450) {
    const timer = setTimeout(() => {
      setMessages((items) => [...items, { role: "assistant", text }]);
      speakAssistantText(text);
    }, delay);
    timers.current.push(timer);
  }

  function startConversation() {
    clearTimers();
    setStarted(true);
    setStep("welcome");
    setInput("");
    setMessages([{ role: "assistant", text: welcomeText }]);
    speakAssistantText(welcomeText, true);
    timers.current.push(setTimeout(() => {
      setMessages([]);
      setStep("name");
      addBotMessage("Main aapki query samajh kar instant guidance dunga aur zarurat hui to admin ko ticket bhej dunga. Sabse pehle apna naam bataiye.", 150);
    }, 2300));
  }

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    if (open && !started) startConversation();
    if (!open && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, [open, started]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function sendIssue(problemText) {
    setLoading(true);
    addBotMessage("Thanks, main aapki problem admin ko send kar raha hoon.", 250);
    try {
      const { data } = await api.post("/support/tickets", {
        name,
        email,
        phone,
        message: problemText,
        pageUrl: window.location.href
      });
      addBotMessage(data.reply || "Aapki problem admin ko send ho gayi hai. Jaldi help milegi.", 700);
      addBotMessage(`Ticket ID: ${data.ticketId}. Category: ${data.category}. Priority: ${data.priority}.`, 1000);
      setStep("done");
      toast.success("Admin ko problem send ho gaya");
    } catch (error) {
      addBotMessage("Sorry, message send nahi ho paya. Thodi der baad fir try kijiye.", 700);
      setStep("problem");
      toast.error(error.response?.data?.message || "Support message send nahi ho paya");
    } finally {
      setLoading(false);
    }
  }

  async function handleChatSubmit(event) {
    event.preventDefault();
    const value = input.trim();
    if (loading || step === "welcome" || step === "done" || !value) return;

    if (step === "name" && value.length < 2) {
      toast.error("Naam thoda clearly likhiye");
      return;
    }
    if (step === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast.error("Valid email likhiye");
      return;
    }
    if (step === "phone" && value.replace(/\D/g, "").length < 8) {
      toast.error("Valid mobile number likhiye");
      return;
    }
    if (step === "problem" && value.length < 8) {
      toast.error("Problem thoda detail me likhiye");
      return;
    }

    setMessages((items) => [...items, { role: "user", text: value }]);
    setInput("");

    if (step === "name") {
      setName(value);
      setStep("email");
      addBotMessage(`Thanks ${value}. Ab apna email bataiye.`, 450);
      return;
    }
    if (step === "email") {
      setEmail(value);
      setStep("phone");
      addBotMessage("Ab mobile number likhiye, taaki admin zarurat pade to contact kar sake.", 450);
      return;
    }
    if (step === "phone") {
      setPhone(value);
      setStep("problem");
      addBotMessage("Ab bataiye aapko kya problem aa rahi hai?", 450);
      return;
    }
    await sendIssue(value);
  }

  return (
    <>
      {open && (
        <section className="fixed bottom-24 right-3 z-50 w-[calc(100vw-1.5rem)] max-w-sm overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,.25)] sm:bottom-6 sm:right-6">
          <div className="flex items-center justify-between bg-gradient-to-r from-[#073b3a] to-[#b45309] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
                <GirlAssistantAvatar />
              </span>
              <div>
                <p className="font-black">AI Support Assistant</p>
                <p className="flex items-center gap-1 text-xs text-orange-100"><CheckCircle2 size={12} /> Smart reply + admin ticket</p>
              </div>
            </div>
            <button className="rounded-full p-2 hover:bg-white/10" onClick={() => setOpen(false)} aria-label="Close chat">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3 p-4">
            <div className="max-h-72 space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-3">
              {messages.map((item, index) => (
                <div className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`} key={`${item.role}-${index}`}>
                  {item.role === "assistant" && (
                    <span className="mr-2"><GirlAssistantAvatar size="sm" /></span>
                  )}
                  <p className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm font-semibold leading-6 ${
                    item.role === "user"
                      ? "rounded-br-sm bg-orange-500 text-white"
                      : "rounded-bl-sm bg-white text-slate-700 shadow-sm"
                  }`}>
                    {item.text}
                  </p>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <span className="mr-2"><GirlAssistantAvatar size="sm" /></span>
                  <p className="rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-sm font-black text-slate-500 shadow-sm">Typing...</p>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            {step === "problem" && !loading && (
              <div className="grid gap-2">
                {quickProblems.map((problem) => (
                  <button
                    className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-left text-xs font-bold text-orange-800 transition hover:border-orange-300 hover:bg-orange-100"
                    key={problem}
                    onClick={() => setInput(problem)}
                    type="button"
                  >
                    {problem}
                  </button>
                ))}
              </div>
            )}
            <form className="flex gap-2" onSubmit={handleChatSubmit}>
              <input
                className="input !min-h-11 flex-1"
                disabled={loading || step === "welcome" || step === "done"}
                placeholder={step === "done" ? "Ticket admin ko send ho gaya" : placeholders[step] || "Type here..."}
                type={step === "email" ? "email" : "text"}
                value={input}
                onChange={(event) => setInput(event.target.value)}
              />
              {step === "done" ? (
                <button className="btn-secondary !min-h-11 !px-3" type="button" onClick={startConversation}>
                  New
                </button>
              ) : (
                <button className="btn-primary !min-h-11 !px-3" disabled={loading || step === "welcome"}>
                  <Send size={16} />
                </button>
              )}
            </form>
          </div>
        </section>
      )}
      <button
        className="fixed bottom-24 right-4 z-40 grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-[#073b3a] to-orange-500 text-white shadow-[0_12px_30px_rgba(249,115,22,.35)] ring-4 ring-white transition hover:scale-105 sm:bottom-6 sm:right-6"
        onClick={() => setOpen((value) => !value)}
        aria-label="Open AI help chat"
      >
        {open ? <X size={24} /> : <GirlAssistantAvatar size="lg" />}
      </button>
    </>
  );
}
