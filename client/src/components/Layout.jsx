import { BookOpen, ClipboardList, Facebook, Home, Instagram, LayoutDashboard, Library, Linkedin, LogOut, Mail, Menu, MessageCircle, Phone, Search, ShoppingCart, Sparkles, User, X } from "lucide-react";
import { useEffect, useState } from "react";
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
  { name: "Facebook", href: "https://www.facebook.com/mahesh.bharti.142/", icon: Facebook },
  { name: "WhatsApp", href: `https://wa.me/91${contactPhone}`, icon: MessageCircle },
  { name: "LinkedIn", href: "#", icon: Linkedin },
  { name: "Instagram", href: "#", icon: Instagram }
];

export function FallingLetters({ text, className = "", startDelay = 0, wrap = false, repeat = false }) {
  const letters =
    typeof Intl !== "undefined" && Intl.Segmenter
      ? Array.from(new Intl.Segmenter("hi", { granularity: "grapheme" }).segment(text), ({ segment }) => segment)
      : Array.from(text);

  return (
    <span className={`falling-word ${wrap ? "falling-word-wrap" : ""} ${className}`} aria-label={text}>
      {letters.map((letter, index) => {
        const x = ((index % 5) - 2) * 18;
        const y = -58 - (index % 4) * 12;
        const rotate = ((index % 7) - 3) * 8;
        return (
          <span
            aria-hidden="true"
            className={`falling-letter ${repeat ? "falling-letter-repeat" : ""}`}
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
  const { logout, isAuthenticated, isAdmin } = useAuth();
  const { items } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const desktopNavClass = ({ isActive }) =>
    `premium-nav-link inline-flex min-h-11 items-center gap-2 px-3 py-2 transition ${isActive ? "is-active text-[#b45309]" : "text-slate-700 hover:text-[#d97706]"}`;
  const mobileNavClass = ({ isActive }) =>
    `inline-flex min-h-12 items-center gap-2 rounded-2xl border px-3.5 py-2.5 transition ${
      isActive
        ? "border-amber-200 bg-amber-50 text-amber-800 shadow-sm"
        : "border-transparent text-slate-700 hover:border-orange-100 hover:bg-orange-50 hover:text-amber-800"
    }`;
  const bottomNavClass = ({ isActive }) =>
    `flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-black transition ${
      isActive ? "bg-orange-50 text-orange-700 shadow-sm" : "text-slate-500 hover:bg-orange-50/60 hover:text-orange-700"
    }`;
  const closeMenu = () => setMenuOpen(false);
  const handleLogout = () => {
    closeMenu();
    logout();
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen">
      <header className={`premium-navbar fixed inset-x-0 top-0 z-50 ${isScrolled ? "premium-navbar-scrolled" : ""}`}>
        <div className="relative mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 md:h-[72px] md:gap-4 md:px-6 lg:px-8">
          <button className="mobile-header-action btn-secondary !min-h-10 !w-10 !rounded-full !p-0 md:hidden" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-label={menuOpen ? "Close menu" : "Open menu"}>
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
          <Link to="/" onClick={closeMenu} className="mobile-header-brand group flex min-w-0 flex-1 items-center gap-2.5 text-[#1f2937] sm:gap-3">
            <span className="relative shrink-0">
              <span className="absolute inset-0 rounded-2xl bg-orange-300/45 blur-lg opacity-70 transition group-hover:opacity-100" />
              <img src={saraswatiLogo} alt="" className="relative h-9 w-9 rounded-xl border border-orange-100 bg-white object-cover p-0.5 shadow-md sm:h-[50px] sm:w-[50px] sm:rounded-2xl" />
              <span className="absolute -bottom-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-orange-100 bg-[#fff7ed] text-[#d97706] shadow-sm">
                <BookOpen size={11} />
              </span>
            </span>
            <span className="min-w-0 leading-none">
              <span className="navbar-brand block truncate text-[12px] font-extrabold tracking-tight sm:text-lg">
                <FallingLetters text="Mahesh Bharti E-book Store" className="navbar-brand-falling" startDelay={0.08} />
              </span>
              <span className="mt-1 hidden items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.15em] text-amber-700/80 sm:flex">
                <span className="h-px w-5 bg-amber-400" />
                Premium Hindi Library
              </span>
            </span>
          </Link>
          <nav className="hidden items-center gap-3 text-sm font-bold md:flex">
            <NavLink className={desktopNavClass} to="/"><Home size={16} /> <FallingLetters text="Home" startDelay={0.28} /></NavLink>
            <NavLink className={desktopNavClass} to="/books"><BookOpen size={16} /> <FallingLetters text="Books" startDelay={0.36} /></NavLink>
            <NavLink className={desktopNavClass} to="/dashboard/library"><Library size={16} /> <FallingLetters text="Library" startDelay={0.44} /></NavLink>
          </nav>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link className="mobile-header-action btn-secondary !min-h-10 !w-10 !rounded-full !p-0 md:!hidden" to="/books" aria-label="Search books">
              <Search size={19} />
            </Link>
            {isAuthenticated && !isAdmin && (
              <Link className="btn-secondary relative !hidden !min-h-10 !rounded-full !px-2.5 sm:!min-h-11 sm:!px-3 md:!inline-flex" to="/cart" aria-label="Cart">
                <ShoppingCart size={18} />
                {items.length > 0 && <span className="absolute -right-1.5 -top-1.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-orange-500 px-1.5 text-[11px] font-black leading-none text-white ring-2 ring-white">{items.length}</span>}
              </Link>
            )}
            {isAdmin ? (
              <Link className="btn-primary !min-h-10 !rounded-full !px-2.5 sm:!min-h-11 sm:!px-4" to="/admin"><LayoutDashboard size={18} /><span className="hidden sm:inline">Go to Admin</span></Link>
            ) : isAuthenticated ? (
              <>
                <Link className="btn-secondary !hidden !rounded-full md:!inline-flex" to="/dashboard"><LayoutDashboard size={18} /><FallingLetters text="Dashboard" className="hidden lg:inline" startDelay={0.52} /></Link>
                <button className="btn-secondary !hidden !min-h-10 !rounded-full !px-2.5 sm:!min-h-11 sm:!px-3 md:!inline-flex" onClick={handleLogout} aria-label="Logout"><LogOut size={18} /></button>
              </>
            ) : (
              <Link className="btn-primary !hidden !min-h-10 !rounded-full !px-2.5 sm:!min-h-11 sm:!px-5 md:!inline-flex" to="/login"><User size={18} /><FallingLetters text="Login" className="hidden sm:inline" startDelay={0.52} /></Link>
            )}
          </div>
        </div>
        {menuOpen && (
          <div className="absolute inset-x-0 top-full px-3 pt-2 md:hidden">
            <nav className="mobile-nav-card mx-auto grid max-w-md grid-cols-2 gap-1.5 rounded-3xl p-2.5 text-sm font-bold">
              <NavLink onClick={closeMenu} className={mobileNavClass} to="/"><Home size={16} /> <FallingLetters text="Home" /></NavLink>
              <NavLink onClick={closeMenu} className={mobileNavClass} to="/books"><BookOpen size={16} /> <FallingLetters text="Books" /></NavLink>
              {!isAdmin && <NavLink onClick={closeMenu} className={mobileNavClass} to="/dashboard/orders"><ClipboardList size={16} /> Orders</NavLink>}
              {!isAdmin && <NavLink onClick={closeMenu} className={mobileNavClass} to="/dashboard/library"><Library size={16} /> <FallingLetters text="Library" /></NavLink>}
              {isAuthenticated && !isAdmin && <NavLink onClick={closeMenu} className={mobileNavClass} to="/cart"><ShoppingCart size={16} /> Cart</NavLink>}
              {isAdmin ? (
                <NavLink onClick={closeMenu} className={mobileNavClass} to="/admin"><LayoutDashboard size={16} /> Go to Admin</NavLink>
              ) : isAuthenticated && <NavLink onClick={closeMenu} className={mobileNavClass} to="/dashboard"><LayoutDashboard size={16} /> <FallingLetters text="Dashboard" /></NavLink>}
              {isAuthenticated && !isAdmin && (
                <button onClick={handleLogout} className={`${mobileNavClass({ isActive: false })} text-left`}>
                  <LogOut size={16} /> <FallingLetters text="Logout" />
                </button>
              )}
            </nav>
          </div>
        )}
      </header>
      <div className="pt-14 md:pt-[72px]">
        <Outlet />
      </div>
      <nav className={`mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 grid gap-1 border border-amber-200/80 bg-[#fffaf5]/95 px-2 pb-[calc(.35rem+env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-12px_34px_rgba(36,25,21,.12)] backdrop-blur-md md:hidden ${isAdmin ? "grid-cols-3" : "grid-cols-4"}`}>
        <NavLink className={bottomNavClass} to="/"><Home size={20} /> Home</NavLink>
        <NavLink className={bottomNavClass} to="/books"><BookOpen size={20} /> Books</NavLink>
        {isAdmin ? (
          <NavLink className={bottomNavClass} to="/admin"><LayoutDashboard size={20} /> Admin</NavLink>
        ) : (
          <>
            <NavLink className={bottomNavClass} to="/dashboard/orders"><ClipboardList size={20} /> Orders</NavLink>
            <NavLink className={bottomNavClass} to="/dashboard"><User size={20} /> Profile</NavLink>
          </>
        )}
      </nav>
      <ChatWidget />
      <footer className="bg-[#1f2937] px-4 pb-24 pt-10 text-sm text-amber-50 md:pb-10 md:pt-14">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(135deg,#1f2937,#29201a)] shadow-[0_20px_52px_rgba(31,41,55,.22)]">
          <div className="h-1 bg-gradient-to-r from-amber-700 via-amber-400 to-orange-300" />
          <div className="grid gap-7 p-5 sm:p-7 lg:grid-cols-[1.25fr_.62fr_.75fr_auto] lg:items-start">
            <div>
              <p className="text-lg font-black text-amber-50">{storeName}</p>
              <p className="mt-2 max-w-xl text-sm leading-7 text-stone-300">
                {footerDescription}
              </p>
            </div>
            <div className="grid gap-2">
              <p className="text-xs font-black uppercase tracking-wide text-amber-300">Quick Links</p>
              <Link className="font-semibold text-stone-200 transition hover:text-amber-300" to="/books">पुस्तकें देखें</Link>
              <Link className="font-semibold text-stone-200 transition hover:text-amber-300" to="/order-book">Order Book</Link>
              <Link className="font-semibold text-stone-200 transition hover:text-amber-300" to="/dashboard/library">My Library</Link>
            </div>
            <div className="grid gap-2">
              <p className="text-xs font-black uppercase tracking-wide text-amber-300">Contact Us</p>
              <a className="inline-flex items-center gap-2 break-all font-semibold text-stone-200 transition hover:text-amber-300" href={`mailto:${contactEmail}`}>
                <Mail size={16} /> {contactEmail}
              </a>
              <a className="inline-flex items-center gap-2 font-semibold text-stone-200 transition hover:text-amber-300" href={`tel:${contactPhone}`}>
                <Phone size={16} /> +91 {contactPhone}
              </a>
              <p className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-5 text-stone-300">Secure online payment and verified PDF access available.</p>
            </div>
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-amber-300 md:text-right">Follow</p>
              <div className="flex items-center gap-2 md:justify-end">
                {socialLinks.map(({ name, href, icon: Icon }) => (
                  <a
                    key={name}
                    aria-label={name}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-amber-200 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-400 hover:bg-amber-500 hover:text-white hover:shadow-md"
                    href={href}
                    rel="noreferrer"
                    title={name}
                  >
                    <Icon size={18} />
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 bg-black/15 px-4 py-4">
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
