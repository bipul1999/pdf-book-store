import { BookOpen, IndianRupee, Receipt, Users, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/client.js";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  async function load() {
    const statsRes = await api.get("/admin/stats");
    setStats(statsRes.data);
  }

  useEffect(() => { load(); }, []);

  const cards = [
    ["Users", stats?.users || 0, Users],
    ["Books", stats?.books || 0, BookOpen],
    ["Orders", stats?.orders || 0, Receipt],
    ["Revenue", `Rs. ${stats?.revenue || 0}`, IndianRupee],
    ["Visitors", stats?.visitors || 0, UsersRound]
  ];

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {cards.map(([label, value, Icon]) => (
          <article className="panel p-4" key={label}>
            <Icon className="mb-3 text-orange-600" />
            <p className="text-sm font-semibold text-gray-600">{label}</p>
            <strong className="text-xl sm:text-2xl">{value}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
