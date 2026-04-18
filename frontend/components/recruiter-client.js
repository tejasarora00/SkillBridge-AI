"use client";

import {
  Bookmark,
  CheckCircle2,
  ChevronsDownUp,
  Eye,
  Mail,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
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

  if (text.includes("Candidate match not found")) {
    return "This candidate is being prepared for review. Please try the action again.";
  }

  return fallback;
}

export function RecruiterClient() {
  const router = useRouter();
  const { token, user, hydrated } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [shortlistedCandidates, setShortlistedCandidates] = useState([]);
  const [summary, setSummary] = useState({
    shortlisted: 0,
    discarded: 0,
    active: 0,
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingCandidateId, setUpdatingCandidateId] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [filters, setFilters] = useState({
    query: "",
    minimumScore: "",
    sortBy: "fit-desc",
  });

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!token || user?.role !== "recruiter") {
      router.replace("/auth");
      return;
    }

    loadCandidates(filters);
  }, [hydrated, token, user, router]);

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
    if (!selectedCandidate?.id || !token) {
      return;
    }

    async function loadCandidateBrief() {
      try {
        setBriefLoading(true);
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
                fitExplanation: data.aiFitSummary || current.fitExplanation,
              }
            : current,
        );
      } catch {
        // Keep the existing brief content if the AI-backed brief request fails.
      } finally {
        setBriefLoading(false);
      }
    }

    loadCandidateBrief();
  }, [selectedCandidate?.id, token]);

  function applyRecruiterData(data) {
    const nextCandidates = data.candidates || [];
    const nextShortlistedCandidates = data.shortlistedCandidates || [];
    setCandidates(nextCandidates);
    setShortlistedCandidates(nextShortlistedCandidates);
    setSummary(data.summary || { shortlisted: 0, discarded: 0, active: 0 });

    setSelectedCandidate((current) => {
      if (!current) {
        return current;
      }

      const refreshedCandidate = [
        ...nextCandidates,
        ...nextShortlistedCandidates,
      ].find((candidate) => candidate.id === current.id);

      return refreshedCandidate || null;
    });
  }

  async function loadCandidates(nextFilters = filters) {
    try {
      setStatusMessage("");
      setErrorMessage("");
      setLoading(true);
      const params = new URLSearchParams();
      const minimumScoreValue = Number(nextFilters.minimumScore);
      if (
        nextFilters.minimumScore !== "" &&
        Number.isFinite(minimumScoreValue) &&
        minimumScoreValue > 0
      ) {
        params.set("minimumScore", String(minimumScoreValue));
      }

      const query = params.toString() ? `?${params}` : "";
      const data = await authRequest(`/recruiter/candidates${query}`, token);
      applyRecruiterData(data);
      return data;
    } catch (error) {
      setErrorMessage(
        toFriendlyRecruiterMessage(
          error,
          "Unable to load recruiter candidates right now.",
        ),
      );
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function updateDecision(studentProfileId, decision) {
    try {
      setUpdatingCandidateId(studentProfileId);
      setStatusMessage("");
      setErrorMessage("");
      const data = await authRequest(
        `/recruiter/candidates/${studentProfileId}/decision`,
        token,
        {
          method: "PATCH",
          body: JSON.stringify({ decision }),
        },
      );

      setStatusMessage(
        decision === "shortlisted"
          ? "Candidate moved to shortlist."
          : decision === "discarded"
            ? "Candidate discarded and removed from review."
            : "Candidate moved back to active review.",
      );
      applyRecruiterData(data);

      if (decision === "discarded") {
        setSelectedCandidate(null);
        return;
      }

      const refreshedCandidate = [
        ...(data.candidates || []),
        ...(data.shortlistedCandidates || []),
      ].find((candidate) => candidate.id === studentProfileId);

      setSelectedCandidate(refreshedCandidate || null);
    } catch (error) {
      setErrorMessage(
        toFriendlyRecruiterMessage(
          error,
          "Unable to update candidate status right now.",
        ),
      );
    } finally {
      setUpdatingCandidateId("");
    }
  }

  if (!hydrated) {
    return null;
  }

  const normalizedQuery = filters.query.trim().toLowerCase();
  const sortCandidates = (list) => {
    const nextList = [...list];

    nextList.sort((left, right) => {
      switch (filters.sortBy) {
        case "fit-asc":
          return left.fitScore - right.fitScore;
        case "verified-desc":
          return right.verifiedTaskScore - left.verifiedTaskScore;
        case "verified-asc":
          return left.verifiedTaskScore - right.verifiedTaskScore;
        case "name-asc":
          return String(
            left.studentName || left.alias || left.targetCareer || "",
          ).localeCompare(
            String(
              right.studentName || right.alias || right.targetCareer || "",
            ),
          );
        case "fit-desc":
        default:
          return right.fitScore - left.fitScore;
      }
    });

    return nextList;
  };

  const matchesCandidateQuery = (candidate, includeIdentity = false) => {
    if (!normalizedQuery) {
      return true;
    }

    return [
      candidate.alias,
      includeIdentity ? candidate.studentName : "",
      includeIdentity ? candidate.studentEmail : "",
      candidate.targetCareer,
      candidate.matchedRole,
      ...(candidate.topSkills || []),
      candidate.strengthsSummary,
      candidate.fitExplanation,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  };

  const visibleCandidates = sortCandidates(
    candidates.filter((candidate) => matchesCandidateQuery(candidate)),
  );

  const activeReviewCount = visibleCandidates.length;
  const hasAnyCandidates =
    candidates.length > 0 ||
    shortlistedCandidates.length > 0 ||
    summary.discarded > 0;

  async function copyCandidateEmail(email) {
    const normalizedEmail = String(email || "").trim();

    if (!normalizedEmail) {
      return;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(normalizedEmail);
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
    <SiteShell>
      <section className="content-card recruiter-hero">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Recruiter workspace</span>
            <h2>Review skill-verified candidates, not personal background</h2>
          </div>
          <span className="score-chip">
            {activeReviewCount} in active review
          </span>
        </div>
        <p>
          This hiring view keeps the focus on evidence. Candidates are
          anonymous, ranked by verified task quality and job fit, and can be
          shortlisted or discarded without identity-first bias.
        </p>
        <div className="recruiter-stats">
          <article className="stat-card">
            <span>Active review: </span>
            <strong>{summary.active}</strong>
          </article>
          <article className="stat-card">
            <span>Shortlisted: </span>
            <strong>{summary.shortlisted}</strong>
          </article>
          <article className="stat-card">
            <span>Discarded: </span>
            <strong>{summary.discarded}</strong>
          </article>
        </div>

        <div className="recruiter-explainer">
          <article className="proof-card">
            <strong>What recruiters see</strong>
            <p>
              Target role, verified task score, top skills, strengths summary,
              and fit score.
            </p>
          </article>
          <article className="proof-card">
            <strong>What stays hidden</strong>
            <p>
              Name, college, referrals, and personal identifiers are removed
              from this review view.
            </p>
          </article>
        </div>
      </section>
      <br></br>
      <section className="content-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Search and filter</span>
            <h2>Keep the review queue focused</h2>
          </div>
          <span className="score-chip">Live view</span>
        </div>
        <p className="muted">
          Search by role, skill, alias, shortlisted student name, or email. Use
          minimum score when you want a tighter shortlist threshold.
        </p>
        <div className="recruiter-filters filters-grid">
          <label className="filter-field filter-field-search">
            <span className="filter-label">Search candidates</span>
            <span className="filter-input-shell">
              <Search size={18} />
              <input
                type="search"
                placeholder="Search by skill, role, name, email, or alias"
                value={filters.query}
                onChange={(event) =>
                  setFilters({ ...filters, query: event.target.value })
                }
              />
            </span>
          </label>
          <label className="filter-field">
            <span className="filter-label">Minimum score</span>
            <span className="filter-input-shell filter-input-shell-compact">
              <CheckCircle2 size={18} />
              <input
                type="number"
                min="0"
                max="100"
                placeholder="0"
                value={filters.minimumScore}
                onChange={(event) => {
                  const nextValue = event.target.value;

                  if (nextValue === "") {
                    setFilters({
                      ...filters,
                      minimumScore: "",
                    });
                    return;
                  }

                  const boundedValue = Math.min(
                    100,
                    Math.max(0, Number(nextValue)),
                  );

                  setFilters({
                    ...filters,
                    minimumScore: String(boundedValue),
                  });
                }}
              />
            </span>
          </label>
          <label className="filter-field">
            <span className="filter-label">Sort by</span>
            <span className="filter-input-shell filter-select-shell">
              <ChevronsDownUp size={18} />
              <select
                value={filters.sortBy}
                onChange={(event) =>
                  setFilters({ ...filters, sortBy: event.target.value })
                }
              >
                <option value="fit-desc">Fit score: high to low</option>
                <option value="fit-asc">Fit score: low to high</option>
                <option value="verified-desc">
                  Verified score: high to low
                </option>
                <option value="verified-asc">
                  Verified score: low to high
                </option>
                <option value="name-asc">Name or alias: A to Z</option>
              </select>
            </span>
          </label>
        </div>
        <div className="action-row">
          <button
            className="button primary"
            onClick={() => loadCandidates(filters)}
            disabled={loading}
          >
            Apply filters
          </button>
          <button
            className="button secondary"
            onClick={() => {
              const nextFilters = {
                query: "",
                minimumScore: "",
                sortBy: "fit-desc",
              };
              setFilters(nextFilters);
              loadCandidates(nextFilters);
            }}
            disabled={loading}
          >
            Reset
          </button>
        </div>
      </section>
      <br></br>

      {loading ? (
        <section className="content-card loading-block">
          Loading candidate cards...
        </section>
      ) : null}

      {!loading && !errorMessage ? (
        <section className="candidate-grid recruiter-candidate-list">
          {visibleCandidates.map((candidate) => (
            <article key={candidate.id} className="candidate-card">
              <div className="candidate-top">
                <div>
                  <span className="eyebrow">{candidate.alias}</span>
                  <h3>{candidate.targetCareer || "Emerging talent"}</h3>
                </div>
                <span className="score-chip">{candidate.fitScore}/100 fit</span>
              </div>
              <div className="candidate-meta">
                <span
                  className={`decision-chip ${candidate.recruiterDecision}`}
                >
                  {candidate.recruiterDecision}
                </span>
                <span className="badge subtle">{candidate.matchedRole}</span>
              </div>
              <div className="candidate-score-grid">
                <article className="mini-metric">
                  <span>Verified score</span>
                  <strong>{candidate.verifiedTaskScore}/100</strong>
                </article>
                <article className="mini-metric">
                  <span>Fit score</span>
                  <strong>{candidate.fitScore}/100</strong>
                </article>
              </div>
              <article className="candidate-summary-card">
                <strong>Strength summary</strong>
                <p>{candidate.strengthsSummary}</p>
              </article>
              <div className="skill-badges">
                {(candidate.topSkills || []).map((skill) => (
                  <span key={`${candidate.id}-${skill}`} className="badge">
                    {skill}
                  </span>
                ))}
              </div>
              <p className="muted recruiter-fit-copy">
                {candidate.fitExplanation}
              </p>
              <div className="candidate-actions">
                <button
                  className="button secondary"
                  onClick={() => setSelectedCandidate(candidate)}
                >
                  <Eye size={16} />
                  Open candidate brief
                </button>
                <button
                  className="button shortlist-button"
                  onClick={() => updateDecision(candidate.id, "shortlisted")}
                  disabled={updatingCandidateId === candidate.id}
                >
                  <Bookmark size={16} />
                  {updatingCandidateId === candidate.id
                    ? "Updating..."
                    : "Shortlist"}
                </button>
                <button
                  className="button discard-button"
                  onClick={() => updateDecision(candidate.id, "discarded")}
                  disabled={updatingCandidateId === candidate.id}
                >
                  <Trash2 size={16} />
                  {updatingCandidateId === candidate.id
                    ? "Updating..."
                    : "Discard"}
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {!loading && errorMessage ? (
        <section className="content-card">
          <p>{errorMessage}</p>
        </section>
      ) : null}

      {!loading && !errorMessage && !visibleCandidates.length ? (
        <section className="content-card">
          <p>
            {hasAnyCandidates
              ? "No active-review candidates matched your current search or score filter."
              : "No candidates are ready for recruiter review yet."}
          </p>
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
                  Review the candidate summary, verified proof, and next actions
                  from one place.
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
              <span
                className={`decision-chip ${selectedCandidate.recruiterDecision}`}
              >
                {selectedCandidate.recruiterDecision}
              </span>
              <span className="badge subtle">
                <Search size={14} />
                {selectedCandidate.matchedRole}
              </span>
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
                  <p>
                    <CheckCircle2 size={15} />
                    <span>
                      <strong>Matched role:</strong>{" "}
                      {selectedCandidate.matchedRole || "Not mapped yet"}
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
                      key={`${selectedCandidate.id}-brief-${skill}`}
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
            <article className="candidate-summary-card">
              <strong>Fit summary</strong>
              <p>
                {briefLoading
                  ? "Generating AI fit summary from the candidate's current skills..."
                  : selectedCandidate.fitExplanation}
              </p>
            </article>
            {selectedCandidate.recruiterDecision === "shortlisted" ? (
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
                      className="button secondary"
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
            ) : null}
            <div className="proof-list recruiter-proof-list">
              {(selectedCandidate.recentProofs || []).map((proof) => (
                <article
                  key={`${selectedCandidate.id}-${proof.title}`}
                  className="proof-card"
                >
                  <div className="proof-head">
                    <strong>{proof.title}</strong>
                    <span className="score-chip">{proof.score}</span>
                  </div>
                  <p>{proof.feedbackSummary}</p>
                </article>
              ))}
            </div>
            {selectedCandidate.recruiterDecision !== "shortlisted" ? (
              <div className="candidate-actions">
                <button
                  className="button shortlist-button"
                  onClick={() =>
                    updateDecision(selectedCandidate.id, "shortlisted")
                  }
                  disabled={updatingCandidateId === selectedCandidate.id}
                >
                  <Bookmark size={16} />
                  {updatingCandidateId === selectedCandidate.id
                    ? "Updating..."
                    : "Shortlist candidate"}
                </button>
                <button
                  className="button discard-button"
                  onClick={() =>
                    updateDecision(selectedCandidate.id, "discarded")
                  }
                  disabled={updatingCandidateId === selectedCandidate.id}
                >
                  <Trash2 size={16} />
                  {updatingCandidateId === selectedCandidate.id
                    ? "Updating..."
                    : "Discard candidate"}
                </button>
              </div>
            ) : null}
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
