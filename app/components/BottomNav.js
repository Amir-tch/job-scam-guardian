"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null));
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/learn");
  }

  const items = [
    { href: "/", label: "Check", requiresAuth: true },
    { href: "/learn", label: "Learn" },
    { href: "/stats", label: "Stats" },
    { href: "/dashboard", label: "History", requiresAuth: true },
  ];

  const initial = user?.email ? user.email.charAt(0).toUpperCase() : "?";

  return (
    <nav className="top-nav">
      <div className="top-nav-inner">
        <Link href={user ? "/" : "/learn"} className="top-nav-logo">
          Job Scam Guardian
        </Link>

        <div className="top-nav-links">
          {items.map((item) => {
            const target = item.requiresAuth && !user ? "/login" : item.href;
            return (
              <Link
                key={item.href}
                href={target}
                className={`top-nav-link ${pathname === item.href ? "active" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="top-nav-account" ref={menuRef}>
          {user ? (
            <>
              <button
                className="account-chip"
                onClick={() => setMenuOpen((v) => !v)}
              >
                {initial}
              </button>
              {menuOpen && (
                <div className="account-dropdown">
                  <div className="account-email">{user.email}</div>
                  <button onClick={handleLogout}>Sign out</button>
                </div>
              )}
            </>
          ) : (
            <Link href="/login" className="top-nav-link">
              Log in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}