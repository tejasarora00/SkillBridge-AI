import bcrypt from "bcryptjs";
import { connectToDatabase } from "../src/config/db.js";
import {
  CandidateMatch,
  JobPosting,
  Roadmap,
  SkillTaskSubmission,
  StudentProfile,
  User,
} from "../src/models/index.js";

async function seed() {
  await connectToDatabase();

  await Promise.all([
    CandidateMatch.deleteMany({}),
    JobPosting.deleteMany({}),
    Roadmap.deleteMany({}),
    SkillTaskSubmission.deleteMany({}),
    StudentProfile.deleteMany({}),
    User.deleteMany({}),
  ]);

  const recruiterPasswordHash = await bcrypt.hash("Recruiter123!", 10);
  const studentPasswordHash = await bcrypt.hash("Student123!", 10);

  const recruiters = await User.create([
    {
      name: "Nina Recruiter",
      email: "recruiter@skillbridge.ai",
      passwordHash: recruiterPasswordHash,
      role: "recruiter",
    },
    {
      name: "Arjun Hiring",
      email: "arjun@skillbridge.ai",
      passwordHash: recruiterPasswordHash,
      role: "recruiter",
    },
  ]);

  const students = await User.create([
    {
      name: "Maya Patel",
      email: "maya@skillbridge.ai",
      passwordHash: studentPasswordHash,
      role: "student",
    },
    {
      name: "Ravi Singh",
      email: "ravi@skillbridge.ai",
      passwordHash: studentPasswordHash,
      role: "student",
    },
    {
      name: "Aisha Khan",
      email: "aisha@skillbridge.ai",
      passwordHash: studentPasswordHash,
      role: "student",
    },
  ]);

  const profiles = await StudentProfile.create([
    {
      userId: students[0]._id,
      interests: ["EdTech", "Accessibility", "UI Systems"],
      currentSkills: ["React", "Next.js", "Accessibility"],
      targetCareer: "Frontend Engineer",
      educationLevel: "Final Year B.Tech",
      roadmapSummary:
        "Sharpen product UI projects and interview proof for frontend roles.",
      roadmapSnapshot: {
        currentStrengths: [
          "React foundations",
          "Responsive UI instincts",
          "Component thinking",
        ],
        missingSkills: [
          "Testing",
          "Performance profiling",
          "Case study storytelling",
        ],
        recommendedNextSteps: [
          "Ship one polished dashboard",
          "Document accessibility wins",
          "Practice feedback loops",
        ],
        beginnerProject:
          "Student progress tracker with filters and empty states",
        intermediateProject:
          "Recruiter analytics dashboard with role-based views",
        learningRoadmap: [
          "Refresh fundamentals",
          "Build a practical portfolio piece",
          "Prepare for interviews",
        ],
      },
      overallSkillScore: 88,
      profileCompleteness: 100,
    },
    {
      userId: students[1]._id,
      interests: ["FinTech", "Analytics", "Operations"],
      currentSkills: ["SQL", "Python", "Dashboarding"],
      targetCareer: "Data Analyst",
      educationLevel: "Third Year BCA",
      roadmapSummary:
        "Build analytics case studies and improve decision storytelling.",
      roadmapSnapshot: {
        currentStrengths: [
          "Structured thinking",
          "SQL basics",
          "Clear written summaries",
        ],
        missingSkills: [
          "Experiment design",
          "Data storytelling",
          "Visualization polish",
        ],
        recommendedNextSteps: [
          "Strengthen dashboard narratives",
          "Practice business-focused analysis",
          "Add evidence of impact",
        ],
        beginnerProject: "Weekly engagement trend report with concise insights",
        intermediateProject: "Customer retention analysis with recommendations",
        learningRoadmap: [
          "Improve analytical depth",
          "Show insight communication",
          "Build recruiter-facing proof",
        ],
      },
      overallSkillScore: 74,
      profileCompleteness: 100,
    },
    {
      userId: students[2]._id,
      interests: ["AI", "Cloud", "Developer Tools"],
      currentSkills: ["Node.js", "APIs", "Prompt Engineering"],
      targetCareer: "AI Engineer",
      educationLevel: "Final Year MCA",
      roadmapSummary:
        "Turn API and AI experimentation into stronger engineering proof.",
      roadmapSnapshot: {
        currentStrengths: [
          "API integration",
          "Rapid prototyping",
          "AI experimentation",
        ],
        missingSkills: [
          "Model evaluation",
          "Production reliability",
          "Deployment confidence",
        ],
        recommendedNextSteps: [
          "Add stronger engineering evidence",
          "Document prompts and outcomes",
          "Ship one applied AI tool",
        ],
        beginnerProject: "Prompt-based FAQ assistant for students",
        intermediateProject:
          "Workflow assistant that routes tasks using LLM outputs",
        learningRoadmap: [
          "Improve AI foundations",
          "Build real prototypes",
          "Practice system explanation",
        ],
      },
      overallSkillScore: 79,
      profileCompleteness: 100,
    },
  ]);

  await Roadmap.create([
    {
      studentProfileId: profiles[0]._id,
      targetRole: "Frontend Engineer",
      summary:
        "Focus on real UI builds, accessibility polish, and recruiter-ready case studies.",
      currentStrengths: [
        "React foundations",
        "Responsive UI instincts",
        "Component thinking",
      ],
      missingSkills: [
        "Testing",
        "Performance profiling",
        "Case study storytelling",
      ],
      recommendedNextSteps: [
        "Ship one polished dashboard",
        "Document accessibility wins",
        "Practice feedback loops",
      ],
      beginnerProject: "Student progress tracker with filters and empty states",
      intermediateProject:
        "Recruiter analytics dashboard with role-based views",
      learningRoadmap: [
        "Refresh fundamentals",
        "Build a practical portfolio piece",
        "Prepare for interviews",
      ],
      milestones: [
        {
          title: "UI refresh sprint",
          timeline: "Weeks 1-2",
          focus: "Improve profile and portfolio presentation.",
          output: "A polished case study and personal landing page.",
        },
        {
          title: "Product dashboard build",
          timeline: "Weeks 3-6",
          focus: "Build a production-style dashboard with auth and filters.",
          output: "A deployed frontend project.",
        },
        {
          title: "Interview proof loop",
          timeline: "Weeks 7-10",
          focus: "Collect feedback and sharpen role storytelling.",
          output: "Two verified task submissions and one mock interview pass.",
        },
      ],
    },
  ]);

  await SkillTaskSubmission.create([
    {
      studentProfileId: profiles[0]._id,
      skillCategory: "frontend development",
      taskPrompt:
        "Build the UI plan for a responsive student dashboard. Explain the layout, reusable components, accessibility choices, and how you would handle loading and error states.",
      userSubmission:
        "Outlined a dashboard with summary cards, activity charts, progress filters, and accessible keyboard navigation. I also described empty states and loading behavior.",
      aiScore: 88,
      strengths: [
        "Clear UI structure",
        "Responsive layout thinking",
        "Good accessibility awareness",
      ],
      weaknesses: ["Needs stronger testing plan"],
      suggestions: [
        "Add interaction states and measurable accessibility outcomes",
      ],
    },
    {
      studentProfileId: profiles[1]._id,
      skillCategory: "data analysis",
      taskPrompt:
        "A student platform saw lower weekly engagement. Explain how you would analyze the issue, what metrics you would inspect, and what recommendations you would present.",
      userSubmission:
        "Would inspect weekly active users, cohort retention, session depth, and drop-off points. Then segment the trends and recommend content and notification experiments.",
      aiScore: 76,
      strengths: [
        "Good analytical framing",
        "Understands segmentation",
        "Useful recommendation direction",
      ],
      weaknesses: ["Could go deeper on validation"],
      suggestions: [
        "Add sample metrics, confidence checks, and dashboard layout ideas",
      ],
    },
    {
      studentProfileId: profiles[2]._id,
      skillCategory: "content writing",
      taskPrompt:
        "Write a short landing-page section for a student career platform. Cover the problem, the value proposition, and one clear call to action in a concise, persuasive tone.",
      userSubmission:
        "Students often know where they want to go but not how to prove they are ready. SkillBridge AI turns effort into visible proof with guided tasks, AI feedback, and recruiter-ready signals. Start building your roadmap today.",
      aiScore: 82,
      strengths: ["Strong clarity", "Clear value proposition", "Good CTA"],
      weaknesses: ["Could sound more differentiated"],
      suggestions: [
        "Add one sharper outcome-oriented line tied to hiring impact",
      ],
    },
  ]);

  const jobPostings = await JobPosting.create([
    {
      recruiterId: recruiters[0]._id,
      title: "Frontend Engineer",
      requiredSkills: ["React", "Next.js", "Accessibility"],
      description:
        "Build product UI, collaborate with design, and ship thoughtful frontend experiences.",
    },
    {
      recruiterId: recruiters[1]._id,
      title: "AI Engineer",
      requiredSkills: ["Node.js", "APIs", "Prompt Engineering"],
      description:
        "Prototype AI workflows, integrate APIs, and support internal automation projects.",
    },
  ]);

  await CandidateMatch.create([
    {
      studentProfileId: profiles[0]._id,
      jobPostingId: jobPostings[0]._id,
      fitScore: 93,
      explanation:
        "Strong React and Next.js overlap plus a high verified frontend task score.",
    },
    {
      studentProfileId: profiles[2]._id,
      jobPostingId: jobPostings[1]._id,
      fitScore: 90,
      explanation:
        "Good alignment on APIs and prompt engineering with credible task-based proof.",
    },
    {
      studentProfileId: profiles[1]._id,
      jobPostingId: jobPostings[0]._id,
      fitScore: 61,
      explanation:
        "Underrated candidate with solid analytical skills but weaker overlap for a frontend role.",
    },
  ]);

  console.log("Seed complete.");
  console.log(
    `Recruiters ready: ${recruiters.map((user) => user.email).join(", ")}`,
  );
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed:", error.message);
  process.exit(1);
});
