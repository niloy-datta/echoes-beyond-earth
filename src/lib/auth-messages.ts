/**
 * Turn Supabase Auth errors into short, bilingual messages a learner can act on.
 * Matches on the stable `code` first, then on known message text, and never
 * shows internal details. Unknown errors fall back to a generic message.
 */
export type AuthLang = "en" | "bn";

type Msg = { en: string; bn: string };

const BY_CODE: Record<string, Msg> = {
  invalid_credentials: { en: "Email or password is incorrect.", bn: "ইমেইল বা পাসওয়ার্ড সঠিক নয়।" },
  email_not_confirmed: { en: "Confirm your email first: open the link we sent you, then sign in.", bn: "আগে ইমেইল নিশ্চিত করো: আমরা যে লিংক পাঠিয়েছি সেটি খোলো, তারপর লগইন করো।" },
  user_already_exists: { en: "An account with this email already exists. Try signing in instead.", bn: "এই ইমেইলে আগে থেকেই অ্যাকাউন্ট আছে। বরং লগইন করো।" },
  email_exists: { en: "An account with this email already exists. Try signing in instead.", bn: "এই ইমেইলে আগে থেকেই অ্যাকাউন্ট আছে। বরং লগইন করো।" },
  weak_password: { en: "Choose a stronger password (at least 6 characters).", bn: "আরও শক্তিশালী পাসওয়ার্ড দাও (কমপক্ষে ৬ অক্ষর)।" },
  email_address_invalid: { en: "Enter a valid email address.", bn: "সঠিক ইমেইল ঠিকানা দাও।" },
  over_email_send_rate_limit: { en: "Too many emails were requested. Wait a few minutes and try again.", bn: "অনেকবার ইমেইল চাওয়া হয়েছে। কয়েক মিনিট পরে আবার চেষ্টা করো।" },
  over_request_rate_limit: { en: "Too many attempts. Wait a few minutes and try again.", bn: "অনেকবার চেষ্টা হয়েছে। কয়েক মিনিট পরে আবার চেষ্টা করো।" },
  same_password: { en: "Choose a password different from your previous one.", bn: "আগের পাসওয়ার্ডের চেয়ে আলাদা একটি পাসওয়ার্ড দাও।" },
  session_not_found: { en: "This link has expired. Request a new password reset email.", bn: "এই লিংকের মেয়াদ শেষ। নতুন পাসওয়ার্ড রিসেট ইমেইল চাও।" },
  otp_expired: { en: "This link has expired. Request a new one.", bn: "এই লিংকের মেয়াদ শেষ। নতুন একটি লিংক চাও।" },
};

const BY_TEXT: [RegExp, Msg][] = [
  [/invalid login credentials/i, BY_CODE.invalid_credentials],
  [/email not confirmed/i, BY_CODE.email_not_confirmed],
  [/already registered|already exists/i, BY_CODE.user_already_exists],
  [/password should be at least/i, BY_CODE.weak_password],
  [/rate limit|too many requests|for security purposes/i, BY_CODE.over_email_send_rate_limit],
  [/unable to validate email|invalid format/i, BY_CODE.email_address_invalid],
  [/different from the old password/i, BY_CODE.same_password],
  [/auth session missing|session.*expired|expired/i, BY_CODE.session_not_found],
  [/failed to fetch|networkerror|network request failed/i, { en: "Can't reach the sign-in service. Check your connection and try again.", bn: "সাইন-ইন সেবায় পৌঁছানো যাচ্ছে না। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করো।" }],
];

const GENERIC: Msg = { en: "Something went wrong. Please try again.", bn: "কিছু ভুল হয়েছে। আবার চেষ্টা করো।" };

export function authErrorMessage(err: unknown, lang: AuthLang): string {
  const code = typeof err === "object" && err !== null && "code" in err ? String((err as { code?: unknown }).code ?? "") : "";
  const text = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  const hit = (code && BY_CODE[code]) || BY_TEXT.find(([re]) => re.test(text))?.[1] || GENERIC;
  return hit[lang];
}
