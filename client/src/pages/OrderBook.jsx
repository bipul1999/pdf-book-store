import { CheckCircle2, CreditCard, MapPin, ReceiptIndianRupee, ShieldCheck, ShoppingBag } from "lucide-react";
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

function money(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

export default function OrderBook() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [settings, setSettings] = useState({ upiId: "", payeeName: "", qrImage: "", orderBookExtraCharge: 0, instructions: "" });
  const [details, setDetails] = useState(initialDetails);
  const [selectedIds, setSelectedIds] = useState([]);
  const [transactionId, setTransactionId] = useState("");
  const [proof, setProof] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

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
  const bookTotal = selectedBooks.reduce((total, book) => total + Number(book.price || 0), 0);
  const extraCharge = Number(settings.orderBookExtraCharge || 0);
  const finalAmount = bookTotal + extraCharge;

  function updateDetails(event) {
    setDetails({ ...details, [event.target.name]: event.target.value });
  }

  function toggleBook(id) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
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
    if (!proof) {
      toast.error("Upload payment screenshot");
      return;
    }
    setSubmitting(true);
    try {
      const payload = new FormData();
      Object.entries(details).forEach(([key, value]) => payload.append(key, value));
      payload.append("bookIds", JSON.stringify(selectedIds));
      payload.append("transactionId", transactionId);
      payload.append("proof", proof);
      const { data } = await api.post("/payments/manual-book-order", payload);
      setSuccess(true);
      toast.success(data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || "Order could not be submitted");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <main className="mobile-page flex min-h-[60vh] items-center justify-center">
        <section className="panel max-w-xl p-6 text-center sm:p-9">
          <CheckCircle2 className="mx-auto mb-4 text-green-600" size={52} />
          <h1 className="text-2xl font-black">Order submitted</h1>
          <p className="mt-3 leading-7 text-gray-600">Your order has been submitted successfully and is pending verification.</p>
          <div className="mt-6 grid gap-3 sm:flex sm:justify-center">
            <Link className="btn-primary" to="/dashboard/orders">View order history</Link>
            <Link className="btn-secondary" to="/books">Browse books</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mobile-page">
      <div className="mb-6 max-w-3xl">
        <span className="badge mb-3"><ShoppingBag size={14} /> Direct book order</span>
        <h1 className="text-2xl font-black sm:text-4xl">Order Book</h1>
        <p className="mt-2 leading-7 text-gray-600">Choose one or more books, complete your delivery details and submit UPI payment proof for admin verification.</p>
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
            <h2 className="mb-4 flex items-center gap-2 text-xl font-black"><ShoppingBag className="text-orange-700" size={20} /> Select books</h2>
            {loading ? (
              <p className="rounded-xl bg-orange-50 p-5 text-center font-semibold text-gray-600">Loading available books...</p>
            ) : books.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {books.map((book) => {
                  const selected = selectedIds.includes(book._id);
                  return (
                    <label className={`flex cursor-pointer gap-3 rounded-2xl border p-3 transition ${selected ? "border-[#0f5b55] bg-teal-50/60 ring-1 ring-[#0f5b55]/20" : "border-orange-100 bg-white hover:border-orange-300"}`} key={book._id}>
                      <input className="mt-1 h-4 w-4 accent-[#0f5b55]" type="checkbox" checked={selected} onChange={() => toggleBook(book._id)} />
                      <img className="h-20 w-14 shrink-0 rounded-lg bg-orange-50 object-contain" src={book.coverImage} onError={(event) => useFallbackImage(event, BOOK_COVER_FALLBACK)} alt="" />
                      <span className="min-w-0">
                        <strong className="line-clamp-2 text-sm">{book.title}</strong>
                        <span className="mt-2 block font-black text-orange-700">Rs. {money(book.price)}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl bg-orange-50 p-5 text-center text-gray-600">No books are available right now.</p>
            )}
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:h-fit">
          <section className="panel p-4 sm:p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black"><ReceiptIndianRupee className="text-orange-700" size={20} /> Order summary</h2>
            {selectedBooks.length ? (
              <div className="mb-4 space-y-2">
                {selectedBooks.map((book) => (
                  <div className="flex justify-between gap-3 text-sm" key={book._id}>
                    <span className="line-clamp-2 text-gray-600">{book.title}</span>
                    <strong className="shrink-0">Rs. {money(book.price)}</strong>
                  </div>
                ))}
              </div>
            ) : <p className="mb-4 text-sm text-gray-500">No books selected yet.</p>}
            <div className="space-y-2 border-t border-orange-100 pt-3 text-sm">
              <div className="flex justify-between"><span>Book Total</span><strong>Rs. {money(bookTotal)}</strong></div>
              <div className="flex justify-between"><span>Extra Charge</span><strong>Rs. {money(extraCharge)}</strong></div>
              <div className="flex justify-between border-t border-dashed border-orange-200 pt-3 text-lg font-black text-[#a94707]"><span>Final Amount</span><span>Rs. {money(finalAmount)}</span></div>
            </div>
          </section>

          <section className="panel p-4 sm:p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-black"><CreditCard className="text-orange-700" size={20} /> Payment proof</h2>
            <div className="rounded-xl border border-orange-100 bg-[#fffaf5] p-3 text-sm">
              <p className="font-semibold text-gray-600">UPI ID</p>
              <p className="break-all font-black text-[#073b3a]">{settings.upiId || "Not configured"}</p>
              {settings.payeeName && <p className="mt-1 text-gray-600">{settings.payeeName}</p>}
              {settings.qrImage && <img className="mx-auto mt-3 h-44 w-44 rounded-xl bg-white object-contain p-2 shadow-sm" src={settings.qrImage} alt="UPI payment QR" />}
              {settings.instructions && <p className="mt-3 leading-6 text-gray-600">{settings.instructions}</p>}
            </div>
            <div className="mt-4 space-y-3">
              <label className="label">Transaction ID<input className="input mt-1" maxLength={120} value={transactionId} onChange={(event) => setTransactionId(event.target.value)} required /></label>
              <label className="label">Payment Screenshot<input className="input mt-1" type="file" accept="image/*" onChange={(event) => setProof(event.target.files[0] || null)} required /></label>
            </div>
            {!isAuthenticated && (
              <p className="mt-4 rounded-xl border border-orange-100 bg-orange-50 p-3 text-sm font-semibold text-orange-800">Please log in before submitting so your order appears in your dashboard.</p>
            )}
            <button className="btn-primary mt-4 w-full" disabled={submitting || !books.length || !settings.upiId}>
              <ShieldCheck size={17} /> {submitting ? "Submitting..." : isAuthenticated ? "Submit Order" : "Login to Submit"}
            </button>
          </section>
        </aside>
      </form>
    </main>
  );
}
