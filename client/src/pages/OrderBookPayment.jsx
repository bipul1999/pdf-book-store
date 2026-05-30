import { ArrowLeft, CheckCircle2, CreditCard, ReceiptIndianRupee, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/client.js";

function money(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

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

export default function OrderBookPayment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [settings, setSettings] = useState({});
  const [method, setMethod] = useState("razorpay");
  const [transactionId, setTransactionId] = useState("");
  const [proof, setProof] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/payments/manual-book-order/${id}/payment`)
      .then(({ data }) => {
        setOrder(data.order);
        setSettings(data.settings || {});
      })
      .catch((error) => {
        toast.error(error.response?.data?.message || "Book order could not be loaded");
        navigate("/order-book");
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const deliveryCharge = Number(settings.deliveryCharge || 0);
  const paymentCharge = Number(method === "razorpay" ? settings.razorpayPaymentExtraCharge : settings.manualPaymentExtraCharge) || 0;
  const finalAmount = Number(order?.bookTotal || 0) + deliveryCharge + paymentCharge;

  async function openRazorpayPayment(data) {
    const scriptReady = await loadRazorpayScript();
    if (!scriptReady) {
      toast.error("Razorpay could not load. Please choose Manual UPI.");
      return;
    }
    const razorpay = new window.Razorpay({
      key: data.razorpay.keyId,
      amount: data.razorpay.amount,
      currency: data.razorpay.currency,
      name: "Mahesh Bharti E-book Store",
      description: `${order.items.reduce((sum, item) => sum + (item.quantity || 1), 0)} book order`,
      order_id: data.razorpay.orderId,
      prefill: {
        name: order.customerDetails?.fullName || "",
        email: order.customerDetails?.email || "",
        contact: `+91${order.customerDetails?.mobileNumber || ""}`
      },
      theme: { color: "#d97706" },
      modal: { ondismiss: () => toast.error("Payment cancelled") },
      handler: async (response) => {
        try {
          await api.post("/payments/verify", { orderId: data.order._id, ...response });
          toast.success("Payment verified. Your book order is confirmed.");
          navigate("/dashboard/orders");
        } catch (error) {
          toast.error(error.response?.data?.message || "Payment verification failed");
        }
      }
    });
    razorpay.on("payment.failed", (response) => toast.error(response.error?.description || "Payment failed. Please try again."));
    razorpay.open();
  }

  async function submit(event) {
    event.preventDefault();
    if (method === "upi_manual" && !proof) return toast.error("Upload payment screenshot");
    setSubmitting(true);
    try {
      let payload;
      if (method === "upi_manual") {
        payload = new FormData();
        payload.append("paymentMethod", method);
        payload.append("transactionId", transactionId);
        payload.append("proof", proof);
      } else {
        payload = { paymentMethod: method };
      }
      const { data } = await api.post(`/payments/manual-book-order/${id}/payment`, payload);
      if (data.razorpay) return await openRazorpayPayment(data);
      toast.success(data.message);
      navigate("/dashboard/orders");
    } catch (error) {
      toast.error(error.response?.data?.message || "Payment could not be started");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <main className="store-page p-8 text-center">Loading payment details...</main>;
  if (!order) return null;

  return (
    <main className="mobile-page store-page mx-auto max-w-4xl">
      <Link className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-orange-700" to="/order-book"><ArrowLeft size={17} /> Back to book selection</Link>
      <section className="panel p-4 sm:p-6">
        <span className="badge mb-3"><ReceiptIndianRupee size={14} /> Final payment</span>
        <h1 className="text-2xl font-black sm:text-3xl">Complete your book order</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">Review all charges, choose a payment method and complete payment.</p>

        <div className="mt-5 grid gap-5 md:grid-cols-[1fr_330px]">
          <div>
            <h2 className="mb-3 font-black">Selected books</h2>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div className="flex justify-between gap-3 rounded-xl border border-orange-100 bg-orange-50/40 p-3 text-sm" key={item.book?._id || item.book}>
                  <span>{item.title} <strong>x {item.quantity || 1}</strong></span>
                  <strong>Rs. {money(item.price * (item.quantity || 1))}</strong>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-orange-100 p-3 text-sm leading-6 text-gray-600">
              <strong className="text-gray-800">Deliver to:</strong><br />
              {order.customerDetails?.fullName}, {order.customerDetails?.address}, {order.customerDetails?.city}, {order.customerDetails?.state} - {order.customerDetails?.pincode}
            </div>
          </div>

          <form className="space-y-4" onSubmit={submit}>
            <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-3 text-sm">
              <p className="mb-2 font-black text-[#a94707]">Final payment details</p>
              <p className="flex justify-between"><span>Book Total</span><strong>Rs. {money(order.bookTotal)}</strong></p>
              <p className="flex justify-between"><span>Delivery charge</span><strong>Rs. {money(deliveryCharge)}</strong></p>
              <p className="flex justify-between"><span>{method === "razorpay" ? "Razorpay" : "Manual UPI"} charge</span><strong>Rs. {money(paymentCharge)}</strong></p>
              <p className="mt-2 flex justify-between border-t border-dashed border-orange-200 pt-2 text-base font-black text-[#a94707]"><span>Final Amount</span><span>Rs. {money(finalAmount)}</span></p>
            </div>

            <div className="grid gap-2">
              <button type="button" className={`rounded-xl border p-3 text-left ${method === "razorpay" ? "border-[#d97706] bg-amber-50" : "border-amber-100"}`} onClick={() => setMethod("razorpay")}>
                <span className="flex items-center gap-2 font-black"><CreditCard size={17} /> Razorpay Online</span>
              </button>
              <button type="button" className={`rounded-xl border p-3 text-left ${method === "upi_manual" ? "border-[#d97706] bg-amber-50" : "border-amber-100"}`} onClick={() => setMethod("upi_manual")}>
                <span className="flex items-center gap-2 font-black"><Smartphone size={17} /> Manual UPI</span>
              </button>
            </div>

            {method === "upi_manual" && (
              <div className="space-y-3 rounded-xl border border-orange-100 p-3 text-sm">
                <p><strong>UPI ID:</strong> {settings.upiId || "Not configured"}</p>
                {settings.payeeName && <p>{settings.payeeName}</p>}
                {settings.qrImage && <img className="mx-auto h-40 w-40 rounded-xl object-contain" src={settings.qrImage} alt="UPI QR" />}
                {settings.instructions && <p className="text-gray-600">{settings.instructions}</p>}
                <input className="input" placeholder="Transaction ID" maxLength={120} value={transactionId} onChange={(event) => setTransactionId(event.target.value)} required />
                <label className="label">Payment Screenshot<input className="input mt-1" type="file" accept="image/*" onChange={(event) => setProof(event.target.files[0] || null)} required /></label>
              </div>
            )}

            <button className="btn-primary w-full" disabled={submitting || (method === "upi_manual" && !settings.upiId)}>
              <CheckCircle2 size={17} /> {submitting ? "Preparing..." : method === "razorpay" ? `Pay Rs. ${money(finalAmount)} Online` : "Submit Payment Proof"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
