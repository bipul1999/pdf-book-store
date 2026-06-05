import { MonitorSmartphone, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/client.js";

function formatDate(value) {
  if (!value) return "Date not available";
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function browserName(userAgent = "") {
  if (userAgent.includes("Edg/")) return "Edge";
  if (userAgent.includes("Chrome/")) return "Chrome";
  if (userAgent.includes("Firefox/")) return "Firefox";
  if (userAgent.includes("Safari/")) return "Safari";
  return "Browser";
}

export default function Visitors() {
  const [summary, setSummary] = useState(null);
  const [visits, setVisits] = useState([]);

  useEffect(() => {
    api.get("/admin/visitors").then(({ data }) => {
      setSummary(data.summary);
      setVisits(data.visits);
    });
  }, []);

  const cards = [
    ["Total visits", summary?.totalVisits || 0],
    ["Unique visitors", summary?.uniqueVisitors || 0],
    ["Today visits", summary?.todayVisits || 0],
    ["Today unique", summary?.todayUnique || 0]
  ];

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <article className="panel p-4" key={label}>
            <UsersRound className="mb-3 text-orange-600" size={22} />
            <p className="text-sm font-semibold text-gray-600">{label}</p>
            <strong className="text-2xl">{value}</strong>
          </article>
        ))}
      </div>
      <section className="panel overflow-hidden">
        <div className="border-b border-gray-200 p-5"><h1 className="text-2xl font-black">Visitors</h1></div>
        <div className="grid gap-3 p-3 sm:hidden">
          {visits.map((visit) => (
            <article className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm" key={visit._id}>
              <strong>{visit.user?.name || "Guest visitor"}</strong>
              <p className="break-words text-sm text-gray-600">{visit.user?.email || visit.visitorId}</p>
              <p className="mt-2 text-sm">{visit.page}</p>
              <p className="mt-1 text-xs font-bold text-gray-500">{formatDate(visit.createdAt)}</p>
              <p className="mt-2 text-xs text-gray-600">{browserName(visit.userAgent)} - {visit.screen || "Screen unknown"}</p>
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr><th className="p-3">Visitor</th><th className="p-3">Page</th><th className="p-3">Device</th><th className="p-3">IP</th><th className="p-3">Time</th></tr>
            </thead>
            <tbody>
              {visits.map((visit) => (
                <tr className="border-t border-gray-100" key={visit._id}>
                  <td className="p-3">
                    <strong>{visit.user?.name || "Guest"}</strong>
                    <p className="max-w-56 break-words text-gray-600">{visit.user?.email || visit.visitorId}</p>
                  </td>
                  <td className="p-3 max-w-xs break-words">{visit.page}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2"><MonitorSmartphone size={16} className="text-orange-600" /> {browserName(visit.userAgent)}</div>
                    <p className="text-xs text-gray-600">{visit.screen || "Screen unknown"}</p>
                  </td>
                  <td className="p-3">{visit.ip || "N/A"}</td>
                  <td className="p-3 whitespace-nowrap text-xs font-bold text-gray-600">{formatDate(visit.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
