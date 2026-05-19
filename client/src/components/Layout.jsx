import { BookOpen, Facebook, Home, Instagram, LayoutDashboard, Library, Linkedin, LogOut, Mail, Menu, MessageCircle, Phone, ShoppingCart, Sparkles, User, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import saraswatiLogo from "../assets/saraswati-logo.png";
import ChatWidget from "./ChatWidget.jsx";

const contactEmail = "maheshbharti851127@gmail.com";
const contactPhone = "8877941491";
const storeName = "महेश भारती ई-बुक स्टोर";
const storeDescription = "प्रसिद्ध लेखक महेश भारती जी की लिखी सभी किताबों का एकमात्र डिजिटल स्टोर। यहाँ आपको इतिहास, पर्यावरण और साहित्य से जुड़ी उनकी सभी पुस्तकें सीधे PDF और ई-बुक के रूप में मिलेंगी, जिन्हें आप आसानी से डाउनलोड करके कहीं भी पढ़ सकते हैं।";
const footerDescription = "© 2026 महेश भारती ई-बुक स्टोर। सभी अधिकार सुरक्षित हैं। यहाँ उपलब्ध सभी पुस्तकें और सामग्री लेखक महेश भारती जी की बौद्धिक संपदा (Intellectual Property) हैं। बिना अनुमति के इनका व्यावसायिक उपयोग या कॉपी करना वर्जित है।";
const socialLinks = [
  { name: "Facebook", href: "#", icon: Facebook },
  { name: "WhatsApp", href: `https://wa.me/91${contactPhone}`, icon: MessageCircle },
  { name: "LinkedIn", href: "#", icon: Linkedin },
  { name: "Instagram", href: "#", icon: Instagram }
];

function FallingLetters({ text, className = "", startDelay = 0 }) {
  const letters =
    typeof Intl !== "undefined" && Intl.Segmenter
      ? Array.from(new Intl.Segmenter("hi", { granularity: "grapheme" }).segment(text), ({ segment }) => segment)
      : Array.from(text);

  return (
    <span className={`falling-word ${className}`} aria-label={text}>
      {letters.map((letter, index) => {
        const x = ((index % 5) - 2) * 18;
        const y = -58 - (index % 4) * 12;
        const rotate = ((index % 7) - 3) * 8;
        return (
          <span
            aria-hidden="true"
            className="falling-letter"
            key={`${letter}-${index}`}
            style={{
              "--letter-delay": `${startDelay + index * 0.035}s`,
              "--letter-x": `${x}px`,
              "--letter-y": `${y}px`,
              "--letter-rotate": `${rotate}deg`
            }}
          >
            {letter === " " ? "\u00a0" : letter}
          </span>
        );
      })}
    </span>
  );
}

export default function Layout() {
  const { logout, isAuthenticated } = useAuth();
  const { items } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const navClass = ({ isActive }) =>
    `inline-flex items-center gap-2 rounded-md px-3 py-2 transition ${
      isActive
        ? "text-orange-300"
        : "text-orange-50/85 hover:text-orange-200"
    }`;
  const bottomNavClass = ({ isActive }) =>
    `flex flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-black ${
      isActive ? "bg-orange-50 text-orange-700" : "text-slate-500"
    }`;
  const closeMenu = () => setMenuOpen(false);
  const handleLogout = () => {
    closeMenu();
    logout();
  };

  return (
    <div className="min-h-screen">
      <header className="mobile-fixed-header sticky top-0 z-50 border-b border-amber-300/25 bg-gradient-to-r from-[#073b3a] via-[#0f5b55] to-[#b45309] shadow-[0_10px_28px_rgba(15,91,85,.20)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-5 translate-y-full bg-gradient-to-b from-amber-300/20 to-transparent sm:block" />
        <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
          <Link to="/" onClick={closeMenu} className="group flex min-w-0 flex-1 items-center gap-2 font-black text-white sm:gap-3">
            <span className="relative shrink-0">
              <span className="absolute inset-0 rounded-full bg-orange-200 blur-md opacity-70 transition group-hover:opacity-100" />
              <img src={saraswatiLogo} alt={storeName} className="relative h-10 w-10 rounded-full border border-orange-100 bg-white object-cover p-0.5 shadow-sm sm:h-12 sm:w-12" />
            </span>
            <span className="min-w-0">
              <FallingLetters text={storeName} className="block line-clamp-2 text-[13px] leading-4 sm:truncate sm:text-lg sm:leading-5" />
              <FallingLetters text="महेश भारती जी की पुस्तकें" className="hidden text-xs font-bold text-orange-200 sm:block" startDelay={0.18} />
            </span>
          </Link>
          <nav className="hidden items-center gap-2 text-sm font-bold md:flex">
            <NavLink className={navClass} to="/"><Home size={16} /> <FallingLetters text="Home" startDelay={0.28} /></NavLink>
            <NavLink className={navClass} to="/books"><BookOpen size={16} /> <FallingLetters text="Books" startDelay={0.36} /></NavLink>
            <NavLink className={navClass} to="/dashboard/library"><Library size={16} /> <FallingLetters text="Library" startDelay={0.44} /></NavLink>
          </nav>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {isAuthenticated && (
              <Link className="btn-secondary relative !min-h-10 !px-2.5 sm:!min-h-11 sm:!px-3" to="/cart" aria-label="Cart">
                <ShoppingCart size={18} />
                {items.length > 0 && <span className="absolute -right-1.5 -top-1.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-orange-500 px-1.5 text-[11px] font-black leading-none text-white ring-2 ring-white">{items.length}</span>}
              </Link>
            )}
            {isAuthenticated ? (
              <>
                <Link className="btn-secondary !hidden md:!inline-flex" to="/dashboard"><LayoutDashboard size={18} /><FallingLetters text="Dashboard" className="hidden lg:inline" startDelay={0.52} /></Link>
                <button className="btn-secondary !hidden !min-h-10 !px-2.5 sm:!min-h-11 sm:!px-3 md:!inline-flex" onClick={handleLogout} aria-label="Logout"><LogOut size={18} /></button>
              </>
            ) : (
              <Link className="btn-primary !min-h-10 !px-2.5 sm:!min-h-11 sm:!px-4" to="/login"><User size={18} /><FallingLetters text="Login" className="hidden sm:inline" startDelay={0.52} /></Link>
            )}
            <button className="btn-secondary !min-h-10 !px-2.5 sm:!min-h-11 sm:!px-3 md:hidden" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? "Close menu" : "Open menu"}>
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="border-t border-amber-300/20 bg-gradient-to-r from-[#073b3a] via-[#0f5b55] to-[#b45309] px-3 py-3 text-sm font-bold shadow-sm md:hidden">
            <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2">
              <NavLink onClick={closeMenu} className={navClass} to="/"><Home size={16} /> <FallingLetters text="Home" /></NavLink>
              <NavLink onClick={closeMenu} className={navClass} to="/books"><BookOpen size={16} /> <FallingLetters text="Books" /></NavLink>
              <NavLink onClick={closeMenu} className={navClass} to="/dashboard/library"><Library size={16} /> <FallingLetters text="Library" /></NavLink>
              {isAuthenticated && <NavLink onClick={closeMenu} className={navClass} to="/dashboard"><LayoutDashboard size={16} /> <FallingLetters text="Dashboard" /></NavLink>}
              {isAuthenticated && (
                <button onClick={handleLogout} className={`${navClass({ isActive: false })} text-left`}>
                  <LogOut size={16} /> <FallingLetters text="Logout" />
                </button>
              )}
            </div>
          </nav>
        )}
      </header>
      <Outlet />
      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 gap-1 rounded-2xl border border-slate-200 bg-white/95 p-1 shadow-[0_16px_40px_rgba(15,23,42,.18)] backdrop-blur md:hidden">
        <NavLink className={bottomNavClass} to="/"><Home size={20} /> Home</NavLink>
        <NavLink className={bottomNavClass} to="/books"><BookOpen size={20} /> Books</NavLink>
        <NavLink className={bottomNavClass} to="/cart"><ShoppingCart size={20} /> Cart</NavLink>
        <NavLink className={bottomNavClass} to={isAuthenticated ? "/dashboard/library" : "/login"}>{isAuthenticated ? <Library size={20} /> : <User size={20} />}{isAuthenticated ? "Library" : "Login"}</NavLink>
      </nav>
      <ChatWidget />
      <footer className="bg-[linear-gradient(180deg,#fffaf5_0%,#fff3e4_100%)] px-4 pb-24 pt-8 text-sm text-ink md:pb-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-xl border border-orange-100/80 bg-white/95 shadow-soft ring-1 ring-white/80 backdrop-blur">
          <div className="h-1 bg-gradient-to-r from-teal-700 via-orange-400 to-amber-300" />
          <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[1.1fr_.9fr_auto] md:items-start">
            <div>
              <p className="text-lg font-black text-[#073b3a]">{storeName}</p>
              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-600">
                {footerDescription}
              </p>
            </div>
            <div className="grid gap-2">
              <p className="text-xs font-black uppercase tracking-wide text-orange-700">Contact Us</p>
              <a className="inline-flex items-center gap-2 font-semibold text-gray-700 transition hover:text-orange-700" href={`mailto:${contactEmail}`}>
                <Mail size={16} /> {contactEmail}
              </a>
              <a className="inline-flex items-center gap-2 font-semibold text-gray-700 transition hover:text-orange-700" href={`tel:${contactPhone}`}>
                <Phone size={16} /> +91 {contactPhone}
              </a>
            </div>
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-orange-700 md:text-right">Follow</p>
              <div className="flex items-center gap-2 md:justify-end">
                {socialLinks.map(({ name, href, icon: Icon }) => (
                  <a
                    key={name}
                    aria-label={name}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-orange-100 bg-orange-50 text-orange-700 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-500 hover:text-white hover:shadow-md"
                    href={href}
                    rel="noreferrer"
                    target="_blank"
                    title={name}
                  >
                    <Icon size={18} />
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-orange-100 bg-[#073b3a] px-4 py-4">
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-amber-100 shadow-sm">
                <Sparkles size={14} className="text-amber-300" />
                Crafted by Bipul Singh
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
