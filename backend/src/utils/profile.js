export function calculateProfileCompleteness(payload) {
  const checks = [
    payload.interests?.length,
    payload.currentSkills?.length,
    payload.targetCareer,
    payload.educationLevel
  ];

  const completeCount = checks.filter(Boolean).length;
  return Math.round((completeCount / checks.length) * 100);
}

export function anonymizeCandidate(profile, index, submissions = [], options = {}) {
  const { revealIdentity = false, user = null } = options;
  const scores = submissions.map((submission) => submission.aiScore);
  const averageScore = scores.length
    ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
    : profile.overallSkillScore || 0;

  return {
    id: profile._id.toString(),
    alias: `Candidate ${String(index + 1).padStart(2, '0')}`,
    targetRole: profile.targetCareer,
    location: profile.educationLevel,
    experienceLevel: profile.educationLevel,
    topSkills: (profile.currentSkills || []).slice(0, 5),
    interests: (profile.interests || []).slice(0, 4),
    profileCompleteness: profile.profileCompleteness || 0,
    averageScore,
    skillScores: submissions.slice(0, 3).map((submission) => ({
      skill: submission.skillCategory,
      score: submission.aiScore
    })),
    strengthsSummary:
      submissions[0]?.strengths?.slice(0, 2).join(' | ') || 'Complete a verified task to generate strengths.',
    studentName: revealIdentity ? String(user?.name || '').trim() : '',
    studentEmail: revealIdentity ? String(user?.email || '').trim() : '',
    recentProofs: submissions.slice(0, 2).map((submission) => ({
      title: submission.skillCategory,
      score: submission.aiScore,
      feedbackSummary: submission.suggestions?.[0] || 'AI-reviewed task evidence available.'
    }))
  };
}
