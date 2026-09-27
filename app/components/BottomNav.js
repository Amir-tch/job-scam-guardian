"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null));
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

  return (
    <nav className="bottom-nav">
      {items.map((item) => {
        const target = item.requiresAuth && !user ? "/login" : item.href;
        return (
          <Link
            key={item.href}
            href={target}
            className={`bottom-nav-item ${pathname === item.href ? "active" : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
      {user ? (
        <button className="bottom-nav-item bottom-nav-button" onClick={handleLogout}>
          Log out
        </button>
      ) : (
        <Link href="/login" className="bottom-nav-item">
          Log in
        </Link>
      )}
    </nav>
  );
}