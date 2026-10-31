import Link from "next/link";
import { signIn } from "../actions";
import { AuthForm } from "@/components/auth-form";
export default function LoginPage() {
  return <AuthForm mode="login" title="Welcome back" subtitle="Sign in to pick up where you left off." action={signIn} submitLabel="Sign in" footer={<>New to Asnor Studio? <Link className="font-medium text-violet-300 hover:text-violet-200" href="/signup">Create an account</Link></>} />;
}
