"use client";

import {
  CalendarClock,
  Eye,
  EyeOff,
  Mail,
  GraduationCap,
  KeyRound,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, authRequest } from "@/lib/api";
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

export function AdminClient() {
  const router = useRouter();
  const { token, user, hydrated, login, logout } = useAuth();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [deletingUserId, setDeletingUserId] = useState("");
  const [deletingRequestId, setDeletingRequestId] = useState("");
  const [emailDraftState, setEmailDraftState] = useState({
    open: false,
    request: null,
    expertEmail: "",
    subject: "",
    body: "",
    aiMessage: "",
    busy: false,
  });
  const [overview, setOverview] = useState({
    summary: { students: 0, recruiters: 0, jobPostings: 0, expertSessionRequests: 0 },
    students: [],
    recruiters: [],
    shortlistedCandidates: [],
    expertSessionRequests: [],
  });

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!user) {
      return;
    }

    if (user.role !== "admin") {
      router.replace(user.role === "recruiter" ? "/recruiter" : "/dashboard");
      return;
    }

    loadOverview(token);
  }, [hydrated, token, user, router]);

  async function loadOverview(activeToken = token) {
    if (!activeToken) {
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      const data = await authRequest("/admin/overview", activeToken);
      setOverview({
        summary: data.summary || {
          students: 0,
          recruiters: 0,
          jobPostings: 0,
          expertSessionRequests: 0,
        },
        students: data.students || [],
        recruiters: data.recruiters || [],
        shortlistedCandidates: data.shortlistedCandidates || [],
        expertSessionRequests: data.expertSessionRequests || [],
      });
    } catch (error) {
      setErrorMessage(error.message || "Unable to load admin data right now.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();

    try {
      setBusy(true);
      setErrorMessage("");
      const data = await apiRequest("/admin/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });

      login({ token: data.token, user: data.user });
      setPassword("");
      setShowPassword(false);
      await loadOverview(data.token);
    } catch (error) {
      setErrorMessage(error.message || "Unable to unlock admin access.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteUser(targetUser) {
    const confirmed = window.confirm(
      `Delete ${targetUser.name} permanently? This will remove the ${targetUser.role} account and related records.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingUserId(targetUser.id);
      setErrorMessage("");
      await authRequest(`/admin/users/${targetUser.id}`, token, {
        method: "DELETE",
      });
      await loadOverview(token);
    } catch (error) {
      setErrorMessage(error.message || "Unable to delete this account right now.");
    } finally {
      setDeletingUserId("");
    }
  }

  async function handleDeleteExpertSessionRequest(request) {
    const confirmed = window.confirm(
      `Delete the 1:1 session request from ${request.name} permanently?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingRequestId(request.id);
      setErrorMessage("");
      await authRequest(`/admin/expert-sessions/${request.id}`, token, {
        method: "DELETE",
      });

      setEmailDraftState((current) =>
        current.request?.id === request.id
          ? {
              open: false,
              request: null,
              expertEmail: "",
              subject: "",
              body: "",
              aiMessage: "",
              busy: false,
            }
          : current,
      );

      await loadOverview(token);
    } catch (error) {
      setErrorMessage(error.message || "Unable to delete this 1:1 request right now.");
    } finally {
      setDeletingRequestId("");
    }
  }

  async function handleGenerateExpertEmailDraft(event) {
    event.preventDefault();

    if (!emailDraftState.request?.id) {
      return;
    }

    try {
      setEmailDraftState((current) => ({
        ...current,
        busy: true,
        aiMessage: "",
      }));

      const data = await authRequest(
        `/admin/expert-sessions/${emailDraftState.request.id}/email-draft`,
        token,
        {
          method: "POST",
          body: JSON.stringify({ expertEmail: emailDraftState.expertEmail }),
        },
      );

      setEmailDraftState((current) => ({
        ...current,
        subject: data.subject || "",
        body: data.body || "",
        aiMessage:
          data.aiStatus?.mode === "fallback"
            ? "Draft generated in fallback mode."
            : "AI draft ready for Gmail.",
        busy: false,
      }));
    } catch (error) {
      setEmailDraftState((current) => ({
        ...current,
        aiMessage: error.message || "Unable to generate the email draft right now.",
        busy: false,
      }));
    }
  }

  function openDraftInGmail() {
    const { expertEmail, subject, body } = emailDraftState;
    const gmailUrl =
      `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(expertEmail)}` +
      `&su=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;

    window.open(gmailUrl, "_blank", "noopener,noreferrer");
  }

  if (!hydrated) {
    return null;
  }

  if (!user || user.role !== "admin") {
    return (
      <SiteShell authMinimalMobile>
        <section className="auth-hero">
          <div className="auth-layout admin-layout">
            <div className="content-card auth-showcase admin-showcase">
              <span className="eyebrow">Admin access</span>
              <h2>
                View all student and recruiter contact records from one place.
              </h2>
              <p>
                This page is reserved for internal platform administration. Use
                the admin password to unlock student details, recruiter contact
                information, and a quick platform summary.
              </p>
              <div className="feature-grid">
                <article className="proof-card">
                  <strong>Students</strong>
                  <p>
                    Names, emails, careers, skills, and profile completeness.
                  </p>
                </article>
                <article className="proof-card">
                  <strong>Recruiters</strong>
                  <p>Recruiter contact details and posted role visibility.</p>
                </article>
              </div>
            </div>

            <div className="content-card auth-panel">
              <div className="auth-header">
                <span className="eyebrow">Protected dashboard</span>
                <h2>Enter the admin password</h2>
                <p className="muted">
                  Password-protected access keeps this contact data separate
                  from student and recruiter workspaces.
                </p>
              </div>

              <form className="stack-form" onSubmit={handleLogin}>
                <label>
                  <span className="required-label">
                    Admin password
                    <span className="required-mark">*</span>
                  </span>
                  <div className="password-field">
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter admin password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>
                <button className="button primary auth-submit" disabled={busy}>
                  <ShieldCheck size={16} />
                  {busy ? "Checking..." : "Open admin dashboard"}
                </button>
              </form>

              {errorMessage ? (
                <div className="auth-alert error" role="alert">
                  <div className="auth-alert-icon">
                    <KeyRound size={18} />
                  </div>
                  <div>
                    <strong>Access denied</strong>
                    <p>{errorMessage}</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <section className="content-card recruiter-hero">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Admin dashboard</span>
            <h2>Platform people directory and contact center</h2>
          </div>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              logout();
              router.push("/admin");
            }}
          >
            Log out
          </button>
        </div>
        <p>
          Review every student and recruiter account with contact details in one
          place. This view is intended for admin use only.
        </p>
        <div className="recruiter-stats admin-stats-grid">
          <article className="stat-card">
            <span>Total students: </span>
            <strong>{overview.summary.students}</strong>
          </article>
          <article className="stat-card">
            <span>Total recruiters: </span>
            <strong>{overview.summary.recruiters}</strong>
          </article>
          <article className="stat-card">
            <span>Job postings: </span>
            <strong>{overview.summary.jobPostings}</strong>
          </article>
          <article className="stat-card">
            <span>Expert session requests: </span>
            <strong>{overview.summary.expertSessionRequests}</strong>
          </article>
        </div>
      </section>

      {loading ? (
        <section className="content-card loading-block">
          Loading admin records...
        </section>
      ) : null}

      {errorMessage ? (
        <section className="content-card">
          <p>{errorMessage}</p>
        </section>
      ) : null}

      {!loading && !errorMessage ? (
        <>
          <section className="grid two-up admin-directory-grid">
            <div className="content-card">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">
                    <GraduationCap size={14} />
                    Students
                  </span>
                  <h2>All student contacts</h2>
                </div>
                <span className="score-chip">
                  {overview.students.length} records
                </span>
              </div>

              <div className="admin-table-shell">
                <table className="shortlist-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Career</th>
                      <th>Education</th>
                      <th>Joined</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.students.map((student) => (
                      <tr key={student.id}>
                        <td>{student.name}</td>
                        <td>{student.email}</td>
                        <td>{student.targetCareer || "Not added yet"}</td>
                        <td>{student.educationLevel || "Not added yet"}</td>
                        <td>{formatDate(student.joinedAt)}</td>
                        <td>
                          <button
                            type="button"
                            className="button discard-button admin-delete-button"
                            onClick={() =>
                              handleDeleteUser({
                                id: student.id,
                                name: student.name,
                                role: "student",
                              })
                            }
                            disabled={deletingUserId === student.id}
                          >
                            <Trash2 size={14} />
                            {deletingUserId === student.id ? "Deleting..." : "Delete"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="content-card accent-card">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">
                    <Users size={14} />
                    Recruiters
                  </span>
                  <h2>Recruiter contact list</h2>
                </div>
                <span className="score-chip">
                  {overview.recruiters.length} records
                </span>
              </div>

              <div className="admin-table-shell">
                <table className="shortlist-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Joined</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.recruiters.map((recruiter) => (
                      <tr key={recruiter.id}>
                        <td>{recruiter.name}</td>
                        <td>{recruiter.email}</td>
                        <td>{formatDate(recruiter.joinedAt)}</td>
                        <td>
                          <button
                            type="button"
                            className="button discard-button admin-delete-button"
                            onClick={() =>
                              handleDeleteUser({
                                id: recruiter.id,
                                name: recruiter.name,
                                role: "recruiter",
                              })
                            }
                            disabled={deletingUserId === recruiter.id}
                          >
                            <Trash2 size={14} />
                            {deletingUserId === recruiter.id ? "Deleting..." : "Delete"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="content-card">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  <CalendarClock size={14} />
                  Expert sessions
                </span>
                <h2>1:1 session requests</h2>
              </div>
              <span className="score-chip">
                {overview.expertSessionRequests.length} requests
              </span>
            </div>

            <div className="admin-table-shell">
              <table className="shortlist-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Preferred slot</th>
                    <th>Message</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.expertSessionRequests.length ? (
                    overview.expertSessionRequests.map((request) => (
                      <tr key={request.id}>
                        <td>{request.name}</td>
                        <td>{request.email}</td>
                        <td>{request.phone}</td>
                        <td>{request.slotLabel}</td>
                        <td>{request.message}</td>
                        <td>
                          <div className="action-cluster">
                            <button
                              type="button"
                              className="button secondary"
                              onClick={() =>
                                setEmailDraftState({
                                  open: true,
                                  request,
                                  expertEmail: "",
                                  subject: "",
                                  body: "",
                                  aiMessage: "",
                                  busy: false,
                                })
                              }
                              disabled={deletingRequestId === request.id}
                            >
                              <Mail size={14} />
                              Email Expert
                            </button>
                            <button
                              type="button"
                              className="button discard-button admin-delete-button"
                              onClick={() => handleDeleteExpertSessionRequest(request)}
                              disabled={deletingRequestId === request.id}
                            >
                              <Trash2 size={14} />
                              {deletingRequestId === request.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6">No expert session requests yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      {emailDraftState.open ? (
        <div
          className="modal-backdrop"
          onClick={() =>
            setEmailDraftState({
              open: false,
              request: null,
              expertEmail: "",
              subject: "",
              body: "",
              aiMessage: "",
              busy: false,
            })
          }
        >
          <div
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-heading">
              <div>
                <span className="eyebrow">Expert email</span>
                <h2>Email expert for {emailDraftState.request?.name}</h2>
              </div>
              <button
                type="button"
                className="button secondary"
                onClick={() =>
                  setEmailDraftState({
                    open: false,
                    request: null,
                    expertEmail: "",
                    subject: "",
                    body: "",
                    aiMessage: "",
                    busy: false,
                  })
                }
              >
                Close
              </button>
            </div>

            <form className="stack-form" onSubmit={handleGenerateExpertEmailDraft}>
              <label>
                <span className="required-label">
                  Expert email
                  <span className="required-mark">*</span>
                </span>
                <input
                  required
                  type="email"
                  value={emailDraftState.expertEmail}
                  onChange={(event) =>
                    setEmailDraftState((current) => ({
                      ...current,
                      expertEmail: event.target.value,
                    }))
                  }
                  placeholder="expert@example.com"
                />
              </label>

              <article className="proof-card">
                <strong>Student request summary</strong>
                <p>Name: {emailDraftState.request?.name || "Unavailable"}</p>
                <p>Email: {emailDraftState.request?.email || "Unavailable"}</p>
                <p>Phone: {emailDraftState.request?.phone || "Unavailable"}</p>
                <p>Preferred slot: {emailDraftState.request?.slotLabel || "Unavailable"}</p>
                <p>Message: {emailDraftState.request?.message || "Unavailable"}</p>
              </article>

              <button className="button primary" disabled={emailDraftState.busy}>
                {emailDraftState.busy ? "Generating..." : "Generate AI email draft"}
              </button>
            </form>

            {emailDraftState.aiMessage ? (
              <p className="status-banner">{emailDraftState.aiMessage}</p>
            ) : null}

            {emailDraftState.subject && emailDraftState.body ? (
              <div className="roadmap-list admin-email-draft">
                <article className="proof-card">
                  <strong>Subject</strong>
                  <p>{emailDraftState.subject}</p>
                </article>
                <article className="proof-card">
                  <strong>Email draft</strong>
                  <p className="admin-email-body">{emailDraftState.body}</p>
                </article>
                <button
                  type="button"
                  className="button primary"
                  onClick={openDraftInGmail}
                >
                  <Mail size={16} />
                  Open in Gmail
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </SiteShell>
  );
}
