import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/client.js";

const BOOK_UPLOAD_TIMEOUT_MS = 10 * 60 * 1000;

function getErrorMessage(error) {
  const data = error.response?.data;
  const firstError = data?.errors?.[0];
  if (firstError?.path && firstError?.msg) return `${firstError.path}: ${firstError.msg}`;
  if (error.code === "ECONNABORTED") return "PDF upload is taking too long. Please wait a moment and try again.";
  if (!error.response) return "Could not reach the server. Please check your connection and try again.";
  return data?.message || "Could not update book";
}

export default function EditBook() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", author: "", description: "", price: "", featured: false, isActive: true });
  const [cover, setCover] = useState(null);
  const [pdf, setPdf] = useState(null);
  const [pdfAvailable, setPdfAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/books/${id}`).then((bookRes) => {
      const book = bookRes.data.book;
      setForm({
        title: book.title,
        author: book.author,
        description: book.description,
        price: book.price,
        featured: Boolean(book.featured),
        isActive: Boolean(book.isActive)
      });
      setPdfAvailable(Boolean(book.pdfAvailable));
      setLoading(false);
    });
  }, [id]);

  async function submit(e) {
    e.preventDefault();
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => payload.append(key, value));
    if (cover) payload.append("cover", cover);
    if (pdf) payload.append("pdf", pdf);
    setSaving(true);
    try {
      await api.put(`/books/${id}`, payload, { timeout: BOOK_UPLOAD_TIMEOUT_MS });
      toast.success("Book updated");
      navigate("/admin/books");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <section className="panel p-5">Loading...</section>;

  return (
    <section className="panel p-4 sm:p-5">
      <h1 className="mb-5 flex items-center gap-2 text-2xl font-black"><Save className="text-orange-600" /> Edit Book</h1>
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <input className="input" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <input className="input" placeholder="Author" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} required />
        <input className="input" type="number" min="0" step="0.01" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
        <textarea className="input min-h-32 md:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        <label className="label">Replace cover image<input className="input mt-1" type="file" accept="image/*" onChange={(e) => setCover(e.target.files[0])} /></label>
        <label className="label">Replace PDF file
          <input className="input mt-1" type="file" accept="application/pdf,.pdf" onChange={(e) => setPdf(e.target.files[0] || null)} />
          <span className={`mt-1 block text-xs font-bold ${pdf || pdfAvailable ? "text-green-700" : "text-orange-700"}`}>
            {pdf ? `Selected: ${pdf.name}` : pdfAvailable ? "PDF already uploaded" : "No PDF uploaded yet"}
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured book</label>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
        <button className="btn-primary w-full md:w-auto md:justify-self-end" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
      </form>
    </section>
  );
}
