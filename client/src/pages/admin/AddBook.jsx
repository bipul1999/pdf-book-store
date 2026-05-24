import { UploadCloud } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import api from "../../api/client.js";

const initial = { title: "", author: "", description: "", price: "", featured: false };

function getErrorMessage(error) {
  const data = error.response?.data;
  const firstError = data?.errors?.[0];
  if (firstError?.path && firstError?.msg) return `${firstError.path}: ${firstError.msg}`;
  return data?.message || "Could not add book";
}

export default function AddBook() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [cover, setCover] = useState(null);
  const [pdf, setPdf] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => payload.append(key, value));
    payload.append("cover", cover);
    payload.append("pdf", pdf);
    setLoading(true);
    try {
      await api.post("/books", payload);
      toast.success("Book added");
      navigate("/admin/books");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel p-4 sm:p-5">
      <h1 className="mb-5 flex items-center gap-2 text-2xl font-black"><UploadCloud className="text-orange-600" /> Add Book</h1>
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <input className="input" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <input className="input" placeholder="Author" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} required />
        <input className="input" type="number" min="0" step="0.01" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
        <textarea className="input min-h-32 md:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        <label className="label">Cover image<input className="input mt-1" type="file" accept="image/*" onChange={(e) => setCover(e.target.files[0])} required /></label>
        <label className="label">PDF file<input className="input mt-1" type="file" accept="application/pdf" onChange={(e) => setPdf(e.target.files[0])} required /></label>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured book</label>
        <button className="btn-primary w-full md:w-auto md:justify-self-end" disabled={loading}>{loading ? "Uploading..." : "Publish book"}</button>
      </form>
    </section>
  );
}
