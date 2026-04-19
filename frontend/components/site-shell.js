"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Bookmark,
  BriefcaseBusiness,
  ClipboardCheck,
  Compass,
  FileSearch,
  GraduationCap,
  Lightbulb,
  ListTodo,
  LogOut,
  Menu,
  MessageSquareQuote,
  MessagesSquare,
  Moon,
  Sparkles,
  SunMedium,
  UserRoundSearch,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "./auth-provider";
import { BrandLogo } from "./brand-logo";
import { SiteFooter } from "./site-footer";
import { useTheme } from "./theme-provider";

const authenticatedNavItems = [
  { href: "/", label: "Home", icon: Sparkles },
  { href: "/onboarding", label: "Onboarding", icon: BriefcaseBusiness },
  { href: "/dashboard", label: "Student Hub", icon: Compass },
  { href: "/todos", label: "Todo List", icon: ListTodo },
  { href: "/tasks", label: "Tasks", icon: ClipboardCheck },
  { href: "/compare", label: "ATS Resume Check", icon: FileSearch },
  { href: "/interview", label: "Interview", icon: MessageSquareQuote },
  { href: "/expert-session", label: "Expert Session", icon: MessagesSquare },
  { href: "/recruiter", label: "Recruiter", icon: UserRoundSearch },
  {
    href: "/recruiter/shortlisted",
    label: "Shortlisted Candidates",
    icon: Bookmark,
    tone: "shortlisted",
  },
  { href: "/admin", label: "Admin", icon: BadgeCheck },
];

const publicNavItems = [
  { href: "/", label: "Home", icon: Sparkles },
  {
    href: "/auth?role=student",
    label: "For Students",
    icon: GraduationCap,
    tone: "student",
  },
  {
    href: "/auth?role=recruiter",
    label: "For Recruiters",
    icon: UserRoundSearch,
    tone: "recruiter",
  },
  {
    href: "/auth?mode=signup",
    label: "Sign Up",
    icon: GraduationCap,
    tone: "signup",
  },
  {
    href: "/auth?mode=login",
    label: "Log In",
    icon: ArrowRight,
    tone: "signin",
  },
  { href: "/admin", label: "Admin", icon: BadgeCheck },
];

const guestMessages = [
  {
    kicker: "Dream. Build. Rise.",
    line: "Small proof beats big promises.",
  },
  {
    kicker: "Your skills can speak.",
    line: "Turn effort into visible progress.",
  },
  {
    kicker: "Start where you are.",
    line: "Momentum is better than waiting.",
  },
  {
    kicker: "Keep showing up.",
    line: "Consistency compounds into opportunity.",
  },
];

export function SiteShell({
  children,
  className = "",
  authMinimalMobile = false,
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, toggleTheme, hydrated } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [guestMessageIndex, setGuestMessageIndex] = useState(0);
  const studentDisplayName =
    user?.role === "student" && user?.name
      ? user.name.trim().toUpperCase()
      : "";
  const recruiterDisplayName =
    user?.role === "recruiter" && user?.name ? user.name.trim() : "";
  const guestMessage = guestMessages[guestMessageIndex];

  useEffect(() => {
    if (user) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setGuestMessageIndex((current) => (current + 1) % guestMessages.length);
    }, 3200);

    return () => window.clearInterval(intervalId);
  }, [user]);

  const visibleNavItems = (
    !user ? publicNavItems : authenticatedNavItems
  ).filter((item) => {
    if (!user) {
      return true;
    }

    if (user.role === "student") {
      return [
        "/",
        "/onboarding",
        "/dashboard",
        "/todos",
        "/tasks",
        "/compare",
        "/interview",
        "/expert-session",
      ].includes(item.href);
    }

    if (user.role === "recruiter") {
      return ["/", "/recruiter", "/recruiter/shortlisted"].includes(item.href);
    }

    if (user.role === "admin") {
      return ["/", "/admin"].includes(item.href);
    }

    return true;
  });

  const shellClassName = [
    "page-shell",
    className,
    authMinimalMobile ? "auth-minimal-mobile-shell" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div className={shellClassName}>
        <header className="topbar">
          <Link href="/" className="brand" onClick={() => setMenuOpen(false)}>
            <BrandLogo compact />
            <div className="brand-copy">
              <strong>SkillBridge AI</strong>
              <p>Let Talent Speak, Not Connections. </p>
            </div>
          </Link>

          {studentDisplayName ? (
            <div className="student-welcome" aria-label={`Welcome ${user.name}`}>
              <span className="student-welcome-label">Welcome,</span>
              <strong className="student-welcome-name">
                {studentDisplayName}
              </strong>
            </div>
          ) : recruiterDisplayName ? (
            <div
              className="recruiter-welcome"
              aria-label={`Welcome ${recruiterDisplayName}`}
            >
              <span className="recruiter-welcome-label">Welcome,</span>
              <strong className="recruiter-welcome-name">
                {recruiterDisplayName}
              </strong>
            </div>
          ) : (
            <div className="guest-highlight">
              <span className="guest-highlight-kicker">
                <Lightbulb size={14} />
                {guestMessage.kicker}
              </span>
              <strong>{guestMessage.line}</strong>
            </div>
          )}

          <div className="topbar-actions">
            <button
              type="button"
              className="menu-toggle"
              onClick={() => setMenuOpen((current) => !current)}
              aria-label={
                menuOpen ? "Close navigation menu" : "Open navigation menu"
              }
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

          <nav className={menuOpen ? "nav-links nav-open" : "nav-links"}>
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    active ? "nav-link active" : "nav-link",
                    !user ? "nav-link-public" : "",
                    item.tone ? `nav-link-${item.tone}` : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setMenuOpen(false)}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              className="theme-toggle nav-theme-toggle"
              onClick={toggleTheme}
              aria-label={
                hydrated && theme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
            >
              {hydrated && theme === "dark" ? (
                <SunMedium size={18} />
              ) : (
                <Moon size={18} />
              )}
              <span>{hydrated && theme === "dark" ? "Light" : "Dark"}</span>
            </button>
            {user ? (
              <button
                type="button"
                className="nav-link ghost"
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                  router.push("/");
                }}
              >
                <LogOut size={16} />
                Log out
              </button>
            ) : null}
          </nav>
        </header>
        <main>{children}</main>
      </div>
      <SiteFooter
        className={authMinimalMobile ? "auth-footer-minimal-mobile" : ""}
      />
    </>
  );
}
