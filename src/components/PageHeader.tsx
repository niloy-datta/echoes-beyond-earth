"use client";
import { localizeDigits } from "@/lib/dates";
import { useT, type StringKey } from "@/lib/i18n";
import { PageIntro } from "./ui";

/** Localized page header usable from server-rendered route files. `n` is the exhibit number in the menu. */
export function PageHeader({ n, title, dek }: { n: number; title: StringKey; dek: StringKey }) {
  const { t, lang } = useT();
  return <PageIntro kicker={t("exhibit.n", { n: localizeDigits(String(n).padStart(2, "0"), lang) })} title={t(title)} dek={t(dek)} />;
}
