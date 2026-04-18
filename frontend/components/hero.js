"use client";

import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Compass,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export function Hero() {
  return (
    <section className="hero-card">
      <div className="hero-copy">
        <span className="pill">Career Intelligence Platform</span>
        <h1>
          AI-powered platform that helps you prove your abilities and get hired
          based on merit.
        </h1>
        <p>
          Students get a roadmap, complete practical tasks, and show verified
          progress. Recruiters review stronger skills instead of polished claims
          alone.
        </p>
        <div className="hero-actions">
          <Link href="/auth" className="button primary">
            Create account
          </Link>
          <Link href="/recruiter" className="button secondary">
            Recruiter view
          </Link>
        </div>
        <div className="hero-quick-links">
          <Link href="/onboarding" className="hero-quick-link">
            Start onboarding
            <ArrowRight size={15} />
          </Link>
          <Link href="/tasks" className="hero-quick-link">
            Try skill tasks
            <ArrowRight size={15} />
          </Link>
          <Link href="/compare" className="hero-quick-link">
            ATS Resume Check
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      <div className="hero-panel">
        <div className="hero-card-grid hero-card-grid-compact">
          <div className="stat-card hero-spotlight hero-spotlight-wide">
            <div className="hero-image-badge">
              <Compass size={16} />
              Student flow
            </div>
            <div className="hero-mini-stack">
              <div className="hero-mini-card">
                <div>
                  <span>Roadmap</span>
                  <strong>Know the next best move</strong>
                </div>
                <Sparkles size={18} />
              </div>
              <div className="hero-mini-card">
                <div>
                  <span>Proof</span>
                  <strong>Complete real skill tasks</strong>
                </div>
                <BriefcaseBusiness size={18} />
              </div>
              <div className="hero-chip-row">
                <span className="hero-chip">Career path</span>
                <span className="hero-chip">Task scores</span>
                <span className="hero-chip">Bias-aware review</span>
              </div>
            </div>
          </div>

          <div className="stat-card hero-spotlight">
            <div className="hero-spotlight-icon">
              <BriefcaseBusiness size={18} />
            </div>
            <span>Skill proof</span>
            <strong>Real work over resume polish</strong>
            <p>Show evidence with guided tasks and AI-supported feedback.</p>
          </div>

          <div className="stat-card hero-spotlight">
            <div className="hero-spotlight-icon">
              <ShieldCheck size={18} />
            </div>
            <span>Bias-aware hiring</span>
            <strong>Review verified signals first</strong>
            <p>Recruiters see ability, fit, and progress before identity.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
