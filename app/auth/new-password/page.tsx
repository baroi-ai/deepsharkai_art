"use client";

import { useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { newPasswordAction } from "@/app/actions/auth-actions"; // Import Action
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const NewPasswordPage = () => {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();

  const [error, setError] = useState<string | undefined>("");
  const [success, setSuccess] = useState<string | undefined>("");
  const [isPending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    const password = formData.get("password") as string;

    setError("");
    setSuccess("");

    startTransition(() => {
      newPasswordAction(password, token).then((data) => {
        if (data.error) {
          setError(data.error);
          toast.error(data.error);
        }
        if (data.success) {
          setSuccess(data.success);
          toast.success(data.success);
          // Redirect to login after 2 seconds
          setTimeout(() => {
            router.push("/dashboard?openLogin=true");
          }, 2000);
        }
      });
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white p-4">
      <div className="w-full max-w-md p-8 bg-slate-900 border border-white/10 rounded-xl shadow-xl">
        <h1 className="text-2xl font-bold text-center mb-2">Reset Password</h1>
        <p className="text-gray-400 text-center text-sm mb-6">
          Enter your new password below.
        </p>

        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="******"
              disabled={isPending}
              required
              className="bg-black/30 border-white/10 focus-visible:ring-teal-500 text-white"
            />
          </div>

          {error && (
            <div className="bg-red-500/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-red-500">
              <AlertCircle className="h-4 w-4" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-500/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-green-500">
              <CheckCircle2 className="h-4 w-4" />
              <p>{success}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-black font-semibold"
          >
            {isPending ? (
              <Loader2 className="animate-spin h-4 w-4" />
            ) : (
              "Reset Password"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default NewPasswordPage;
