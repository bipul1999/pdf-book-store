import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/client.js";
import BookCard from "../components/BookCard.jsx";

export default function Books() {
  const [params, setParams] = useSearchParams();
  const [books, setBooks] = useState([]);
  const [q, setQ] = useState(params.get("q") || "");

  useEffect(() => {
    api.get(`/books?${params.toString()}`).then(({ data }) => setBooks(data.books));
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{books.map((book) => <BookCard book={book} key={book._id} />)}</div>
      {!books.length && <p className="panel p-8 text-center text-gray-600">No books found.</p>}
    </main>
  );
}
