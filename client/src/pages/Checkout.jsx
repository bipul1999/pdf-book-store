import { ArrowLeft, CheckCircle2, CreditCard, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { isBookPdfAvailable, ownerUploadMessage } from "../utils/bookAvailability.js";
import BookPrice from "../components/BookPrice.jsx";

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve(true);
  const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
  if (existing) {
    return new Promise((resolve) => {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
    });
  }

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, total, clear } = useCart();
  const [method, setMethod] = useState("razorpay");
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState(null);
  const [proof, setProof] = useState(null);
  const [paymentNote, setPaymentNote] = useState("");
  const [settings, setSettings] = useState({ manualPaymentExtraCharge: 10, razorpayPaymentExtraCharge: 20 });
  const hasUnavailableItem = items.some((item) => !isBookPdfAvailable(item));
  const extraCharge = Number(method === "razorpay" ? settings.razorpayPaymentExtraCharge : settings.manualPaymentExtraCharge) || 0;
  const finalAmount = total + extraCharge;

  useEffect(() => {
    api.get("/payments/order-book-settings")
      .then(({ data }) => setSettings(data.settings || {}))
      .catch(() => {});
  }, []);

  function upiLink(upi) {
    if (!upi) return "#";
    return upi.paymentUri || "#";
  }

  async function startPayment() {
    if (hasUnavailableItem) {
      toast.error(ownerUploadMessage);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/payments/create-order", { bookIds: items.map((item) => item._id), paymentMethod: method });
      if (data.message) toast.error(data.message);
      if (!data.razorpay) {
        setPayment(data);
        toast.success("UPI payment details ready");
        return;
      }

      const scriptReady = await loadRazorpayScript();
      if (!scriptReady) {
        toast.error("Could not load Razorpay. Please use UPI payment.");
        return;
      }

      const rz = new window.Razorpay({
        key: data.razorpay.keyId,
        amount: data.razorpay.amount,
        currency: data.razorpay.currency,
        name: "Mahesh Bharti E-book Store",
        description: `${items.length} PDF book${items.length === 1 ? "" : "s"}`,
        order_id: data.razorpay.orderId,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: user?.phone ? `+91${String(user.phone).replace(/\D/g, "").slice(-10)}` : ""
        },
        theme: { color: "#d97706" },
        modal: {
          ondismiss: () => toast.error("Payment cancelled")
        },
        handler: async (response) => {
          try {
            await api.post("/payments/verify", { orderId: data.order._id, ...response });
            toast.success("Payment verified. Your PDF is ready to download.");
            clear();
            navigate("/dashboard/library");
          } catch (error) {
            toast.error(error.response?.data?.message || "Payment verification failed");
          }
        }
      });
      rz.on("payment.failed", (response) => {
        toast.error(response.error?.description || "Payment failed. Please try again.");
      });
      rz.open();
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
    <main className="store-page mx-auto max-w-4xl px-4 py-5 sm:py-9">
      <div className="mb-5">
        <span className="badge mb-3">Secure checkout</span>
        <h1 className="text-2xl font-black sm:text-3xl">Checkout</h1>
      </div>
      <div className="panel warm-summary p-4 sm:p-6">
        <div className="space-y-3">
          {items.map((item) => (
            <div className="grid grid-cols-[56px_1fr] gap-3 border-b border-orange-100/70 pb-3 last:border-0 sm:grid-cols-[56px_1fr_auto] sm:items-center" key={item._id}>
              <img className="h-20 w-14 rounded-xl bg-orange-50 object-contain p-1" src={item.coverImage} alt={item.title} decoding="async" loading="lazy" />
              <div className="min-w-0">
                <Link className="font-bold hover:text-orange-600" to={`/books/${item._id}`}>{item.title}</Link>
                <p className="text-sm text-gray-600">{item.author}</p>
                {!isBookPdfAvailable(item) && <p className="text-xs font-black text-orange-700">{ownerUploadMessage}</p>}
              </div>
              {isBookPdfAvailable(item) && <BookPrice book={item} compact className="col-start-2 sm:col-auto" />}
            </div>
          ))}
        </div>
        <p className="mt-5 text-sm font-bold text-gray-600">{hasUnavailableItem ? "Available PDF total" : `${items.length} books selected`}</p>
        <div className="mt-2 space-y-1 text-sm">
          <p className="flex justify-between gap-3"><span>PDF subtotal</span><strong>Rs. {total}</strong></p>
          <p className="flex justify-between gap-3"><span>{method === "razorpay" ? "Razorpay" : "Manual UPI"} charge</span><strong>Rs. {extraCharge}</strong></p>
          <p className="flex justify-between gap-3 border-t border-dashed border-orange-200 pt-2 text-lg font-black text-[#a94707]"><span>Final amount</span><span>Rs. {finalAmount}</span></p>
        </div>

        {!payment ? (
          <div className="mt-6 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" className={`rounded-2xl border p-4 text-left outline-none transition hover:border-amber-300 focus-visible:ring-2 focus-visible:ring-[#d97706]/30 ${method === "razorpay" ? "border-amber-400 bg-amber-50 shadow-sm" : "border-amber-100 bg-white"}`} onClick={() => setMethod("razorpay")}>
                <CreditCard className="mb-2 text-orange-600" />
                <strong>Razorpay online payment</strong>
                <p className="mt-1 text-sm text-gray-600">Auto verifies successful payments and unlocks PDFs.</p>
              </button>
              <button type="button" className={`rounded-2xl border p-4 text-left outline-none transition hover:border-amber-300 focus-visible:ring-2 focus-visible:ring-[#d97706]/30 ${method === "upi_manual" ? "border-amber-400 bg-amber-50 shadow-sm" : "border-amber-100 bg-white"}`} onClick={() => setMethod("upi_manual")}>
                <Smartphone className="mb-2 text-orange-600" />
                <strong>Manual UPI</strong>
                <p className="mt-1 text-sm text-gray-600">Pay by UPI and upload screenshot for admin review.</p>
              </button>
            </div>
            {hasUnavailableItem && <p className="rounded-xl bg-orange-50 p-3 text-sm font-bold text-orange-800">This cart contains a book that is not uploaded by owner.</p>}
            <button disabled={!items.length || loading || hasUnavailableItem} onClick={startPayment} className="btn-primary w-full">
              {loading ? "Preparing payment..." : hasUnavailableItem ? ownerUploadMessage : `Continue to pay Rs. ${finalAmount}`}
            </button>
          </div>
        ) : (
          <div className="warm-summary mt-6 rounded-2xl border border-amber-100 p-4 sm:p-5">
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
              {payment.upi.qrImage && <img className="mx-auto mt-3 h-56 w-56 rounded-2xl border border-orange-100 bg-white object-contain p-2 shadow-sm sm:mx-0" src={payment.upi.qrImage} alt="UPI QR code" />}
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
