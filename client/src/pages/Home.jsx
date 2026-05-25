import { BookOpen, BookPlus, CheckCircle2, CreditCard, Download, Library, Search, ShieldCheck, ShoppingBag, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const authorVideoSectionRef = useRef(null);
  const authorVideoRef = useRef(null);
  const promoSectionRef = useRef(null);
  const promoVideoRef = useRef(null);

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

  useEffect(() => {
    const elements = document.querySelectorAll("[data-home-reveal]");
    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const section = authorVideoSectionRef.current;
    const video = authorVideoRef.current;
    if (!section || !video) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.muted = false;
          video.play().catch(() => {
            video.muted = true;
            video.play().catch(() => {});
          });
        } else {
          video.pause();
        }
      },
      { threshold: 0.42 }
    );
    observer.observe(section);
    return () => {
      observer.disconnect();
      video.pause();
    };
  }, []);

  useEffect(() => {
    const section = promoSectionRef.current;
    const video = promoVideoRef.current;
    if (!section || !video) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.muted = false;
          video.volume = 1;
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.42 }
    );
    observer.observe(section);
    return () => {
      observer.disconnect();
      video.pause();
    };
  }, []);

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
  const featuredBooks = books.slice(0, 4);
  const trustItems = [
    { icon: CheckCircle2, title: "हिंदी सामाजिक चेतना", text: "समाज, इतिहास और पर्यावरण से जुड़े विषय संवेदनशील हिंदी लेखन में प्रस्तुत हैं।" },
    { icon: ShieldCheck, title: "सुरक्षित भुगतान", text: "खरीदारी के बाद PDF access आपके account से जुड़ जाता है।" },
    { icon: Download, title: "Instant PDF Access", text: "Verification के बाद purchased PDF आपकी digital library में पढ़ने के लिए उपलब्ध होती है।" },
    { icon: Library, title: "मोबाइल डिजिटल लाइब्रेरी", text: "फोन, टैबलेट या लैपटॉप पर अपनी खरीदी हुई पुस्तकें आराम से पढ़ें।" }
  ];
  const processSteps = [
    { icon: Search, title: "पुस्तक खोजें", text: "Catalog में विषय, नाम या लेखक के अनुसार सही पुस्तक चुनें।" },
    { icon: CheckCircle2, title: "विवरण समझें", text: "Cover, description और price देखकर निर्णय लें।" },
    { icon: CreditCard, title: "भुगतान करें", text: "Razorpay या UPI/manual payment से सुरक्षित checkout करें।" },
    { icon: Library, title: "लाइब्रेरी में पढ़ें", text: "Payment verify होने के बाद PDF आपकी library में उपलब्ध होगी।" }
  ];

  return (
    <main className="home-page">
      <section className="home-section px-4 py-5 sm:py-9">
        <div className="mx-auto max-w-4xl">
          <article data-home-reveal className="home-reveal home-quote-card panel relative overflow-hidden p-4 sm:p-6 md:p-7">
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
                  <FallingLetters key={`header-quote-${quoteSlot}-${activeQuote.quote}`} text={activeQuote.quote || defaultQuote.quote} className="quote-fall-word" startDelay={0.2} wrap />
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

      <section className="home-hero library-hero relative isolate overflow-hidden">
        <div aria-hidden="true" className="home-hero-atmosphere">
          <span className="home-hero-pattern" />
          <span className="home-glow home-glow-one" />
          <span className="home-glow home-glow-two" />
          <span className="home-particle home-particle-one" />
          <span className="home-particle home-particle-two" />
          <span className="home-particle home-particle-three" />
        </div>
        <div data-home-reveal className="home-reveal hero-layout relative mx-auto grid max-w-7xl items-center gap-7 px-4 py-8 sm:py-10 lg:grid-cols-[1fr_.88fr] lg:gap-8 lg:py-12">
          <div className="hero-copy space-y-4 text-center lg:text-left">
            <span className="hero-kicker mx-auto lg:mx-0"><Sparkles size={14} /> महेश भारती डिजिटल पुस्तकालय</span>
            <h1 className="hero-title mx-auto max-w-3xl text-[32px] font-black leading-[1.17] sm:text-[44px] lg:mx-0 lg:text-[52px]">
              हिंदी विचारों की रोशनी,
              <span className="block text-amber-300">अब आपके डिजिटल पुस्तकालय में</span>
            </h1>
            <p className="hero-description mx-auto max-w-2xl text-[15px] leading-7 text-amber-50/85 sm:text-base lg:mx-0">
              सामाजिक चेतना, इतिहास, पर्यावरण और जनजीवन पर केंद्रित महेश भारती जी की हिंदी पुस्तकें पढ़ें। सुरक्षित भुगतान के साथ PDF प्राप्त करें और कहीं भी डिजिटल रूप में पढ़ें।
            </p>
            <div className="hero-actions grid gap-3 sm:flex sm:justify-center lg:justify-start">
              <Link to="/books" className="hero-primary-cta btn w-full sm:w-auto"><Search size={18} /> पुस्तकें देखें</Link>
              <Link to="/order-book" className="hero-secondary-cta btn w-full sm:w-auto"><ShoppingBag size={18} /> अभी ऑर्डर करें</Link>
            </div>
            <div className="hero-benefits grid gap-3 pt-1 sm:grid-cols-3">
              <div><BookOpen size={18} /><strong>PDF Access</strong><span>तुरंत पढ़ना शुरू करें</span></div>
              <div><ShieldCheck size={18} /><strong>Secure Pay</strong><span>विश्वसनीय भुगतान</span></div>
              <div><Sparkles size={18} /><strong>Hindi Works</strong><span>चेतना और साहित्य</span></div>
            </div>
          </div>

          <div className="hero-library-visual">
            <div className="hero-phone-card">
              <span className="hero-phone-head"><BookOpen size={14} /> Digital Preview</span>
              {heroBooks[0] && (
                <Link to={`/books/${heroBooks[0]._id}`} className="group block">
                  <img src={heroBooks[0].coverImage} onError={(event) => useFallbackImage(event, BOOK_COVER_FALLBACK)} className="hero-phone-cover transition duration-300 group-hover:scale-[1.03]" alt={heroBooks[0].title} decoding="async" loading="eager" />
                  <strong className="mt-3 block line-clamp-2 text-sm leading-6 text-[#1f2937]">{heroBooks[0].title}</strong>
                  <span className="mt-1 block text-sm font-black text-amber-700">Rs. {heroBooks[0].price}</span>
                </Link>
              )}
            </div>
            <div className={`hero-collage transition-all duration-500 ease-out ${
            isBookTransitioning ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"
          }`}>
              {heroBooks.slice(1, 4).map((book) => (
                <Link key={book._id} to={`/books/${book._id}`} className="home-hero-book group">
                  <img src={book.coverImage} onError={(event) => useFallbackImage(event, BOOK_COVER_FALLBACK)} className="h-full w-full object-contain p-2 transition duration-300 group-hover:scale-105" alt={book.title} decoding="async" fetchPriority="high" loading="eager" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section ref={authorVideoSectionRef} className="home-section author-spotlight px-4 py-12 sm:py-20">
        <div data-home-reveal className="home-reveal mx-auto grid max-w-7xl gap-6 lg:grid-cols-[.94fr_1.06fr] lg:items-center">
          <div className="author-profile-card panel p-5 sm:p-7">
            <span className="badge mb-5">लेखक परिचय</span>
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <img className="h-24 w-24 shrink-0 rounded-2xl object-cover shadow-soft ring-4 ring-amber-100" src={activeQuote.authorImage || fallbackAuthorImage} onError={(event) => useFallbackImage(event, fallbackAuthorImage)} alt={activeQuote.authorName || defaultQuote.authorName} loading="lazy" />
              <div>
                <h2 className="text-2xl font-black text-ink sm:text-3xl">महेश भारती</h2>
                <p className="mt-1 text-sm font-bold text-amber-700">हिंदी लेखक और सामाजिक विषयों के दस्तावेजकार</p>
                <p className="mt-2 text-sm leading-7 text-gray-600">इतिहास, पर्यावरण और जनजीवन से जुड़ी रचनाओं को पाठकों तक डिजिटल रूप में पहुँचाने का मंच।</p>
              </div>
            </div>
            <div className="author-themes mt-5 grid grid-cols-3 gap-2 text-center">
              <span>सामाजिक चेतना</span>
              <span>इतिहास</span>
              <span>पर्यावरण</span>
            </div>
            <Link className="btn-secondary mt-5 w-full sm:w-auto" to="/books"><BookOpen size={17} /> रचनाएं देखें</Link>
          </div>
          <div className="home-video-card overflow-hidden rounded-3xl border border-amber-200/70 bg-black shadow-[0_28px_68px_rgba(69,26,3,.2)]">
            <video
              ref={authorVideoRef}
              className="aspect-video w-full bg-black object-cover"
              controls
              playsInline
              preload="none"
              src="/videos/about-author.mp4"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </section>

      <section className="home-section px-4 py-9 sm:py-14">
        <div data-home-reveal className="home-reveal home-order-banner mx-auto grid max-w-7xl items-center gap-5 overflow-hidden rounded-3xl border border-amber-100 px-5 py-7 sm:px-8 md:grid-cols-[1fr_auto]">
          <div>
            <span className="badge mb-3"><ShoppingBag size={14} /> सरल और सुरक्षित ऑर्डर</span>
            <h2 className="text-2xl font-black sm:text-3xl">अपनी पसंद की पुस्तक सीधे ऑर्डर करें</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-600">पुस्तक चुनें, मात्रा तय करें और सुरक्षित Razorpay या Manual UPI भुगतान के साथ अपना ऑर्डर जमा करें।</p>
          </div>
          <Link className="btn-order-book w-full md:w-auto" to="/order-book"><ShoppingBag size={18} /> अभी ऑर्डर करें</Link>
        </div>
      </section>

      <section className="home-section reading-process px-4 py-12 sm:py-20">
        <div data-home-reveal className="home-reveal mx-auto max-w-7xl">
          <div className="journey-panel panel p-5 sm:p-8">
          <div className="mb-6 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <span className="badge mb-3">खरीदने की प्रक्रिया</span>
              <h2 className="text-2xl font-black leading-tight text-ink sm:text-3xl">पुस्तक खरीदना आसान और स्पष्ट</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-600">हर step साफ रखा गया है ताकि पाठक बिना भ्रम के सही पुस्तक चुनकर उसे सुरक्षित रूप से पढ़ सकें।</p>
            </div>
            <div className="grid gap-2 sm:flex">
              <Link className="btn-order-book w-full md:w-auto" to="/order-book"><ShoppingBag size={16} /> Order Book</Link>
              <Link className="btn-secondary w-full md:w-auto" to="/books">Catalog खोलें</Link>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {processSteps.map(({ icon: Icon, title, text }, index) => (
              <div className="home-step-card journey-step relative p-4" key={title}>
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

      <section ref={promoSectionRef} className="home-section home-promo-section promotion-stage px-4 py-12 sm:py-20">
        <div data-home-reveal className="home-reveal promo-grid mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div className="home-video-card promo-video-panel relative overflow-hidden rounded-2xl border border-orange-100 bg-black shadow-[0_18px_42px_rgba(36,25,21,.14)]">
            <video
              ref={promoVideoRef}
              className="promo-video aspect-video w-full bg-black object-cover"
              controls
              loop
              playsInline
              preload="none"
              src="/videos/author-intro.mp4"
            >
              Your browser does not support the video tag.
            </video>
          </div>
          <div className="home-glass promo-copy-panel panel space-y-3 p-5 text-center sm:p-7 lg:text-left">
            <span className="badge mx-auto lg:mx-0">लेखक का आमंत्रण</span>
            <h2 className="text-2xl font-black text-ink sm:text-3xl">इस डिजिटल पुस्तक मंच से जुड़िए</h2>
            <p className="mx-auto max-w-xl text-sm leading-7 text-gray-600 lg:mx-0">
              महेश भारती जी से जानिए कि यह ई-बुक स्टोर पाठकों को उनकी पुस्तकों से सरल और सुरक्षित रूप में कैसे जोड़ता है।
            </p>
            <div className="grid gap-3 pt-2 sm:flex sm:justify-center lg:justify-start">
              <Link className="btn-primary w-full sm:w-auto" to="/books"><Search size={17} /> पुस्तकें देखें</Link>
              <Link className="btn-order-book w-full sm:w-auto" to="/order-book"><ShoppingBag size={17} /> Order Book</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section featured-library px-4 py-9 sm:py-14">
        <div data-home-reveal className="home-reveal mx-auto max-w-7xl">
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <span className="badge mb-3">Featured Books</span>
              <h2 className="text-2xl font-black sm:text-3xl">लोकप्रिय हिंदी पुस्तकें</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-600">सामाजिक सरोकार, स्थानीय इतिहास और जनजीवन से जुड़ी चुनिंदा डिजिटल पुस्तकें।</p>
            </div>
            <Link className="btn-secondary w-full md:w-auto" to="/books">पूरा संग्रह देखें</Link>
          </div>
          {loading && !featuredBooks.length ? (
            <BookGridSkeleton />
          ) : featuredBooks.length ? (
            <div className="featured-books-rail grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featuredBooks.map((book) => <BookCard key={book._id} book={book} compact />)}
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

      <section className="home-section why-library px-4 py-12 sm:py-20">
        <div data-home-reveal className="home-reveal mx-auto max-w-7xl">
          <div className="mb-8 text-center">
            <span className="badge mb-3">Why Choose Us</span>
            <h2 className="text-3xl font-black leading-tight text-ink sm:text-4xl">क्यों चुनें यह हिंदी डिजिटल पुस्तकालय?</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-gray-600">लेखक की प्रामाणिक रचनाएं, सुरक्षित खरीद और सुविधाजनक डिजिटल अध्ययन एक ही स्थान पर।</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {trustItems.map(({ icon: Icon, title, text }) => (
              <div className="home-trust-item benefit-card" key={title}>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-700">
                  <Icon size={23} />
                </span>
                <h3 className="mt-5 text-lg font-black text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-gray-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
