// Next.js prefixes its own routes; files copied from public need this explicitly.
export const assetPath = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH || ""}${path}`;
