import { Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";

export default function Cart() {
  const { items, remove, total } = useCart();
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <h1 className="mb-5 text-2xl font-black sm:text-3xl">Cart</h1>
      {items.length ? (
        <div className="grid gap-5 md:grid-cols-[1fr_280px]">
          <section className="space-y-3">{items.map((item) => <div className="panel grid grid-cols-[64px_1fr_auto] items-center gap-3 p-3 sm:grid-cols-[80px_1fr_auto] sm:gap-4" key={item._id}><img src={item.coverImage} className="h-24 w-16 rounded bg-orange-50 object-contain p-1 sm:w-20" /><div className="min-w-0"><h3 className="line-clamp-2 font-bold">{item.title}</h3><p className="text-sm text-gray-600">Rs. {item.price}</p></div><button className="btn-secondary !px-3" onClick={() => remove(item._id)}><Trash2 size={18} /></button></div>)}</section>
          <aside className="panel h-fit p-5"><p className="text-sm text-gray-600">Total</p><strong className="text-2xl sm:text-3xl">Rs. {total}</strong><Link className="btn-primary mt-4 w-full" to="/checkout">Checkout</Link></aside>
        </div>
      ) : (
        <p className="panel p-8 text-center">Your cart is empty.</p>
      )}
    </main>
  );
}
