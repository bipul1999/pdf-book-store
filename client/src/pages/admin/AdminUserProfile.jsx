import { ArrowLeft, ReceiptIndianRupee, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../api/client.js";

function formatDate(value) {
  if (!value) return "Not available";
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function paymentMethod(order) {
  if (order.provider === "razorpay") return "Razorpay";
  return "Manual UPI";
}

function transactionLabel(order) {
  return order.transaction || order.transactionId || order.paymentNote || order.razorpayPaymentId || order.razorpayOrderId || "";
}

export default function AdminUserProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/admin/users/${id}`)
      .then(({ data }) => setProfile(data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <section className="panel p-5">Loading...</section>;
  if (!profile) return <section className="panel p-5">User not found</section>;

  const { user, summary, orders, transactions, pdfPurchases } = profile;

  return (
    <section className="space-y-4">
      <div className="panel p-4 sm:p-5">
        <Link className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-orange-700" to="/admin/users"><ArrowLeft size={16} /> Back to users</Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <UserRound className="text-orange-600" />
              <h1 className="text-2xl font-black">{user.name}</h1>
            </div>
            <p className="break-words text-sm text-gray-600">{user.email}</p>
            <p className="mt-1 text-sm text-gray-600">Phone: {user.phone}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-orange-50 px-2 py-1 text-orange-700">{user.role}</span>
              <span className="rounded-full bg-orange-50 px-2 py-1 text-orange-700">{user.isVerified ? "Verified" : "Not verified"}</span>
            </div>
          </div>
          <div className="grid gap-2 text-sm sm:min-w-64">
            <p><strong>Joined:</strong> {formatDate(user.createdAt)}</p>
            <p><strong>Last login:</strong> {formatDate(user.lastLoginAt)}</p>
            <p><strong>Login count:</strong> {user.loginCount || 0}</p>
            {user.lastLoginIp && <p className="break-words"><strong>Last IP:</strong> {user.lastLoginIp}</p>}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Total orders", summary.totalOrders],
          ["Successful", summary.successfulOrders],
          ["PDF purchases", summary.pdfPurchases],
          ["Total paid", `Rs. ${summary.totalPaid || 0}`]
        ].map(([label, value]) => (
          <div className="panel p-4" key={label}>
            <p className="text-xs font-black uppercase text-gray-500">{label}</p>
            <p className="mt-1 text-xl font-black text-orange-700">{value}</p>
          </div>
        ))}
      </div>

      <div className="panel overflow-hidden">
        <div className="border-b border-gray-200 p-5"><h2 className="text-xl font-black">Order History</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600"><tr><th className="p-3">Date</th><th className="p-3">Books</th><th className="p-3">Payment</th><th className="p-3">Amount</th><th className="p-3">Status</th></tr></thead>
            <tbody>
              {orders.map((order) => (
                <tr className="border-t border-gray-100" key={order._id}>
                  <td className="p-3 whitespace-nowrap text-xs font-bold text-gray-600">{formatDate(order.createdAt)}</td>
                  <td className="p-3">{order.items.map((item) => <p key={item.book?._id || item.title}>{item.title} x {item.quantity || 1}</p>)}</td>
                  <td className="p-3"><p>{paymentMethod(order)}</p>{transactionLabel(order) && <p className="mt-1 max-w-44 break-all text-xs text-gray-600">{transactionLabel(order)}</p>}</td>
                  <td className="p-3 font-bold">Rs. {order.amount}</td>
                  <td className="p-3">{order.status}</td>
                </tr>
              ))}
              {!orders.length && <tr><td className="p-5 text-gray-500" colSpan={5}>No orders found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel overflow-hidden">
          <div className="border-b border-gray-200 p-5"><h2 className="flex items-center gap-2 text-xl font-black"><ReceiptIndianRupee className="text-orange-600" /> Transactions</h2></div>
          <div className="grid gap-3 p-3">
            {transactions.map((item) => (
              <article className="rounded-xl border border-slate-100 p-3 text-sm" key={item.orderId}>
                <div className="flex justify-between gap-3"><strong>Rs. {item.amount}</strong><span>{item.status}</span></div>
                <p className="mt-1 text-gray-600">{paymentMethod(item)} · {formatDate(item.updatedAt)}</p>
                {item.transaction && <p className="mt-1 break-all text-xs text-gray-600">Transaction: {item.transaction}</p>}
              </article>
            ))}
            {!transactions.length && <p className="p-2 text-sm text-gray-500">No transactions found</p>}
          </div>
        </div>

        <div className="panel overflow-hidden">
          <div className="border-b border-gray-200 p-5"><h2 className="text-xl font-black">PDF Purchases</h2></div>
          <div className="grid gap-3 p-3">
            {pdfPurchases.map((item) => (
              <article className="rounded-xl border border-slate-100 p-3 text-sm" key={`${item.orderId}:${item.bookId}`}>
                <strong>{item.title}</strong>
                <p className="mt-1 text-gray-600">Purchased: {formatDate(item.purchasedAt)}</p>
                <p className="text-gray-600">Access until: {formatDate(item.accessExpiresAt)}</p>
                {item.transaction && <p className="mt-1 break-all text-xs text-gray-600">Transaction: {item.transaction}</p>}
              </article>
            ))}
            {!pdfPurchases.length && <p className="p-2 text-sm text-gray-500">No PDF purchases found</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
