import { ArrowLeft, CheckCircle2, CreditCard, Smartphone } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client.js";
import { useCart } from "../context/CartContext.jsx";

export default function Checkout() {
  const navigate = useNavigate();
  const { items, total, clear } = useCart();
  const [method, setMethod] = useState("razorpay");
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState(null);
  const [proof, setProof] = useState(null);
  const [paymentNote, setPaymentNote] = useState("");

  function upiLink(upi) {
    if (!upi) return "#";
    return upi.paymentUri || "#";
  }

  async function startPayment() {
    setLoading(true);
    try {
      const { data } = await api.post("/payments/create-order", { bookIds: items.map((item) => item._id), paymentMethod: method });
      if (!data.razorpay) {
        setPayment(data);
        toast.success("UPI payment details ready");
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      document.body.appendChild(script);
      script.onload = () => {
        const rz = new window.Razorpay({
          key: data.razorpay.keyId,
          amount: data.razorpay.amount,
          currency: data.razorpay.currency,
          name: "महेश भारती ई-बुक स्टोर",
          order_id: data.razorpay.orderId,
          handler: async (response) => {
            await api.post("/payments/verify", { orderId: data.order._id, ...response });
            toast.success("Payment verified. Your PDF is ready to download.");
            clear();
            navigate("/dashboard/library");
          }
        });
        rz.open();
      };
      script.onerror = () => toast.error("Could not load Razorpay. Please use UPI payment.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Payment could not start");
    } finally {
      setLoading(false);
    }
  }

  async function confirmUpiPayment() {
    if (!payment?.order?._id) return;
    if (!proof) {
      toast.error("Upload payment screenshot first");
      return;
    }
    setLoading(true);
    try {
      const payload = new FormData();
      payload.append("orderId", payment.order._id);
      payload.append("paymentNote", paymentNote);
      payload.append("proof", proof);
      await api.post("/payments/confirm-manual", payload);
      toast.success("Payment proof submitted for review.");
      clear();
      navigate("/dashboard/orders");
    } catch (error) {
      toast.error(error.response?.data?.message || "Payment proof could not be submitted");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <h1 className="mb-5 text-2xl font-black sm:text-3xl">Checkout</h1>
      <div className="panel p-4 sm:p-5">
        <div className="space-y-3">
          {items.map((item) => (
            <div className="grid grid-cols-[56px_1fr] gap-3 border-b border-gray-100 pb-3 last:border-0 sm:grid-cols-[56px_1fr_auto] sm:items-center" key={item._id}>
              <img className="h-20 w-14 rounded bg-orange-50 object-contain p-1" src={item.coverImage} alt={item.title} />
              <div className="min-w-0">
                <Link className="font-bold hover:text-orange-600" to={`/books/${item._id}`}>{item.title}</Link>
                <p className="text-sm text-gray-600">{item.author}</p>
              </div>
              <strong className="col-start-2 sm:col-auto">Rs. {item.price}</strong>
            </div>
          ))}
        </div>
        <p className="mt-4">{items.length} books selected</p>
        <strong className="mt-2 block text-3xl">Rs. {total}</strong>

        {!payment ? (
          <div className="mt-6 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" className={`rounded-lg border p-4 text-left ${method === "upi_manual" ? "border-orange-500 bg-orange-50" : "border-gray-200"}`} onClick={() => setMethod("upi_manual")}>
                <Smartphone className="mb-2 text-orange-600" />
                <strong>Manual UPI</strong>
                <p className="mt-1 text-sm text-gray-600">Fallback option. Admin review is required.</p>
              </button>
              <button type="button" className={`rounded-lg border p-4 text-left ${method === "razorpay" ? "border-orange-500 bg-orange-50" : "border-gray-200"}`} onClick={() => setMethod("razorpay")}>
                <CreditCard className="mb-2 text-orange-500" />
                <strong>Auto UPI QR / Online payment</strong>
                <p className="mt-1 text-sm text-gray-600">Auto verifies successful payments and unlocks PDFs.</p>
              </button>
            </div>
            <button disabled={!items.length || loading} onClick={startPayment} className="btn-primary w-full">
              {loading ? "Preparing payment..." : "Continue to payment"}
            </button>
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-gray-200 p-4">
            <div className="mb-3 flex items-center gap-2">
              <button
                className="btn-secondary !px-3"
                onClick={() => {
                  setPayment(null);
                  setProof(null);
                  setPaymentNote("");
                }}
                title="Back to payment methods"
                type="button"
              >
                <ArrowLeft size={18} />
              </button>
              <CheckCircle2 className="text-orange-600" />
              <h2 className="text-xl font-black">UPI Payment</h2>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>UPI ID:</strong> {payment.upi.id}</p>
              <p><strong>Name:</strong> {payment.upi.payee}</p>
              <p><strong>Amount:</strong> Rs. {payment.upi.amount}</p>
              <p><strong>Note:</strong> {payment.upi.note}</p>
              {payment.upi.qrImage && <img className="mx-auto mt-3 h-56 w-56 rounded border bg-white object-contain p-2 sm:mx-0" src={payment.upi.qrImage} alt="UPI QR code" />}
              <p className="font-semibold text-gray-700">Scan this QR. It already contains this order amount.</p>
              <p className="text-gray-600">{payment.upi.instructions}</p>
            </div>
            <div className="mt-4 space-y-3">
              <label className="label">Payment screenshot
                <input className="input mt-1" type="file" accept="image/*" onChange={(e) => setProof(e.target.files[0])} required />
              </label>
              <input className="input" placeholder="Transaction ID or note" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} />
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <a className="btn-secondary w-full sm:w-auto" href={upiLink(payment.upi)}>Open UPI app</a>
              <button className="btn-primary w-full sm:w-auto" disabled={loading} onClick={confirmUpiPayment}>
                {loading ? "Submitting..." : "Submit payment proof"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
