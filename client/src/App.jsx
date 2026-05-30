import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

const AdminShell = lazy(() => import("./components/AdminShell.jsx"));
const Home = lazy(() => import("./pages/Home.jsx"));
const Books = lazy(() => import("./pages/Books.jsx"));
const BookDetails = lazy(() => import("./pages/BookDetails.jsx"));
const Cart = lazy(() => import("./pages/Cart.jsx"));
const Checkout = lazy(() => import("./pages/Checkout.jsx"));
const OrderBook = lazy(() => import("./pages/OrderBook.jsx"));
const OrderBookPayment = lazy(() => import("./pages/OrderBookPayment.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Signup = lazy(() => import("./pages/Signup.jsx"));
const VerifyOtp = lazy(() => import("./pages/VerifyOtp.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Library = lazy(() => import("./pages/Library.jsx"));
const PdfReader = lazy(() => import("./pages/PdfReader.jsx"));
const Orders = lazy(() => import("./pages/Orders.jsx"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin.jsx"));
const AdminVerifyOtp = lazy(() => import("./pages/admin/AdminVerifyOtp.jsx"));
const AdminForgotPassword = lazy(() => import("./pages/admin/AdminForgotPassword.jsx"));
const AdminResetPassword = lazy(() => import("./pages/admin/AdminResetPassword.jsx"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.jsx"));
const AddBook = lazy(() => import("./pages/admin/AddBook.jsx"));
const EditBook = lazy(() => import("./pages/admin/EditBook.jsx"));
const ManageBooks = lazy(() => import("./pages/admin/ManageBooks.jsx"));
const ManageOrders = lazy(() => import("./pages/admin/ManageOrders.jsx"));
const ManageUsers = lazy(() => import("./pages/admin/ManageUsers.jsx"));
const PaymentSettings = lazy(() => import("./pages/admin/PaymentSettings.jsx"));
const QuoteSettings = lazy(() => import("./pages/admin/QuoteSettings.jsx"));
const SupportTickets = lazy(() => import("./pages/admin/SupportTickets.jsx"));

function PageLoader() {
  return <main className="mx-auto flex min-h-[45vh] max-w-7xl items-center justify-center px-4 py-8 text-center text-sm font-semibold text-gray-600"><span className="panel px-5 py-3">Loading...</span></main>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/signup" element={<Navigate to="/admin/login" replace />} />
          <Route path="/admin/verify-otp" element={<AdminVerifyOtp />} />
          <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />
          <Route path="/admin/reset-password" element={<AdminResetPassword />} />
          <Route path="/admin" element={<ProtectedRoute admin><AdminShell /></ProtectedRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="books/new" element={<AddBook />} />
            <Route path="books/:id/edit" element={<EditBook />} />
            <Route path="books" element={<ManageBooks />} />
            <Route path="orders" element={<ManageOrders />} />
            <Route path="payment" element={<PaymentSettings />} />
            <Route path="quote" element={<QuoteSettings />} />
            <Route path="support" element={<SupportTickets />} />
            <Route path="users" element={<ManageUsers />} />
          </Route>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/books" element={<Books />} />
            <Route path="/books/:id" element={<BookDetails />} />
            <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
            <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="/order-book" element={<OrderBook />} />
            <Route path="/order-book/payment/:id" element={<ProtectedRoute><OrderBookPayment /></ProtectedRoute>} />
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
      </Suspense>
    </BrowserRouter>
  );
}
