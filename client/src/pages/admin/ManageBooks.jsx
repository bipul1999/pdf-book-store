import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import api from "../../api/client.js";

export default function ManageBooks() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await api.get("/books");
    setBooks(data.books);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function archive(id) {
    await api.delete(`/books/${id}`);
    toast.success("Book archived");
    load();
  }

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-gray-200 p-5">
        <h1 className="text-2xl font-black">Manage Books</h1>
      </div>
      {loading ? <p className="p-5">Loading...</p> : (
        <>
        <div className="grid gap-3 p-3 sm:hidden">
          {books.map((book) => (
            <article className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm" key={book._id}>
              <div className="grid grid-cols-[72px_1fr] gap-3">
                <img className="h-24 w-16 rounded-xl bg-orange-50 object-contain p-1" src={book.coverImage} alt={book.title} />
                <div className="min-w-0">
                  <strong className="line-clamp-2">{book.title}</strong>
                  <p className="text-sm text-gray-600">{book.author}</p>
                  <p className="price-text mt-1">PDF Rs. {book.price}</p>
                  <p className="text-xs font-bold text-gray-500">Order Book Rs. {book.orderBookPrice ?? book.price}</p>
                  <div className="mt-3 flex gap-2">
                    <Link className="btn-secondary !min-h-10 !px-3" to={`/admin/books/${book._id}/edit`} title="Edit book"><Pencil size={16} /></Link>
                    <button className="btn-secondary !min-h-10 !px-3" onClick={() => archive(book._id)} title="Archive book"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600"><tr><th className="p-3">Book</th><th className="p-3">PDF Price</th><th className="p-3">Order Book Price</th><th className="p-3">Action</th></tr></thead>
            <tbody>
              {books.map((book) => (
                <tr className="border-t border-gray-100" key={book._id}>
                  <td className="flex items-center gap-3 p-3"><img className="h-14 w-10 rounded object-cover" src={book.coverImage} alt={book.title} /><div><strong>{book.title}</strong><p className="text-gray-600">{book.author}</p></div></td>
                  <td className="p-3">Rs. {book.price}</td>
                  <td className="p-3">Rs. {book.orderBookPrice ?? book.price}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Link className="btn-secondary !px-3" to={`/admin/books/${book._id}/edit`} title="Edit book"><Pencil size={16} /></Link>
                      <button className="btn-secondary !px-3" onClick={() => archive(book._id)} title="Archive book"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </section>
  );
}
