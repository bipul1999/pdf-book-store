import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminShell from "./components/AdminShell.jsx";
import Home from "./pages/Home.jsx";
import Books from "./pages/Books.jsx";
import BookDetails from "./pages/BookDetails.jsx";
import Cart from "./pages/Cart.jsx";
import Checkout from "./pages/Checkout.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import VerifyOtp from "./pages/VerifyOtp.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Library from "./pages/Library.jsx";
import PdfReader from "./pages/PdfReader.jsx";
import Orders from "./pages/Orders.jsx";
import AdminLogin from "./pages/admin/AdminLogin.jsx";
import AdminSignup from "./pages/admin/AdminSignup.jsx";
import AdminVerifyOtp from "./pages/admin/AdminVerifyOtp.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AddBook from "./pages/admin/AddBook.jsx";
import EditBook from "./pages/admin/EditBook.jsx";
import ManageBooks from "./pages/admin/ManageBooks.jsx";
import ManageOrders from "./pages/admin/ManageOrders.jsx";
import ManageUsers from "./pages/admin/ManageUsers.jsx";
import PaymentSettings from "./pages/admin/PaymentSettings.jsx";
import QuoteSettings from "./pages/admin/QuoteSettings.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/signup" element={<AdminSignup />} />
        <Route path="/admin/verify-otp" element={<AdminVerifyOtp />} />
        <Route path="/admin" element={<ProtectedRoute admin><AdminShell /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="books/new" element={<AddBook />} />
          <Route path="books/:id/edit" element={<EditBook />} />
          <Route path="books" element={<ManageBooks />} />
          <Route path="orders" element={<ManageOrders />} />
          <Route path="payment" element={<PaymentSettings />} />
          <Route path="quote" element={<QuoteSettings />} />
          <Route path="users" element={<ManageUsers />} />
        </Route>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/books" element={<Books />} />
          <Route path="/books/:id" element={<BookDetails />} />
          <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
          <Route path="/dashboard/library/:id/read" element={<ProtectedRoute><PdfReader /></ProtectedRoute>} />
          <Route path="/dashboard/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
