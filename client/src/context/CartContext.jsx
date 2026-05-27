import { createContext, useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "./AuthContext.jsx";
import { getStoredToken } from "../utils/authStorage.js";
import { isBookPdfAvailable, ownerUploadMessage } from "../utils/bookAvailability.js";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const [items, setItems] = useState(() => JSON.parse(sessionStorage.getItem("pbs_cart") || "[]"));

  useEffect(() => {
    localStorage.removeItem("pbs_cart");
    if (!loading && !isAuthenticated) persist([]);
  }, [isAuthenticated, loading]);

  function persist(next) {
    setItems(next);
    sessionStorage.setItem("pbs_cart", JSON.stringify(next));
  }

  function add(book) {
    if (!isBookPdfAvailable(book)) {
      toast.error(ownerUploadMessage);
      return false;
    }
    if (!isAuthenticated && !getStoredToken()) {
      toast.error("Please login first to add books");
      return false;
    }
    if (items.some((item) => item._id === book._id)) return toast("Already in cart");
    persist([...items, book]);
    toast.success("Added to cart");
    return true;
  }

  function buyNow(book) {
    if (!isBookPdfAvailable(book)) {
      toast.error(ownerUploadMessage);
      return false;
    }
    if (!isAuthenticated && !getStoredToken()) {
      toast.error("Please login first to buy PDF");
      return false;
    }
    persist([book]);
    return true;
  }

  function remove(id) {
    persist(items.filter((item) => item._id !== id));
  }

  function clear() {
    persist([]);
  }

  const total = items.filter((item) => isBookPdfAvailable(item)).reduce((sum, item) => sum + Number(item.price || 0), 0);
  const value = useMemo(() => ({ items, add, buyNow, remove, clear, total }), [items, total]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
