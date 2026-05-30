import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/client.js";

const digitalStatuses = [
  ["pending", "pending"],
  ["submitted", "submitted"],
  ["success", "success"],
  ["failed", "failed"]
];
const manualStatuses = [
  ["pending", "Pending"],
  ["confirmed", "Confirmed"],
  ["completed", "Completed"],
  ["rejected", "Rejected"]
];

function statusOptions(order) {
  return order.orderType === "manual_book" ? manualStatuses : digitalStatuses;
}

function dateTimeValue(value) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function accessKey(order, item) {
  return `${order._id}:${item.book?._id || item.book}`;
}

function formatOrderDate(value) {
  if (!value) return "Date not available";
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

async function blobErrorMessage(error) {
  const data = error.response?.data;
  if (data instanceof Blob) {
    try {
      return JSON.parse(await data.text()).message;
    } catch {
      return "";
    }
  }
  return data?.message || "";
}

function proofRequestUrl(paymentProof) {
  return paymentProof?.startsWith("/api/") ? paymentProof.slice(4) : paymentProof;
}

function CustomerDetails({ order }) {
  if (order.orderType !== "manual_book") {
    return <><strong>{order.user?.name}</strong><p className="break-words text-gray-600">{order.user?.email}</p></>;
  }
  const details = order.customerDetails || {};
  return (
    <>
      <div className="mb-1 flex flex-wrap items-center gap-2"><strong>{details.fullName || order.user?.name}</strong><span className="badge">Book order</span></div>
      <p className="break-words text-gray-600">{details.email}</p>
      <p className="text-gray-600">{details.mobileNumber}</p>
      <p className="mt-2 max-w-xs text-xs leading-5 text-gray-500">{details.address}, {details.city}, {details.state} - {details.pincode}</p>
    </>
  );
}

export default function ManageOrders() {
  const [orders, setOrders] = useState([]);
  const [accessDrafts, setAccessDrafts] = useState({});

  async function load() {
    const { data } = await api.get("/admin/orders");
    setOrders(data.orders);
    setAccessDrafts(Object.fromEntries(data.orders.flatMap((order) =>
      order.items.map((item) => [accessKey(order, item), dateTimeValue(item.accessExpiresAt)])
    )));
  }

  useEffect(() => { load(); }, []);

  async function setStatus(id, status) {
    await api.patch(`/admin/orders/${id}/status`, { status });
    toast.success("Order updated");
    load();
  }

  function shiftAccess(order, item, days) {
    const key = accessKey(order, item);
    const currentValue = accessDrafts[key] || dateTimeValue(item.accessExpiresAt) || dateTimeValue(new Date());
    const nextDate = new Date(currentValue);
    nextDate.setDate(nextDate.getDate() + days);
    setAccessDrafts((values) => ({ ...values, [key]: dateTimeValue(nextDate) }));
  }

  async function saveAccess(order, item) {
    const accessExpiresAt = accessDrafts[accessKey(order, item)];
    if (!accessExpiresAt) {
      toast.error("Select access expiry date and time");
      return;
    }
    await api.patch(`/admin/orders/${order._id}/access`, {
      bookId: item.book?._id || item.book,
      accessExpiresAt: new Date(accessExpiresAt).toISOString()
    });
    toast.success("PDF access duration updated");
    load();
  }

  function renderAccessEditor(order, item, mobile = false) {
    if (order.orderType === "manual_book" || order.status !== "success") return null;
    const key = accessKey(order, item);
    return (
      <div className={`${mobile ? "mt-3" : "mt-3 min-w-56"} rounded-xl border border-amber-100 bg-amber-50/60 p-2`}>
        <p className="mb-1 text-xs font-bold text-amber-800">PDF access until</p>
        <input
          className="input !min-h-10 !p-2 text-xs"
          type="datetime-local"
          value={accessDrafts[key] || ""}
          onChange={(event) => setAccessDrafts((values) => ({ ...values, [key]: event.target.value }))}
        />
        <div className="mt-2 flex gap-1.5">
          <button className="btn-secondary !min-h-9 !px-2 text-xs" onClick={() => shiftAccess(order, item, -7)} type="button">-7 days</button>
          <button className="btn-secondary !min-h-9 !px-2 text-xs" onClick={() => shiftAccess(order, item, 7)} type="button">+7 days</button>
          <button className="btn-primary !min-h-9 !px-3 text-xs" onClick={() => saveAccess(order, item)} type="button">Save</button>
        </div>
      </div>
    );
  }

  async function viewProof(order) {
    const proofWindow = window.open("", "_blank");
    if (proofWindow) {
      proofWindow.document.title = "Loading payment proof...";
      proofWindow.document.body.textContent = "Loading payment proof...";
    }
    try {
      const { data } = await api.get(proofRequestUrl(order.paymentProof), { responseType: "blob" });
      const proofUrl = URL.createObjectURL(data);
      if (proofWindow) {
        proofWindow.location.assign(proofUrl);
      } else {
        const link = document.createElement("a");
        link.href = proofUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.click();
      }
      setTimeout(() => URL.revokeObjectURL(proofUrl), 60 * 1000);
    } catch (error) {
      proofWindow?.close();
      toast.error(await blobErrorMessage(error) || "Payment proof could not be opened");
    }
  }

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-gray-200 p-5"><h1 className="text-2xl font-black">Manage Orders</h1></div>
      <div className="grid gap-3 p-3 sm:hidden">
        {orders.map((order) => (
          <article className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm" key={order._id}>
            <div className="text-sm"><CustomerDetails order={order} /></div>
            <p className="mt-2 text-xs font-bold text-gray-500">Ordered on {formatOrderDate(order.createdAt)}</p>
            <div className="mt-2 space-y-2 text-sm">{order.items.map((item) => (
              <div className="rounded-xl border border-slate-100 p-2" key={item.book?._id || item.title}>
                <p>{item.title} x {item.quantity || 1}</p>
                {renderAccessEditor(order, item, true)}
              </div>
            ))}</div>
            <p className="price-text mt-2">Rs. {order.amount}</p>
            {order.orderType === "manual_book" && <p className="text-xs text-gray-600">Books Rs. {order.bookTotal || 0} + Extra Rs. {order.extraCharge || 0}</p>}
            {order.orderType === "manual_book" && <p className="mt-1 text-xs font-bold text-gray-600">Payment: {order.provider === "razorpay" ? "Razorpay" : "Manual UPI"}</p>}
            {order.paymentProof ? <button className="mt-2 inline-block font-bold text-orange-600" onClick={() => viewProof(order)} type="button">View proof</button> : <p className="mt-2 text-sm text-gray-500">No proof</p>}
            {(order.transactionId || order.paymentNote) && <p className="mt-1 break-all text-xs text-gray-600">Transaction: {order.transactionId || order.paymentNote}</p>}
            <select className="input mt-3" value={order.status} onChange={(e) => setStatus(order._id, e.target.value)}>
              {statusOptions(order).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600"><tr><th className="p-3">Customer</th><th className="p-3">Date & Time</th><th className="p-3">Books</th><th className="p-3">Amount</th><th className="p-3">Proof</th><th className="p-3">Status</th></tr></thead>
          <tbody>
            {orders.map((order) => (
              <tr className="border-t border-gray-100" key={order._id}>
                <td className="p-3 align-top"><CustomerDetails order={order} /></td>
                <td className="p-3 align-top whitespace-nowrap text-xs font-bold text-gray-600">{formatOrderDate(order.createdAt)}</td>
                <td className="p-3 align-top">
                  <div className="space-y-3">{order.items.map((item) => (
                    <div key={item.book?._id || item.title}>
                      <p>{item.title} x {item.quantity || 1}</p>
                      {renderAccessEditor(order, item)}
                    </div>
                  ))}</div>
                </td>
                <td className="p-3">
                  <strong>Rs. {order.amount}</strong>
                  {order.orderType === "manual_book" && <p className="mt-1 whitespace-nowrap text-xs text-gray-600">Rs. {order.bookTotal || 0} + Rs. {order.extraCharge || 0}</p>}
                  {order.orderType === "manual_book" && <p className="mt-1 text-xs font-bold text-gray-600">{order.provider === "razorpay" ? "Razorpay" : "Manual UPI"}</p>}
                </td>
                <td className="p-3">
                  {order.paymentProof ? (
                    <button className="font-bold text-orange-600" onClick={() => viewProof(order)} type="button">View proof</button>
                  ) : (
                    <span className="text-gray-500">No proof</span>
                  )}
                  {(order.transactionId || order.paymentNote) && <p className="mt-1 max-w-32 break-all text-xs text-gray-600">{order.transactionId || order.paymentNote}</p>}
                </td>
                <td className="p-3">
                  <select className="input min-w-32" value={order.status} onChange={(e) => setStatus(order._id, e.target.value)}>
                    {statusOptions(order).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
