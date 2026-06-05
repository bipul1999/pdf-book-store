import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import api from "../api/client.js";

const storageKey = "pdf_store_visitor_id";

function visitorId() {
  const existing = localStorage.getItem(storageKey);
  if (existing) return existing;
  const next = window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(storageKey, next);
  return next;
}

export default function VisitTracker() {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith("/admin")) return;
    api.post("/site/visit", {
      visitorId: visitorId(),
      page: `${location.pathname}${location.search}`,
      referrer: document.referrer,
      screen: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language
    }).catch(() => {});
  }, [location.pathname, location.search]);

  return null;
}
