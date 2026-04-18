"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authRequest } from "@/lib/api";
import { downloadResumeFromDataUrl } from "@/lib/resume-download";
import { useAuth } from "./auth-provider";
import { SiteShell } from "./site-shell";

const MAX_RESUME_FILE_SIZE = 3 * 1024 * 1024;
const ALLOWED_RESUME_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const INTEREST_OPTIONS = [
  "Artificial Intelligence",
  "Web Development",
  "App Development",
  "Software Engineering",
  "Computer Science Research",
  "FinTech",
  "EdTech",
  "Data Science",
  "Machine Learning",
  "Robotics",
  "Biotechnology",
  "Healthcare",
  "Medicine",
  "Pharmacy",
  "Nursing",
  "Psychology",
  "Physics",
  "Chemistry",
  "Mathematics",
  "Statistics",
  "Environmental Science",
  "Agriculture",
  "Civil Engineering",
  "Mechanical Engineering",
  "Electrical Engineering",
  "Electronics",
  "Architecture",
  "Cybersecurity",
  "Product Design",
  "Graphic Design",
  "Fashion Design",
  "Interior Design",
  "Cloud Computing",
  "Developer Tools",
  "Digital Marketing",
  "Marketing",
  "Brand Strategy",
  "Sales",
  "Business Analytics",
  "Accounting",
  "Finance",
  "Investment Analysis",
  "Banking",
  "Economics",
  "Entrepreneurship",
  "Human Resources",
  "Operations Management",
  "Supply Chain",
  "E-commerce",
  "Law",
  "Public Policy",
  "Journalism",
  "Mass Communication",
  "Content Creation",
  "Creative Writing",
  "Teaching",
  "Social Work",
  "Public Speaking",
];

const SKILL_OPTIONS = [
  "React",
  "Next.js",
  "Node.js",
  "Python",
  "SQL",
  "JavaScript",
  "TypeScript",
  "Java",
  "C",
  "C++",
  "C#",
  "Go",
  "Rust",
  "PHP",
  "R",
  "Excel",
  "Power BI",
  "Tableau",
  "Financial Modeling",
  "Bookkeeping",
  "Tally",
  "Accounting Principles",
  "Taxation Basics",
  "Market Research",
  "Business Analysis",
  "Data Visualization",
  "Prompt Engineering",
  "Data Analysis",
  "Content Writing",
  "Copywriting",
  "Technical Writing",
  "Research Writing",
  "Report Writing",
  "UI Design",
  "Communication",
  "Presentation Skills",
  "Public Speaking",
  "Critical Thinking",
  "Problem Solving",
  "Leadership",
  "Teamwork",
  "Time Management",
  "Negotiation",
  "Project Management",
  "Customer Service",
  "Sales Communication",
  "Digital Marketing",
  "SEO",
  "Social Media Marketing",
  "Graphic Design",
  "Video Editing",
  "Canva",
  "Figma",
  "Adobe Photoshop",
  "Adobe Illustrator",
  "UX Research",
  "Teaching",
  "Lesson Planning",
  "Statistical Analysis",
  "Laboratory Skills",
  "Biology Fundamentals",
  "Chemistry Fundamentals",
  "Physics Problem Solving",
  "Legal Research",
  "Case Analysis",
  "Economics Analysis",
  "Content Strategy",
];

const TARGET_CAREER_OPTIONS = [
  "Software Engineer",
  "Frontend Engineer",
  "Backend Engineer",
  "Full Stack Developer",
  "Mobile App Developer",
  "Data Analyst",
  "Data Scientist",
  "Machine Learning Engineer",
  "AI Engineer",
  "Cybersecurity Analyst",
  "Cloud Engineer",
  "DevOps Engineer",
  "UI/UX Designer",
  "Product Designer",
  "Graphic Designer",
  "Digital Marketing Specialist",
  "Content Writer",
  "Copywriter",
  "Journalist",
  "Video Editor",
  "Business Analyst",
  "Financial Analyst",
  "Accountant",
  "Chartered Accountant (CA)",
  "Investment Analyst",
  "Banking Associate",
  "Sales Executive",
  "Marketing Executive",
  "HR Specialist",
  "Operations Executive",
  "Supply Chain Analyst",
  "Entrepreneur",
  "Teacher",
  "Professor",
  "Research Assistant",
  "Scientist",
  "Lab Technician",
  "Doctor",
  "Nurse",
  "Pharmacist",
  "Psychologist",
  "Lawyer",
  "Legal Associate",
  "Civil Engineer",
  "Mechanical Engineer",
  "Electrical Engineer",
  "Architect",
  "Public Policy Analyst",
  "Social Worker",
];

const EDUCATION_LEVEL_OPTIONS = [
  "Class 11",
  "Class 12",
  "Diploma Student",
  "Polytechnic Student",
  "1st Year B.Tech",
  "2nd Year B.Tech",
  "3rd Year B.Tech",
  "4th Year B.Tech",
  "B.Sc Student",
  "B.Com Student",
  "B.A Student",
  "BBA Student",
  "BCA Student",
  "B.Des Student",
  "Law Student",
  "Medical Student",
  "Pharmacy Student",
  "Nursing Student",
  "M.Tech Student",
  "M.Sc Student",
  "M.Com Student",
  "M.A Student",
  "MBA Student",
  "Postgraduate Student",
  "Research Scholar",
  "Working Professional",
  "Career Switcher",
  "Fresher",
];

const initialForm = {
  fullName: "",
  email: "",
  interests: [],
  currentSkills: [],
  targetCareer: "",
  educationLevel: "",
  uploadedResume: null,
};

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      const [, dataBase64 = ""] = result.split(",");
      resolve(dataBase64);
    };

    reader.onerror = () => {
      reject(new Error("Unable to read the selected resume file."));
    };

    reader.readAsDataURL(file);
  });
}

function addUniqueValue(values, option) {
  const normalized = String(option || "").trim();
  if (!normalized) {
    return values;
  }

  const exists = values.some(
    (item) => item.toLowerCase() === normalized.toLowerCase(),
  );
  return exists ? values : [...values, normalized];
}

function removeValue(values, option) {
  return values.filter((item) => item !== option);
}

function SelectWithManualAdd({
  label,
  options,
  values,
  onAdd,
  onRemove,
  helper,
  selectPlaceholder,
  manualPlaceholder,
  required = false,
}) {
  const [selectedOption, setSelectedOption] = useState("");
  const [manualValue, setManualValue] = useState("");

  function handleSelectAdd() {
    if (!selectedOption) {
      return;
    }
    onAdd(selectedOption);
    setSelectedOption("");
  }

  function handleManualAdd() {
    if (!manualValue.trim()) {
      return;
    }
    onAdd(manualValue);
    setManualValue("");
  }

  return (
    <div className="selection-group">
      <div className="selection-head">
        <label>
          <span className={required ? "required-label" : undefined}>
            {label}
            {required ? <span className="required-mark">*</span> : null}
          </span>
        </label>
        <span className="field-note">{helper}</span>
      </div>
      <div className="selection-controls">
        <div className="selection-picker">
          <select
            value={selectedOption}
            onChange={(event) => setSelectedOption(event.target.value)}
          >
            <option value="">{selectPlaceholder}</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="button secondary selection-add-button"
            onClick={handleSelectAdd}
          >
            Add
          </button>
        </div>
        <div className="selection-picker">
          <input
            value={manualValue}
            onChange={(event) => setManualValue(event.target.value)}
            placeholder={manualPlaceholder}
          />
          <button
            type="button"
            className="button secondary selection-add-button"
            onClick={handleManualAdd}
          >
            Add custom
          </button>
        </div>
      </div>
      <div className="selection-grid">
        {values.length ? (
          values.map((option) => (
            <button
              key={option}
              type="button"
              className="selection-chip active"
              onClick={() => onRemove(option)}
            >
              {option} ×
            </button>
          ))
        ) : (
          <p className="muted">No selections yet.</p>
        )}
      </div>
    </div>
  );
}

export function OnboardingClient() {
  const router = useRouter();
  const { token, user, hydrated, login } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!token || user?.role !== "student") {
      router.replace("/auth");
      return;
    }

    async function loadProfile() {
      try {
        const data = await authRequest("/students/profile", token);
        setForm({
          fullName: user?.name || "",
          email: user?.email || "",
          interests: data.profile?.interests || [],
          currentSkills: data.profile?.currentSkills || [],
          targetCareer: data.profile?.targetCareer || "",
          educationLevel: data.profile?.educationLevel || "",
          uploadedResume: data.profile?.uploadedResume?.fileName
            ? data.profile.uploadedResume
            : null,
        });
      } catch (error) {
        setMessage(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [hydrated, token, user, router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const payload = {
      fullName: form.fullName,
      interests: form.interests,
      currentSkills: form.currentSkills,
      targetCareer: form.targetCareer,
      educationLevel: form.educationLevel,
      uploadedResume: form.uploadedResume,
    };

    try {
      await authRequest("/students/profile", token, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      login({
        token,
        user: {
          ...user,
          name: form.fullName,
          email: form.email,
        },
      });
      setMessage("Your profile is ready.");
      router.push("/dashboard");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleResumeChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!ALLOWED_RESUME_FILE_TYPES.includes(file.type)) {
      setMessage("Resume must be a PDF or Word document.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_RESUME_FILE_SIZE) {
      setMessage("Resume file is too large. Please keep it under 3 MB.");
      event.target.value = "";
      return;
    }

    try {
      setMessage("");
      const payload = new FormData();
      payload.append("resumeFile", file);

      const data = await authRequest("/students/profile/resume", token, {
        method: "POST",
        body: payload,
      });

      setForm({
        ...form,
        uploadedResume: data.uploadedResume || null,
      });
      setMessage("Resume uploaded and saved.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      event.target.value = "";
    }
  }

  async function handleSavedResumeDownload() {
    try {
      setMessage("");
      const data = await authRequest("/ai/resume-file", token);
      downloadResumeFromDataUrl({
        dataUrl: data.dataUrl,
        fileName: data.fileName,
      });
    } catch (error) {
      setMessage(error.message);
    }
  }

  if (!hydrated || loading) {
    return (
      <SiteShell>
        <section className="content-card">
          <p>Loading your onboarding workspace...</p>
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <section className="content-card progress-card">
        <span className="eyebrow">Student profile</span>
        <h2>Build a profile that the platform can actually work with</h2>
        <div className="progress-shell">
          <div className="progress-fill" style={{ width: "82%" }} />
        </div>
        <p>
          Choose your interests and strengths, define your direction, and unlock
          roadmap, task, and recruiter insights.
        </p>
        <div className="feature-grid onboarding-highlights">
          <article className="proof-card">
            <strong>Better roadmap quality</strong>
            <p>
              Interests, current skills, and target career make the AI guidance
              much more useful.
            </p>
          </article>
          <article className="proof-card">
            <strong>Fairer recruiter view</strong>
            <p>
              Your profile powers anonymous, skills-first summaries instead of
              identity-first screening.
            </p>
          </article>
        </div>
      </section>
      <br></br>
      <section className="content-card">
        <form className="stack-form" onSubmit={handleSubmit}>
          <div className="grid compact">
            <label>
              <span className="required-label">
                Full name
                <span className="required-mark">*</span>
              </span>
              <input
                required
                value={form.fullName}
                onChange={(event) =>
                  setForm({ ...form, fullName: event.target.value })
                }
                placeholder="Your Name..."
              />
            </label>
            <label>
              <span className="required-label">
                Email
                <span className="required-mark">*</span>
              </span>
              <input required type="email" value={form.email} readOnly />
            </label>
          </div>

          <SelectWithManualAdd
            label="Interests"
            options={INTEREST_OPTIONS}
            values={form.interests}
            onAdd={(option) =>
              setForm({
                ...form,
                interests: addUniqueValue(form.interests, option),
              })
            }
            onRemove={(option) =>
              setForm({
                ...form,
                interests: removeValue(form.interests, option),
              })
            }
            helper={`${form.interests.length} selected`}
            selectPlaceholder="Choose an interest"
            manualPlaceholder="Add your own interest"
            required
          />

          <SelectWithManualAdd
            label="Current skills"
            options={SKILL_OPTIONS}
            values={form.currentSkills}
            onAdd={(option) =>
              setForm({
                ...form,
                currentSkills: addUniqueValue(form.currentSkills, option),
              })
            }
            onRemove={(option) =>
              setForm({
                ...form,
                currentSkills: removeValue(form.currentSkills, option),
              })
            }
            helper={`${form.currentSkills.length} selected`}
            selectPlaceholder="Choose a skill"
            manualPlaceholder="Add your own skill"
            required
          />

          <div className="grid compact">
            <label>
              <span className="required-label">
                Target career
                <span className="required-mark">*</span>
              </span>
              <input
                required
                value={form.targetCareer}
                list="target-career-options"
                onChange={(event) =>
                  setForm({ ...form, targetCareer: event.target.value })
                }
                placeholder="Choose or type your target career"
              />
              <datalist id="target-career-options">
                {TARGET_CAREER_OPTIONS.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>
            <label>
              <span className="required-label">
                Education level
                <span className="required-mark">*</span>
              </span>
              <input
                required
                value={form.educationLevel}
                list="education-level-options"
                onChange={(event) =>
                  setForm({ ...form, educationLevel: event.target.value })
                }
                placeholder="Choose or type your education level"
              />
              <datalist id="education-level-options">
                {EDUCATION_LEVEL_OPTIONS.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>
          </div>

          <label className="file-upload">
            <span>Resume upload (optional)</span>
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleResumeChange}
            />
            <span className="field-note">
              Upload a PDF or Word resume so recruiters can view or download it
              only after shortlisting you.
            </span>
            {form.uploadedResume?.fileName ? (
              <>
                <span className="file-upload-note">
                  Current file: {form.uploadedResume.fileName}
                </span>
                <div className="file-upload-actions">
                  <button
                    type="button"
                    className="button secondary"
                    onClick={handleSavedResumeDownload}
                  >
                    View or download saved resume
                  </button>
                </div>
              </>
            ) : (
              <span className="file-upload-note">No resume uploaded yet.</span>
            )}
          </label>

          <div className="form-footer">
            <p className="muted">
              Select at least one interest and one current skill for stronger
              recommendations.
            </p>
            <button
              className="button primary"
              disabled={
                busy || !form.interests.length || !form.currentSkills.length
              }
            >
              {busy ? "Saving..." : "Save profile"}
            </button>
          </div>
        </form>
        <br></br>
        {message ? <p className="status-banner">{message}</p> : null}
      </section>
    </SiteShell>
  );
}
