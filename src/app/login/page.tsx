import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = { title: "Your account" };

export default function LoginPage() {
  return <LoginForm />;
}
