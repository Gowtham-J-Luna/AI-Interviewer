import mammoth from "mammoth";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";

GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).href;

const normalizeText = (text = "") =>
  text
    .replace(/\u00A0/g, " ")
    .replace(/[•●▪◦]/g, "\n- ")
    .replace(/[–—−]/g, "-")
    .replace(/â€“|â€”/g, "-")
    .replace(/\t+/g, " ");

const normalizeLine = (line = "") =>
  normalizeText(line)
    .replace(/\s+/g, " ")
    .trim();

const uniqueList = (values = []) =>
  [...new Set(values.map((value) => normalizeLine(value)).filter(Boolean))];

const splitLines = (resumeText = "") =>
  normalizeText(resumeText)
    .split(/\r?\n/)
    .map((line) => normalizeLine(line))
    .filter(Boolean);

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SECTION_ALIASES = {
  summary: [
    "summary",
    "professional summary",
    "career summary",
    "profile",
    "professional profile",
    "objective",
    "about me",
  ],
  skills: [
    "skills",
    "technical skills",
    "core skills",
    "key skills",
    "skills summary",
    "competencies",
    "technical proficiencies",
    "expertise",
    "tools",
    "technologies",
    "tech stack",
    "tech skills",
  ],
  experience: [
    "experience",
    "work experience",
    "professional experience",
    "employment history",
    "work history",
    "career history",
  ],
  projects: [
    "projects",
    "project experience",
    "key projects",
    "selected projects",
    "academic projects",
  ],
  education: [
    "education",
    "academic background",
    "academic qualifications",
    "qualifications",
    "degrees",
    "degree",
  ],
  certifications: [
    "certifications",
    "certificates",
    "licenses",
    "courses",
    "training",
    "certified",
  ],
};

const ALL_SECTION_HEADINGS = Object.values(SECTION_ALIASES).flat();

const matchHeading = (line = "", headings = []) => {
  const normalized = normalizeLine(line).toLowerCase();

  for (const heading of headings) {
    const pattern = new RegExp(`^${escapeRegex(heading)}(?:\\s*[:|-]\\s*(.*))?$`, "i");
    const match = normalized.match(pattern);
    if (match) {
      return {
        isMatch: true,
        remainder: normalizeLine(match[1] || ""),
      };
    }
  }

  return { isMatch: false, remainder: "" };
};

const isAnySectionHeading = (line = "") => matchHeading(line, ALL_SECTION_HEADINGS).isMatch;

const extractSection = (lines, headings) => {
  const collected = [];
  let active = false;

  lines.forEach((line) => {
    const currentHeading = matchHeading(line, headings);
    if (currentHeading.isMatch) {
      active = true;
      if (currentHeading.remainder) {
        collected.push(currentHeading.remainder);
      }
      return;
    }

    if (active && isAnySectionHeading(line)) {
      active = false;
      return;
    }

    if (active) {
      collected.push(line);
    }
  });

  return uniqueList(collected);
};

const SKILL_ALIASES = {
  JavaScript: ["javascript", "js"],
  TypeScript: ["typescript", "ts"],
  React: ["react", "react.js", "reactjs"],
  "Next.js": ["next.js", "nextjs"],
  Vue: ["vue", "vue.js"],
  Angular: ["angular"],
  HTML: ["html", "html5"],
  CSS: ["css", "css3"],
  "Tailwind CSS": ["tailwind", "tailwind css"],
  Bootstrap: ["bootstrap"],
  "Material UI": ["material ui", "mui"],
  Redux: ["redux"],
  "Node.js": ["node", "node.js"],
  "Express.js": ["express", "express.js"],
  "REST APIs": ["rest api", "rest apis", "restful api", "restful apis"],
  GraphQL: ["graphql"],
  Python: ["python"],
  Java: ["java"],
  "Spring Boot": ["spring boot", "spring"],
  "C#": ["c#", "csharp"],
  ".NET": [".net", "dotnet", "asp.net"],
  PHP: ["php"],
  Django: ["django"],
  Flask: ["flask"],
  FastAPI: ["fastapi"],
  SQL: ["sql", "t-sql", "pl/sql"],
  PostgreSQL: ["postgresql", "postgres"],
  MySQL: ["mysql"],
  MongoDB: ["mongodb", "mongo"],
  Oracle: ["oracle"],
  SQLite: ["sqlite"],
  Redis: ["redis"],
  Firebase: ["firebase", "firestore"],
  AWS: ["aws", "amazon web services"],
  Azure: ["azure"],
  GCP: ["gcp", "google cloud", "google cloud platform"],
  Docker: ["docker"],
  Kubernetes: ["kubernetes", "k8s"],
  Terraform: ["terraform"],
  Jenkins: ["jenkins"],
  "GitHub Actions": ["github actions"],
  Git: ["git", "github", "gitlab", "bitbucket"],
  Linux: ["linux", "unix"],
  Tableau: ["tableau"],
  "Power BI": ["power bi"],
  Excel: ["excel", "advanced excel"],
  ETL: ["etl"],
  "Data Analysis": ["data analysis", "data analytics"],
  "Data Visualization": ["data visualization"],
  "Machine Learning": ["machine learning", "ml"],
  "Deep Learning": ["deep learning"],
  TensorFlow: ["tensorflow"],
  PyTorch: ["pytorch"],
  Pandas: ["pandas"],
  NumPy: ["numpy"],
  NLP: ["nlp", "natural language processing"],
  "Computer Vision": ["computer vision", "opencv"],
  Jira: ["jira"],
  Confluence: ["confluence"],
  Agile: ["agile", "scrum", "kanban"],
  Figma: ["figma"],
  "UI/UX": ["ui/ux", "ui ux", "ui design", "ux design", "wireframing", "prototyping"],
  "Requirements Gathering": ["requirements gathering", "requirement gathering", "requirements analysis"],
  "User Stories": ["user stories", "user story"],
  "Stakeholder Management": ["stakeholder management", "stakeholder engagement"],
  "Process Improvement": ["process improvement", "business process improvement", "process mapping"],
  "Business Analysis": ["business analysis", "gap analysis", "brd", "frd"],
  Selenium: ["selenium"],
  Cypress: ["cypress"],
  Playwright: ["playwright"],
  Testing: ["testing", "unit testing", "integration testing", "qa"],
  Microservices: ["microservices", "microservice"],
  "System Design": ["system design", "software architecture", "architecture"],
};

const SKILL_CATEGORIES = {
  Frontend: ["JavaScript", "TypeScript", "React", "Next.js", "Vue", "Angular", "HTML", "CSS", "Tailwind CSS", "Bootstrap", "Material UI", "Redux"],
  Backend: ["Node.js", "Express.js", "Python", "Java", "Spring Boot", "C#", ".NET", "PHP", "Django", "Flask", "FastAPI", "REST APIs", "GraphQL", "Microservices", "System Design"],
  Database: ["SQL", "PostgreSQL", "MySQL", "MongoDB", "Oracle", "SQLite", "Redis", "Firebase"],
  Cloud: ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Jenkins", "GitHub Actions", "Linux"],
  Data: ["Excel", "Tableau", "Power BI", "ETL", "Data Analysis", "Data Visualization", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Pandas", "NumPy", "NLP", "Computer Vision"],
  Product: ["Agile", "Jira", "Confluence", "Requirements Gathering", "User Stories", "Stakeholder Management", "Process Improvement", "Business Analysis"],
  Design: ["Figma", "UI/UX"],
  Quality: ["Selenium", "Cypress", "Playwright", "Testing"],
};

const ROLE_PROFILES = [
  {
    role: "Business Analyst",
    titleKeywords: ["business analyst", "functional analyst", "systems analyst"],
    skillSignals: ["Requirements Gathering", "User Stories", "Stakeholder Management", "Process Improvement", "Business Analysis", "Jira", "Confluence"],
  },
  {
    role: "Data Analyst",
    titleKeywords: ["data analyst", "bi analyst", "reporting analyst", "analytics analyst"],
    skillSignals: ["SQL", "Excel", "Tableau", "Power BI", "Data Analysis", "Data Visualization"],
  },
  {
    role: "Product Manager",
    titleKeywords: ["product manager", "associate product manager", "technical product manager"],
    skillSignals: ["Agile", "Jira", "Stakeholder Management", "User Stories"],
  },
  {
    role: "Project Manager",
    titleKeywords: ["project manager", "program manager"],
    skillSignals: ["Agile", "Stakeholder Management", "Process Improvement"],
  },
  {
    role: "Senior Software Engineer",
    titleKeywords: ["senior software engineer", "staff engineer", "principal engineer", "lead software engineer", "technical lead", "tech lead"],
    skillSignals: ["System Design", "Microservices", "Node.js", "Java", "Python", "AWS"],
  },
  {
    role: "Software Engineer",
    titleKeywords: ["software engineer", "software developer", "application developer", "developer"],
    skillSignals: ["JavaScript", "TypeScript", "Node.js", "Java", "Python", "REST APIs"],
  },
  {
    role: "Full Stack Developer",
    titleKeywords: ["full stack developer", "full-stack developer", "full stack engineer", "fullstack developer"],
    skillSignals: ["React", "JavaScript", "Node.js", "Express.js", "MongoDB", "SQL"],
  },
  {
    role: "Frontend Developer",
    titleKeywords: ["frontend developer", "front-end developer", "ui developer", "web developer", "react developer"],
    skillSignals: ["React", "Next.js", "JavaScript", "TypeScript", "HTML", "CSS", "Tailwind CSS"],
  },
  {
    role: "Backend Developer",
    titleKeywords: ["backend developer", "back-end developer", "api developer", "server-side developer"],
    skillSignals: ["Node.js", "Express.js", "Python", "Java", "SQL", "MongoDB", "REST APIs"],
  },
  {
    role: "DevOps Engineer",
    titleKeywords: ["devops engineer", "site reliability engineer", "sre", "cloud engineer", "platform engineer"],
    skillSignals: ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Jenkins", "Linux"],
  },
  {
    role: "Data Scientist",
    titleKeywords: ["data scientist", "machine learning scientist"],
    skillSignals: ["Python", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Pandas", "NumPy"],
  },
  {
    role: "Machine Learning Engineer",
    titleKeywords: ["machine learning engineer", "ml engineer", "ai engineer"],
    skillSignals: ["Python", "Machine Learning", "TensorFlow", "PyTorch", "NLP", "Computer Vision"],
  },
  {
    role: "UI/UX Designer",
    titleKeywords: ["ui designer", "ux designer", "ui/ux designer", "product designer"],
    skillSignals: ["Figma", "UI/UX"],
  },
  {
    role: "QA Engineer",
    titleKeywords: ["qa engineer", "quality assurance engineer", "test engineer", "qa analyst"],
    skillSignals: ["Testing", "Selenium", "Cypress", "Playwright"],
  },
  {
    role: "Mobile Developer",
    titleKeywords: ["mobile developer", "android developer", "ios developer", "flutter developer", "react native developer"],
    skillSignals: ["JavaScript", "TypeScript", "React", "Python"],
  },
];

const TITLE_STOPWORDS = [
  "bachelor",
  "master",
  "university",
  "college",
  "school",
  "cgpa",
  "gpa",
  "email",
  "phone",
  "linkedin",
  "github",
  "address",
  "education",
];

const ROLE_LINE_HINTS = [
  "engineer",
  "developer",
  "analyst",
  "manager",
  "designer",
  "architect",
  "consultant",
  "specialist",
  "administrator",
  "lead",
];

const isLikelyDateRange = (line = "") =>
  /((jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{4}|\b(19|20)\d{2}\b)\s*(-|to)\s*((jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{4}|\b(19|20)\d{2}\b|present|current)/i.test(
    line
  );

const isLikelyRoleLine = (line = "") => {
  const lower = line.toLowerCase();
  return ROLE_LINE_HINTS.some((hint) => lower.includes(hint));
};

const inferSkillsFromText = (text = "") => {
  const lowerText = text.toLowerCase();

  return Object.entries(SKILL_ALIASES)
    .filter(([, aliases]) =>
      aliases.some((alias) =>
        new RegExp(`(^|[^a-z0-9+#.])${escapeRegex(alias.toLowerCase())}([^a-z0-9+#.]|$)`, "i").test(
          lowerText
        )
      )
    )
    .map(([skill]) => skill);
};

const extractSkillsFromSection = (skillsSection = []) => {
  const rawTokens = skillsSection.flatMap((line) =>
    line
      .split(/[,|/]/)
      .map((token) => normalizeLine(token.replace(/^[-:]\s*/, "")))
      .filter(Boolean)
  );

  const canonical = rawTokens.flatMap((token) => {
    const lowerToken = token.toLowerCase();
    const exact = Object.entries(SKILL_ALIASES).find(([, aliases]) =>
      aliases.some((alias) => alias.toLowerCase() === lowerToken)
    );
    if (exact) {
      return [exact[0]];
    }

    const fuzzy = Object.entries(SKILL_ALIASES)
      .filter(([, aliases]) => aliases.some((alias) => lowerToken.includes(alias.toLowerCase())))
      .map(([skill]) => skill);

    return fuzzy.length ? fuzzy : [];
  });

  return uniqueList(canonical);
};

const categorizeSkills = (skills = []) => {
  const categorized = {};

  skills.forEach((skill) => {
    for (const [category, categorySkills] of Object.entries(SKILL_CATEGORIES)) {
      if (categorySkills.includes(skill)) {
        if (!categorized[category]) {
          categorized[category] = [];
        }
        categorized[category].push(skill);
        break;
      }
    }
  });

  return categorized;
};

const extractContactInfo = (resumeText = "") => ({
  email: resumeText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/i)?.[0] || "",
  phone:
    resumeText.match(/(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)?.[0] || "",
  linkedin:
    resumeText.match(/https?:\/\/(www\.)?linkedin\.com\/in\/[^\s)]+/i)?.[0] ||
    resumeText.match(/linkedin\.com\/in\/[a-zA-Z0-9-]+/i)?.[0] ||
    "",
  github:
    resumeText.match(/https?:\/\/(www\.)?github\.com\/[^\s)]+/i)?.[0] ||
    resumeText.match(/github\.com\/[a-zA-Z0-9-]+/i)?.[0] ||
    "",
});

const buildExperienceEntries = (experienceLines = []) => {
  const entries = [];
  let currentEntry = null;

  experienceLines.forEach((line) => {
    const cleanLine = normalizeLine(line);
    if (!cleanLine) {
      return;
    }

    const bulletLine = /^[-*]/.test(cleanLine);
    const shortProfessionalLine =
      cleanLine.length <= 90 &&
      !bulletLine &&
      !TITLE_STOPWORDS.some((word) => cleanLine.toLowerCase().includes(word));

    if (!currentEntry) {
      currentEntry = {
        title: shortProfessionalLine ? cleanLine : "",
        company: "",
        duration: isLikelyDateRange(cleanLine) ? cleanLine : "",
        description: shortProfessionalLine ? [] : [cleanLine],
      };
      return;
    }

    if (isLikelyDateRange(cleanLine)) {
      if (currentEntry && (currentEntry.title || currentEntry.company) && !currentEntry.duration) {
        currentEntry.duration = cleanLine;
        return;
      }

      if (currentEntry.title || currentEntry.company || currentEntry.description.length) {
        entries.push(currentEntry);
      }

      currentEntry = {
        title: "",
        company: "",
        duration: cleanLine,
        description: [],
      };
      return;
    }

    if (!currentEntry.title && shortProfessionalLine) {
      currentEntry.title = cleanLine;
      return;
    }

    if (
      shortProfessionalLine &&
      isLikelyRoleLine(cleanLine) &&
      currentEntry.title &&
      currentEntry.duration
    ) {
      entries.push(currentEntry);
      currentEntry = {
        title: cleanLine,
        company: "",
        duration: "",
        description: [],
      };
      return;
    }

    if (!currentEntry.company && shortProfessionalLine && cleanLine.length <= 70) {
      currentEntry.company = cleanLine;
      return;
    }

    currentEntry.description.push(cleanLine.replace(/^[-*]\s*/, ""));
  });

  if (currentEntry && (currentEntry.title || currentEntry.company || currentEntry.description.length)) {
    entries.push(currentEntry);
  }

  return entries.filter((entry) => entry.title || entry.duration || entry.description.length);
};

const MONTHS = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

const parseDateToken = (token = "", isEnd = false) => {
  const cleanToken = token.toLowerCase().replace(/,/g, " ").replace(/\s+/g, " ").trim();
  if (!cleanToken) {
    return null;
  }

  if (cleanToken.includes("present") || cleanToken.includes("current")) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }

  const monthYearMatch = cleanToken.match(
    /(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+((19|20)\d{2})/
  );
  if (monthYearMatch) {
    return { year: Number(monthYearMatch[2]), month: MONTHS[monthYearMatch[1]] ?? 0 };
  }

  const yearMatch = cleanToken.match(/\b((19|20)\d{2})\b/);
  if (yearMatch) {
    return { year: Number(yearMatch[1]), month: isEnd ? 11 : 0 };
  }

  return null;
};

const dateValueInMonths = ({ year, month }) => year * 12 + month;

const extractDateRanges = (text = "") => {
  const ranges = [];
  const normalized = normalizeText(text);
  const rangeRegex =
    /((?:jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+\d{4}|\b(?:19|20)\d{2}\b)\s*(?:-|to)\s*((?:jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+\d{4}|\b(?:19|20)\d{2}\b|present|current)/gi;

  let match;
  while ((match = rangeRegex.exec(normalized))) {
    const start = parseDateToken(match[1], false);
    const end = parseDateToken(match[2], true);

    if (!start || !end) {
      continue;
    }

    ranges.push({ start, end });
  }

  return ranges;
};

const inferExperienceYears = (resumeText = "", experienceLines = [], summaryLines = []) => {
  const scopedText = [...summaryLines, ...experienceLines].join("\n");
  const explicitMatches = [
    ...scopedText.matchAll(/(\d{1,2})\+?\s*(years?|yrs?)\s+(?:of\s+)?experience/gi),
  ]
    .map((match) => Number(match[1]))
    .filter((value) => value > 0 && value < 50);

  if (explicitMatches.length) {
    return Math.max(...explicitMatches);
  }

  const ranges = extractDateRanges(experienceLines.join("\n"));
  if (!ranges.length) {
    return 0;
  }

  const earliest = Math.min(...ranges.map((range) => dateValueInMonths(range.start)));
  const latest = Math.max(...ranges.map((range) => dateValueInMonths(range.end)));
  const months = Math.max(0, latest - earliest + 1);

  return Math.max(0, Math.round(months / 12));
};

const getRoleCandidateLines = (lines, summaryLines, experienceEntries) => {
  const topLines = lines
    .slice(0, 12)
    .filter(
      (line) =>
        line.length >= 4 &&
        line.length <= 80 &&
        !TITLE_STOPWORDS.some((word) => line.toLowerCase().includes(word))
    );

  const summaryCandidates = summaryLines.filter((line) => line.length <= 90);
  const experienceCandidates = experienceEntries.flatMap((entry) => [entry.title, entry.company]).filter(Boolean);

  return uniqueList([...topLines, ...summaryCandidates, ...experienceCandidates]);
};

const inferRole = ({
  resumeText = "",
  lines = [],
  summaryLines = [],
  experienceEntries = [],
  skills = [],
}) => {
  const professionalText = [resumeText, ...summaryLines, ...experienceEntries.flatMap((entry) => [entry.title, entry.company, ...(entry.description || [])])]
    .join("\n")
    .toLowerCase();
  const candidateLines = getRoleCandidateLines(lines, summaryLines, experienceEntries).map((line) =>
    line.toLowerCase()
  );
  const skillSet = new Set(skills);

  let bestRole = "";
  let bestScore = 0;

  ROLE_PROFILES.forEach((profile) => {
    let score = 0;

    profile.titleKeywords.forEach((keyword) => {
      if (candidateLines.some((line) => line === keyword)) {
        score += 12;
      } else if (candidateLines.some((line) => line.includes(keyword))) {
        score += 8;
      } else if (professionalText.includes(keyword)) {
        score += 4;
      }
    });

    profile.skillSignals.forEach((signal) => {
      if (skillSet.has(signal)) {
        score += 2;
      } else if (professionalText.includes(signal.toLowerCase())) {
        score += 1;
      }
    });

    if (profile.role === "Business Analyst" && score < 8) {
      return;
    }

    if (profile.role === "Data Analyst" && score < 6) {
      return;
    }

    if (score > bestScore) {
      bestScore = score;
      bestRole = profile.role;
    }
  });

  if (bestRole) {
    return bestRole;
  }

  if (skillSet.has("React") && skillSet.has("Node.js")) {
    return "Full Stack Developer";
  }
  if (skillSet.has("React") || skillSet.has("Next.js") || skillSet.has("Angular") || skillSet.has("Vue")) {
    return "Frontend Developer";
  }
  if (skillSet.has("Node.js") || skillSet.has("Express.js") || skillSet.has("Java") || skillSet.has("Python")) {
    return "Backend Developer";
  }
  if (skillSet.has("AWS") || skillSet.has("Docker") || skillSet.has("Kubernetes")) {
    return "DevOps Engineer";
  }
  if (skillSet.has("SQL") && (skillSet.has("Tableau") || skillSet.has("Power BI") || skillSet.has("Excel"))) {
    return "Data Analyst";
  }

  return "Developer";
};

const getTopKeywords = ({ skills = [], projects = [], experienceEntries = [] }) => {
  const experienceKeywords = inferSkillsFromText(
    experienceEntries.flatMap((entry) => [entry.title, ...(entry.description || [])]).join(" ")
  );
  const projectKeywords = inferSkillsFromText(projects.join(" "));

  return uniqueList([...skills, ...experienceKeywords, ...projectKeywords]).slice(0, 12);
};

export const extractTextFromPdf = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    const pages = [];

    for (let i = 1; i <= pdf.numPages; i += 1) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const items = textContent.items
        .map((item) => ({
          text: item.str,
          x: item.transform?.[4] || 0,
          y: item.transform?.[5] || 0,
        }))
        .filter((item) => item.text && item.text.trim());

      items.sort((a, b) => {
        if (Math.abs(b.y - a.y) > 2) {
          return b.y - a.y;
        }
        return a.x - b.x;
      });

      const lines = [];
      items.forEach((item) => {
        const lastLine = lines[lines.length - 1];
        if (!lastLine || Math.abs(lastLine.y - item.y) > 2.5) {
          lines.push({ y: item.y, parts: [item] });
          return;
        }

        lastLine.parts.push(item);
      });

      const pageText = lines
        .map((line) =>
          line.parts
            .sort((a, b) => a.x - b.x)
            .map((part) => part.text)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim()
        )
        .filter(Boolean)
        .join("\n");

      pages.push(pageText);
    }

    return pages.join("\n\n");
  } catch (error) {
    throw new Error("Failed to extract text from PDF.");
  }
};

export const extractTextFromDocx = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    throw new Error("Failed to extract text from DOCX.");
  }
};

export const extractTextFromPlainText = async (file) => {
  try {
    return await file.text();
  } catch (error) {
    throw new Error("Failed to extract text from text file.");
  }
};

export const parseResumeSnapshot = (resumeText = "") => {
  const lines = splitLines(resumeText);
  const summaryLines = extractSection(lines, SECTION_ALIASES.summary);
  const skillsSection = extractSection(lines, SECTION_ALIASES.skills);
  const experienceLines = extractSection(lines, SECTION_ALIASES.experience);
  const projects = extractSection(lines, SECTION_ALIASES.projects);
  const education = extractSection(lines, SECTION_ALIASES.education);
  const certifications = extractSection(lines, SECTION_ALIASES.certifications);

  const summary = summaryLines.slice(0, 4).join(" ") || lines.slice(0, 4).join(" ");
  const skills = uniqueList([
    ...extractSkillsFromSection(skillsSection),
    ...inferSkillsFromText([summary, ...experienceLines, ...projects].join("\n")),
  ]);

  const experienceEntries = buildExperienceEntries(experienceLines);
  const inferredExperienceYears = inferExperienceYears(resumeText, experienceLines, summaryLines);
  const inferredRole = inferRole({
    resumeText,
    lines,
    summaryLines,
    experienceEntries,
    skills,
  });
  const topKeywords = getTopKeywords({
    skills,
    projects,
    experienceEntries,
  });

  return {
    summary,
    skills,
    categorizedSkills: categorizeSkills(skills),
    experience: uniqueList(
      experienceEntries.length
        ? experienceEntries.map((entry) => [entry.title, entry.company].filter(Boolean).join(" | "))
        : experienceLines
    ).slice(0, 10),
    experienceEntries: experienceEntries.slice(0, 8),
    projects: projects.slice(0, 10),
    education: education.slice(0, 5),
    certifications: certifications.slice(0, 5),
    inferredRole,
    inferredExperienceYears,
    topKeywords,
    contactInfo: extractContactInfo(resumeText),
  };
};
