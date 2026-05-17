import { Quote } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/client.js";

export default function QuoteSettings() {
  const [form, setForm] = useState({ quote: "", authorName: "" });
  const [authorImage, setAuthorImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/admin/quote-settings").then(({ data }) => {
      setForm({
        quote: data.quote.quote || "",
        authorName: data.quote.authorName || ""
      });
      setPreview(data.quote.authorImage || "");
    });
  }, []);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = new FormData();
      payload.append("quote", form.quote);
      payload.append("authorName", form.authorName);
      if (authorImage) payload.append("authorImage", authorImage);
      const { data } = await api.put("/admin/quote-settings", payload);
      setPreview(data.quote.authorImage || "");
      toast.success("Quote section updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update quote section");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel p-5">
      <h1 className="mb-5 flex items-center gap-2 text-2xl font-black"><Quote /> Quote Section</h1>
      <form onSubmit={submit} className="grid gap-4">
        <textarea
          className="input min-h-36"
          placeholder="Hindi quote"
          value={form.quote}
          onChange={(e) => setForm({ ...form, quote: e.target.value })}
          required
        />
        <input
          className="input"
          placeholder="Author name"
          value={form.authorName}
          onChange={(e) => setForm({ ...form, authorName: e.target.value })}
          required
        />
        <label className="label">
          Author image
          <input className="input mt-1" type="file" accept="image/*" onChange={(e) => setAuthorImage(e.target.files[0])} />
        </label>
        {preview && <img className="h-28 w-28 rounded-full border object-cover" src={preview} alt={form.authorName} />}
        <button className="btn-primary justify-self-start" disabled={loading}>{loading ? "Saving..." : "Save quote"}</button>
      </form>
    </section>
  );
}
