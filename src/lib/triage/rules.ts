import type { RequestCategory, RequestPriority } from "@/lib/maintenance/requests";

import type { TriageRequestText, TriageSuggestion } from "./types";

// Keyword fallback for when Gemini is not configured, fails, times out,
// returns junk or the org is over its hourly AI limit. Deliberately simple:
// it only has to be a sensible starting point the manager confirms.

type CategoryRule = { category: RequestCategory; words: string[] };

// First match wins, so heating comes before plumbing ("no hot water" is a boiler job).
const CATEGORY_RULES: CategoryRule[] = [
  { category: "heating", words: ["boiler", "heating", "heater", "radiator", "hot water", "furnace", "thermostat", "cold"] },
  { category: "plumbing", words: ["leak", "leaking", "water", "pipe", "tap", "faucet", "toilet", "drain", "sink", "flood", "shower", "blocked"] },
  { category: "electrical", words: ["electric", "power", "socket", "outlet", "switch", "spark", "wiring", "fuse", "breaker", "light"] },
  { category: "appliance", words: ["fridge", "freezer", "oven", "cooker", "washing machine", "dishwasher", "dryer", "microwave", "appliance"] },
  { category: "pest", words: ["mouse", "mice", "rat", "cockroach", "roach", "bug", "insect", "ants", "pest", "wasp"] },
  { category: "structural", words: ["crack", "ceiling", "wall", "roof", "window", "door", "floor", "stairs", "damp", "mould", "mold"] },
];

const EMERGENCY_WORDS = ["gas", "smoke", "fire", "flood", "flooding", "sparking", "sparks", "burning", "no heat", "no heating", "sewage", "carbon monoxide", "collapsed"];
const HIGH_WORDS = ["leak", "leaking", "no hot water", "no power", "broken lock", "can't lock", "cannot lock", "not working", "blocked toilet"];
const LOW_WORDS = ["cosmetic", "paint", "scuff", "squeak", "loose handle", "when convenient", "not urgent"];

function findWord(text: string, words: string[]): string | undefined {
  return words.find((word) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(text));
}

export function triageByRules({ title, description }: TriageRequestText): TriageSuggestion {
  const text = `${title} ${description}`.toLowerCase();

  let category: RequestCategory = "other";
  let categoryWord: string | undefined;
  for (const rule of CATEGORY_RULES) {
    categoryWord = findWord(text, rule.words);
    if (categoryWord) {
      category = rule.category;
      break;
    }
  }

  let priority: RequestPriority = "normal";
  let priorityWord = findWord(text, EMERGENCY_WORDS);
  if (priorityWord) priority = "emergency";
  else if ((priorityWord = findWord(text, HIGH_WORDS))) priority = "high";
  else if ((priorityWord = findWord(text, LOW_WORDS))) priority = "low";

  const reasons = [
    categoryWord ? `mentions "${categoryWord}"` : "no category keyword found",
    priorityWord ? `"${priorityWord}" suggests ${priority} priority` : "no urgency keyword found",
  ];
  return { category, priority, reason: `Keyword rules: ${reasons.join(", ")}.` };
}
