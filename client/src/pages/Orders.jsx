import { CheckCircle2, Clock3, FileText, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client.js";

const statusMap = {
  success: {
    label: "Payment verified",
    text: "Your PDF is unlocked in My Library.",
    className: "border-green-200 bg-green-50 text-green-700",
    Icon: CheckCircle2
  },
  failed: {
    label: "Payment failed",
    text: "This payment could not be verified.",
    className: "border-red-200 bg-red-50 text-red-700",
    Icon: XCircle
  },
  submitted: {
    label: "Payment submitted",
    text: "Your payment proof is under review.",
    className: "border-amber-200 bg-amber-50 text-amber-800",
    Icon: Clock3
  },
  pending: {
    label: "Payment pending",
    text: "Upload payment proof from checkout to start verification.",
    className: "border-gray-200 bg-gray-50 text-gray-700",
    Icon: Clock3
  },
  confirmed: {
    label: "Order confirmed",
    text: "Your book order has been confirmed.",
    className: "border-blue-200 bg-blue-50 text-blue-700",
    Icon: CheckCircle2
  },
  completed: {
    label: "Order completed",
    text: "Your book order has been completed.",
    className: "border-green-200 bg-green-50 text-green-700",
    Icon: CheckCircle2
  },
  rejected: {
    label: "Order rejected",
    text: "Your book order could not be approved.",
    className: "border-red-200 bg-red-50 text-red-700",
    Icon: XCircle
  }
};

const manualPendingStatus = {
  label: "Pending verification",
  text: "Your payment proof and book order are under review.",
  className: "border-amber-200 bg-amber-50 text-amber-800",
  Icon: Clock3
};

function formatOrderDate(value) {
  if (!value) return "Date not available";
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function orderTitle(order) {
  return order.items?.[0]?.title || "";
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [notice, setNotice] = useState(null);
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    api.get("/users/orders").then(({ data }) => {
      setOrders(data.orders);
      const latest = data.orders[0];
      if (latest && latest.orderType !== "manual_book" && ["success", "failed"].includes(latest.status)) {
        setNotice({
          type: latest.status,
          message: latest.status === "success"
            ? "Payment successful. Your PDF is unlocked in My Library."
            : "Payment failed. Please try again or contact support."
        });
      }
    });
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 8000);
    return () => clearTimeout(timer);
  }, [notice]);

  const visibleOrders = useMemo(() => {
    const sorted = [...orders];
    if (sortBy === "az") sorted.sort((a, b) => orderTitle(a).localeCompare(orderTitle(b), "hi"));
    else if (sortBy === "za") sorted.sort((a, b) => orderTitle(b).localeCompare(orderTitle(a), "hi"));
    else if (sortBy === "oldest") sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    else sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return sorted;
  }, [orders, sortBy]);

  return (
    <main className="store-page mx-auto max-w-6xl px-4 py-5 sm:py-9">
      {notice && (
        <div className={`fixed left-4 right-4 top-20 z-50 rounded-2xl border bg-white p-4 shadow-soft sm:left-auto sm:max-w-sm ${notice.type === "success" ? "border-green-300" : "border-red-300"}`}>
          <p className={notice.type === "success" ? "font-black text-green-700" : "font-black text-red-700"}>{notice.message}</p>
          <p className="mt-1 text-sm text-gray-600">This notification will close automatically.</p>
        </div>
      )}
      <span className="badge mb-3">Order history</span>
      <div className="mb-5 grid gap-3 sm:flex sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">My Orders</h1>
          <p className="mt-1 text-sm text-gray-600">All digital purchases and physical book orders appear here with date and time.</p>
        </div>
        <label className="label sm:w-48">Sort orders
          <select className="input mt-1" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="az">A-Z by book</option>
            <option value="za">Z-A by book</option>
          </select>
        </label>
      </div>
      <div className="space-y-4">
        {visibleOrders.map((order) => {
          const status = order.orderType === "manual_book" && order.status === "pending"
            ? manualPendingStatus
            : statusMap[order.status] || statusMap.pending;
          const Icon = status.Icon;
          return (
            <article className="panel p-4 transition hover:shadow-[0_18px_42px_rgba(120,53,15,.11)] sm:p-5" key={order._id}>
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div className="min-w-0">
                  <div className="mb-3 flex items-center gap-2">
                    <FileText size={18} className="shrink-0 text-orange-600" />
                    <strong className="break-words">Order #{order._id.slice(-6).toUpperCase()}</strong>
                    {order.orderType === "manual_book" && <span className="badge">Book order</span>}
                  </div>
                  <p className="mb-3 text-sm font-bold text-gray-600">Ordered on {formatOrderDate(order.createdAt)}</p>
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2" key={`${order._id}-${item.book?._id || item.title}`}>
                        <p className="break-words font-bold">{item.title}</p>
                        <p className="text-sm text-gray-600">Rs. {item.price} x {item.quantity || 1} = Rs. {item.price * (item.quantity || 1)}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3 md:min-w-64">
                  <strong className="price-text block text-xl sm:text-2xl">Rs. {order.amount}</strong>
                  {order.orderType === "manual_book" && (
                    <div className="space-y-1 rounded-xl border border-orange-100 bg-orange-50/50 p-3 text-sm">
                      <p className="flex justify-between gap-4"><span>Book Total</span><strong>Rs. {order.bookTotal || 0}</strong></p>
                      <p className="flex justify-between gap-4"><span>Delivery / payment charges</span><strong>Rs. {order.extraCharge || 0}</strong></p>
                    </div>
                  )}
                  <div className={`flex items-start gap-2 rounded-xl border p-3 ${status.className}`}>
                    <Icon size={22} className="shrink-0" />
                    <div className="min-w-0">
                      <p className="font-black">{status.label}</p>
                      <p className="text-sm">{status.text}</p>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
        {!orders.length && (
          <div className="panel p-8 text-center text-gray-600">
            <p>No orders yet.</p>
            <p className="mt-2 text-sm">Submitted book orders and verified digital purchases appear here.</p>
            <Link className="btn-primary mt-4" to="/books">Browse books</Link>
          </div>
        )}
      </div>
    </main>
  );
}
