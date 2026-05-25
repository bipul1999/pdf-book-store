import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/client.js";
import BookCard from "../components/BookCard.jsx";
import { fallbackBooks } from "../data/fallbackCatalog.js";

const BOOK_RETRY_DELAYS_MS = [1500, 3500, 7000];

function BookListSkeleton() {
  return (
    <div className="catalog-books-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="panel h-80 animate-pulse bg-orange-50/70" />
      ))}
    </div>
  );
}

export default function Books() {
  const [params, setParams] = useSearchParams();
  const [books, setBooks] = useState(fallbackBooks);
  const [q, setQ] = useState(params.get("q") || "");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let retryTimer;

    async function loadBooks(attempt = 0) {
      try {
        setLoading(true);
        setLoadError(false);
        const { data } = await api.get(`/books?${params.toString()}`);
        if (cancelled) return;
        setBooks(data.books || []);
        setLoading(false);
      } catch {
        if (cancelled) return;
        const query = params.get("q")?.trim().toLowerCase();
        const visibleFallbackBooks = query
          ? fallbackBooks.filter((book) => `${book.title} ${book.author} ${book.description}`.toLowerCase().includes(query))
          : fallbackBooks;
        setBooks(visibleFallbackBooks);
        setLoading(false);
        const nextDelay = BOOK_RETRY_DELAYS_MS[attempt];
        if (nextDelay) {
          retryTimer = setTimeout(() => loadBooks(attempt + 1), nextDelay);
          return;
        }
        setLoadError(true);
        setLoading(false);
      }
    }

    loadBooks();

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
    };
  }, [params]);

  function search(e) {
    e.preventDefault();
    setParams({ ...(q ? { q } : {}) });
  }

  return (
    <main className="mobile-page store-page">
      <div className="catalog-intro mb-7 grid gap-4 rounded-3xl border border-amber-100/80 p-5 sm:p-7 lg:grid-cols-[1fr_minmax(360px,480px)] lg:items-end">
        <div>
          <span className="badge mb-3">Digital catalog</span>
          <h1 className="text-2xl font-black sm:text-3xl">Books</h1>
          <p className="mt-1 text-sm leading-6 text-gray-600">Apni pasand ki PDF book search karein aur details dekhkar purchase karein.</p>
        </div>
        <form onSubmit={search} className="grid gap-2 sm:flex">
          <input aria-label="Search books" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title, author, topic" />
          <button className="btn-primary w-full sm:w-auto">Search</button>
        </form>
      </div>
      {loading && !books.length ? (
        <BookListSkeleton />
      ) : books.length ? (
        <div className="catalog-books-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{books.map((book) => <BookCard book={book} key={book._id} />)}</div>
      ) : loadError ? (
        <div className="panel p-8 text-center text-gray-600">
          Books load ho rahi hain. Server wake up ke baad page refresh karein.
        </div>
      ) : (
        <p className="panel p-8 text-center text-gray-600">No books found.</p>
      )}
    </main>
  );
}
