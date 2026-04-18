"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  Mail,
  ShieldCheck,
  UserRoundSearch,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authRequest } from "@/lib/api";
import { useAuth } from "./auth-provider";
import { SiteShell } from "./site-shell";

function formatDate(value) {
  if (!value) {
    return "Unavailable";
  }

  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AdminShortlistedClient() {
  const router = useRouter();
  const { token, user, hydrated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [shortlistedCandidates, setShortlistedCandidates] = useState([]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!token || user?.role !== "admin") {
      router.replace("/admin");
      return;
    }

    loadShortlisted();
  }, [hydrated, token, user, router]);

  async function loadShortlisted() {
    try {
      setLoading(true);
      setErrorMessage("");
      const data = await authRequest("/admin/overview", token);
      setShortlistedCandidates(data.shortlistedCandidates || []);
    } catch (error) {
      setErrorMessage(
        error.message || "Unable to load shortlisted candidates right now.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!hydrated) {
    return null;
  }

  return (
    <SiteShell>
      <section className="content-card recruiter-hero">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              <BadgeCheck size={14} />
              Admin shortlist view
            </span>
            <h2>Shortlisted candidates and their recruiters</h2>
          </div>
          <Link href="/admin" className="button secondary">
            <ArrowLeft size={16} />
            Back to admin
          </Link>
        </div>
        <p>
          This page shows every shortlisted candidate together with the
          recruiter who shortlisted them and the role they were shortlisted for.
        </p>
      </section>

      {loading ? (
        <section className="content-card loading-block">
          Loading shortlist records...
        </section>
      ) : null}

      {errorMessage ? (
        <section className="content-card">
          <p>{errorMessage}</p>
        </section>
      ) : null}

      {!loading && !errorMessage ? (
        <>
          <section className="content-card accent-card">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  <ShieldCheck size={14} />
                  Shortlisted candidates
                </span>
                <h2>Recruiter-linked shortlist table</h2>
              </div>
              <span className="score-chip">
                {shortlistedCandidates.length} records
              </span>
            </div>

            <div className="admin-table-shell">
              <table className="shortlist-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Candidate email</th>
                    <th>Target career</th>
                    <th>Recruiter</th>
                    <th>Recruiter email</th>
                    <th>Role</th>
                    <th>Fit</th>
                    <th>Shortlisted</th>
                  </tr>
                </thead>
                <tbody>
                  {shortlistedCandidates.map((candidate) => (
                    <tr key={candidate.id}>
                      <td>{candidate.candidateName}</td>
                      <td>{candidate.candidateEmail}</td>
                      <td>{candidate.targetCareer || "Not added yet"}</td>
                      <td>{candidate.recruiterName}</td>
                      <td>{candidate.recruiterEmail}</td>
                      <td>{candidate.jobTitle}</td>
                      <td>{candidate.fitScore}/100</td>
                      <td>{formatDate(candidate.shortlistedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid two-up">
            {shortlistedCandidates.map((candidate) => (
              <article
                key={`${candidate.id}-card`}
                className="content-card admin-shortlist-card"
              >
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">
                      <BriefcaseBusiness size={14} />
                      {candidate.jobTitle}
                    </span>
                    <h2>{candidate.candidateName}</h2>
                  </div>
                  <span className="score-chip">{candidate.fitScore}/100 fit</span>
                </div>
                <p>
                  <Mail size={14} /> {candidate.candidateEmail}
                </p>
                <p>
                  <UserRoundSearch size={14} /> Shortlisted by{" "}
                  {candidate.recruiterName}
                </p>
                <p>Recruiter email: {candidate.recruiterEmail}</p>
                <p>Target career: {candidate.targetCareer || "Not added yet"}</p>
                <p>Shortlisted on: {formatDate(candidate.shortlistedAt)}</p>
              </article>
            ))}
          </section>

          {!shortlistedCandidates.length ? (
            <section className="content-card">
              <p>No shortlisted candidates yet.</p>
            </section>
          ) : null}
        </>
      ) : null}
    </SiteShell>
  );
}
