import { CheckCircle2, Mic, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import assistantAvatar from "../assets/ai-assistant-sari.png";

const welcomeText = "Namaste, main Mahesh Bharti Store AI Assistant hoon.";
const quickProblems = [
  "Author Mahesh Bharti ji ke baare me batao",
  "Books section par le chalo",
  "Meri library khol do",
  "Payment ho gaya lekin book unlock nahi hui",
  "PDF download/open nahi ho raha"
];

const authorAnswer = "Mahesh Bharti ji ek lekhak hain jinki pustakein is digital store par PDF aur e-book format me available hain. Yahan user unki books browse, purchase, download aur library me read kar sakte hain.";

const guideActions = [
  { label: "Home", words: ["home", "homepage", "main page", "ghar"], path: "/" },
  { label: "Books", words: ["books", "book section", "book list"], path: "/books" },
  { label: "Login", words: ["login", "sign in", "account"], path: "/login" },
  { label: "Signup", words: ["signup", "sign up", "register", "create account"], path: "/signup" },
  { label: "Cart", words: ["cart", "bag", "tokri"], path: "/cart" },
  { label: "Library", words: ["library", "meri book", "my books", "purchased", "read"], path: "/dashboard/library" },
  { label: "Orders", words: ["orders", "order history", "payment history"], path: "/dashboard/orders" }
];

function GirlAssistantAvatar({ size = "md" }) {
  const boxSize = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-8 w-8" : "h-9 w-9";

  return (
    <span className={`grid ${boxSize} shrink-0 place-items-center overflow-hidden rounded-full bg-orange-50 ring-2 ring-white/80`} aria-hidden="true">
      <img
        alt=""
        className="h-full w-full object-cover object-top"
        decoding="async"
        loading="lazy"
        src={assistantAvatar}
      />
    </span>
  );
}

export default function ChatWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [step, setStep] = useState("welcome");
  const [input, setInput] = useState("");
  const [started, setStarted] = useState(false);
  const [listening, setListening] = useState(false);
  const timers = useRef([]);
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);

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

  function normalizeText(value) {
    return String(value || "").toLowerCase().trim();
  }

  function searchBookQuery(text) {
    return text
      .replace(/^(mujhe|mere ko|please|plz|open|search|find|dikhao|dikhaiye|le chalo|khol do|book|kitab|pustak)\s+/i, "")
      .replace(/\b(book|kitab|pustak|ebook|e-book|section|par|pe|tak|khol do|dikhao|dikhaiye|le chalo|search karo|find karo)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
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
      addBotMessage("Main author, books, login, cart, library aur orders me aapki help kar sakti hoon. Zarurat hui to support ticket bhi bana dungi. Sabse pehle apna naam bataiye.", 150);
    }, 2300));
  }

  useEffect(() => () => {
    clearTimers();
    recognitionRef.current?.abort?.();
  }, []);

  useEffect(() => {
    if (open && !started) startConversation();
    if (!open && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, [open, started]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function sendIssue(problemText) {
    setLoading(true);
    addBotMessage("Thanks, main aapki problem support team ko send kar rahi hoon.", 250);
    try {
      const { data } = await api.post("/support/tickets", {
        name,
        email,
        phone,
        message: problemText,
        pageUrl: window.location.href
      });
      addBotMessage(data.reply || "Aapki problem support team ko send ho gayi hai. Jaldi help milegi.", 700);
      addBotMessage(`Ticket ID: ${data.ticketId}. Category: ${data.category}. Priority: ${data.priority}.`, 1000);
      setStep("done");
      toast.success("Support ticket send ho gaya");
    } catch (error) {
      addBotMessage("Sorry, message send nahi ho paya. Thodi der baad fir try kijiye.", 700);
      setStep("problem");
      toast.error(error.response?.data?.message || "Support message send nahi ho paya");
    } finally {
      setLoading(false);
    }
  }

  function handleGuideRequest(value) {
    const text = normalizeText(value);

    if (/\badmin\b|admin panel|dashboard admin|manage books|add book/i.test(text)) {
      addBotMessage("Ye secure owner area hai. Main public store, books, login, cart, library aur orders me help kar sakti hoon.", 350);
      return true;
    }

    if (/author|writer|mahesh|bharti|lekhak|about/i.test(text)) {
      addBotMessage(authorAnswer, 350);
      return true;
    }

    const action = guideActions.find((item) => item.words.some((word) => text.includes(word)));
    if (action) {
      navigate(action.path);
      addBotMessage(`${action.label} section khol diya.`, 350);
      return true;
    }

    if (/search|find|dikhao|dikhaiye|book|kitab|pustak|ebook|e-book/i.test(text)) {
      const query = searchBookQuery(value);
      navigate(query ? `/books?q=${encodeURIComponent(query)}` : "/books");
      addBotMessage(query ? `"${query}" ke liye books search kar di.` : "Books section khol diya.", 350);
      return true;
    }

    return false;
  }

  async function processUserText(value) {
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
      addBotMessage("Ab mobile number likhiye, taaki support team zarurat pade to contact kar sake.", 450);
      return;
    }
    if (step === "phone") {
      setPhone(value);
      setStep("problem");
      addBotMessage("Ab bataiye aapko kya chahiye? Aap author ke baare me puch sakte hain, book ka naam bol sakte hain, ya section khulwa sakte hain.", 450);
      return;
    }
    if (handleGuideRequest(value)) return;
    await sendIssue(value);
  }

  async function handleChatSubmit(event) {
    event.preventDefault();
    const value = input.trim();
    setInput("");
    await processUserText(value);
  }

  function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Is browser me voice input support nahi hai");
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "hi-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setListening(true);
    recognition.onerror = () => {
      setListening(false);
      toast.error("Voice samajh nahi aayi, dobara try kijiye");
    };
    recognition.onend = () => setListening(false);
    recognition.onresult = async (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (!transcript) return;
      setInput("");
      await processUserText(transcript);
    };
    recognition.start();
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
                <p className="flex items-center gap-1 text-xs text-orange-100"><CheckCircle2 size={12} /> Voice guide + support ticket</p>
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
                placeholder={step === "done" ? "Ticket support team ko send ho gaya" : placeholders[step] || "Type here..."}
                type={step === "email" ? "email" : "text"}
                value={input}
                onChange={(event) => setInput(event.target.value)}
              />
              {step !== "done" && (
                <button
                  aria-label="Speak"
                  className={`btn-secondary !min-h-11 !px-3 ${listening ? "!border-orange-400 !bg-orange-100 !text-orange-700" : ""}`}
                  disabled={loading || step === "welcome"}
                  onClick={startVoiceInput}
                  type="button"
                >
                  <Mic size={16} />
                </button>
              )}
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
