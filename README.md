# Echoes Beyond Earth

> **The machines went silent. The knowledge kept traveling.**

An interactive museum of the machines NASA left on the Moon and Mars — and of what they sent home.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Author

Created and maintained by [Niloy Datta](https://github.com/niloy-datta).

## Account sign-in

The static site uses Supabase Auth directly from the browser. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` for local development and in the Render static site's build environment for deployment. Use a publishable (or legacy anon) key, never a secret or service-role key. Restart the development server or rebuild after changing these values.

Enable email/password authentication in Supabase. In Authentication → URL Configuration, add the exact `/login/` URLs for your deployed site and local development (for example `https://your-site.onrender.com/login/` and `http://localhost:3000/login/`). Confirmation and password-reset emails depend on these allowlisted redirect URLs and on the project's email delivery settings. Configure a production SMTP provider before relying on email delivery to users.
