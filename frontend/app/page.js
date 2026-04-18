import { Hero } from '@/components/hero';
import { SiteShell } from '@/components/site-shell';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  ClipboardCheck,
  Compass,
  FileSearch,
  GraduationCap,
  MessageSquareQuote,
  MessagesSquare,
  UserRoundSearch
} from 'lucide-react';

const modules = [
  {
    href: '/onboarding',
    icon: GraduationCap,
    title: 'Student onboarding',
    body: 'Set interests, skills, target career, and education in one guided flow.'
  },
  {
    href: '/dashboard',
    icon: Compass,
    title: 'AI Career GPS',
    body: 'Generate a practical roadmap with clear milestones and next steps.'
  },
  {
    href: '/tasks',
    icon: ClipboardCheck,
    title: 'Skill task submission',
    body: 'Submit work, get AI feedback, and build visible proof of ability.'
  },
  {
    href: '/expert-session',
    icon: MessagesSquare,
    title: '1:1 expert session',
    body: 'Book a one-hour slot with an industry expert and send your request to admin.'
  },
  {
    href: '/recruiter',
    icon: UserRoundSearch,
    title: 'Recruiter dashboard',
    body: 'Browse anonymized candidates using fit scores and verified evidence.'
  },
  {
    href: '/admin',
    icon: BadgeCheck,
    title: 'Admin contact hub',
    body: 'Review student and recruiter contact details from one protected page.'
  },
  {
    href: '/compare',
    icon: FileSearch,
    title: 'ATS Resume Check',
    body: 'Upload a PDF resume to score ATS readiness and get targeted improvement suggestions.'
  },
  {
    href: '/interview',
    icon: MessageSquareQuote,
    title: 'AI mock interview',
    body: 'Practice with interview questions and quick feedback.'
  }
];

export default function HomePage() {
  return (
    <SiteShell>
      <Hero />

      <section className="module-grid">
        {modules.map((module) => (
          <Link key={module.title} href={module.href} className="content-card module-link-card">
            <span className="eyebrow">
              <module.icon size={14} />
              Core module
            </span>
            <h2>{module.title}</h2>
            <p>{module.body}</p>
            <span className="module-link-row">
              Explore
              <ArrowRight size={16} />
            </span>
          </Link>
        ))}
      </section>
    </SiteShell>
  );
}
