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

  async function load() {
    const { data } = await api.get("/admin/orders");
    setOrders(data.orders);
  }

  useEffect(() => { load(); }, []);

  async function setStatus(id, status) {
    await api.patch(`/admin/orders/${id}/status`, { status });
    toast.success("Order updated");
    load();
  }

  async function viewProof(order) {
    try {
      const { data } = await api.get(order.paymentProof, { responseType: "blob" });
      const proofUrl = URL.createObjectURL(data);
      window.open(proofUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(proofUrl), 60 * 1000);
    } catch (error) {
      toast.error(error.response?.data?.message || "Payment proof could not be opened");
    }
  }

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-gray-200 p-5"><h1 className="text-2xl font-black">Manage Orders</h1></div>
      <div className="grid gap-3 p-3 sm:hidden">
        {orders.map((order) => (
          <article className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm" key={order._id}>
            <div className="text-sm"><CustomerDetails order={order} /></div>
            <p className="mt-2 line-clamp-2 text-sm">{order.items.map((item) => item.title).join(", ")}</p>
            <p className="price-text mt-2">Rs. {order.amount}</p>
            {order.orderType === "manual_book" && <p className="text-xs text-gray-600">Books Rs. {order.bookTotal || 0} + Extra Rs. {order.extraCharge || 0}</p>}
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
          <thead className="bg-gray-50 text-gray-600"><tr><th className="p-3">Customer</th><th className="p-3">Books</th><th className="p-3">Amount</th><th className="p-3">Proof</th><th className="p-3">Status</th></tr></thead>
          <tbody>
            {orders.map((order) => (
              <tr className="border-t border-gray-100" key={order._id}>
                <td className="p-3 align-top"><CustomerDetails order={order} /></td>
                <td className="p-3">{order.items.map((item) => item.title).join(", ")}</td>
                <td className="p-3">
                  <strong>Rs. {order.amount}</strong>
                  {order.orderType === "manual_book" && <p className="mt-1 whitespace-nowrap text-xs text-gray-600">Rs. {order.bookTotal || 0} + Rs. {order.extraCharge || 0}</p>}
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
