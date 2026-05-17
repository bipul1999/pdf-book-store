import { BookPlus, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api/client.js";
import BookCard from "../components/BookCard.jsx";

export default function Home() {
  const [books, setBooks] = useState([]);
  const [heroBookPool, setHeroBookPool] = useState([]);
  const [quote, setQuote] = useState({
    quote: "किताबें केवल शब्द नहीं होतीं, वे जीवन को समझने की एक शांत रोशनी होती हैं।",
    authorName: "महेश भारती",
    authorImage: ""
  });
  const [loading, setLoading] = useState(true);
  const [bookOffset, setBookOffset] = useState(0);
  const [isBookTransitioning, setIsBookTransitioning] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isQuoteMoving, setIsQuoteMoving] = useState(false);

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
    if (heroBookPool.length <= 4) return undefined;
    let transitionTimer;
    const timer = setInterval(() => {
      setIsBookTransitioning(true);
      transitionTimer = setTimeout(() => {
        setBookOffset((current) => (current + 1) % heroBookPool.length);
        setIsBookTransitioning(false);
      }, 650);
    }, 5000);
    return () => {
      clearInterval(timer);
      clearTimeout(transitionTimer);
    };
  }, [heroBookPool.length]);

  useEffect(() => {
    let moveTimer;
    const timer = setInterval(() => {
      setIsQuoteMoving(true);
      moveTimer = setTimeout(() => {
        setQuoteIndex((current) => (current + 1) % 4);
        setIsQuoteMoving(false);
      }, 1200);
    }, 9000);
    return () => {
      clearInterval(timer);
      clearTimeout(moveTimer);
    };
  }, []);

  const heroBooks = heroBookPool.length <= 4
    ? heroBookPool
    : Array.from({ length: Math.min(4, heroBookPool.length) }, (_, index) => heroBookPool[(bookOffset + index) % heroBookPool.length]);
  const quoteSlides = [
    quote.quote,
    "किताबें मन को दिशा देती हैं और जीवन को नई समझ देती हैं।",
    "अच्छे विचार धीरे-धीरे पढ़े जाते हैं, लेकिन असर गहरा छोड़ते हैं।",
    "हर पन्ना एक नई शुरुआत है, बस उसे धैर्य से पढ़ना होता है।"
  ];
  const currentQuote = quoteSlides[quoteIndex] || quote.quote;

  return (
    <main>
      <section className="bg-white px-4 py-5 sm:py-8">
        <div className="mx-auto max-w-4xl">
          <article className="panel relative overflow-hidden p-4 sm:p-6 md:p-7">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(249,115,22,.18),transparent_30%),linear-gradient(135deg,rgba(255,247,237,.95),rgba(255,255,255,.9))]" />
            <div className="absolute -right-5 -top-8 text-7xl font-black text-orange-100 sm:text-8xl">”</div>
            <div className="absolute bottom-4 right-6 h-20 w-20 rounded-full border border-orange-100 opacity-70 sm:h-24 sm:w-24" />
            <div className="relative grid items-center gap-4 sm:gap-6 md:grid-cols-[120px_1fr]">
            <div className={`relative flex justify-center transition-all duration-1000 ease-in-out ${
              isQuoteMoving ? "opacity-40" : "opacity-100"
            }`}>
              {quote.authorImage ? (
                <img className="h-20 w-20 shrink-0 rounded-full object-cover shadow-soft ring-4 ring-orange-100 sm:h-24 sm:w-24" src={quote.authorImage} alt={quote.authorName} />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-orange-500 text-2xl font-black text-white shadow-soft ring-4 ring-orange-100 sm:h-24 sm:w-24 sm:text-3xl">
                  {quote.authorName?.[0] || "म"}
                </div>
              )}
            </div>
            <div className={`relative min-w-0 text-center transition-all duration-1000 ease-in-out md:text-left ${
              isQuoteMoving ? "opacity-0" : "opacity-100"
            }`}>
              <p className="text-base font-bold leading-7 text-ink sm:text-lg sm:leading-8 md:text-xl md:leading-9">
                &ldquo;{currentQuote}&rdquo;
              </p>
              <blockquote className="sr-only">
                “{quote.quote}”
              </blockquote>
              <p className="mt-3 text-sm font-semibold text-gray-600 sm:mt-5">~ {quote.authorName}</p>
            </div>
            </div>
          </article>
        </div>
      </section>

      <section className="bg-paper">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-8 sm:py-12 md:grid-cols-[1.05fr_.95fr] md:py-14">
          <div className="space-y-5 text-center md:text-left">
            <span className="badge mx-auto md:mx-0"><ShieldCheck size={14} /> Secure PDF downloads</span>
            <h1 className="mx-auto max-w-2xl text-2xl font-black leading-snug sm:text-3xl md:mx-0 md:text-4xl lg:text-5xl">महेश भारती ई-बुक स्टोर</h1>
            <p className="mx-auto max-w-xl text-base leading-7 text-gray-700 sm:text-lg md:mx-0">प्रसिद्ध लेखक महेश भारती जी की लिखी सभी किताबों का एकमात्र डिजिटल स्टोर। यहाँ आपको इतिहास, पर्यावरण और साहित्य से जुड़ी उनकी सभी पुस्तकें सीधे PDF और ई-बुक के रूप में मिलेंगी, जिन्हें आप आसानी से डाउनलोड करके कहीं भी पढ़ सकते हैं।</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
              <Link to="/books" className="btn-primary w-full sm:w-auto"><Search size={18} /> Browse books</Link>
              <Link to="/signup" className="btn-secondary w-full sm:w-auto"><Sparkles size={18} /> Create account</Link>
            </div>
          </div>
          <div className={`grid grid-cols-2 gap-3 transition-all duration-700 ease-out ${
            isBookTransitioning ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"
          }`}>
            {heroBooks.map((book) => (
              <Link key={book._id} to={`/books/${book._id}`} className="group relative overflow-hidden rounded-lg shadow-soft transition duration-500 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(124,45,18,.18)]">
                <img src={book.coverImage} className="h-40 w-full bg-orange-50 object-contain p-2 transition duration-500 group-hover:scale-105 sm:h-52" alt={book.title} />
                <span className="absolute bottom-2 left-2 right-2 rounded-md bg-white/95 px-2 py-1 text-xs font-bold text-ink">
                  {book.title}
                </span>
              </Link>
            ))}
            {!loading && !heroBooks.length && (
              <div className="col-span-2 panel flex min-h-60 flex-col items-center justify-center gap-3 p-6 text-center sm:min-h-72">
                <BookPlus className="text-orange-500" size={42} />
                <h2 className="text-xl font-black">Add your first PDF book</h2>
                <p className="max-w-sm text-sm text-gray-600">Books will appear here with cover image, description, price, and a Buy PDF button.</p>
                <Link className="btn-primary" to="/books">Browse Books</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-black sm:text-2xl">Featured books</h2>
          <Link className="shrink-0 text-sm font-bold text-orange-600" to="/books">View all</Link>
        </div>
        <p className="mb-4 text-sm text-gray-600">Click any cover to view description, price, payment option, and secure download path.</p>
        {loading ? (
          <div className="panel p-8 text-center text-gray-600">Loading books...</div>
        ) : books.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{books.map((book) => <BookCard book={book} key={book._id} />)}</div>
        ) : (
          <div className="panel p-8 text-center">
            <BookPlus className="mx-auto mb-3 text-orange-500" size={42} />
            <h3 className="text-xl font-black">No books in the store yet</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm text-gray-600">New PDF books will appear here with cover image, description, price, and a direct Buy PDF button.</p>
            <Link className="btn-primary mt-4" to="/books">Browse Books</Link>
          </div>
        )}
      </section>
    </main>
  );
}
