import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/client.js";

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

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-gray-200 p-5"><h1 className="text-2xl font-black">Manage Orders</h1></div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600"><tr><th className="p-3">Customer</th><th className="p-3">Books</th><th className="p-3">Amount</th><th className="p-3">Proof</th><th className="p-3">Status</th></tr></thead>
          <tbody>
            {orders.map((order) => (
              <tr className="border-t border-gray-100" key={order._id}>
                <td className="p-3"><strong>{order.user?.name}</strong><p className="text-gray-600">{order.user?.email}</p></td>
                <td className="p-3">{order.items.map((item) => item.title).join(", ")}</td>
                <td className="p-3">Rs. {order.amount}</td>
                <td className="p-3">
                  {order.paymentProof ? (
                    <a className="font-bold text-orange-600" href={order.paymentProof} target="_blank" rel="noreferrer">View proof</a>
                  ) : (
                    <span className="text-gray-500">No proof</span>
                  )}
                  {order.paymentNote && <p className="mt-1 text-xs text-gray-600">{order.paymentNote}</p>}
                </td>
                <td className="p-3">
                  <select className="input min-w-32" value={order.status} onChange={(e) => setStatus(order._id, e.target.value)}>
                    <option value="pending">pending</option>
                    <option value="submitted">submitted</option>
                    <option value="success">success</option>
                    <option value="failed">failed</option>
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
