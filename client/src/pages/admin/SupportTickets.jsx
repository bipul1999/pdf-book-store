import { CheckCircle2, Clock, Mail, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/client.js";

const statusLabels = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved"
};

const priorityClass = {
  high: "bg-red-50 text-red-700 border-red-200",
  normal: "bg-orange-50 text-orange-700 border-orange-200",
  low: "bg-slate-50 text-slate-600 border-slate-200"
};

export default function SupportTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadTickets() {
    const { data } = await api.get("/admin/support-tickets");
    setTickets(data.tickets || []);
    setLoading(false);
  }

  useEffect(() => {
    loadTickets().catch(() => {
      toast.error("Support tickets load nahi ho paye");
      setLoading(false);
    });
  }, []);

  async function updateStatus(id, status) {
    await api.patch(`/admin/support-tickets/${id}`, { status });
    setTickets((items) => items.map((ticket) => ticket._id === id ? { ...ticket, status } : ticket));
    toast.success("Ticket updated");
  }

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-gray-200 p-5">
        <h1 className="text-2xl font-black">Support Chats</h1>
        <p className="mt-1 text-sm text-gray-600">AI chat se aaye user problems yahan dikhenge.</p>
      </div>
      <div className="grid gap-4 p-4">
        {loading && <p className="text-sm font-semibold text-gray-500">Loading...</p>}
        {!loading && !tickets.length && (
          <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50 p-8 text-center font-bold text-orange-800">
            Abhi koi support chat nahi aaya.
          </div>
        )}
        {tickets.map((ticket) => (
          <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm" key={ticket._id}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${priorityClass[ticket.priority] || priorityClass.normal}`}>
                    {ticket.priority}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black uppercase text-slate-700">{ticket.category}</span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-500"><Clock size={13} /> {new Date(ticket.createdAt).toLocaleString()}</span>
                </div>
                <h2 className="mt-3 text-lg font-black">{ticket.subject}</h2>
                <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-gray-700">{ticket.summary}</p>
                <div className="mt-3 grid gap-1 text-sm text-gray-600">
                  <p><strong>{ticket.name || ticket.user?.name || "Unknown user"}</strong></p>
                  {(ticket.email || ticket.user?.email) && <p className="flex items-center gap-2 break-all"><Mail size={15} /> {ticket.email || ticket.user?.email}</p>}
                  {(ticket.phone || ticket.user?.phone) && <p className="flex items-center gap-2"><Phone size={15} /> {ticket.phone || ticket.user?.phone}</p>}
                </div>
              </div>
              <div className="grid gap-2 md:w-48">
                <select className="input" value={ticket.status} onChange={(event) => updateStatus(ticket._id, event.target.value)}>
                  {Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
                {ticket.status === "resolved" && <p className="inline-flex items-center gap-1 text-sm font-bold text-green-700"><CheckCircle2 size={16} /> Resolved</p>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
