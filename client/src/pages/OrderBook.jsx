import { CheckCircle2, CreditCard, MapPin, Minus, Plus, ReceiptIndianRupee, Search, ShieldCheck, ShoppingBag, Smartphone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { BOOK_COVER_FALLBACK, useFallbackImage } from "../utils/imageFallback.js";

const initialDetails = {
  fullName: "",
  mobileNumber: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pincode: ""
};
const MAX_BOOK_QUANTITY = 20;

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

export default function OrderBook() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [settings, setSettings] = useState({ upiId: "", payeeName: "", qrImage: "", orderBookExtraCharge: 0, instructions: "" });
  const [details, setDetails] = useState(initialDetails);
  const [bookQuery, setBookQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [transactionId, setTransactionId] = useState("");
  const [proof, setProof] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    Promise.all([api.get("/books"), api.get("/payments/order-book-settings")])
      .then(([booksResponse, settingsResponse]) => {
        setBooks(booksResponse.data.books || []);
        setSettings(settingsResponse.data.settings || {});
      })
      .catch(() => toast.error("Order details could not be loaded. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    setDetails((value) => ({
      ...value,
      fullName: value.fullName || user.name || "",
      mobileNumber: value.mobileNumber || user.phone || "",
      email: value.email || user.email || ""
    }));
  }, [user]);

  const selectedBooks = useMemo(() => books.filter((book) => selectedIds.includes(book._id)), [books, selectedIds]);
  const visibleBooks = useMemo(() => {
    const query = bookQuery.trim().toLowerCase();
    return query
      ? books.filter((book) => `${book.title} ${book.author}`.toLowerCase().includes(query))
      : books;
  }, [bookQuery, books]);
  const totalCopies = selectedBooks.reduce((total, book) => total + (quantities[book._id] || 1), 0);
  const bookTotal = selectedBooks.reduce((total, book) => total + Number(book.price || 0) * (quantities[book._id] || 1), 0);
  const extraCharge = Number(settings.orderBookExtraCharge || 0);
  const finalAmount = bookTotal + extraCharge;

  function updateDetails(event) {
    setDetails({ ...details, [event.target.name]: event.target.value });
  }

  function toggleBook(id) {
    const selected = selectedIds.includes(id);
    setSelectedIds((current) => selected ? current.filter((item) => item !== id) : [...current, id]);
    setQuantities((current) => {
      const next = { ...current };
      if (selected) delete next[id];
      else next[id] = 1;
      return next;
    });
  }

  function changeQuantity(id, change) {
    const nextQuantity = (quantities[id] || 1) + change;
    if (nextQuantity < 1) {
      toggleBook(id);
      return;
    }
    setQuantities((current) => ({ ...current, [id]: Math.min(MAX_BOOK_QUANTITY, nextQuantity) }));
  }

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
      description: `${totalCopies} book order`,
      order_id: data.razorpay.orderId,
      prefill: {
        name: details.fullName,
        email: details.email,
        contact: `+91${details.mobileNumber}`
      },
      theme: { color: "#d97706" },
      modal: { ondismiss: () => toast.error("Payment cancelled") },
      handler: async (response) => {
        try {
          await api.post("/payments/verify", { orderId: data.order._id, ...response });
          setSuccess("confirmed");
          toast.success("Payment verified. Your book order is confirmed.");
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
    if (!isAuthenticated) {
      navigate("/login?redirect=%2Forder-book");
      return;
    }
    if (!selectedIds.length) {
      toast.error("Select at least one book");
      return;
    }
    if (paymentMethod === "upi_manual" && !proof) {
      toast.error("Upload payment screenshot");
      return;
    }
    setSubmitting(true);
    try {
      let payload;
      if (paymentMethod === "upi_manual") {
        payload = new FormData();
        Object.entries(details).forEach(([key, value]) => payload.append(key, value));
        payload.append("items", JSON.stringify(selectedBooks.map((book) => ({ bookId: book._id, quantity: quantities[book._id] || 1 }))));
        payload.append("paymentMethod", paymentMethod);
        payload.append("transactionId", transactionId);
        payload.append("proof", proof);
      } else {
        payload = { ...details, items: JSON.stringify(selectedBooks.map((book) => ({ bookId: book._id, quantity: quantities[book._id] || 1 }))), paymentMethod };
      }
      const { data } = await api.post("/payments/manual-book-order", payload);
      if (data.razorpay) {
        await openRazorpayPayment(data);
      } else {
        setSuccess("pending");
        toast.success(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Order could not be submitted");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <main className="mobile-page store-page flex min-h-[60vh] items-center justify-center">
        <section className="panel max-w-xl p-6 text-center sm:p-9">
          <CheckCircle2 className="mx-auto mb-4 text-green-600" size={52} />
          <h1 className="text-2xl font-black">Order submitted</h1>
          <p className="mt-3 leading-7 text-gray-600">
            {success === "confirmed"
              ? "Payment verified successfully. Your book order is confirmed."
              : "Your order has been submitted successfully and is pending verification."}
          </p>
          <div className="mt-6 grid gap-3 sm:flex sm:justify-center">
            <Link className="btn-primary" to="/dashboard/orders">View order history</Link>
            <Link className="btn-secondary" to="/books">Browse books</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mobile-page store-page">
      <div className="mb-6 max-w-3xl">
        <span className="badge mb-3"><ShoppingBag size={14} /> Direct book order</span>
        <h1 className="text-2xl font-black sm:text-4xl">Order Book</h1>
        <p className="mt-2 leading-7 text-gray-600">Choose one or more books, complete your delivery details and pay securely by Razorpay or Manual UPI.</p>
      </div>

      <form className="grid gap-5 lg:grid-cols-[1fr_360px]" onSubmit={submit}>
        <div className="space-y-5">
          <section className="panel p-4 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-black"><MapPin className="text-orange-700" size={20} /> Delivery details</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="label">Full Name<input className="input mt-1" maxLength={120} name="fullName" value={details.fullName} onChange={updateDetails} required /></label>
              <label className="label">Mobile Number<input className="input mt-1" inputMode="numeric" maxLength={10} name="mobileNumber" value={details.mobileNumber} onChange={updateDetails} required /></label>
              <label className="label sm:col-span-2">Email<input className="input mt-1" type="email" maxLength={180} name="email" value={details.email} onChange={updateDetails} required /></label>
              <label className="label sm:col-span-2">Address<textarea className="input mt-1 min-h-24" maxLength={500} name="address" value={details.address} onChange={updateDetails} required /></label>
              <label className="label">City<input className="input mt-1" maxLength={100} name="city" value={details.city} onChange={updateDetails} required /></label>
              <label className="label">State<input className="input mt-1" maxLength={100} name="state" value={details.state} onChange={updateDetails} required /></label>
              <label className="label">Pincode<input className="input mt-1" inputMode="numeric" maxLength={6} name="pincode" value={details.pincode} onChange={updateDetails} required /></label>
            </div>
          </section>

          <section className="panel p-4 sm:p-6">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-black"><ShoppingBag className="text-orange-700" size={20} /> Select books</h2>
                <p className="mt-1 text-sm text-gray-600">Cover aur naam dekhkar book select karein, phir copies set karein.</p>
              </div>
              <label className="relative block sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input className="input !pl-9" placeholder="Search book" value={bookQuery} onChange={(event) => setBookQuery(event.target.value)} />
              </label>
            </div>
            {loading ? (
              <p className="rounded-xl bg-orange-50 p-5 text-center font-semibold text-gray-600">Loading available books...</p>
            ) : visibleBooks.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibleBooks.map((book) => {
                  const selected = selectedIds.includes(book._id);
                  const quantity = quantities[book._id] || 1;
                  return (
                    <article className={`flex min-h-44 flex-col rounded-2xl border p-3 transition ${selected ? "border-[#d97706] bg-amber-50/70 ring-2 ring-[#d97706]/15" : "border-amber-100 bg-white hover:border-amber-300 hover:shadow-sm"}`} key={book._id}>
                      <button aria-pressed={selected} className="flex flex-1 gap-3 text-left" onClick={() => toggleBook(book._id)} type="button">
                        <img className="h-32 w-24 shrink-0 rounded-xl bg-orange-50 object-contain p-1" src={book.coverImage} onError={(event) => useFallbackImage(event, BOOK_COVER_FALLBACK)} alt={book.title} loading="lazy" />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className={`mb-2 w-fit rounded-full px-2 py-1 text-[11px] font-black ${selected ? "bg-[#d97706] text-white" : "bg-amber-50 text-amber-700"}`}>{selected ? "Selected" : "Select"}</span>
                          <strong className="line-clamp-3 text-sm leading-5">{book.title}</strong>
                          <span className="mt-1 line-clamp-1 text-xs font-semibold text-gray-500">{book.author}</span>
                          <span className="mt-auto block pt-2 font-black text-orange-700">Rs. {money(book.price)}</span>
                        </span>
                      </button>
                      {selected && (
                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-amber-100 pt-3">
                          <span className="text-xs font-bold text-gray-600">Copies</span>
                          <div className="flex items-center rounded-lg border border-amber-200 bg-white p-1" aria-label={`Quantity for ${book.title}`}>
                            <button className="grid h-8 w-8 place-items-center rounded-md text-[#d97706] transition hover:bg-amber-50" onClick={() => changeQuantity(book._id, -1)} type="button" aria-label="Decrease quantity"><Minus size={15} /></button>
                            <span className="min-w-9 text-center text-sm font-black">{quantity}</span>
                            <button className="grid h-8 w-8 place-items-center rounded-md text-[#d97706] transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40" disabled={quantity >= MAX_BOOK_QUANTITY} onClick={() => changeQuantity(book._id, 1)} type="button" aria-label="Increase quantity"><Plus size={15} /></button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl bg-orange-50 p-5 text-center text-gray-600">{books.length ? "No matching book found." : "No books are available right now."}</p>
            )}
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:h-fit">
          <section className="panel warm-summary p-4 sm:p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black"><ReceiptIndianRupee className="text-orange-700" size={20} /> Order summary</h2>
            {selectedBooks.length ? (
              <div className="mb-4 space-y-2">
                {selectedBooks.map((book) => (
                  <div className="flex justify-between gap-3 text-sm" key={book._id}>
                    <span className="line-clamp-2 text-gray-600">{book.title} <strong className="text-gray-800">x {quantities[book._id] || 1}</strong></span>
                    <strong className="shrink-0">Rs. {money(Number(book.price || 0) * (quantities[book._id] || 1))}</strong>
                  </div>
                ))}
              </div>
            ) : <p className="mb-4 text-sm text-gray-500">No books selected yet.</p>}
            <div className="space-y-2 border-t border-orange-100 pt-3 text-sm">
              <div className="flex justify-between"><span>Book Total ({totalCopies} copies)</span><strong>Rs. {money(bookTotal)}</strong></div>
              <div className="flex justify-between"><span>Extra Charge</span><strong>Rs. {money(extraCharge)}</strong></div>
              <div className="flex justify-between border-t border-dashed border-orange-200 pt-3 text-lg font-black text-[#a94707]"><span>Final Amount</span><span>Rs. {money(finalAmount)}</span></div>
            </div>
          </section>

          <section className="panel p-4 sm:p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-black"><CreditCard className="text-orange-700" size={20} /> Payment method</h2>
            <div className="grid gap-2">
              <button type="button" className={`rounded-xl border p-3 text-left transition ${paymentMethod === "razorpay" ? "border-[#d97706] bg-amber-50/70 ring-1 ring-[#d97706]/20" : "border-amber-100 bg-white"}`} onClick={() => setPaymentMethod("razorpay")}>
                <span className="flex items-center gap-2 font-black"><CreditCard size={17} className="text-orange-700" /> Razorpay Online Payment</span>
                <span className="mt-1 block text-xs leading-5 text-gray-600">Pay securely online and confirm your order instantly.</span>
              </button>
              <button type="button" className={`rounded-xl border p-3 text-left transition ${paymentMethod === "upi_manual" ? "border-[#d97706] bg-amber-50/70 ring-1 ring-[#d97706]/20" : "border-amber-100 bg-white"}`} onClick={() => setPaymentMethod("upi_manual")}>
                <span className="flex items-center gap-2 font-black"><Smartphone size={17} className="text-orange-700" /> Manual UPI</span>
                <span className="mt-1 block text-xs leading-5 text-gray-600">Pay by UPI and upload screenshot for verification.</span>
              </button>
            </div>
            {paymentMethod === "upi_manual" && (
              <>
                <div className="mt-4 rounded-xl border border-orange-100 bg-[#fffaf5] p-3 text-sm">
                  <p className="font-semibold text-gray-600">UPI ID</p>
                  <p className="break-all font-black text-[#b45309]">{settings.upiId || "Not configured"}</p>
                  {settings.payeeName && <p className="mt-1 text-gray-600">{settings.payeeName}</p>}
                  {settings.qrImage && <img className="mx-auto mt-3 h-44 w-44 rounded-xl bg-white object-contain p-2 shadow-sm" src={settings.qrImage} alt="UPI payment QR" />}
                  {settings.instructions && <p className="mt-3 leading-6 text-gray-600">{settings.instructions}</p>}
                </div>
                <div className="mt-4 space-y-3">
                  <label className="label">Transaction ID<input className="input mt-1" maxLength={120} value={transactionId} onChange={(event) => setTransactionId(event.target.value)} required /></label>
                  <label className="label">Payment Screenshot<input className="input mt-1" type="file" accept="image/*" onChange={(event) => setProof(event.target.files[0] || null)} required /></label>
                </div>
              </>
            )}
            {paymentMethod === "razorpay" && <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-sm leading-6 text-gray-700">Razorpay checkout opens after you submit. Successful payment changes this order to <strong>Confirmed</strong>.</p>}
            {!isAuthenticated && (
              <p className="mt-4 rounded-xl border border-orange-100 bg-orange-50 p-3 text-sm font-semibold text-orange-800">Please log in before submitting so your order appears in your dashboard.</p>
            )}
            <button className="btn-primary mt-4 w-full" disabled={submitting || !selectedIds.length || (paymentMethod === "upi_manual" && !settings.upiId)}>
              <ShieldCheck size={17} /> {submitting ? "Preparing..." : isAuthenticated ? paymentMethod === "razorpay" ? `Pay Rs. ${money(finalAmount)} Online` : "Submit Manual Order" : "Login to Submit"}
            </button>
          </section>
        </aside>
      </form>
    </main>
  );
}
