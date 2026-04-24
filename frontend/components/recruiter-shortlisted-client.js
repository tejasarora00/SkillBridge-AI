"use client";

import { CheckCircle2, Eye, Mail, Search, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authRequest } from "@/lib/api";
import { downloadResumeFile, viewResumeFile } from "@/lib/resume-download";
import { useAuth } from "./auth-provider";
import { SiteShell } from "./site-shell";

function toFriendlyRecruiterMessage(error, fallback) {
  const text = String(error?.message || "").trim();
  if (!text) {
    return fallback;
  }

  if (text.includes("Route not found")) {
    return "Recruiter data is temporarily unavailable. Please refresh the page and try again.";
  }

  return fallback;
}

export function RecruiterShortlistedClient() {
  const router = useRouter();
  const { token, user, hydrated } = useAuth();
  const [shortlistedCandidates, setShortlistedCandidates] = useState([]);
  const [summary, setSummary] = useState({
    shortlisted: 0,
    discarded: 0,
    active: 0,
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [query, setQuery] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [emailCopyAlert, setEmailCopyAlert] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!token || user?.role !== "recruiter") {
      router.replace("/auth");
      return;
    }

    loadShortlistedCandidates();
  }, [hydrated, token, user, router]);

  useEffect(() => {
    if (!selectedCandidate?.id || !token) {
      return;
    }

    async function loadCandidateBrief() {
      try {
        const data = await authRequest(
          `/recruiter/candidates/${selectedCandidate.id}/brief`,
          token,
        );

        setSelectedCandidate((current) =>
          current && current.id === selectedCandidate.id
            ? {
                ...current,
                currentSkills:
                  data.currentSkills || current.currentSkills || [],
                targetCareer: data.targetCareer || current.targetCareer,
                matchedRole: data.matchedRole || current.matchedRole,
              }
            : current,
        );
      } catch {
        // Keep the existing brief content if the AI-backed brief request fails.
      }
    }

    loadCandidateBrief();
  }, [selectedCandidate?.id, token]);

  useEffect(() => {
    setEmailCopyAlert(false);
  }, [selectedCandidate?.id]);

  useEffect(() => {
    if (!statusMessage) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setStatusMessage("");
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  useEffect(() => {
    if (!emailCopyAlert) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setEmailCopyAlert(false);
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [emailCopyAlert]);

  async function loadShortlistedCandidates() {
    try {
      setLoading(true);
      setErrorMessage("");
      const data = await authRequest("/recruiter/candidates", token);
      setShortlistedCandidates(data.shortlistedCandidates || []);
      setSummary(data.summary || { shortlisted: 0, discarded: 0, active: 0 });
      setSelectedCandidate((current) => {
        if (!current) {
          return current;
        }

        const refreshedCandidate = (data.shortlistedCandidates || []).find(
          (candidate) => candidate.id === current.id,
        );

        return refreshedCandidate || null;
      });
    } catch (error) {
      setErrorMessage(
        toFriendlyRecruiterMessage(
          error,
          "Unable to load shortlisted candidates right now.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  if (!hydrated) {
    return null;
  }

  const normalizedQuery = query.trim().toLowerCase();
  const visibleShortlistedCandidates = shortlistedCandidates.filter(
    (candidate) => {
      if (!normalizedQuery) {
        return true;
      }

      return [
        candidate.studentName,
        candidate.studentEmail,
        candidate.alias,
        candidate.targetCareer,
        candidate.matchedRole,
        ...(candidate.topSkills || []),
        candidate.strengthsSummary,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    },
  );

  async function copyCandidateEmail(email) {
    const normalizedEmail = String(email || "").trim();

    if (!normalizedEmail) {
      return;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(normalizedEmail);
        setEmailCopyAlert(true);
        setStatusMessage(`Candidate email copied: ${normalizedEmail}`);
        return;
      }
    } catch {
      // Fall through to the generic status message below.
    }

    setStatusMessage(
      `Unable to copy automatically. Please copy this email manually: ${normalizedEmail}`,
    );
  }

  return (
    <SiteShell className="shortlisted-page-shell">
      <section className="content-card recruiter-hero">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Shortlisted candidates</span>
            <h2>Follow up with candidates you already approved</h2>
          </div>
          <span className="score-chip">{summary.shortlisted} shortlisted</span>
        </div>
        <p>
          This page keeps your approved shortlist separate from active review,
          so you can quickly revisit contact details, verified scores, and top
          skills without scanning the full candidate queue.
        </p>
      </section>
      <br></br>
      <section className="content-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Search shortlist</span>
            <h2>Find shortlisted candidates faster</h2>
          </div>
          <span className="score-chip">Recruiter-only view</span>
        </div>
        <label className="filter-field filter-field-search">
          <span className="filter-label">Search shortlisted candidates</span>
          <span className="filter-input-shell">
            <Search size={18} />
            <input
              type="search"
              placeholder="Search by name, email, role, skill, or alias"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </span>
        </label>
      </section>

      {loading ? (
        <section className="content-card loading-block">
          Loading shortlisted candidates...
        </section>
      ) : null}
      <br></br>
      {!loading && !errorMessage ? (
        <section className="content-card accent-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Shortlist table</span>
              <h2>Priority follow-up table</h2>
            </div>
            <span className="score-chip">
              {visibleShortlistedCandidates.length} visible
            </span>
          </div>
          {visibleShortlistedCandidates.length ? (
            <div className="shortlist-table-shell">
              <table className="shortlist-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Target role</th>
                    <th>Verified</th>
                    <th>Top skills</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleShortlistedCandidates.map((candidate) => (
                    <tr key={`shortlist-${candidate.id}`}>
                      <td>{candidate.studentName || "Unavailable"}</td>
                      <td>{candidate.studentEmail || "Unavailable"}</td>
                      <td>{candidate.targetCareer || "Emerging talent"}</td>
                      <td>{candidate.verifiedTaskScore}/100</td>
                      <td>
                        {(candidate.topSkills || []).slice(0, 3).join(", ") ||
                          "No skills yet"}
                      </td>
                      <td>
                        <button
                          className="button secondary"
                          onClick={() => setSelectedCandidate(candidate)}
                        >
                          <Eye size={16} />
                          Open candidate brief
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">
              No shortlisted candidates matched your current search.
            </p>
          )}
        </section>
      ) : null}
      <br></br>
      {!loading && errorMessage ? (
        <section className="content-card">
          <p>{errorMessage}</p>
        </section>
      ) : null}

      {selectedCandidate ? (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedCandidate(null)}
        >
          <div
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-heading recruiter-modal-head">
              <div>
                <span className="eyebrow">{selectedCandidate.alias}</span>
                <h2>{selectedCandidate.targetCareer}</h2>
                <p className="modal-helper-copy">
                  Review contact details, resume access, and shortlist evidence
                  in one clear view.
                </p>
              </div>
              <button
                className="button secondary"
                onClick={() => setSelectedCandidate(null)}
              >
                Close brief
              </button>
            </div>
            <div className="candidate-meta modal-meta">
              <span className="decision-chip shortlisted">shortlisted</span>
              <span className="score-chip">
                <CheckCircle2 size={14} />
                {selectedCandidate.verifiedTaskScore}/100 verified
              </span>
            </div>
            <div className="recruiter-detail-grid">
              <article className="candidate-summary-card">
                <strong>Candidate overview</strong>
                <div className="recruiter-detail-list">
                  <p>
                    <Search size={15} />
                    <span>
                      <strong>Target career:</strong>{" "}
                      {selectedCandidate.targetCareer || "Not specified"}
                    </span>
                  </p>
                </div>
              </article>
              <article className="candidate-summary-card">
                <strong>Current skills</strong>
                <div className="skill-badges recruiter-brief-skills">
                  {(
                    selectedCandidate.currentSkills ||
                    selectedCandidate.topSkills ||
                    []
                  ).map((skill) => (
                    <span
                      key={`${selectedCandidate.id}-shortlist-brief-${skill}`}
                      className="badge"
                    >
                      {skill}
                    </span>
                  ))}
                  {!(
                    selectedCandidate.currentSkills ||
                    selectedCandidate.topSkills ||
                    []
                  ).length ? (
                    <span className="badge subtle">No skills listed yet</span>
                  ) : null}
                </div>
              </article>
            </div>
            <article className="candidate-summary-card recruiter-contact-card">
              <strong>Verified score</strong>
              <p>
                <CheckCircle2 size={15} />
                &nbsp;
                {selectedCandidate.verifiedTaskScore}/100
              </p>
            </article>
            <article className="candidate-summary-card recruiter-contact-card">
              <strong>Student details</strong>
              <p>
                <UserRound size={15} />
                &nbsp;
                {selectedCandidate.studentName || "Name unavailable"}
              </p>
              <p>
                <Mail size={15} />
                &nbsp;
                {selectedCandidate.studentEmail || "Email unavailable"}
              </p>
              <div className="file-upload-actions recruiter-resume-button">
                {selectedCandidate.studentEmail ? (
                  <button
                    type="button"
                    className={`button secondary copy-email-feedback${emailCopyAlert ? " active" : ""}`}
                    onClick={() =>
                      copyCandidateEmail(selectedCandidate.studentEmail)
                    }
                  >
                    <Mail size={16} />
                    Copy candidate email
                  </button>
                ) : null}
                {selectedCandidate.uploadedResume?.fileName ? (
                  <>
                    {selectedCandidate.uploadedResume?.mimeType ===
                    "application/pdf" ? (
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() =>
                          viewResumeFile(selectedCandidate.uploadedResume)
                        }
                      >
                        View resume
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() =>
                        downloadResumeFile(selectedCandidate.uploadedResume)
                      }
                    >
                      Download resume
                    </button>
                  </>
                ) : (
                  <span className="inline-note">No resume uploaded</span>
                )}
              </div>
            </article>
          </div>
        </div>
      ) : null}

      {statusMessage ? (
        <section className="content-card">
          <p>{statusMessage}</p>
        </section>
      ) : null}
    </SiteShell>
  );
}
