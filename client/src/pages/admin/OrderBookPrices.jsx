import { BadgePercent, Save } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/client.js";
import { BOOK_COVER_FALLBACK, useFallbackImage } from "../../utils/imageFallback.js";
import { orderBookDiscount, orderBookListPrice, orderBookPrice } from "../../utils/pricing.js";

function initialDraft(book) {
  return {
    orderBookListPrice: String(orderBookListPrice(book)),
    orderBookPrice: String(orderBookPrice(book))
  };
}

export default function OrderBookPrices() {
  const [books, setBooks] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");

  useEffect(() => {
    api.get("/books")
      .then(({ data }) => {
        const nextBooks = data.books || [];
        setBooks(nextBooks);
        setDrafts(Object.fromEntries(nextBooks.map((book) => [book._id, initialDraft(book)])));
      })
      .catch(() => toast.error("Physical book prices could not be loaded"))
      .finally(() => setLoading(false));
  }, []);

  function updateDraft(id, field, value) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
  }

  async function save(book) {
    const draft = drafts[book._id];
    const orderBookListPrice = Number(draft.orderBookListPrice);
    const orderBookPrice = Number(draft.orderBookPrice);
    if (!Number.isFinite(orderBookListPrice) || !Number.isFinite(orderBookPrice) || orderBookListPrice < 0 || orderBookPrice < 0) {
      toast.error("Enter valid physical book prices");
      return;
    }
    if (orderBookListPrice < orderBookPrice) {
      toast.error("MRP cannot be lower than the sale price");
      return;
    }
    setSavingId(book._id);
    try {
      const { data } = await api.patch(`/books/${book._id}/order-book-price`, { orderBookListPrice, orderBookPrice });
      setBooks((current) => current.map((item) => item._id === book._id ? data.book : item));
      setDrafts((current) => ({ ...current, [book._id]: initialDraft(data.book) }));
      toast.success("Physical book offer updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update physical book price");
    } finally {
      setSavingId("");
    }
  }

  return (
    <section className="space-y-4">
      <div className="panel p-4 sm:p-5">
        <h1 className="flex items-center gap-2 text-2xl font-black"><BadgePercent className="text-orange-600" /> Order Book Prices</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">Physical books ka MRP aur sale price yahan set karein. Store par MRP cut mark aur offer percentage automatically dikhega.</p>
      </div>

      {loading ? (
        <section className="panel p-5">Loading...</section>
      ) : books.length ? (
        <div className="grid gap-4">
          {books.map((book) => {
            const draft = drafts[book._id] || initialDraft(book);
            const preview = { ...book, ...draft };
            const discount = orderBookDiscount(preview);
            return (
              <article className="panel grid gap-4 p-4 sm:grid-cols-[76px_1fr] lg:grid-cols-[76px_1fr_170px_170px_140px]" key={book._id}>
                <img className="h-24 w-[76px] rounded-xl bg-orange-50 object-contain p-1" src={book.coverImage} onError={(event) => useFallbackImage(event, BOOK_COVER_FALLBACK)} alt={book.title} />
                <div className="min-w-0 self-center">
                  <h2 className="font-black">{book.title}</h2>
                  <p className="mt-1 text-sm font-semibold text-gray-500">{book.author}</p>
                  <p className="mt-2 text-sm">
                    <strong className="text-orange-700">Rs. {Number(draft.orderBookPrice || 0).toLocaleString("en-IN")}</strong>
                    {discount > 0 && <><span className="ml-2 text-gray-400 line-through">Rs. {Number(draft.orderBookListPrice || 0).toLocaleString("en-IN")}</span><span className="ml-2 rounded-full bg-green-100 px-2 py-1 text-xs font-black text-green-700">{discount}% OFF</span></>}
                  </p>
                </div>
                <label className="label self-center">Physical MRP<input className="input mt-1" min="0" step="0.01" type="number" value={draft.orderBookListPrice} onChange={(event) => updateDraft(book._id, "orderBookListPrice", event.target.value)} /></label>
                <label className="label self-center">Sale Price<input className="input mt-1" min="0" step="0.01" type="number" value={draft.orderBookPrice} onChange={(event) => updateDraft(book._id, "orderBookPrice", event.target.value)} /></label>
                <button className="btn-primary self-center" disabled={savingId === book._id} onClick={() => save(book)}><Save size={16} /> {savingId === book._id ? "Saving..." : "Save Offer"}</button>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="panel p-5 text-gray-600">No books available.</section>
      )}
    </section>
  );
}
