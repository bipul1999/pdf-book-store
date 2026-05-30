import { Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { isBookPdfAvailable, ownerUploadMessage } from "../utils/bookAvailability.js";
import BookPrice from "../components/BookPrice.jsx";

export default function Cart() {
  const { items, remove, total } = useCart();
  const hasUnavailableItem = items.some((item) => !isBookPdfAvailable(item));
  return (
    <main className="store-page mx-auto w-full max-w-5xl px-4 py-5 sm:py-9">
      <h1 className="mb-4 text-2xl font-black sm:text-3xl">Cart</h1>
      {items.length ? (
        <div className="grid gap-5 md:grid-cols-[1fr_300px]">
          <section className="space-y-3">{items.map((item) => <div className="panel grid grid-cols-[72px_1fr_auto] items-center gap-3 p-3 sm:grid-cols-[80px_1fr_auto] sm:gap-4" key={item._id}><img src={item.coverImage} className="h-24 w-16 rounded-xl bg-orange-50 object-contain p-1 sm:w-20" alt={item.title} /><div className="min-w-0"><h3 className="line-clamp-2 font-black leading-snug">{item.title}</h3>{isBookPdfAvailable(item) ? <BookPrice book={item} compact className="mt-1" /> : <p className="mt-1 text-xs font-black text-orange-700">{ownerUploadMessage}</p>}</div><button className="btn-secondary !px-3" onClick={() => remove(item._id)} aria-label="Remove item"><Trash2 size={18} /></button></div>)}</section>
          <aside className="panel warm-summary h-fit p-5 md:sticky md:top-24"><p className="text-sm font-bold text-gray-600">{hasUnavailableItem ? "Available PDF total" : "Order total"}</p><strong className="price-text mt-1 block text-2xl sm:text-3xl">Rs. {total}</strong>{hasUnavailableItem ? <p className="mt-4 rounded-xl bg-orange-50 p-3 text-sm font-bold text-orange-800">Remove unavailable books before checkout.</p> : <Link className="btn-primary mt-4 w-full" to="/checkout">Checkout</Link>}</aside>
        </div>
      ) : (
        <div className="panel p-8 text-center"><p className="font-bold">Your cart is empty.</p><Link className="btn-primary mt-4" to="/books">Browse books</Link></div>
      )}
    </main>
  );
}
