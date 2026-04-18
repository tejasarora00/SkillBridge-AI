"use client";

import {
  AlertTriangle,
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  ShieldCheck,
  UserRoundSearch,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { EmailInputWithSuggestions } from "./email-input-with-suggestions";
import { useAuth } from "./auth-provider";
import { SiteShell } from "./site-shell";

const initialState = {
  name: "",
  email: "",
  password: "",
  role: "student",
};

function getAuthAlert(message) {
  const text = String(message || "").trim();
  const normalized = text.toLowerCase();

  if (
    normalized.includes("invalid credentials") ||
    normalized.includes("invalid email") ||
    normalized.includes("invalid password")
  ) {
    return {
      title: "Email or password is incorrect",
      body: "Double-check your login details and try again. Make sure caps lock is off.",
      tone: "error",
    };
  }

  if (normalized.includes("already in use")) {
    return {
      title: "Account already exists",
      body: "That email is already registered. Try logging in instead.",
      tone: "warning",
    };
  }

  if (!text) {
    return null;
  }

  return {
    title: "Authentication failed",
    body: text,
    tone: "error",
  };
}

export function AuthClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [mode, setMode] = useState("signup");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState(initialState);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const requestedMode = searchParams.get("mode");
    const role = searchParams.get("role");
    const hasExplicitLoginMode =
      requestedMode === "login" || requestedMode === "signin";
    const hasExplicitSignupMode =
      requestedMode === "signup" || requestedMode === "register";

    if (hasExplicitLoginMode) {
      setMode("login");
    } else if (hasExplicitSignupMode) {
      setMode("signup");
    }

    if (role === "recruiter" || role === "student") {
      setForm((current) => ({ ...current, role }));
      if (!hasExplicitSignupMode) {
        setMode("login");
      }
    }
  }, [searchParams]);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const path = mode === "signup" ? "/auth/signup" : "/auth/login";
      const payload =
        mode === "signup"
          ? form
          : {
              email: form.email,
              password: form.password,
            };

      const data = await apiRequest(path, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      login({ token: data.token, user: data.user });
      router.push(data.user.role === "recruiter" ? "/recruiter" : "/dashboard");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  const authAlert = getAuthAlert(message);

  return (
    <SiteShell authMinimalMobile>
      <section className="auth-hero">
        <div className="auth-layout">
          <div className="content-card auth-showcase">
            <span className="eyebrow">Welcome to SkillBridge AI</span>
            <h2>
              One platform for students proving skill and recruiters hiring
              without bias.
            </h2>
            <p>
              Build a profile, get a roadmap, complete practical tasks, and
              share verified ability. Recruiters review anonymized candidate
              signals instead of personal references or background cues.
            </p>
            <div className="feature-grid">
              <article className="proof-card">
                <strong>Students</strong>
                <p>
                  Create a profile, generate a roadmap, and turn tasks into
                  visible proof of skill.
                </p>
              </article>
              <article className="proof-card">
                <strong>Recruiters</strong>
                <p>
                  Review bias-reduced candidate evidence with fit scores,
                  strengths, and shortlist actions.
                </p>
              </article>
            </div>

            <div className="auth-role-grid">
              <article className="auth-role-card">
                <div className="auth-role-icon">
                  <GraduationCap size={20} />
                </div>
                <strong> Students</strong>
                <p>Turn effort into visible, performance-based proof.</p>
              </article>
              <article className="auth-role-card">
                <div className="auth-role-icon">
                  <UserRoundSearch size={20} />
                </div>
                <strong> Recruiters</strong>
                <p>
                  Review verified candidate ability before identity details.
                </p>
              </article>
              <article className="auth-role-card">
                <div className="auth-role-icon">
                  <ShieldCheck size={20} />
                </div>
                <strong> Bias-free</strong>
                <p>Skills, scores, and evidence come first.</p>
              </article>
            </div>
          </div>

          <div className="content-card auth-panel">
            <div className="auth-tabs">
              <button
                type="button"
                className={mode === "signup" ? "tab auth-mode-tab active" : "tab auth-mode-tab"}
                onClick={() => setMode("signup")}
              >
                Sign up
              </button>
              <button
                type="button"
                className={mode === "login" ? "tab auth-mode-tab active" : "tab auth-mode-tab"}
                onClick={() => setMode("login")}
              >
                Log in
              </button>
            </div>

            <div className="auth-header">
              <span className="eyebrow">
                {mode === "signup" ? "Create account" : "Welcome back"}
              </span>
              <h2>
                {mode === "signup"
                  ? "Start your profile"
                  : "Access your workspace"}
              </h2>
              <p className="muted">
                {mode === "signup"
                  ? "Choose your role and get into the platform in a minute."
                  : "Use the same credentials you created during signup to continue where you left off."}
              </p>
            </div>

            <form className="stack-form" onSubmit={handleSubmit}>
              {mode === "signup" ? (
                <label>
                  <span className="required-label">
                    Full name
                    <span className="required-mark">*</span>
                  </span>
                  <input
                    required
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                    placeholder="Your Name..."
                  />
                </label>
              ) : null}
              <label>
                <span className="required-label">
                  Email
                  <span className="required-mark">*</span>
                </span>
                <EmailInputWithSuggestions
                  required
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  placeholder="you@example.com"
                />
              </label>
              <label>
                <span className="required-label">
                  Password
                  <span className="required-mark">*</span>
                </span>
                <div className="password-field">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(event) =>
                      setForm({ ...form, password: event.target.value })
                    }
                    placeholder="Enter password"
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
              {mode === "signup" ? (
                <label>
                  <span className="required-label">
                    Account type
                    <span className="required-mark">*</span>
                  </span>
                  <select
                    required
                    value={form.role}
                    onChange={(event) =>
                      setForm({ ...form, role: event.target.value })
                    }
                  >
                    <option value="student">Student</option>
                    <option value="recruiter">Recruiter</option>
                  </select>
                </label>
              ) : null}
              <button className="button primary auth-submit" disabled={busy}>
                {busy
                  ? "Working..."
                  : mode === "signup"
                    ? "Create account"
                    : "Log in"}
                <ArrowRight size={16} />
              </button>
            </form>

            {authAlert ? (
              <div
                className={`auth-alert ${authAlert.tone}`}
                role="alert"
                aria-live="assertive"
              >
                <div className="auth-alert-icon">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <strong>{authAlert.title}</strong>
                  <p>{authAlert.body}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
