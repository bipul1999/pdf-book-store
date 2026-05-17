import { BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client.js";

export default function Library() {
  const [books, setBooks] = useState([]);
  useEffect(() => { api.get("/users/library").then(({ data }) => setBooks(data.books)); }, []);
  return <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8"><h1 className="mb-5 text-2xl font-black sm:text-3xl">My Library</h1><p className="mb-4 text-sm font-semibold text-gray-600">Purchased PDFs remain available for 30 days after payment verification.</p><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{books.map((book) => <article className="panel grid grid-cols-[80px_1fr] gap-3 p-3" key={book._id}><img src={book.coverImage} className="h-28 w-20 rounded bg-orange-50 object-contain p-1" /><div className="min-w-0"><h3 className="line-clamp-2 font-bold">{book.title}</h3><p className="text-sm text-gray-600">{book.author}</p>{book.accessExpiresAt && <p className="mt-1 text-xs font-semibold text-orange-700">Access until {new Date(book.accessExpiresAt).toLocaleDateString()}</p>}<Link className="btn-primary mt-3 w-full sm:w-auto" to={`/dashboard/library/${book._id}/read`}><BookOpen size={16} /> Read PDF</Link></div></article>)}</div>{!books.length && <p className="panel p-8 text-center text-gray-600">Purchased books will appear here after successful payment.</p>}</main>;
}
