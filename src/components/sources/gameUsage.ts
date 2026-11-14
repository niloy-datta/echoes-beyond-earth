/**
 * Only link a museum source to gameplay where that source is actually used.
 * The game has five chapters; broad keyword matching created false chapter
 * claims for unrelated missions (e.g. Viking and InSight).
 */
const GAME_SOURCE_USAGE: Readonly<Record<string, string>> = {
  "img:PIA23178": "The Last Light · Chapter 1 · Opportunity final traverse map",
  "img:PIA22909": "The Last Light · Chapters 2 and 4 · Pancam Legacy Pan evidence",
  "cap:PIA11436": "The Last Light · Chapter 2 · Optional rover-family discovery",
  "img:AS12-48-7133": "The Last Light · Chapter 4 · Apollo 12 and Surveyor 3 imagery",
  "img:as12-48-7121": "The Last Light · Chapter 4 · Surveyor 3 lunar photograph",
  "nssdca:1967-035A": "The Last Light · Chapter 4 · Surveyor 3 mission history",
  "trek:moon": "Museum Moon basemap (not the playable game world)",
  "trek:mars": "Museum Mars basemap (not the playable game world)",
};

export function gameUsageForSource(source: { id: string }): string | null {
  return GAME_SOURCE_USAGE[source.id] ?? null;
}
