function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

export function calculateCandidateMatch(profile, jobPosting, latestTaskScore = 0) {
  const studentSkills = new Set((profile.currentSkills || []).map(normalize));
  const requiredSkills = (jobPosting.requiredSkills || []).map(normalize).filter(Boolean);

  const matchedSkills = requiredSkills.filter((skill) => studentSkills.has(skill));
  const skillCoverage = requiredSkills.length ? matchedSkills.length / requiredSkills.length : 0;
  const careerAlignment = normalize(profile.targetCareer) === normalize(jobPosting.title) ? 1 : 0;
  const categoryAlignment = normalize(jobPosting.title).includes(normalize(profile.targetCareer)) ? 1 : 0;
  const scoreFromTasks = Math.max(0, Math.min(100, Number(latestTaskScore || profile.overallSkillScore || 0)));

  // Transparent MVP formula:
  // 60% skill overlap + 25% verified task score + 15% career/title alignment.
  const fitScore = Math.round(
    skillCoverage * 60 + (scoreFromTasks / 100) * 25 + Math.max(careerAlignment, categoryAlignment) * 15
  );

  const explanation = matchedSkills.length
    ? `Matches ${matchedSkills.length} required skill(s) for ${jobPosting.title}, with a verified task score of ${scoreFromTasks}.`
    : `Limited skill overlap for ${jobPosting.title}, but verified task score of ${scoreFromTasks} still shows practical potential.`;

  return {
    fitScore: Math.max(0, Math.min(100, fitScore)),
    explanation
  };
}
