/**
 * Printable learning summary (teacher support). Built only from the local save;
 * nothing is uploaded. Every interpolated value is HTML-escaped.
 */
import { CHAPTERS } from "../content/chapters.ts";
import { ECHO_CHAINS, LAYER_LABEL, revealedLayers, type LearnerBand } from "../content/echoChain.ts";
import { EVIDENCE_BY_ID } from "../content/evidence.ts";
import { LEARNING_GOALS, PUZZLE_BY_ID } from "../content/puzzles.ts";
import { chaptersCompleted, evidenceOf, learningRecord, type GameProgress } from "./progress.ts";

type Lang = "en" | "bn";
const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);

const T = {
  title: { en: "The Last Light: learning summary", bn: "শেষ আলো: শেখার সারসংক্ষেপ" },
  learner: { en: "Learner", bn: "শিক্ষার্থী" },
  guest: { en: "Guest explorer", bn: "অতিথি এক্সপ্লোরার" },
  band: { en: "Learning level", bn: "শেখার ধাপ" },
  chapters: { en: "Chapters completed", bn: "সম্পন্ন অধ্যায়" },
  evidence: { en: "NASA records recovered", bn: "উদ্ধার করা NASA রেকর্ড" },
  lessons: { en: "Lessons", bn: "পাঠ" },
  goal: { en: "Learning goal", bn: "শেখার লক্ষ্য" },
  result: { en: "Result", bn: "ফল" },
  first: { en: "First try", bn: "প্রথম চেষ্টায়" },
  hints: { en: "After hints", bn: "সূত্র দেখে" },
  notYet: { en: "Not yet", bn: "বাকি" },
  chain: { en: "Echo Chain (hardware → evidence → discovery → legacy)", bn: "ইকো চেইন (যন্ত্র → প্রমাণ → আবিষ্কার → উত্তরাধিকার)" },
  claim: { en: "Claim Check passed", bn: "দাবি-যাচাই সম্পন্ন" },
  yes: { en: "yes", bn: "হ্যাঁ" },
  no: { en: "no", bn: "না" },
  sources: { en: "NASA sources", bn: "NASA সূত্র" },
  discuss: { en: "Discussion questions", bn: "আলোচনার প্রশ্ন" },
  q1: { en: "What did the evidence show, and how do we know?", bn: "প্রমাণ কী দেখাল, আর আমরা কীভাবে জানি?" },
  q2: { en: "Which statements were interpretations rather than direct observations?", bn: "কোন বক্তব্যগুলো সরাসরি পর্যবেক্ষণ নয়, ব্যাখ্যা ছিল?" },
  q3: { en: "Why can a machine that stopped working still teach scientists?", bn: "যে যন্ত্র কাজ থামিয়েছে, সেটি কেন এখনো বিজ্ঞানীদের শেখাতে পারে?" },
  note: {
    en: "Generated on this device from the game's local save. Educational summary; not an official NASA document. The game world and EKO are artistic; NASA facts are cited.",
    bn: "এই ডিভাইসে গেমের লোকাল সেভ থেকে তৈরি। শিক্ষামূলক সারসংক্ষেপ; NASA-র অফিসিয়াল নথি নয়। গেমের জগৎ ও ইকো শিল্পিত; NASA-র তথ্যের সূত্র দেওয়া আছে।",
  },
} as const;

const BAND: Record<LearnerBand, { en: string; bn: string }> = {
  junior: { en: "Junior Explorer", bn: "জুনিয়র এক্সপ্লোরার" },
  young: { en: "Young Scientist", bn: "তরুণ বিজ্ঞানী" },
  research: { en: "Research Explorer", bn: "গবেষক এক্সপ্লোরার" },
};

export function learningSummaryHtml(progress: GameProgress, opts: { lang: Lang; name?: string; band?: LearnerBand | null; date?: string }): string {
  const { lang } = opts;
  const t = (k: keyof typeof T) => escapeHtml(T[k][lang]);
  const ev = evidenceOf(progress);
  const rows = learningRecord(progress).map((r) => {
    const title = escapeHtml(PUZZLE_BY_ID.get(r.puzzle)?.title[lang] ?? r.puzzle);
    const goal = escapeHtml(LEARNING_GOALS[r.puzzle]?.[lang] ?? "");
    const result = !r.solved ? t("notYet") : r.firstTry ? t("first") : t("hints");
    return `<tr><td>${title}</td><td>${goal}</td><td>${result}</td></tr>`;
  }).join("");
  const chains = ECHO_CHAINS.map((c) => {
    const shown = revealedLayers(c, ev).map((l) => escapeHtml(LAYER_LABEL[l][lang])).join(" → ") || "—";
    return `<li><strong>${escapeHtml(c.mission[lang])}</strong>: ${shown}. ${t("claim")}: ${progress.chains.includes(c.id) ? t("yes") : t("no")}</li>`;
  }).join("");
  const unique = new Map<string, string>();
  for (const id of ev) { const e = EVIDENCE_BY_ID.get(id); if (e) unique.set(e.source.url, e.source.label); }
  const sources = [...unique.entries()].map(([url, label]) => `<li>${escapeHtml(label)}: ${escapeHtml(url)}</li>`).join("");
  const name = opts.name?.trim() ? escapeHtml(opts.name.trim()) : t("guest");
  const band = opts.band ? escapeHtml(BAND[opts.band][lang]) : "—";
  const date = escapeHtml(opts.date ?? new Date().toISOString().slice(0, 10));
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${t("title")}</title>
<style>body{font:15px/1.5 system-ui,"Noto Sans Bengali",sans-serif;color:#111;background:#fff;max-width:52rem;margin:2rem auto;padding:0 1rem}h1{font-size:1.5rem}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:.4rem;text-align:left;vertical-align:top}small{color:#555}@media print{body{margin:0}}</style></head><body>
<h1>${t("title")}</h1>
<p>${t("learner")}: <strong>${name}</strong> · ${t("band")}: ${band} · ${date}</p>
<p>${t("chapters")}: ${chaptersCompleted(progress)}/${CHAPTERS.length} · ${t("evidence")}: ${ev.length}</p>
<h2>${t("lessons")}</h2><table><thead><tr><th>${t("lessons")}</th><th>${t("goal")}</th><th>${t("result")}</th></tr></thead><tbody>${rows}</tbody></table>
<h2>${t("chain")}</h2><ul>${chains}</ul>
<h2>${t("discuss")}</h2><ol><li>${t("q1")}</li><li>${t("q2")}</li><li>${t("q3")}</li></ol>
<h2>${t("sources")}</h2><ul>${sources}</ul>
<p><small>${t("note")}</small></p></body></html>`;
}
