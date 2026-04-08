export const FILLER_WORDS = [
  "um",
  "uh",
  "erm",
  "hmm",
  "like",
  "you know",
  "actually",
  "basically",
  "literally",
  "i mean",
  "kind of",
  "sort of",
  "okay",
  "right",
];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const buildMatcher = (phrase) => new RegExp(`\\b${phrase.replace(/\s+/g, "\\s+")}\\b`, "gi");

const countFillerWords = (text = "") => {
  const breakdown = Object.fromEntries(
    FILLER_WORDS.map((word) => [word, (text.match(buildMatcher(word)) || []).length])
  );

  const repeatedStarterCount = (
    text.match(/\b(so|and|because|right|okay)\b[\s,]+\b(so|and|because|right|okay)\b/gi) || []
  ).length;

  return {
    breakdown,
    repeatedStarterCount,
    total:
      Object.values(breakdown).reduce((sum, count) => sum + count, 0) + repeatedStarterCount,
  };
};

export const getGrammarIssues = (text = "") => {
  const issues = [];
  const trimmed = text.trim();

  if (!trimmed) {
    return issues;
  }

  if (/\bi\b/.test(trimmed)) {
    issues.push('Capitalize "I".');
  }

  if (/\b(\w+)\s+\1\b/i.test(trimmed)) {
    issues.push("Repeated word detected.");
  }

  if (!/[.!?]$/.test(trimmed)) {
    issues.push("Add ending punctuation.");
  }

  if (/[a-z][.!?]\s+[a-z]/.test(trimmed)) {
    issues.push("Capitalize the start of each sentence.");
  }

  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);
  sentences.forEach((sentence, index) => {
    const words = sentence.split(/\s+/).filter(Boolean);
    if (words.length > 32) {
      issues.push(`Sentence ${index + 1} is too long.`);
    }

    if (/^(because|and|but|so)\b/i.test(sentence.trim()) && words.length < 8) {
      issues.push(`Sentence ${index + 1} may be incomplete.`);
    }

    if ((sentence.match(/\b(and|so|but)\b/gi) || []).length >= 4) {
      issues.push(`Sentence ${index + 1} has too many joined clauses.`);
    }
  });

  return [...new Set(issues)];
};

const getDefaultAccuracy = (wordCount) => {
  if (!wordCount) {
    return 0;
  }

  return 82;
};

export const buildLiveVoiceMetrics = ({
  transcript = "",
  elapsedMs = 0,
  longPauseCount = 0,
  speechAccuracy = 0,
}) => {
  const normalized = transcript.replace(/\s+/g, " ").trim();
  const words = normalized ? normalized.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const filler = countFillerWords(normalized.toLowerCase());
  const grammarIssues = getGrammarIssues(normalized);
  const minutes = elapsedMs > 0 ? elapsedMs / 60000 : 0;
  const paceWpm = minutes > 0 ? Math.round(wordCount / minutes) : 0;
  const fillerRate = wordCount > 0 ? Math.round((filler.total / wordCount) * 100) : 0;
  const accuracyScore = speechAccuracy > 0 ? speechAccuracy : getDefaultAccuracy(wordCount);

  const fillerPenalty = filler.total * 3 + Math.max(0, fillerRate - 5) * 2;
  const pausePenalty = longPauseCount * 5;
  const grammarPenalty = grammarIssues.length * 8;
  const pacePenalty =
    paceWpm > 178
      ? Math.min(28, Math.round((paceWpm - 178) * 0.7))
      : paceWpm > 0 && paceWpm < 90
        ? Math.min(18, 90 - paceWpm)
        : 0;
  const accuracyPenalty = accuracyScore > 0 ? Math.max(0, 88 - accuracyScore) : 12;

  const fillerScore = clamp(100 - fillerPenalty, 0, 100);
  const grammarScore = clamp(100 - grammarPenalty, 0, 100);
  const clarityScore = clamp(100 - fillerPenalty - pausePenalty - pacePenalty - accuracyPenalty, 0, 100);
  const overallScore = Math.round((fillerScore + grammarScore + clarityScore + accuracyScore) / 4);

  const feedback = [];
  if (accuracyScore > 0 && accuracyScore < 75) {
    feedback.push("Speak a little slower and closer to the microphone so more of your words are captured clearly.");
  }
  if (filler.total >= 4 || fillerRate >= 8) {
    feedback.push("Too many filler words are creeping in. Pause silently instead of saying 'um', 'like', or 'you know'.");
  }
  if (paceWpm > 178) {
    feedback.push("You're speaking too fast. Slow down and land one idea at a time.");
  }
  if (paceWpm > 0 && paceWpm < 90) {
    feedback.push("Your delivery is a little slow. Keep your answer moving with shorter pauses.");
  }
  if (longPauseCount >= 2) {
    feedback.push("Long pauses are stacking up. Finish one point, then move directly to your next example.");
  }
  if (grammarIssues.length >= 2) {
    feedback.push("Shorter, cleaner sentences will make this answer sound more polished.");
  }
  if (feedback.length === 0 && wordCount > 12) {
    feedback.push("Delivery looks steady. Keep your answer structured and confident.");
  }

  return {
    wordCount,
    speechAccuracy: accuracyScore,
    fillerWords: filler.total,
    fillerRate,
    fillerBreakdown: filler.breakdown,
    grammarIssues,
    longPauses: longPauseCount,
    paceWpm,
    fillerScore,
    grammarScore,
    clarityScore,
    overallScore,
    feedback,
  };
};
