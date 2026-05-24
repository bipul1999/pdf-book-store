import { CreditCard } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/client.js";

export default function PaymentSettings() {
  const [form, setForm] = useState({ upiId: "", payeeName: "", orderBookExtraCharge: "0", instructions: "" });
  const [qr, setQr] = useState(null);
  const [qrImage, setQrImage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/admin/payment-settings").then(({ data }) => {
      setForm({
        upiId: data.settings.upiId || "",
        payeeName: data.settings.payeeName || "",
        orderBookExtraCharge: data.settings.orderBookExtraCharge || 0,
        instructions: data.settings.instructions || ""
      });
      setQrImage(data.settings.qrImage || "");
    });
  }, []);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, value));
      if (qr) payload.append("qr", qr);
      const { data } = await api.put("/admin/payment-settings", payload);
      setQrImage(data.settings.qrImage || "");
      toast.success("Payment options updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update payment options");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel p-4 sm:p-5">
      <h1 className="mb-5 flex items-center gap-2 text-2xl font-black"><CreditCard className="text-orange-600" /> Payment Options</h1>
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <input className="input" placeholder="UPI ID" value={form.upiId} onChange={(e) => setForm({ ...form, upiId: e.target.value })} required />
        <input className="input" placeholder="Payee name" value={form.payeeName} onChange={(e) => setForm({ ...form, payeeName: e.target.value })} required />
        <label className="label md:col-span-2">Order Book extra charge / margin (Rs.)<input className="input mt-1" type="number" min="0" step="0.01" value={form.orderBookExtraCharge} onChange={(e) => setForm({ ...form, orderBookExtraCharge: e.target.value })} required /></label>
        <textarea className="input min-h-28 md:col-span-2" placeholder="Payment instructions" value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
        <label className="label">UPI QR image<input className="input mt-1" type="file" accept="image/*" onChange={(e) => setQr(e.target.files[0])} /></label>
        {qrImage && <img className="h-36 w-36 rounded border object-contain" src={qrImage} alt="Current UPI QR" />}
        <button className="btn-primary w-full md:col-span-2 md:w-auto md:justify-self-end" disabled={loading}>{loading ? "Saving..." : "Save payment options"}</button>
      </form>
    </section>
  );
}
