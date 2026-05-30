import { MapPin, Minus, Plus, ReceiptIndianRupee, Search, ShieldCheck, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { BOOK_COVER_FALLBACK, useFallbackImage } from "../utils/imageFallback.js";
import { orderBookDiscount, orderBookListPrice, orderBookPrice } from "../utils/pricing.js";

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

function PhysicalPrice({ book }) {
  const discount = orderBookDiscount(book);
  return (
    <span className="mt-auto block pt-2">
      <span className="font-black text-orange-700">Rs. {money(orderBookPrice(book))}</span>
      {discount > 0 && (
        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-bold text-gray-400 line-through">Rs. {money(orderBookListPrice(book))}</span>
          <span className="rounded-full bg-green-100 px-1.5 py-0.5 font-black text-green-700">{discount}% OFF</span>
        </span>
      )}
    </span>
  );
}

export default function OrderBook() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [details, setDetails] = useState(initialDetails);
  const [bookQuery, setBookQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/books")
      .then(({ data }) => setBooks(data.books || []))
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
  const bookTotal = selectedBooks.reduce((total, book) => total + orderBookPrice(book) * (quantities[book._id] || 1), 0);

  function updateDetails(event) {
    setDetails({ ...details, [event.target.name]: event.target.value });
  }

  function toggleBook(bookOrId) {
    const book = typeof bookOrId === "string" ? books.find((item) => item._id === bookOrId) : bookOrId;
    if (!book) return;
    const id = book._id;
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

  async function submit(event) {
    event.preventDefault();
    if (!isAuthenticated) {
      navigate("/login?redirect=%2Forder-book");
      return;
    }
    if (!selectedBooks.length) {
      toast.error("Select at least one book");
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...details, items: JSON.stringify(selectedBooks.map((book) => ({ bookId: book._id, quantity: quantities[book._id] || 1 }))) };
      const { data } = await api.post("/payments/manual-book-order/draft", payload);
      navigate(`/order-book/payment/${data.order._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Order could not be submitted");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mobile-page store-page">
      <div className="mb-6 max-w-3xl">
        <span className="badge mb-3"><ShoppingBag size={14} /> Direct book order</span>
        <h1 className="text-2xl font-black sm:text-4xl">Order Book</h1>
        <p className="mt-2 leading-7 text-gray-600">Choose books for physical delivery and complete your address. Charges and payment options will appear on the next page.</p>
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
              <p className="rounded-xl bg-orange-50 p-5 text-center font-semibold text-gray-600">Loading books...</p>
            ) : visibleBooks.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibleBooks.map((book) => {
                  const selected = selectedIds.includes(book._id);
                  const quantity = quantities[book._id] || 1;
                  return (
                    <article className={`flex min-h-44 flex-col rounded-2xl border p-3 transition ${selected ? "border-[#d97706] bg-amber-50/70 ring-2 ring-[#d97706]/15" : "border-amber-100 bg-white hover:border-amber-300 hover:shadow-sm"}`} key={book._id}>
                      <button aria-pressed={selected} className="flex flex-1 gap-3 text-left" onClick={() => toggleBook(book)} type="button">
                        <img className="h-32 w-24 shrink-0 rounded-xl bg-orange-50 object-contain p-1" src={book.coverImage} onError={(event) => useFallbackImage(event, BOOK_COVER_FALLBACK)} alt={book.title} loading="lazy" />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className={`mb-2 w-fit rounded-full px-2 py-1 text-[11px] font-black ${selected ? "bg-[#d97706] text-white" : "bg-amber-50 text-amber-700"}`}>{selected ? "Selected" : "Select"}</span>
                          <strong className="line-clamp-3 text-sm leading-5">{book.title}</strong>
                          <span className="mt-1 line-clamp-1 text-xs font-semibold text-gray-500">{book.author}</span>
                          <PhysicalPrice book={book} />
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
                    <strong className="shrink-0">Rs. {money(orderBookPrice(book) * (quantities[book._id] || 1))}</strong>
                  </div>
                ))}
              </div>
            ) : <p className="mb-4 text-sm text-gray-500">No books selected yet.</p>}
            <div className="space-y-2 border-t border-orange-100 pt-3 text-sm">
              <div className="flex justify-between"><span>Book Total ({totalCopies} copies)</span><strong>Rs. {money(bookTotal)}</strong></div>
            </div>
          </section>

          <section className="panel p-4 sm:p-5">
            <p className="text-sm leading-6 text-gray-600">Delivery and payment charges will be shown before the final payment.</p>
            {!isAuthenticated && (
              <p className="mt-3 rounded-xl border border-orange-100 bg-orange-50 p-3 text-sm font-semibold text-orange-800">Please log in before continuing so your order appears in your dashboard.</p>
            )}
            <button className="btn-primary mt-4 w-full" disabled={submitting || !selectedBooks.length}>
              <ShieldCheck size={17} /> {submitting ? "Preparing..." : isAuthenticated ? "Submit and Pay" : "Login to Continue"}
            </button>
          </section>
        </aside>
      </form>
    </main>
  );
}
