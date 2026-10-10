/**
 * Real NASA photographs already bundled with the site (public/images/nasa, credited in public/data/sources.json),
 * matched to the spreadsheet objects they actually show. Keys are catalog object ids; values are keys of
 * sources.json `images` (exact spelling). Only matches that follow from the image title are listed — objects without
 * a bundled photo (for example IM-1 Odysseus) show their spreadsheet photo link instead.
 */
export const PHOTOS: Record<string, string[]> = {
  "apollo-11": ["as11-40-5948", "PIA12909", "as11-37-5551"],
  "apollo-12": ["AS12-48-7133", "as12-48-7121"],
  "apollo-14": ["as14-67-09361"],
  "apollo-15": ["PIA13037"],
  "apollo-16": ["as16-113-18347"],
  "apollo-17": ["as17-147-22548"],
  "surveyor-1": ["PIA12910"],
  "surveyor-3": ["as12-48-7121", "AS12-48-7133"],
  "viking-1": ["PIA03165"],
  "viking-2": ["PIA04023"],
  pathfinder: ["PIA04318"],
  sojourner: ["PIA04318"],
  spirit: ["PIA03250"],
  opportunity: ["PIA22909", "PIA23178"],
  phoenix: ["PIA10701"],
  curiosity: ["PIA19807", "PIA16208"],
  insight: ["PIA25287", "PIA23177", "PIA24263"],
  perseverance: ["PIA24542", "PIA24482"],
  ingenuity: ["PIA26236", "PIA24542", "PIA26482"],
};

export const photoKeys = (objectId: string | undefined): string[] => (objectId ? PHOTOS[objectId] ?? [] : []);
