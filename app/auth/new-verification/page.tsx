"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { newVerification } from "@/app/actions/new-verification";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const NewVerificationPage = () => {
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const onSubmit = useCallback(() => {
    if (success || error) return;

    if (!token) {
      setError("Missing token!");
      return;
    }

    newVerification(token)
      .then((data) => {
        setSuccess(data.success);
        setError(data.error);
      })
      .catch(() => {
        setError("Something went wrong!");
      });
  }, [token, success, error]);

  useEffect(() => {
    onSubmit();
  }, [onSubmit]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="w-full max-w-md p-8 bg-slate-900 border border-white/10 rounded-xl shadow-xl text-center">
        <h1 className="text-2xl font-bold mb-6">Verifying your email</h1>

        <div className="flex items-center justify-center w-full mb-6">
          {!success && !error && (
            <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
          )}
          {success && (
            <div className="flex flex-col items-center gap-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-green-400">{success}</p>
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center gap-4">
              <XCircle className="h-12 w-12 text-red-500" />
              <p className="text-red-400">{error}</p>
            </div>
          )}
        </div>

        <Button asChild className="bg-teal-600 hover:bg-teal-700 w-full">
          <Link href="/dashboard?openLogin=true">Back to Login</Link>
        </Button>
      </div>
    </div>
  );
};

export default NewVerificationPage;
