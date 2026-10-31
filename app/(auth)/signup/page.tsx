import Link from "next/link";
import { signUp } from "../actions";
import { AuthForm } from "@/components/auth-form";
export default function SignupPage() {
  return <AuthForm mode="signup" title="Create your account" subtitle="Your next website starts here." action={signUp} submitLabel="Create account" footer={<>Already have an account? <Link className="font-medium text-violet-300 hover:text-violet-200" href="/login">Sign in</Link></>} />;
}
