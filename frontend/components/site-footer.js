"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export function SiteFooter({ className = "" }) {
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const dateLabel = useMemo(
    () =>
      now
        ? new Intl.DateTimeFormat("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          }).format(now)
        : "--",
    [now],
  );

  const timeLabel = useMemo(
    () =>
      now
        ? new Intl.DateTimeFormat("en-IN", {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          }).format(now)
        : "--",
    [now],
  );

  return (
    <footer className={["site-footer", className].filter(Boolean).join(" ")}>
      <div className="site-footer-inner">
        <div className="footer-grid">
          <div>
            <span className="eyebrow">SkillBridge AI</span>
            <h3>Skills-first career growth and bias-aware hiring.</h3>
            <p>
              Students build verified proof of ability. Recruiters review
              anonymous, performance-based signals before identity details.
            </p>
          </div>

          <div>
            <strong>Explore</strong>
            <div className="footer-links">
              <Link href="/">Home</Link>
              <Link href="/onboarding">Student onboarding</Link>
              <Link href="/tasks">Skill proof</Link>
              <Link href="/recruiter">Recruiter dashboard</Link>
            </div>
          </div>

          <div>
            <strong>Principles</strong>
            <div className="footer-links">
              <span>Practical proof over polished claims</span>
              <span>Anonymous candidate review</span>
              <span>Clear career direction for students</span>
            </div>
          </div>
        </div>
        <div className="footer-datetime" aria-live="polite">
          <span>Current date: {dateLabel}</span>
          <span>Current time: {timeLabel}</span>
          <span className="footer-copyright">
            &copy; 2026, Team "Double Trouble"
          </span>
        </div>
      </div>
    </footer>
  );
}
