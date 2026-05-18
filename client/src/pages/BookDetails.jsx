import { CreditCard, Download, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { getStoredToken } from "../utils/authStorage.js";

export default function BookDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { add, buyNow } = useCart();
  const [book, setBook] = useState(null);
  useEffect(() => { api.get(`/books/${id}`).then(({ data }) => setBook(data.book)); }, [id]);
  function hasLogin() {
    return isAuthenticated || Boolean(getStoredToken());
  }

  function goToCheckout() {
    if (!hasLogin()) {
      toast.error("Login first to purchase this PDF");
      navigate(`/login?redirect=${encodeURIComponent(`/books/${id}`)}`);
      return;
    }
    buyNow(book);
    navigate("/checkout");
  }

  function addToCart() {
    if (!hasLogin()) {
      toast.error("Login first to add this book");
      navigate(`/login?redirect=${encodeURIComponent(`/books/${id}`)}`);
      return;
    }
    add(book);
  }
  if (!book) return <main className="p-8">Loading...</main>;
  return (
    <main className="mx-auto grid max-w-6xl gap-5 px-3 py-5 sm:px-4 sm:py-10 md:grid-cols-[320px_1fr] lg:grid-cols-[360px_1fr]">
      <img src={book.coverImage} className="max-h-[520px] w-full rounded-lg bg-orange-50 object-contain p-3 shadow-soft" alt={book.title} />
      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-black leading-tight sm:text-4xl">{book.title}</h1>
          <p className="mt-1 text-sm font-semibold text-gray-600 sm:text-base">By {book.author}</p>
        </div>
        <p className="text-[15px] leading-7 text-gray-700 sm:text-base">{book.description}</p>
        <div className="panel bg-paper p-5">
          <p className="text-sm font-semibold text-gray-600">PDF price</p>
          <strong className="mt-1 block text-2xl sm:text-3xl">Rs. {book.price}</strong>
          <div className="mt-4 grid gap-3 sm:flex sm:flex-wrap">
            <button className="btn-primary w-full sm:w-auto" onClick={goToCheckout}><CreditCard size={18} /> Buy and pay</button>
            <button className="btn-secondary w-full sm:w-auto" onClick={addToCart}><ShoppingCart size={18} /> Add to cart</button>
            <Link className="btn-secondary w-full sm:w-auto" to="/dashboard/library"><Download size={18} /> Read purchased books</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
