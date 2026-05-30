import { CheckCircle2, Clock, Mail, Phone, Star } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/client.js";

export default function ManageFeedback() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/feedback")
      .then(({ data }) => setFeedback(data.feedback || []))
      .catch(() => toast.error("Feedback load nahi ho paya"))
      .finally(() => setLoading(false));
  }, []);

  async function updateStatus(id, status) {
    try {
      await api.patch(`/admin/feedback/${id}`, { status });
      setFeedback((items) => items.map((item) => item._id === id ? { ...item, status } : item));
      toast.success("Feedback updated");
    } catch {
      toast.error("Feedback update nahi ho paya");
    }
  }

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-gray-200 p-5">
        <h1 className="text-2xl font-black">User Feedback</h1>
        <p className="mt-1 text-sm text-gray-600">Website handling, books, purchase aur payment ratings yahan dikhenge.</p>
      </div>
      <div className="grid gap-4 p-4">
        {loading && <p className="text-sm font-semibold text-gray-500">Loading...</p>}
        {!loading && !feedback.length && <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50 p-8 text-center font-bold text-orange-800">Abhi koi feedback nahi aaya.</div>}
        {feedback.map((item) => (
          <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm" key={item._id}>
            <div className="flex flex-col gap-4 md:flex-row md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-black uppercase text-orange-700">{item.category}</span>
                  <span className="inline-flex gap-0.5 text-orange-500">{[1, 2, 3, 4, 5].map((rating) => <Star fill={rating <= item.rating ? "currentColor" : "none"} key={rating} size={15} />)}</span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-500"><Clock size={13} /> {new Date(item.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-gray-700">{item.message}</p>
                <div className="mt-3 grid gap-1 text-sm text-gray-600">
                  <strong>{item.name || item.user?.name || "Anonymous visitor"}</strong>
                  {(item.email || item.user?.email) && <span className="flex items-center gap-2 break-all"><Mail size={15} /> {item.email || item.user?.email}</span>}
                  {(item.phone || item.user?.phone) && <span className="flex items-center gap-2"><Phone size={15} /> {item.phone || item.user?.phone}</span>}
                </div>
              </div>
              <div className="md:w-44">
                <select className="input" value={item.status} onChange={(event) => updateStatus(item._id, event.target.value)}>
                  <option value="new">New</option>
                  <option value="reviewed">Reviewed</option>
                </select>
                {item.status === "reviewed" && <p className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-green-700"><CheckCircle2 size={16} /> Reviewed</p>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
