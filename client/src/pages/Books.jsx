import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/client.js";
import BookCard from "../components/BookCard.jsx";

const BOOK_RETRY_DELAYS_MS = [1500, 3500, 7000];

function BookListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="panel h-80 animate-pulse bg-orange-50/70" />
      ))}
    </div>
  );
}

export default function Books() {
  const [params, setParams] = useSearchParams();
  const [books, setBooks] = useState([]);
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
    <main className="mx-auto max-w-7xl px-3 py-5 sm:px-4 sm:py-8">
      <div className="mb-5 space-y-3">
        <div>
          <h1 className="text-2xl font-black">Books</h1>
          <p className="mt-1 text-sm leading-6 text-gray-600">Apni pasand ki PDF book search karein aur details dekhkar purchase karein.</p>
        </div>
        <form onSubmit={search} className="grid flex-1 gap-2 sm:flex">
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title, author, topic" />
          <button className="btn-primary w-full sm:w-auto">Search</button>
        </form>
      </div>
      {loading ? (
        <BookListSkeleton />
      ) : books.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{books.map((book) => <BookCard book={book} key={book._id} />)}</div>
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
