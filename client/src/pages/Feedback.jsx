import { MessageSquareText, Send, Star } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

const categories = [
  ["website", "Website handling"],
  ["book", "Books and content"],
  ["purchase", "Purchase experience"],
  ["payment", "Payment experience"],
  ["problem", "Report a problem"],
  ["suggestion", "Suggestion"]
];

export default function Feedback() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    category: "website",
    rating: 5,
    message: ""
  });
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm((value) => ({
      ...value,
      name: value.name || user.name || "",
      email: value.email || user.email || "",
      phone: value.phone || user.phone || ""
    }));
  }, [user]);

  function update(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post("/feedback", { ...form, rating: Number(form.rating) });
      setSubmitted(true);
      toast.success("Thank you for your feedback");
    } catch (error) {
      toast.error(error.response?.data?.message || "Feedback submit nahi ho paya");
    } finally {
      setSaving(false);
    }
  }

  if (submitted) {
    return (
      <main className="store-page mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <section className="panel p-6 text-center sm:p-10">
          <Star className="mx-auto text-orange-500" fill="currentColor" size={46} />
          <h1 className="mt-4 text-2xl font-black">Thank you for your feedback</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-gray-600">Aapka experience hume website aur services ko better banane me help karega.</p>
          <button className="btn-secondary mt-5" onClick={() => setSubmitted(false)}>Send another feedback</button>
        </section>
      </main>
    );
  }

  return (
    <main className="store-page mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <section className="panel overflow-hidden">
        <div className="bg-[linear-gradient(135deg,#fff7ed,#fffbeb)] p-5 sm:p-8">
          <span className="badge mb-3"><MessageSquareText size={14} /> User Feedback</span>
          <h1 className="text-2xl font-black sm:text-3xl">Website use karne ka experience batayein</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-600">Website handling, books, purchase ya payment ke baare me rating aur feedback dein. Problem report bhi yahin se kar sakte hain.</p>
        </div>
        <form className="grid gap-4 p-5 sm:p-8" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="label">Feedback type
              <select className="input mt-1" name="category" value={form.category} onChange={update}>
                {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <fieldset>
              <legend className="label">Your rating</legend>
              <div className="mt-2 flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button aria-label={`${rating} star rating`} className={`grid h-11 w-11 place-items-center rounded-xl border transition ${rating <= form.rating ? "border-orange-300 bg-orange-50 text-orange-500" : "border-gray-200 text-gray-300 hover:border-orange-200"}`} key={rating} onClick={() => setForm({ ...form, rating })} type="button">
                    <Star fill={rating <= form.rating ? "currentColor" : "none"} size={21} />
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <textarea className="input min-h-36" maxLength={2000} name="message" placeholder="Apna feedback ya problem detail me likhein..." required value={form.message} onChange={update} />
          <div className="grid gap-3 sm:grid-cols-3">
            <input className="input" maxLength={80} name="name" placeholder="Name (optional)" value={form.name} onChange={update} />
            <input className="input" maxLength={120} name="email" placeholder="Email (optional)" type="email" value={form.email} onChange={update} />
            <input className="input" maxLength={20} name="phone" placeholder="Phone (optional)" value={form.phone} onChange={update} />
          </div>
          <button className="btn-primary w-full sm:w-fit sm:justify-self-end" disabled={saving}><Send size={17} /> {saving ? "Submitting..." : "Submit Feedback"}</button>
        </form>
      </section>
    </main>
  );
}
