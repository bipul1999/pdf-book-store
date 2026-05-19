import { BookPlus, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import api from "../api/client.js";
import BookCard from "../components/BookCard.jsx";
import { FallingLetters } from "../components/Layout.jsx";

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

const defaultQuote = {
  quote: "किताबें केवल शब्द नहीं होतीं, वे जीवन को समझने की एक शांत रोशनी होती हैं।",
  authorName: "महेश भारती",
  authorImage: ""
};

const rotatingQuotes = [
  defaultQuote,
  {
    quote: "Books open quiet doors inside the mind.",
    authorName: "Mahesh Bharti",
    authorImage: ""
  },
  {
    quote: "A good page stays with you long after the screen turns off.",
    authorName: "Mahesh Bharti",
    authorImage: ""
  },
  {
    quote: "Reading is a simple habit that slowly makes life wider.",
    authorName: "Mahesh Bharti",
    authorImage: ""
  },
  {
    quote: "Every thoughtful book gives courage to one more thought.",
    authorName: "Mahesh Bharti",
    authorImage: ""
  }
];

export default function Home() {
  const [books, setBooks] = useState([]);
  const [heroBookPool, setHeroBookPool] = useState([]);
  const [quote, setQuote] = useState(defaultQuote);
  const [loading, setLoading] = useState(true);
  const [bookOffset, setBookOffset] = useState(0);
  const [isBookTransitioning, setIsBookTransitioning] = useState(false);
  const [quoteSlot, setQuoteSlot] = useState(() => Math.floor(Date.now() / FOUR_HOURS_MS));

  useEffect(() => {
    async function loadHome() {
      try {
        const [featuredRes, allBooksRes] = await Promise.all([
          api.get("/books?featured=true"),
          api.get("/books")
        ]);
        const allBooks = allBooksRes.data.books || [];
        setHeroBookPool(allBooks);
        setBooks(featuredRes.data.books?.length ? featuredRes.data.books : allBooks);
      } finally {
        setLoading(false);
      }
    }

    loadHome();
    api.get("/site/quote").then(({ data }) => setQuote(data.quote)).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteSlot(Math.floor(Date.now() / FOUR_HOURS_MS));
    }, 60 * 1000);
    return () => clearInterval(timer);
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
  const activeQuote = quoteOptions[quoteSlot % quoteOptions.length] || defaultQuote;

  return (
    <main>
      <section className="bg-white px-3 py-4 sm:px-4 sm:py-8">
        <div className="mx-auto max-w-4xl">
          <article className="panel relative overflow-hidden p-4 sm:p-6 md:p-7">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,247,237,.97),rgba(255,255,255,.92))]" />
            <div className="relative grid items-center gap-3 sm:gap-6 md:grid-cols-[120px_1fr]">
              <div className="flex justify-center">
                {activeQuote.authorImage ? (
                  <img className="h-24 w-24 shrink-0 rounded-full object-cover shadow-soft ring-4 ring-orange-100" src={activeQuote.authorImage} alt={activeQuote.authorName} decoding="async" loading="lazy" />
                ) : (
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-orange-500 text-3xl font-black text-white shadow-soft ring-4 ring-orange-100">
                    {activeQuote.authorName?.[0] || "म"}
                  </div>
                )}
              </div>
              <div className="min-w-0 text-center md:text-left">
                <p className="text-[15px] font-bold leading-7 text-ink sm:text-lg sm:leading-8 md:text-xl md:leading-9">
                  <span aria-hidden="true">&ldquo;</span>
                  <FallingLetters key={`quote-${quoteSlot}`} text={activeQuote.quote || defaultQuote.quote} className="quote-fall-word" startDelay={0.65} wrap />
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

      <section className="bg-paper">
        <div className="mx-auto grid max-w-7xl items-center gap-6 px-3 py-6 sm:px-4 sm:py-12 md:grid-cols-[1.05fr_.95fr] md:py-14">
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
              <Link to="/signup" className="btn-secondary w-full sm:w-auto"><Sparkles size={18} /> Create account</Link>
            </div>
          </div>

          <div className={`grid grid-cols-2 gap-2 transition-all duration-500 ease-out sm:gap-3 ${
            isBookTransitioning ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"
          }`}>
            {heroBooks.map((book) => (
              <Link key={book._id} to={`/books/${book._id}`} className="group relative overflow-hidden rounded-lg shadow-soft transition duration-300 hover:-translate-y-1">
                <img src={book.coverImage} className="h-44 w-full bg-orange-50 object-contain p-2 transition duration-300 group-hover:scale-105 sm:h-52" alt={book.title} decoding="async" loading="lazy" sizes="(min-width: 768px) 25vw, 50vw" />
                <span className="absolute bottom-2 left-2 right-2 line-clamp-2 rounded-md bg-white/95 px-2 py-1 text-[11px] font-bold leading-4 text-ink sm:text-xs">
                  {book.title}
                </span>
              </Link>
            ))}
            {!loading && !heroBooks.length && (
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

      <section className="mx-auto max-w-7xl px-3 py-7 sm:px-4 sm:py-10">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xl font-black sm:text-2xl">Featured books</h2>
          <Link className="shrink-0 text-sm font-bold text-orange-600" to="/books">View all</Link>
        </div>
        <p className="mb-4 text-sm leading-6 text-gray-600">Cover par tap karke details, price aur payment option dekhein.</p>
        {loading ? (
          <div className="panel p-8 text-center text-gray-600">Loading books...</div>
        ) : books.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{books.map((book) => <BookCard book={book} key={book._id} />)}</div>
        ) : (
          <div className="panel p-8 text-center">
            <BookPlus className="mx-auto mb-3 text-orange-500" size={42} />
            <h3 className="text-xl font-black">No books in the store yet</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm text-gray-600">New PDF books will appear here soon.</p>
            <Link className="btn-primary mt-4" to="/books">Browse Books</Link>
          </div>
        )}
      </section>
    </main>
  );
}
