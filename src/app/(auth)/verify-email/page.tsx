"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const email  = params.get("email") ?? "";
  const [resending, setResending] = useState(false);
  const [resent, setResent]       = useState(false);

  async function resendVerification() {
    setResending(true);
    await authClient.sendVerificationEmail({ email, callbackURL: "/select-org" });
    setResending(false);
    setResent(true);
    setTimeout(() => setResent(false), 5000);
  }

  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-6">
        <Mail className="w-7 h-7 text-blue-600" />
      </div>

      <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Check your inbox</h2>
      <p className="text-slate-500 text-sm leading-relaxed mb-2">
        We sent a verification link to
      </p>
      {email && (
        <p className="font-semibold text-slate-800 text-sm mb-6">{email}</p>
      )}

      <p className="text-slate-400 text-xs leading-relaxed mb-8">
        Click the link in the email to verify your account. The link expires in 24 hours.
        Check your spam folder if you don&apos;t see it.
      </p>

      {resent ? (
        <div className="flex items-center justify-center gap-2 text-green-600 text-sm mb-4">
          <CheckCircle2 className="w-4 h-4" />
          Verification email resent
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={resendVerification}
          disabled={resending}
          className="w-full h-11 border-slate-200 mb-4"
        >
          {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Resend verification email"}
        </Button>
      )}

      <p className="text-sm text-slate-500">
        Wrong email?{" "}
        <Link href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
          Go back
        </Link>
      </p>
    </div>
  );
}
