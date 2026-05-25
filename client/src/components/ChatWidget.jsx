import { CheckCircle2, Mic, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import assistantAvatar from "../assets/ai-assistant-sari.png";

const welcomeText = "Namaste, main Mahesh Bharti Store AI Assistant hoon.";
const quickProblems = [
  { label: "Author Mahesh Bharti ji ke baare me batao" },
  { label: "Books section par le chalo", path: "/books" },
  { label: "Order Book page khol do", path: "/order-book" },
  { label: "Meri library khol do", path: "/dashboard/library" },
  { label: "Payment ho gaya lekin book unlock nahi hui" },
  { label: "PDF download/open nahi ho raha" }
];

const authorAnswer = "Mahesh Bharti ji ek lekhak hain jinki pustakein is digital store par PDF aur e-book format me available hain. Yahan user unki books browse, purchase, download aur library me read kar sakte hain.";

const answerRules = [
  {
    words: ["buy", "purchase", "kharid", "kaise kharide", "order"],
    reply: "Book kharidne ke liye Books section me jaiye, book open kijiye, Buy PDF par tap kijiye, payment complete kijiye. Payment verify hone ke baad book Library me unlock ho jayegi."
  },
  {
    words: ["payment", "upi", "razorpay", "pay", "paid"],
    reply: "Payment ke liye Razorpay ya UPI option milega. UPI manual payment me exact amount pay karke screenshot upload karna hota hai. Verify hone ke baad PDF Library me unlock hoti hai."
  },
  {
    words: ["download", "pdf", "open nahi", "read", "library"],
    reply: "PDF padhne ya download karne ke liye login karke Library section open kijiye. Sirf successful payment wali books Library me read/open hoti hain."
  },
  {
    words: ["login", "otp", "password", "account"],
    reply: "Login ke liye apna email/mobile aur password use kijiye. Agar password bhool gaye hain to Forgot Password se OTP ke through reset kar sakte hain."
  },
  {
    words: ["cart"],
    reply: "Cart me selected books dikhti hain. Cart open karke checkout par jaiye aur payment complete kijiye."
  },
  {
    words: ["contact", "help", "support"],
    reply: "Aap apni problem yahin likh sakte hain. Agar issue resolve na ho to main support ticket bana dungi."
  }
];

const guideActions = [
  { label: "Home", words: ["home", "homepage", "main page", "ghar"], path: "/" },
  { label: "Books", words: ["books", "book section", "book list"], path: "/books" },
  { label: "Order Book", words: ["order book", "book order"], path: "/order-book" },
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
  const [listening, setListening] = useState(false);
  const timers = useRef([]);
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");
  const voiceSentRef = useRef(false);
  const utterancesRef = useRef(new Set());

  const placeholders = {
    problem: "Apna question likhiye ya mic se boliye..."
  };

  function clearTimers() {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current = [];
  }

  function closeAssistant() {
    recognitionRef.current?.abort?.();
    transcriptRef.current = "";
    voiceSentRef.current = false;
    setListening(false);
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      utterancesRef.current.clear();
    }
    setOpen(false);
  }

  function navigateAndClose(path) {
    closeAssistant();
    navigate(path);
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

  function speakAssistantText(text, interrupt = false) {
    if (!("speechSynthesis" in window)) return;
    const speech = window.speechSynthesis;
    if (interrupt) {
      speech.cancel();
      utterancesRef.current.clear();
    }
    if (speech.paused) speech.resume();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = speech.getVoices();
    const preferredVoice = voices.find((voice) => /hi-IN|en-IN/i.test(voice.lang) && /female|zira|heera|lekha|google/i.test(voice.name))
      || voices.find((voice) => /hi-IN/i.test(voice.lang))
      || voices.find((voice) => /en-IN/i.test(voice.lang));
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.lang = preferredVoice?.lang || "hi-IN";
    utterance.rate = 0.95;
    utterance.pitch = 1.08;
    utterance.onend = () => utterancesRef.current.delete(utterance);
    utterance.onerror = () => utterancesRef.current.delete(utterance);
    utterancesRef.current.add(utterance);
    speech.speak(utterance);
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
    setStep("welcome");
    setInput("");
    setMessages([{ role: "assistant", text: welcomeText }]);
    speakAssistantText(welcomeText, true);
    timers.current.push(setTimeout(() => {
      setMessages([]);
      setStep("problem");
      addBotMessage("Aap seedha question puch sakte hain: author, book search, payment, login, library, download, ya kisi section par jaana.", 150);
    }, 2300));
  }

  function openAssistant() {
    setOpen(true);
    startConversation();
  }

  useEffect(() => () => {
    clearTimers();
    recognitionRef.current?.abort?.();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    utterancesRef.current.clear();
  }, []);

  useEffect(() => {
    if (!open && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      utterancesRef.current.clear();
    }
  }, [open]);

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
      navigateAndClose(action.path);
      return true;
    }

    if (!shouldCreateSupportTicket(value) && /search|find|dikhao|dikhaiye|book|kitab|pustak|ebook|e-book/i.test(text)) {
      const query = searchBookQuery(value);
      navigateAndClose(query ? `/books?q=${encodeURIComponent(query)}` : "/books");
      return true;
    }

    return false;
  }

  function handleKnownQuestion(value) {
    const text = normalizeText(value);
    const match = answerRules.find((rule) => rule.words.some((word) => text.includes(word)));
    if (!match) return false;
    addBotMessage(match.reply, 350);
    return true;
  }

  function shouldCreateSupportTicket(value) {
    return /(problem|issue|error|not working|nahi ho raha|nahi aa raha|nahi hui|unlock|fail|failed|refund|money|deduct|kat gaya|ho gaya lekin|complaint|shikayat|support ticket)/i.test(value);
  }

  async function processUserText(value) {
    if (loading || step === "welcome" || step === "done" || !value) return;

    setMessages((items) => [...items, { role: "user", text: value }]);
    setInput("");

    if (handleGuideRequest(value)) return;
    if (step === "problem" && value.length < 8) {
      toast.error("Question thoda detail me boliye ya likhiye");
      return;
    }
    if (shouldCreateSupportTicket(value)) {
      await sendIssue(value);
      return;
    }
    if (handleKnownQuestion(value)) return;
    addBotMessage("Main is store me books search, author info, payment, login, library, cart aur orders me help kar sakti hoon. Book ka naam likhiye ya boliye, main search kar dungi.", 350);
  }

  async function handleChatSubmit(event) {
    event.preventDefault();
    const value = input.trim();
    setInput("");
    await processUserText(value);
  }

  function voiceErrorMessage(error) {
    const reason = error?.error || error?.name;
    if (["not-allowed", "service-not-allowed", "NotAllowedError", "SecurityError"].includes(reason)) {
      return "Microphone permission allow kijiye, phir mic dobara tap kijiye.";
    }
    if (["audio-capture", "NotFoundError", "NotReadableError"].includes(reason)) {
      return "Microphone available nahi mila. Device mic settings check kijiye.";
    }
    if (reason === "no-speech") return "Awaaz sunai nahi di. Mic tap karke dobara boliye.";
    if (reason === "network") return "Voice service connect nahi hui. Network check karke dobara try kijiye.";
    if (reason === "aborted") return "";
    return "Voice input start nahi ho paya. Dobara try kijiye.";
  }

  async function sendVoiceTranscript(transcript) {
    const value = String(transcript || "").trim();
    if (!value || voiceSentRef.current) return;
    voiceSentRef.current = true;
    recognitionRef.current?.stop?.();
    setInput("");
    toast.success("Voice message send ho gaya");
    await processUserText(value);
  }

  async function startVoiceInput() {
    if (listening) {
      recognitionRef.current?.stop?.();
      return;
    }
    if (!window.isSecureContext) {
      toast.error("Voice input ke liye secure HTTPS page par website kholiye.");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice input ke liye Chrome browser me website kholiye.");
      return;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    transcriptRef.current = "";
    voiceSentRef.current = false;
    recognition.lang = "hi-IN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      setListening(true);
      toast.success("Bolna shuru kijiye, message automatic send hoga...");
    };
    recognition.onerror = (event) => {
      setListening(false);
      const message = voiceErrorMessage(event);
      if (message) toast.error(message);
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      if (!voiceSentRef.current && transcriptRef.current.trim()) {
        void sendVoiceTranscript(transcriptRef.current);
      }
    };
    recognition.onresult = (event) => {
      let transcript = "";
      let finalTranscript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const spokenText = event.results[index]?.[0]?.transcript || "";
        transcript += spokenText;
        if (event.results[index].isFinal) finalTranscript += spokenText;
      }
      const spokenValue = transcript.trim();
      if (spokenValue) {
        transcriptRef.current = spokenValue;
        setInput(spokenValue);
      }
      if (finalTranscript.trim()) void sendVoiceTranscript(finalTranscript);
    };
    try {
      recognition.start();
    } catch (error) {
      setListening(false);
      const message = voiceErrorMessage(error);
      if (message) toast.error(message);
    }
  }

  return (
    <>
      {open && (
        <section className="fixed bottom-24 right-3 z-50 flex max-h-[calc(100vh-7rem)] w-[calc(100vw-1.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,.25)] md:bottom-6 md:right-6 md:max-h-[calc(100vh-3rem)]">
          <button
            className="absolute right-2 top-2 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-slate-700 shadow-md ring-1 ring-orange-100 transition hover:bg-orange-50 hover:text-orange-700"
            onClick={closeAssistant}
            aria-label="Close AI chat"
            type="button"
          >
            <X size={18} />
          </button>
          <div className="flex items-center justify-between bg-gradient-to-r from-[#d97706] to-[#f59e0b] px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-2 pr-10">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
                <GirlAssistantAvatar />
              </span>
              <div>
                <p className="font-black">AI Support Assistant</p>
                <p className="flex items-center gap-1 text-xs text-orange-100"><CheckCircle2 size={12} /> Voice guide + support ticket</p>
              </div>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col space-y-3 p-4">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-3">
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
                    key={problem.label}
                    onClick={() => problem.path ? navigateAndClose(problem.path) : setInput(problem.label)}
                    type="button"
                  >
                    {problem.label}
                  </button>
                ))}
              </div>
            )}
            {listening && (
              <p className="flex items-center justify-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" /> Recording... boliye, message automatic send hoga
              </p>
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
                  aria-label={listening ? "Stop voice recording" : "Start voice recording"}
                  className={`btn-secondary !min-h-11 !px-3 ${listening ? "!border-red-400 !bg-red-50 !text-red-600" : ""}`}
                  disabled={loading || step === "welcome"}
                  onClick={startVoiceInput}
                  type="button"
                >
                  <Mic size={16} /> <span className="sr-only">{listening ? "Stop" : "Record"}</span>
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
        className="fixed bottom-24 right-4 z-40 grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-[#e24b13] via-[#f97316] to-[#fbbf24] text-white shadow-[0_14px_32px_rgba(234,88,12,.45)] ring-4 ring-orange-100 transition hover:scale-105 hover:from-[#ef5b25] hover:to-[#fde047] md:bottom-6 md:right-6"
        onClick={open ? closeAssistant : openAssistant}
        aria-label="Open AI help chat"
      >
        {open ? <X size={24} /> : <GirlAssistantAvatar size="lg" />}
      </button>
    </>
  );
}
