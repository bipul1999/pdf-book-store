import { BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client.js";

function accessLabel(accessExpiresAt) {
  if (!accessExpiresAt) return "";
  const date = new Date(accessExpiresAt);
  if (date.getFullYear() >= 9999) return "Lifetime access";
  return `Access until ${date.toLocaleString()}`;
}

export default function Library() {
  const [books, setBooks] = useState([]);
  useEffect(() => { api.get("/users/library").then(({ data }) => setBooks(data.books)); }, []);
  return <main className="store-page mx-auto w-full max-w-6xl px-4 py-5 sm:py-9"><h1 className="mb-3 text-2xl font-black sm:text-3xl">My Library</h1><p className="mb-5 text-sm font-semibold leading-6 text-gray-600">Your purchased book always opens its latest PDF version. Reading access remains available until the date set for your purchase.</p><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{books.map((book) => <article className="panel grid grid-cols-[84px_1fr] gap-3 p-3 transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(120,53,15,.12)]" key={book._id}><img src={book.coverImage} className="h-28 w-20 rounded-xl bg-orange-50 object-contain p-1" alt={book.title} /><div className="min-w-0"><h3 className="line-clamp-2 font-black leading-snug">{book.title}</h3><p className="text-sm text-gray-600">{book.author}</p>{book.accessExpiresAt && <p className="mt-1 text-xs font-bold text-orange-600">{accessLabel(book.accessExpiresAt)}</p>}<Link className="btn-primary mt-3 w-full sm:w-auto" to={`/dashboard/library/${book._id}/read`}><BookOpen size={16} /> Read PDF</Link></div></article>)}</div>{!books.length && <div className="panel p-8 text-center text-gray-600"><p className="font-bold">Purchased books will appear here after successful payment.</p><Link className="btn-primary mt-4" to="/books">Browse books</Link></div>}</main>;
}
