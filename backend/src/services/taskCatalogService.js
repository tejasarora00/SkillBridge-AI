const TASK_CATALOG = {
  'frontend development': {
    skillCategory: 'frontend development',
    relatedTerms: ['frontend development', 'web development', 'react', 'next.js', 'javascript', 'typescript', 'ui design'],
    taskPrompt:
      'Build the UI plan for a responsive student dashboard. Explain the layout, reusable components, accessibility choices, and how you would handle loading and error states.'
  },
  'content writing': {
    skillCategory: 'content writing',
    relatedTerms: ['content writing', 'copywriting', 'digital marketing', 'communication'],
    taskPrompt:
      'Write a short landing-page section for a student career platform. Cover the problem, the value proposition, and one clear call to action in a concise, persuasive tone.'
  },
  'data analysis': {
    skillCategory: 'data analysis',
    relatedTerms: ['data analysis', 'data science', 'sql', 'python', 'analytics', 'fintech'],
    taskPrompt:
      'A student platform saw lower weekly engagement. Explain how you would analyze the issue, what metrics you would inspect, and what recommendations you would present.'
  }
};

export function listAllTaskPrompts() {
  return Object.values(TASK_CATALOG);
}

function normalizeList(values) {
  return Array.isArray(values)
    ? values.map((value) => String(value || '').trim().toLowerCase()).filter(Boolean)
    : [];
}

function termsOverlap(left, right) {
  const normalizedLeft = String(left || '').trim().toLowerCase();
  const normalizedRight = String(right || '').trim().toLowerCase();

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  if (
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  ) {
    return true;
  }

  const leftWords = new Set(normalizedLeft.split(/[^a-z0-9+.]+/).filter(Boolean));
  const rightWords = new Set(
    normalizedRight.split(/[^a-z0-9+.]+/).filter(Boolean),
  );

  let sharedWords = 0;
  for (const word of leftWords) {
    if (rightWords.has(word)) {
      sharedWords += 1;
    }
  }

  return sharedWords > 0;
}

function toTitleCase(value) {
  return String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getTargetCareerTerms(profile = {}) {
  return [...new Set(normalizeList([profile.targetCareer]))];
}

export function listTaskPrompts(profile = null, roadmap = null) {
  const tasks = listAllTaskPrompts();
  const targetCareerTerms = getTargetCareerTerms(profile || {});

  if (!targetCareerTerms.length) {
    return [];
  }

  return tasks
    .filter((task) =>
      (task.relatedTerms || []).some((term) =>
        targetCareerTerms.some((careerTerm) => termsOverlap(careerTerm, term)),
      ),
    )
    .map((task) => ({
      ...task,
      displaySkillCategory: toTitleCase(task.skillCategory)
    }));
}

export function getTaskPromptByCategory(skillCategory) {
  return TASK_CATALOG[String(skillCategory || '').toLowerCase()] || null;
}
