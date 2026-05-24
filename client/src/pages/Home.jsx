import { BookPlus, CheckCircle2, CreditCard, Download, Library, RefreshCw, Search, ShieldCheck, ShoppingBag, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import api from "../api/client.js";
import BookCard from "../components/BookCard.jsx";
import { FallingLetters } from "../components/Layout.jsx";
import { fallbackAuthorImage, fallbackBooks } from "../data/fallbackCatalog.js";
import { BOOK_COVER_FALLBACK, useFallbackImage } from "../utils/imageFallback.js";

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const HOME_RETRY_DELAYS_MS = [1500, 3500, 7000];

function currentQuoteSlot() {
  return Math.floor(Date.now() / FOUR_HOURS_MS);
}

function msUntilNextQuoteSlot() {
  return FOUR_HOURS_MS - (Date.now() % FOUR_HOURS_MS);
}

const defaultQuote = {
  quote: "किताबें केवल शब्द नहीं होतीं, वे जीवन को समझने की एक शांत रोशनी होती हैं।",
  authorName: "महेश भारती",
  authorImage: fallbackAuthorImage
};

const rotatingQuotes = [
  defaultQuote,
  {
    quote: "अच्छी किताब मन के भीतर नए रास्ते खोलती है।",
    authorName: "महेश भारती",
    authorImage: ""
  },
  {
    quote: "पढ़ना एक छोटी आदत है, जो जीवन को धीरे-धीरे बड़ा बना देती है।",
    authorName: "महेश भारती",
    authorImage: ""
  },
  {
    quote: "हर विचारशील पुस्तक मन में एक नई हिम्मत जगाती है।",
    authorName: "महेश भारती",
    authorImage: ""
  },
  {
    quote: "किताबों के साथ बिताया समय हमेशा कुछ न कुछ लौटा देता है।",
    authorName: "महेश भारती",
    authorImage: ""
  }
];

function BookGridSkeleton({ compact = false }) {
  return (
    <div className={`grid gap-4 ${compact ? "grid-cols-2 sm:gap-3" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className={`${compact ? "h-44 sm:h-52" : "h-80"} animate-pulse rounded-2xl bg-orange-50 shadow-soft`} />
      ))}
    </div>
  );
}

export default function Home() {
  const [books, setBooks] = useState(fallbackBooks);
  const [heroBookPool, setHeroBookPool] = useState(fallbackBooks);
  const [quote, setQuote] = useState(defaultQuote);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [bookOffset, setBookOffset] = useState(0);
  const [isBookTransitioning, setIsBookTransitioning] = useState(false);
  const [quoteSlot, setQuoteSlot] = useState(() => currentQuoteSlot());

  useEffect(() => {
    let cancelled = false;
    let retryTimer;

    async function loadHome(attempt = 0) {
      try {
        setLoadError(false);
        const { data } = await api.get("/books");
        if (cancelled) return;
        const allBooks = data.books || [];
        setHeroBookPool(allBooks);
        setBooks(allBooks);
        setLoading(false);
      } catch {
        if (cancelled) return;
        if (!books.length) {
          setHeroBookPool(fallbackBooks);
          setBooks(fallbackBooks);
        }
        setLoading(false);
        const nextDelay = HOME_RETRY_DELAYS_MS[attempt];
        if (nextDelay) {
          retryTimer = setTimeout(() => loadHome(attempt + 1), nextDelay);
          return;
        }
        setLoadError(true);
        setLoading(false);
      }
    }

    loadHome();
    api.get("/site/quote").then(({ data }) => setQuote(data.quote)).catch(() => {});

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
    };
  }, []);

  useEffect(() => {
    let intervalTimer;
    const timeoutTimer = setTimeout(() => {
      setQuoteSlot(currentQuoteSlot());
      intervalTimer = setInterval(() => {
        setQuoteSlot(currentQuoteSlot());
      }, FOUR_HOURS_MS);
    }, msUntilNextQuoteSlot());

    return () => {
      clearTimeout(timeoutTimer);
      clearInterval(intervalTimer);
    };
  }, []);

  useEffect(() => {
    if (heroBookPool.length <= 4) return undefined;
    let transitionTimer;
    const timer = setInterval(() => {
      setIsBookTransitioning(true);
      transitionTimer = setTimeout(() => {
        setBookOffset((current) => (current + 1) % heroBookPool.length);
        setIsBookTransitioning(false);
      }, 550);
    }, 5000);
    return () => {
      clearInterval(timer);
      clearTimeout(transitionTimer);
    };
  }, [heroBookPool.length]);

  const heroBooks = heroBookPool.length <= 4
    ? heroBookPool
    : Array.from({ length: Math.min(4, heroBookPool.length) }, (_, index) => heroBookPool[(bookOffset + index) % heroBookPool.length]);
  const quoteOptions = useMemo(() => {
    const customQuote = quote?.quote ? quote : defaultQuote;
    return [customQuote, ...rotatingQuotes.filter((item) => item.quote !== customQuote.quote)];
  }, [quote]);
  const selectedQuote = quoteOptions[quoteSlot % quoteOptions.length] || defaultQuote;
  const activeQuote = {
    ...selectedQuote,
    authorImage: selectedQuote.authorImage || quote?.authorImage || defaultQuote.authorImage
  };
  const bestBook = books[0];
  const trustItems = [
    { icon: CheckCircle2, title: "विचारपूर्ण लेखन", text: "विषय को सरल, शांत और पढ़ने योग्य भाषा में रखा गया है।" },
    { icon: ShieldCheck, title: "सुरक्षित भुगतान", text: "खरीदारी के बाद PDF access आपके account से जुड़ जाता है।" },
    { icon: Library, title: "लाइब्रेरी में उपलब्ध", text: "Purchased books आपकी library में रहती हैं, जहां से आप पढ़ सकते हैं।" },
    { icon: Download, title: "मोबाइल-फ्रेंडली", text: "फोन, टैबलेट या लैपटॉप पर आराम से पढ़ने का अनुभव।" }
  ];
  const processSteps = [
    { icon: Search, title: "पुस्तक खोजें", text: "Catalog में विषय, नाम या लेखक के अनुसार सही पुस्तक चुनें।" },
    { icon: CheckCircle2, title: "विवरण समझें", text: "Cover, description और price देखकर निर्णय लें।" },
    { icon: CreditCard, title: "भुगतान करें", text: "Razorpay या UPI/manual payment से सुरक्षित checkout करें।" },
    { icon: Library, title: "लाइब्रेरी में पढ़ें", text: "Payment verify होने के बाद PDF आपकी library में उपलब्ध होगी।" }
  ];

  return (
    <main>
      <section className="px-4 py-5 sm:py-9">
        <div className="mx-auto max-w-4xl">
          <article className="panel relative overflow-hidden p-4 sm:p-6 md:p-7">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,247,237,.98),rgba(255,255,255,.92))]" />
            <div className="relative grid items-center gap-3 sm:gap-6 md:grid-cols-[120px_1fr]">
              <div className="flex justify-center">
                {activeQuote.authorImage ? (
                  <img className="h-24 w-24 shrink-0 rounded-full object-cover shadow-soft ring-4 ring-orange-100" src={activeQuote.authorImage} onError={(event) => useFallbackImage(event, fallbackAuthorImage)} alt={activeQuote.authorName} decoding="async" fetchPriority="high" loading="eager" />
                ) : (
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-orange-500 text-3xl font-black text-white shadow-soft ring-4 ring-orange-100">
                    {activeQuote.authorName?.[0] || "म"}
                  </div>
                )}
              </div>
              <div className="min-w-0 text-center md:text-left">
                <p className="text-[15px] font-bold leading-7 text-ink sm:text-lg sm:leading-8 md:text-xl md:leading-9">
                  <span aria-hidden="true">&ldquo;</span>
                  <FallingLetters key={`quote-${quoteSlot}-${activeQuote.quote}`} text={activeQuote.quote || defaultQuote.quote} className="quote-fall-word" startDelay={0.2} wrap />
                  <span aria-hidden="true">&rdquo;</span>
                </p>
                <p className="mt-3 text-sm font-semibold text-gray-600">
                  ~ {activeQuote.authorName || defaultQuote.authorName}
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="border-y border-orange-100/70 bg-[linear-gradient(110deg,#fff7ed_0%,#fffdf9_48%,#fff4e6_100%)]">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-8 sm:py-12 md:grid-cols-[1.05fr_.95fr] md:py-16">
          <div className="space-y-4 text-center md:text-left">
            <span className="badge mx-auto items-center gap-1.5 md:mx-0"><ShieldCheck size={14} /> Secure PDF downloads</span>
            <h1 className="mx-auto max-w-2xl text-[26px] font-black leading-tight sm:text-3xl md:mx-0 md:text-4xl lg:text-5xl">
              महेश भारती ई-बुक स्टोर
            </h1>
            <p className="mx-auto max-w-xl text-[15px] leading-7 text-gray-700 sm:text-lg md:mx-0">
              महेश भारती जी की किताबें सीधे PDF और ई-बुक के रूप में खरीदें, डाउनलोड करें और मोबाइल पर आराम से पढ़ें।
            </p>
            <div className="grid gap-3 sm:flex sm:justify-center md:justify-start">
              <Link to="/books" className="btn-primary w-full sm:w-auto"><Search size={18} /> Browse books</Link>
              <Link to="/order-book" className="btn-secondary w-full sm:w-auto"><ShoppingBag size={18} /> Order Book</Link>
              <Link to="/signup" className="btn-secondary w-full sm:w-auto"><Sparkles size={18} /> Create account</Link>
            </div>
          </div>

          <div className={`grid grid-cols-2 gap-2 transition-all duration-500 ease-out sm:gap-3 ${
            isBookTransitioning ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"
          }`}>
            {heroBooks.map((book) => (
              <Link key={book._id} to={`/books/${book._id}`} className="group relative overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(124,45,18,.14)]">
                <img src={book.coverImage} onError={(event) => useFallbackImage(event, BOOK_COVER_FALLBACK)} className="h-44 w-full bg-orange-50/70 object-contain p-3 transition duration-300 group-hover:scale-105 sm:h-52" alt={book.title} decoding="async" fetchPriority="high" loading="eager" sizes="(min-width: 768px) 25vw, 50vw" />
                <span className="absolute bottom-2 left-2 right-2 line-clamp-2 rounded-xl bg-white/95 px-2.5 py-1.5 text-[11px] font-bold leading-4 text-ink shadow-sm sm:text-xs">
                  {book.title}
                </span>
              </Link>
            ))}
            {loading && !heroBooks.length && <div className="col-span-2"><BookGridSkeleton compact /></div>}
            {!loading && loadError && !heroBooks.length && (
              <div className="col-span-2 panel flex min-h-60 flex-col items-center justify-center gap-3 p-6 text-center">
                <RefreshCw className="text-orange-500" size={42} />
                <h2 className="text-xl font-black">Books load ho rahi hain</h2>
                <p className="max-w-sm text-sm text-gray-600">Server wake up ho raha hai. Thodi der mein refresh karte hi books aur images aa jayengi.</p>
                <button className="btn-primary" onClick={() => window.location.reload()}>Refresh</button>
              </div>
            )}
            {!loading && !loadError && !heroBooks.length && (
              <div className="col-span-2 panel flex min-h-60 flex-col items-center justify-center gap-3 p-6 text-center">
                <BookPlus className="text-orange-500" size={42} />
                <h2 className="text-xl font-black">Books coming soon</h2>
                <p className="max-w-sm text-sm text-gray-600">Books will appear here with cover, description, price, and Buy PDF button.</p>
                <Link className="btn-primary" to="/books">Browse Books</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="px-4 py-9 sm:py-12">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-[.9fr_1.1fr] md:items-center">
          <div className="panel space-y-3 p-5 text-center md:p-7 md:text-left">
            <span className="badge mx-auto md:mx-0">लेखक परिचय</span>
            <h2 className="text-2xl font-black text-ink sm:text-3xl">महेश भारती जी का संदेश</h2>
            <p className="mx-auto max-w-xl text-sm leading-7 text-gray-600 md:mx-0">
              लेखक की वाणी में इस ई-बुक स्टोर का उद्देश्य जानिए और उनकी पुस्तकों से जुड़ने का सरल डिजिटल अनुभव देखिए।
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-orange-100 bg-black shadow-[0_18px_42px_rgba(36,25,21,.14)]">
            <video
              className="aspect-video w-full bg-black object-cover"
              controls
              playsInline
              preload="metadata"
              src="/videos/author-intro.mp4"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </section>

      <section className="px-4 py-9 sm:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="panel p-5 sm:p-7">
          <div className="mb-6 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <span className="badge mb-3">खरीदने की प्रक्रिया</span>
              <h2 className="text-2xl font-black leading-tight text-ink sm:text-3xl">पुस्तक खरीदना आसान और स्पष्ट</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-600">हर step साफ रखा गया है ताकि पाठक बिना भ्रम के सही पुस्तक चुनकर उसे सुरक्षित रूप से पढ़ सकें।</p>
            </div>
            <div className="grid gap-2 sm:flex">
              <Link className="btn-secondary w-full md:w-auto" to="/order-book"><ShoppingBag size={16} /> Order Book</Link>
              <Link className="btn-secondary w-full md:w-auto" to="/books">Catalog खोलें</Link>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {processSteps.map(({ icon: Icon, title, text }, index) => (
              <div className="relative rounded-2xl border border-orange-100/80 bg-[#fffaf5] p-4 transition hover:border-orange-200 hover:bg-white" key={title}>
                <div className="mb-4 flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-orange-700 shadow-sm ring-1 ring-orange-100">
                    <Icon size={20} />
                  </span>
                  <span className="text-xs font-black text-orange-300">0{index + 1}</span>
                </div>
                <h3 className="font-black text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">{text}</p>
              </div>
            ))}
          </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-9 sm:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <span className="badge mb-3">आज की प्रमुख पुस्तक</span>
              <h2 className="text-2xl font-black sm:text-3xl">पढ़ने के लिए खास चयन</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">यहां एक प्रमुख पुस्तक को highlight किया गया है। बाकी सभी पुस्तकों के लिए पूरा catalog देखें।</p>
            </div>
            <Link className="btn-secondary w-full md:w-auto" to="/books">सभी पुस्तकें देखें</Link>
          </div>
          {loading && !bestBook ? (
            <BookGridSkeleton />
          ) : bestBook ? (
            <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[260px_1fr] lg:items-stretch">
              <div className="mx-auto w-full max-w-[260px] lg:mx-0">
                <BookCard book={bestBook} />
              </div>
              <div className="panel flex flex-col justify-center p-5 sm:p-7">
                <span className="badge mb-3 w-fit">Featured read</span>
                <h3 className="text-xl font-black leading-snug text-ink sm:text-2xl">{bestBook.title}</h3>
                <p className="mt-3 line-clamp-3 text-sm leading-7 text-gray-600">{bestBook.description}</p>
                <div className="mt-5 grid gap-3 sm:flex">
                  <Link className="btn-primary w-full sm:w-auto" to={`/books/${bestBook._id}`}>विवरण देखें</Link>
                  <Link className="btn-secondary w-full sm:w-auto" to="/books">और पुस्तकें देखें</Link>
                </div>
              </div>
            </div>
          ) : loadError ? (
            <div className="panel p-8 text-center text-gray-600">Books load ho rahi hain. Server wake up ke baad page refresh karein.</div>
          ) : (
            <div className="panel p-8 text-center">
              <BookPlus className="mx-auto mb-3 text-orange-500" size={42} />
              <h3 className="text-xl font-black">No books in the store yet</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm text-gray-600">New PDF books will appear here soon.</p>
              <Link className="btn-primary mt-4" to="/books">Browse Books</Link>
            </div>
          )}
        </div>
      </section>

      <section className="px-4 py-9 sm:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="panel overflow-hidden">
            <div className="grid gap-0 lg:grid-cols-[.9fr_1.1fr]">
              <div className="border-b border-slate-200 p-5 text-center sm:p-7 lg:border-b-0 lg:border-r lg:text-left">
              <span className="badge mb-3">विश्वास और सुविधा</span>
              <h2 className="text-2xl font-black leading-tight text-ink sm:text-3xl">पुस्तकों तक पहुंचने का भरोसेमंद डिजिटल तरीका</h2>
              <p className="mt-3 text-sm leading-7 text-gray-600">यह मंच पाठकों को महेश भारती जी की पुस्तकों से सीधे जोड़ता है। उद्देश्य साफ है: पुस्तक खोजें, सुरक्षित रूप से खरीदें और अपनी लाइब्रेरी में पढ़ें।</p>
              <Link className="btn-primary mt-5 w-full sm:w-auto" to="/books">पुस्तकें देखें</Link>
            </div>
              <div className="divide-y divide-slate-200">
                {trustItems.map(({ icon: Icon, title, text }) => (
                  <div className="grid gap-3 p-4 sm:grid-cols-[44px_1fr] sm:p-5" key={title}>
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-50 text-orange-700 ring-1 ring-orange-100">
                      <Icon size={21} />
                    </span>
                    <div>
                      <h3 className="font-black text-ink">{title}</h3>
                      <p className="mt-1 text-sm leading-6 text-gray-600">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
