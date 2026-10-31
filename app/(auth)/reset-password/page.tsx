import Link from "next/link";
import { resetPassword } from "../actions";
import { AuthForm } from "@/components/auth-form";
export default function ResetPasswordPage() {
  return <AuthForm mode="reset" title="Reset your password" subtitle="Enter your email and we’ll send a secure reset link." action={resetPassword} submitLabel="Send reset link" footer={<>Remembered it? <Link className="font-medium text-violet-300 hover:text-violet-200" href="/login">Back to sign in</Link></>} />;
}
