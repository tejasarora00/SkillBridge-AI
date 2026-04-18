"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authRequest } from "@/lib/api";
import { useAuth } from "./auth-provider";
import { SiteShell } from "./site-shell";

function getCareerCoverConfig(targetCareer) {
  const value = (targetCareer || "").toLowerCase();
  const compactValue = value.replace(/[^a-z0-9\s]/g, " ");

  if (
    compactValue.includes("developer") ||
    compactValue.includes("engineer") ||
    compactValue.includes("software") ||
    compactValue.includes("coding") ||
    compactValue.includes("programmer") ||
    compactValue.includes("programming") ||
    compactValue.includes("computer science") ||
    compactValue.includes("it ") ||
    compactValue.includes("web") ||
    compactValue.includes("app") ||
    compactValue.includes("cyber")
  ) {
    return {
      eyebrow: "Technology Track",
      subtitle:
        "Your path is pointed toward creating real products and solving real problems with code.",
      sceneType: "technology",
      imagePosition: "right center",
    };
  }

  if (
    value.includes("doctor") ||
    value.includes("nurse") ||
    value.includes("medical") ||
    value.includes("health") ||
    value.includes("pharma")
  ) {
    return {
      eyebrow: "Healthcare Track",
      subtitle:
        "You are building toward a career where preparation, empathy, and trust matter every day.",
      sceneType: "healthcare",
      imagePosition: "center",
    };
  }

  if (
    value.includes("design") ||
    value.includes("artist") ||
    value.includes("ui") ||
    value.includes("ux") ||
    value.includes("animation") ||
    value.includes("fashion")
  ) {
    return {
      eyebrow: "Creative Track",
      subtitle:
        "Your creative direction can become visible proof through bold projects and thoughtful execution.",
      sceneType: "creative",
      imagePosition: "center",
    };
  }

  if (
    compactValue.includes("finance") ||
    compactValue.includes("chartered accountant") ||
    compactValue.includes("accountant") ||
    compactValue.includes(" ca ") ||
    compactValue.startsWith("ca ") ||
    compactValue.endsWith(" ca") ||
    compactValue.includes("account") ||
    compactValue.includes("commerce") ||
    compactValue.includes("analyst") ||
    compactValue.includes("data") ||
    compactValue.includes("bank")
  ) {
    return {
      eyebrow: "Analytics Track",
      subtitle:
        "The strongest finance and analytics profiles show clarity, discipline, and decision-making value.",
      sceneType: "finance",
      imagePosition: "right center",
    };
  }

  if (
    value.includes("teacher") ||
    value.includes("education") ||
    value.includes("professor") ||
    value.includes("trainer") ||
    value.includes("mentor")
  ) {
    return {
      eyebrow: "Education Track",
      subtitle:
        "Your future work can create impact through clarity, communication, and student trust.",
      sceneType: "education",
      imagePosition: "center",
    };
  }

  return {
    eyebrow: "Career Track",
    subtitle:
      "Every task, roadmap step, and project proof brings your target career closer and more believable.",
    sceneType: "general",
    imagePosition: "center",
  };
}

function getCareerSceneMarkup(sceneType) {
  if (sceneType === "technology") {
    return `
      <rect x="812" y="92" width="608" height="334" rx="28" fill="rgba(255,255,255,0.2)" stroke="rgba(201,236,255,0.88)" stroke-width="6"/>
      <rect x="846" y="132" width="540" height="246" rx="16" fill="rgba(10,28,46,0.82)"/>
      <path d="M880 186h150M880 226h200M880 266h118" stroke="#9DDCF8" stroke-width="10" stroke-linecap="round"/>
      <path d="M1110 186h228M1110 226h152M1110 266h206" stroke="#FFC893" stroke-width="10" stroke-linecap="round"/>
      <path d="M1240 312l30 30-30 30M1320 312l-30 30 30 30" stroke="#D2ECFF" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="1040" y="444" width="154" height="20" rx="10" fill="rgba(214,240,255,0.9)"/>
      <rect x="1010" y="470" width="214" height="16" rx="8" fill="rgba(214,240,255,0.62)"/>
      <rect x="786" y="488" width="664" height="110" rx="22" fill="rgba(255,255,255,0.18)" stroke="rgba(201,236,255,0.68)" stroke-width="4"/>
      <g fill="#ECF8FF">
        <rect x="828" y="524" width="44" height="28" rx="6"/><rect x="882" y="524" width="44" height="28" rx="6"/><rect x="936" y="524" width="44" height="28" rx="6"/>
        <rect x="990" y="524" width="44" height="28" rx="6"/><rect x="1044" y="524" width="44" height="28" rx="6"/><rect x="1098" y="524" width="44" height="28" rx="6"/>
        <rect x="1152" y="524" width="44" height="28" rx="6"/><rect x="1206" y="524" width="44" height="28" rx="6"/><rect x="1260" y="524" width="44" height="28" rx="6"/>
      </g>
      <circle cx="220" cy="210" r="80" fill="rgba(255,255,255,0.2)"/>
      <path d="M184 208h72M220 172v72" stroke="#9DDCF8" stroke-width="8" stroke-linecap="round"/>
      <path d="M146 314l30 30-30 30M294 314l-30 30 30 30" stroke="#E9F7FF" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    `;
  }

  if (sceneType === "finance") {
    return `
      <rect x="790" y="72" width="642" height="542" rx="28" fill="rgba(255,255,255,0.18)" stroke="rgba(201,236,255,0.76)" stroke-width="6"/>
      <rect x="848" y="124" width="526" height="102" rx="18" fill="rgba(12,34,56,0.84)"/>
      <path d="M902 172h112M1038 172h82M1142 172h92M1258 172h70" stroke="#EAF7FF" stroke-width="10" stroke-linecap="round"/>
      <rect x="848" y="256" width="150" height="88" rx="14" fill="rgba(152,216,242,0.48)"/>
      <rect x="1012" y="256" width="150" height="88" rx="14" fill="rgba(152,216,242,0.48)"/>
      <rect x="1176" y="256" width="198" height="88" rx="14" fill="rgba(255,200,147,0.5)"/>
      <rect x="848" y="362" width="150" height="88" rx="14" fill="rgba(152,216,242,0.48)"/>
      <rect x="1012" y="362" width="150" height="88" rx="14" fill="rgba(152,216,242,0.48)"/>
      <rect x="1176" y="362" width="198" height="192" rx="14" fill="rgba(255,200,147,0.58)"/>
      <path d="M240 548h360" stroke="#D7EEFF" stroke-width="10" stroke-linecap="round"/>
      <path d="M240 514h260" stroke="#9DDCF8" stroke-width="10" stroke-linecap="round"/>
      <circle cx="292" cy="348" r="86" fill="rgba(255,255,255,0.2)"/>
      <path d="M250 348h84M292 306v84" stroke="#E9F7FF" stroke-width="10" stroke-linecap="round"/>
    `;
  }

  if (sceneType === "healthcare") {
    return `
      <circle cx="592" cy="112" r="66" fill="rgba(255,255,255,0.14)" stroke="rgba(191,230,255,0.56)" stroke-width="3"/>
      <rect x="564" y="84" width="56" height="56" rx="12" fill="rgba(24,63,54,0.7)"/>
      <path d="M592 96v32M576 112h32" stroke="#9AF0CF" stroke-width="7" stroke-linecap="round"/>
      <rect x="462" y="170" width="220" height="58" rx="14" fill="rgba(255,255,255,0.16)" stroke="rgba(191,230,255,0.56)" stroke-width="3"/>
      <path d="M486 200h38M536 200h22M568 200h42M620 200h26" stroke="#EAF7FF" stroke-width="5" stroke-linecap="round"/>
    `;
  }

  if (sceneType === "creative") {
    return `
      <path d="M520 72c42-22 90-12 124 18 28 25 36 62 12 86-18 18-46 22-64 6-16-14-10-40 10-44 18-4 30 16 14 28" fill="none" stroke="#F5B176" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="560" cy="112" r="10" fill="#8FD0E3"/><circle cx="598" cy="98" r="10" fill="#FFE0BF"/><circle cx="626" cy="126" r="10" fill="#9ADFB6"/>
      <rect x="470" y="188" width="220" height="54" rx="14" fill="rgba(255,255,255,0.16)" stroke="rgba(191,230,255,0.56)" stroke-width="3"/>
      <path d="M492 214h62M566 214h30M610 214h58" stroke="#EAF7FF" stroke-width="5" stroke-linecap="round"/>
    `;
  }

  if (sceneType === "education") {
    return `
      <rect x="460" y="62" width="230" height="154" rx="16" fill="rgba(16,41,66,0.72)" stroke="rgba(191,230,255,0.56)" stroke-width="3"/>
      <path d="M484 92h180M484 120h132M484 148h164" stroke="#BFE6FF" stroke-width="5" stroke-linecap="round"/>
      <path d="M520 234l56-24 56 24-56 24-56-24z" fill="rgba(255,255,255,0.2)" stroke="#F5B176" stroke-width="3" stroke-linejoin="round"/>
    `;
  }

  return `
    <path d="M486 214c44-72 104-112 188-126" fill="none" stroke="#8FD0E3" stroke-width="7" stroke-linecap="round"/>
    <path d="M624 78h64v64" fill="none" stroke="#F5B176" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="520" cy="202" r="12" fill="#F5B176"/><circle cx="590" cy="152" r="12" fill="#8FD0E3"/><circle cx="662" cy="102" r="12" fill="#9ADFB6"/>
  `;
}

function getCareerCoverStyle(targetCareer) {
  const config = getCareerCoverConfig(targetCareer);
  const sceneMarkup = getCareerSceneMarkup(config.sceneType);
  const svg = `
    <svg width="1600" height="900" viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg" fill="none">
      <rect width="1600" height="900" fill="url(#bg)"/>
      <circle cx="220" cy="190" r="220" fill="rgba(143,208,227,0.18)"/>
      <circle cx="1380" cy="110" r="180" fill="rgba(245,177,118,0.16)"/>
      <path d="M80 760C300 620 520 650 760 790" stroke="rgba(143,208,227,0.26)" stroke-width="42" stroke-linecap="round"/>
      ${sceneMarkup}
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1600" y2="900">
          <stop offset="0%" stop-color="#10324E"/>
          <stop offset="48%" stop-color="#1A5578"/>
          <stop offset="100%" stop-color="#783F2A"/>
        </linearGradient>
      </defs>
    </svg>
  `;

  return {
    "--career-cover-image": `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
    "--career-cover-fallback":
      "linear-gradient(135deg, rgba(23, 107, 135, 0.5), rgba(217, 111, 50, 0.42))",
    "--career-cover-position": config.imagePosition || "center",
  };
}

function getCareerCoverIllustrationSrc(targetCareer) {
  const config = getCareerCoverConfig(targetCareer);
  const sceneMarkup = getCareerSceneMarkup(config.sceneType);
  const svg = `
    <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg" fill="none" preserveAspectRatio="xMidYMid slice">
      <rect width="1600" height="900" fill="transparent"/>
      <rect x="720" y="40" width="840" height="760" rx="42" fill="rgba(255,255,255,0.08)"/>
      <circle cx="220" cy="190" r="220" fill="rgba(143,208,227,0.18)"/>
      <circle cx="1380" cy="110" r="180" fill="rgba(245,177,118,0.16)"/>
      <path d="M80 760C300 620 520 650 760 790" stroke="rgba(143,208,227,0.26)" stroke-width="42" stroke-linecap="round"/>
      ${sceneMarkup}
    </svg>
  `;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function DashboardClient() {
  const router = useRouter();
  const { token, user, hydrated } = useAuth();
  const [dashboard, setDashboard] = useState({
    profile: null,
    roadmap: null,
    taskSubmissions: [],
    todoItems: [],
    todoCompletionSeries: [],
  });
  const [message, setMessage] = useState("");
  const [aiMessage, setAiMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [roadmapChatInput, setRoadmapChatInput] = useState("");
  const [roadmapChatBusy, setRoadmapChatBusy] = useState(false);
  const [roadmapChatPreview, setRoadmapChatPreview] = useState(null);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!token || user?.role !== "student") {
      router.replace("/auth");
      return;
    }

    loadDashboard();
  }, [hydrated, token, user, router]);

  async function loadDashboard() {
    try {
      const data = await authRequest("/students/dashboard", token);
      setDashboard(data);
      try {
        const status = await authRequest("/ai/status", token);
        if (status.aiStatus?.message) {
          setAiMessage(status.aiStatus.message);
        }
      } catch {}
      if (!data.profile?.profileCompleteness) {
        router.replace("/onboarding");
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function generateRoadmap() {
    setBusy(true);
    setMessage("");

    try {
      const data = await authRequest("/ai/roadmap", token, {
        method: "POST",
      });

      setDashboard((current) => ({ ...current, roadmap: data.roadmap }));
      setAiMessage(data.aiStatus?.message || "");
      setMessage(
        data.aiStatus?.mode === "fallback"
          ? "Roadmap generated in demo fallback mode."
          : "Your roadmap is ready.",
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function refineRoadmapWithChat(event) {
    event.preventDefault();
    const userMessage = roadmapChatInput.trim();
    if (!userMessage) {
      return;
    }

    setRoadmapChatBusy(true);
    setMessage("");
    setRoadmapChatPreview({
      user: userMessage,
      assistant: "Updating your roadmap...",
    });
    setRoadmapChatInput("");

    try {
      const data = await authRequest("/ai/roadmap/refine", token, {
        method: "POST",
        body: JSON.stringify({ userMessage }),
      });

      setDashboard((current) => ({ ...current, roadmap: data.roadmap }));
      setAiMessage(data.aiStatus?.message || "");
      setMessage(
        data.aiStatus?.mode === "fallback"
          ? "Roadmap updated in demo fallback mode."
          : "Roadmap updated from your AI chat.",
      );
      setRoadmapChatPreview({
        user: userMessage,
        assistant:
          data.assistantReply ||
          "I updated your roadmap using the new context you shared.",
      });
    } catch (error) {
      setMessage(error.message);
      setRoadmapChatPreview({
        user: userMessage,
        assistant:
          error.message ||
          "I couldn't update the roadmap right now. Please try again.",
      });
    } finally {
      setRoadmapChatBusy(false);
    }
  }

  if (!hydrated || loading) {
    return (
      <SiteShell>
        <section className="content-card">
          <p>Loading student dashboard...</p>
        </section>
      </SiteShell>
    );
  }

  const { profile, roadmap, taskSubmissions } = dashboard;
  const canGenerateRoadmap = Boolean(
    profile?.targetCareer && (profile?.currentSkills || []).length,
  );
  const visibleTaskSubmissions = (taskSubmissions || [])
    .filter((submission) => Number(submission.aiScore) > 0)
    .slice(0, 4);
  const coverConfig = getCareerCoverConfig(profile?.targetCareer);
  const coverStyle = getCareerCoverStyle(profile?.targetCareer);
  const coverIllustrationSrc = getCareerCoverIllustrationSrc(profile?.targetCareer);

  return (
    <SiteShell>
      <section className="dashboard-cover" style={coverStyle}>
        <img
          className="dashboard-cover-illustration"
          src={coverIllustrationSrc}
          alt=""
          aria-hidden="true"
        />
        <div className="dashboard-cover-content">
          <span className="dashboard-cover-eyebrow">{coverConfig.eyebrow}</span>
          <div className="dashboard-cover-heading">
            <p className="dashboard-cover-intro">
              {user?.name ? user.name.toUpperCase() : "STUDENT"}
            </p>
            <h1>{profile?.targetCareer || "Set your target career"}</h1>
          </div>
          <p className="dashboard-cover-subtitle">{coverConfig.subtitle}</p>
          <div className="dashboard-cover-actions">
            <Link href="/tasks" className="button primary">
              Start proving your skills
            </Link>
            <Link href="/onboarding" className="button secondary">
              Refine your target
            </Link>
          </div>
        </div>
      </section>

      <section className="content-card dashboard-hero">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Student workspace</span>
            <h2>Welcome back, {user?.name}</h2>
          </div>
          <span className="score-chip">
            {profile?.profileCompleteness || 0}% complete
          </span>
        </div>
        <p>
          Build your profile, generate a roadmap, complete practical tasks, and
          create a stronger, evidence-based career story for recruiters to
          evaluate fairly.
        </p>
        <div className="overview-grid">
          <article className="stat-card">
            <span>Target career: </span>
            <strong>{profile?.targetCareer || "Finish onboarding"}</strong>
          </article>
          <article className="stat-card">
            <span>Education: </span>
            <strong>{profile?.educationLevel || "Add details"}</strong>
          </article>
          <article className="stat-card">
            <span>Skill score: </span>
            <strong>{profile?.overallSkillScore || 0}/100</strong>
          </article>
          <article className="stat-card">
            <span>Current strengths: </span>
            <strong>
              {(profile?.currentSkills || []).slice(0, 2).join(" / ") ||
                "Select skills"}
            </strong>
          </article>
        </div>
        <div className="action-row">
          <Link href="/onboarding" className="button secondary">
            Edit onboarding
          </Link>
          <Link href="/tasks" className="button secondary">
            Submit task
          </Link>
          <Link href="/todos" className="button secondary">
            Open planner
          </Link>
          <Link href="/compare" className="button secondary">
            ATS Resume Check
          </Link>
          <Link href="/interview" className="button secondary">
            Mock interview
          </Link>
          <Link href="/expert-session" className="button secondary">
            Book expert session
          </Link>
        </div>
      </section>

      <section className="content-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Student planner</span>
            <h2>Keep your weekly tasks organized</h2>
          </div>
          <Link href="/todos" className="button primary">
            Open Planner
          </Link>
        </div>
        <p>
          Manage your personal to-do list, set due dates, tick off completed
          work, and track how many tasks you finish each day from one dedicated
          planner page.
        </p>
      </section>
      <br></br>
      <section className="content-card accent-card dashboard-roadmap-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">AI Career GPS</span>
            <h2>Personalized roadmap</h2>
          </div>
          <button
            className="button primary"
            onClick={generateRoadmap}
            disabled={busy || !canGenerateRoadmap}
          >
            {busy ? "Generating..." : "Generate roadmap"}
          </button>
        </div>

        {!canGenerateRoadmap ? (
          <div className="inline-note">
            Add your target career and current skills in onboarding before
            generating a roadmap.
          </div>
        ) : null}

        {roadmap ? (
          <div className="roadmap-list">
            <article className="proof-card roadmap-overview-card">
              <div className="roadmap-overview-head">
                <div>
                  <span className="eyebrow">Career direction</span>
                  <strong>Your roadmap</strong>
                </div>
              </div>
              <p className="roadmap-summary">{roadmap.summary}</p>
            </article>

            <article className="proof-card roadmap-steps-card">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Step by step</span>
                  <br></br>
                  <br></br>
                  <strong>Learning roadmap in 3 steps</strong>
                </div>
              </div>
              <div className="step-list">
                {(roadmap.learningRoadmap || []).map((item, index) => (
                  <div key={`${item}-${index}`} className="step-item">
                    <span className="step-index">{index + 1}</span>
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </article>

            <div className="roadmap-detail-grid">
              <article className="proof-card">
                <strong>Current strengths</strong>
                <div className="skill-badges">
                  {(roadmap.currentStrengths || []).map((item) => (
                    <span key={item} className="badge">
                      {item}
                    </span>
                  ))}
                </div>
              </article>
              <article className="proof-card">
                <strong>Missing skills</strong>
                <div className="skill-badges">
                  {(roadmap.missingSkills || []).map((item) => (
                    <span key={item} className="badge subtle">
                      {item}
                    </span>
                  ))}
                </div>
              </article>
              <article className="proof-card">
                <strong>Recommended next steps</strong>
                <div className="skill-badges">
                  {(roadmap.recommendedNextSteps || []).map((item) => (
                    <span key={item} className="badge">
                      {item}
                    </span>
                  ))}
                </div>
              </article>
              <article className="proof-card">
                <strong>Projects to build</strong>
                <div className="roadmap-projects">
                  <p>
                    <span>Beginner</span>
                    {roadmap.beginnerProject}
                  </p>
                  <p>
                    <span>Intermediate</span>
                    {roadmap.intermediateProject}
                  </p>
                </div>
              </article>
            </div>

            <article className="proof-card">
              <div className="section-heading">
                <div>
                  <strong>Chat with AI to edit your roadmap</strong>
                  <p className="muted">
                    Add more context and AI will revise the roadmap.
                  </p>
                </div>
              </div>
              {roadmapChatPreview ? (
                <div className="roadmap-chat-list compact">
                  <div className="roadmap-chat-bubble user compact">
                    <strong>You</strong>
                    <p>{roadmapChatPreview.user}</p>
                  </div>
                  <div className="roadmap-chat-bubble assistant compact">
                    <strong>AI</strong>
                    <p>{roadmapChatPreview.assistant}</p>
                  </div>
                </div>
              ) : (
                <p className="muted compact-roadmap-note">
                  Ask for changes like time limits, project types, or a new
                  focus area.
                </p>
              )}
              <form className="stack-form" onSubmit={refineRoadmapWithChat}>
                <label>
                  <span className="required-label">
                    Update request
                    <span className="required-mark">*</span>
                  </span>
                  <textarea
                    required
                    rows="3"
                    value={roadmapChatInput}
                    onChange={(event) =>
                      setRoadmapChatInput(event.target.value)
                    }
                    placeholder="Example: Focus more on frontend projects and keep the plan light for 5 hours a week."
                    disabled={roadmapChatBusy}
                  />
                </label>
                <button
                  className="button primary"
                  disabled={roadmapChatBusy || !roadmapChatInput.trim()}
                >
                  {roadmapChatBusy ? "Updating..." : "Update roadmap with AI"}
                </button>
              </form>
            </article>
          </div>
        ) : (
          <p className="muted">
            Generate your roadmap to see strengths, gaps, next steps, and
            suggested projects.
          </p>
        )}
      </section>
      <br></br>
      <section className="content-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Skill proof</span>
            <h2>Recent submissions</h2>
          </div>
        </div>

        <div className="proof-list">
          {visibleTaskSubmissions.length ? (
            visibleTaskSubmissions.map((submission) => (
              <article key={submission._id} className="proof-card">
                <div className="proof-head">
                  <strong>{submission.skillCategory}</strong>
                  <span className="score-chip">{submission.aiScore}/100</span>
                </div>
                <p>{submission.taskPrompt}</p>
                <p>{(submission.strengths || []).slice(0, 1).join("")}</p>
                <div className="skill-badges">
                  {(submission.suggestions || []).slice(0, 2).map((item) => (
                    <span key={`${submission._id}-${item}`} className="badge">
                      {item}
                    </span>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <p className="muted">
              No scored submissions yet. Complete a practical task to generate
              verified skill feedback.
            </p>
          )}
        </div>
      </section>
      {message ? <p className="status-banner">{message}</p> : null}
    </SiteShell>
  );
}
