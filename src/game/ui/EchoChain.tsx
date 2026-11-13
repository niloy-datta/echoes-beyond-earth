"use client";

import { useState } from "react";
import {
  CLASSIFICATION_LABEL, ECHO_CHAINS, LAYER_LABEL, chainComplete, claimsFor, gradeClaims, revealedLayers,
  type ClaimVerdict, type EchoChain, type LearnerBand,
} from "../content/echoChain";
import { EVIDENCE_BY_ID } from "../content/evidence";
import { evidenceOf } from "../core/progress";
import type { GameSession } from "../core/session";
import { Modal } from "./Modal";
import { S } from "./strings";

type Lang = "en" | "bn";

const VERDICTS: readonly { id: ClaimVerdict; label: { en: string; bn: string } }[] = [
  { id: "verified", label: { en: "Verified record", bn: "যাচাই করা রেকর্ড" } },
  { id: "interpretation", label: { en: "Interpretation", bn: "ব্যাখ্যা" } },
  { id: "unsupported", label: { en: "Not supported", bn: "প্রমাণসমর্থিত নয়" } },
];

function ClaimCheck({ chain, band, lang, passed, onPass }: { chain: EchoChain; band: LearnerBand; lang: Lang; passed: boolean; onPass: () => void }) {
  const claims = claimsFor(chain, band);
  const [answers, setAnswers] = useState<Record<string, ClaimVerdict | undefined>>({});
  const [result, setResult] = useState<{ correct: boolean; wrong: string[] } | null>(passed ? { correct: true, wrong: [] } : null);
  const bn = lang === "bn";
  return (
    <section className="ll-claims" aria-labelledby={`claims-${chain.id}`} data-testid={`claim-check-${chain.id}`}>
      <h4 id={`claims-${chain.id}`} className="ll-kicker ll-kicker--signal">{bn ? "দাবি-যাচাই: প্রতিটি বক্তব্য কোন ধরনের?" : "Claim Check: what kind of statement is each one?"}</h4>
      <ol>
        {claims.map((c) => {
          const wrong = result && result.wrong.includes(c.id);
          const show = result && (result.correct || wrong);
          return (
            <li key={c.id}>
              <p>{c.text[lang]}</p>
              <div className="ll-choices" role="radiogroup" aria-label={c.text[lang]}>
                {VERDICTS.map((v) => (
                  <button key={v.id} type="button" role="radio" aria-checked={answers[c.id] === v.id || (passed && c.verdict === v.id)} disabled={passed}
                    className={`ll-choice ${answers[c.id] === v.id || (passed && c.verdict === v.id) ? "is-selected" : ""}`}
                    onClick={() => { setAnswers({ ...answers, [c.id]: v.id }); setResult(null); }}>{v.label[lang]}</button>
                ))}
              </div>
              {show && (
                <p className={`ll-feedback ${wrong ? "is-wrong" : "is-right"}`} role="status">
                  {wrong ? (bn ? "✗ আবার ভাবো: " : "✗ Think again: ") : "✓ "}{result!.correct ? c.why[lang] : (bn ? "প্রমাণের স্তরগুলো আবার পড়ো।" : "Re-read the layers above.")}
                </p>
              )}
            </li>
          );
        })}
      </ol>
      {!passed && (
        <div className="ll-actions">
          <button type="button" className="ll-btn ll-btn--primary" disabled={claims.some((c) => !answers[c.id])}
            onClick={() => { const r = gradeClaims(chain, band, answers); setResult(r); if (r.correct) onPass(); }}>{S.check[lang]}</button>
        </div>
      )}
      {passed && <p className="ll-feedback is-right" role="status">{bn ? "✓ দাবি-যাচাই সম্পন্ন। তুমি পর্যবেক্ষণ, ব্যাখ্যা আর অসমর্থিত দাবি আলাদা করতে পারছ।" : "✓ Claim Check passed. You can tell observations, interpretations and unsupported claims apart."}</p>}
    </section>
  );
}

/**
 * The Echo Chain board: HARDWARE → EVIDENCE → DISCOVERY → LEGACY for each
 * mission. Layers unlock from recovered evidence. Same panel in 3D and 2D.
 */
export function EchoChainBoard({ session, lang, band, onClose }: { session: GameSession; lang: Lang; band: LearnerBand; onClose: () => void }) {
  const evidence = evidenceOf(session.progress);
  const bn = lang === "bn";
  const [, force] = useState(0);
  return (
    <Modal label={bn ? "ইকো চেইন" : "Echo Chain"} onClose={onClose} wide>
      <header className="ll-panel__head">
        <div>
          <p className="ll-kicker ll-kicker--signal">{bn ? "যন্ত্র → প্রমাণ → আবিষ্কার → উত্তরাধিকার" : "Hardware → Evidence → Discovery → Legacy"}</p>
          <h2>{bn ? "ইকো চেইন" : "Echo Chain"}</h2>
        </div>
        <button type="button" className="ll-btn" onClick={onClose}>{S.close[lang]} <kbd>Esc</kbd></button>
      </header>
      <p className="ll-intro">{bn
        ? "প্রতিটি স্তর তিনটি প্রশ্নের উত্তর দেয়: আমরা কী জানি? কীভাবে জানি? কী এখনো অনিশ্চিত? প্রমাণ উদ্ধার করলে স্তর খোলে।"
        : "Each link answers three questions: What do we know? How do we know? What remains uncertain? Links light up as you recover evidence."}</p>
      <div className="ll-chains" data-testid="echo-chain">
        {ECHO_CHAINS.map((chain) => {
          const open = new Set(revealedLayers(chain, evidence));
          const complete = chainComplete(chain, evidence);
          return (
            <section key={chain.id} className="ll-chain" data-world={chain.world} aria-label={chain.mission[lang]}>
              <h3>{chain.mission[lang]} <span className="ll-muted text-xs">· {open.size}/{chain.links.length}</span></h3>
              <ol className="ll-chain__links">
                {chain.links.map((link) => {
                  const lit = open.has(link.layer);
                  const need = link.requires.map((id) => EVIDENCE_BY_ID.get(id)?.title[lang] ?? id).join(", ");
                  return (
                    <li key={link.layer} className={`ll-chain__link ${lit ? "is-lit" : "is-dark"}`} data-layer={link.layer}>
                      <p className="ll-kicker">{LAYER_LABEL[link.layer][lang]}</p>
                      {lit ? (
                        <>
                          <h4>{link.title[lang]}</h4>
                          <dl>
                            <dt>{bn ? "আমরা কী জানি" : "What we know"}</dt><dd>{band === "junior" ? link.simple[lang] : link.know[lang]}</dd>
                            <dt>{bn ? "কীভাবে জানি" : "How we know"}</dt><dd>{link.how[lang]}</dd>
                            <dt>{bn ? "যা অনিশ্চিত" : "What remains uncertain"}</dt><dd>{link.uncertain[lang]}</dd>
                          </dl>
                          <ul className="ll-chain__sources">
                            {link.sources.map((s) => (
                              <li key={s.url}>
                                <span className={`ll-class ll-class--${s.classification}`}>{CLASSIFICATION_LABEL[s.classification][lang]}</span>{" "}
                                <a href={s.url} target="_blank" rel="noopener noreferrer">{s.label} ↗</a>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <p className="ll-muted text-sm">🔒 {bn ? "খুলতে উদ্ধার করো: " : "Recover to unlock: "}{need}</p>
                      )}
                    </li>
                  );
                })}
              </ol>
              {complete
                ? <ClaimCheck chain={chain} band={band} lang={lang} passed={session.progress.chains.includes(chain.id)} onPass={() => { session.passChainCheck(chain.id); force((n) => n + 1); }} />
                : <p className="ll-muted text-sm">{bn ? "চারটি স্তর খুললে দাবি-যাচাই শুরু হবে।" : "The Claim Check opens when all four links are lit."}</p>}
            </section>
          );
        })}
      </div>
    </Modal>
  );
}
