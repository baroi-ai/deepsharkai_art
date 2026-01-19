"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowLeft, MailCheck, RefreshCw } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

import {
  loginAction,
  registerAction,
  googleLoginAction,
  resendVerificationAction,
  forgotPasswordAction, // ✅ 1. Import Forgot Password Action
} from "@/app/actions/auth-actions";

// ... GoogleIcon component ...
const GoogleIcon = () => (
  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

type AuthTab = "login" | "signup" | "forgot-password" | "verification-pending";

interface AuthModalProps {
  trigger?: React.ReactNode;
  defaultTab?: "login" | "signup";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  allowUrlControl?: boolean;
}

export function AuthModal({
  trigger,
  defaultTab = "login",
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  allowUrlControl = false,
}: AuthModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = setControlledOpen ?? setInternalOpen;

  const [activeTab, setActiveTab] = useState<AuthTab>(defaultTab);
  const [pendingEmail, setPendingEmail] = useState("");

  // ✅ Timers
  const [resendTimer, setResendTimer] = useState(0);
  const [resetTimer, setResetTimer] = useState(0); // ✅ 2. New Timer for Forgot Password

  const router = useRouter();
  const searchParams = useSearchParams();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setPendingEmail("");
      // Note: We don't reset timers to 0 here to prevent spamming by closing/opening modal
    }
  }, [isOpen, defaultTab]);

  // URL Control Logic
  useEffect(() => {
    if (!allowUrlControl) return;
    const openLogin = searchParams.get("openLogin");
    if (openLogin === "true") {
      setIsOpen(true);
    }
  }, [searchParams, setIsOpen, allowUrlControl]);

  // ✅ Verification Timer Logic
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  // ✅ 3. Forgot Password Timer Logic
  useEffect(() => {
    if (resetTimer > 0) {
      const interval = setInterval(() => setResetTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [resetTimer]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    await googleLoginAction();
  };

  const handleResendEmail = async () => {
    if (resendTimer > 0 || !pendingEmail) return;
    setIsLoading(true);
    const result = await resendVerificationAction(pendingEmail);
    setIsLoading(false);

    if (result.success) {
      toast.success("Email sent!");
      setResendTimer(60);
    } else {
      toast.error(result.error);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const emailInput = formData.get("email") as string;
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

    if (activeTab === "login") {
      const result = await loginAction(formData);

      if (result?.success) {
        toast.success("Welcome back!");
        setIsOpen(false);
        //router.push(callbackUrl);
        //router.refresh();
        window.location.href = callbackUrl;
      } else if (result?.code === "unverified") {
        setPendingEmail(emailInput);
        setActiveTab("verification-pending");
      } else {
        toast.error(result?.error || "Login failed");
      }
      setIsLoading(false);
    } else if (activeTab === "signup") {
      const result = await registerAction(formData);

      if (result?.success) {
        setPendingEmail(emailInput);
        setActiveTab("verification-pending");
        setResendTimer(60);
      } else {
        toast.error(result?.error);
      }
      setIsLoading(false);
    } else if (activeTab === "forgot-password") {
      // ✅ 4. Updated Forgot Password Logic
      if (resetTimer > 0) {
        toast.error(`Please wait ${resetTimer}s before sending again.`);
        setIsLoading(false);
        return;
      }

      const result = await forgotPasswordAction(emailInput);

      if (result.success) {
        toast.success(result.success); // "If account exists..."
        setResetTimer(60); // Lock button
        // Optional: Switch to login or keep here
      } else {
        toast.error(result.error || "Something went wrong");
      }

      setIsLoading(false);
    }
  };

  const renderTrigger = () => {
    if (trigger && React.isValidElement(trigger)) {
      return React.cloneElement(trigger as React.ReactElement<any>, {
        suppressHydrationWarning: true,
      });
    }
    if (controlledOpen === undefined && !allowUrlControl) {
      return <Button suppressHydrationWarning>Login</Button>;
    }
    return null;
  };

  const isTabsVisible = activeTab === "login" || activeTab === "signup";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {(trigger || (controlledOpen === undefined && !allowUrlControl)) && (
        <DialogTrigger asChild>{renderTrigger()}</DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[425px] bg-slate-950 border-white/10 text-white backdrop-blur-xl p-0 overflow-hidden gap-0">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-transparent to-purple-500/10 opacity-20 pointer-events-none" />

        <div className="p-6 pb-2">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center text-white">
              <span className="text-teal-400">DeepShark AI</span>
            </DialogTitle>
            <DialogDescription className="text-center text-gray-400">
              {activeTab === "verification-pending"
                ? "Verify your email address"
                : activeTab === "forgot-password"
                ? "Recover account"
                : "Login or Sign Up"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as AuthTab)}
          className="w-full relative z-10"
        >
          {isTabsVisible && (
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-2 bg-slate-900/50 border border-white/10 h-11">
                <TabsTrigger
                  value="login"
                  className="data-[state=active]:bg-teal-500 data-[state=active]:text-black h-9 transition-all"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="data-[state=active]:bg-teal-500 data-[state=active]:text-black h-9 transition-all"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>
            </div>
          )}

          <div className="p-6 pt-4 h-[420px] overflow-y-auto custom-scrollbar">
            <AnimatePresence mode="wait">
              {/* LOGIN */}
              {activeTab === "login" && (
                <TabsContent value="login" className="mt-0" forceMount>
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="grid gap-4"
                  >
                    <Button
                      variant="outline"
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                      className="w-full border-white/20 hover:bg-white/5 hover:text-white h-12"
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <GoogleIcon />
                      )}{" "}
                      Continue with Google
                    </Button>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/10" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-slate-950 px-2 text-gray-500">
                          Or continue with
                        </span>
                      </div>
                    </div>
                    <form onSubmit={handleFormSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="m@example.com"
                          required
                          className="bg-black/30 border-white/10 focus-visible:ring-teal-500 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password">Password</Label>
                          <button
                            type="button"
                            onClick={() => setActiveTab("forgot-password")}
                            className="text-xs text-teal-400 hover:text-teal-300 hover:underline"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          required
                          className="bg-black/30 border-white/10 focus-visible:ring-teal-500 text-white"
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-black font-semibold h-11 btn-glow mt-2"
                      >
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          "Log In"
                        )}
                      </Button>
                    </form>
                  </motion.div>
                </TabsContent>
              )}

              {/* SIGNUP */}
              {activeTab === "signup" && (
                <TabsContent value="signup" className="mt-0" forceMount>
                  <motion.div
                    key="signup"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="grid gap-4"
                  >
                    <Button
                      variant="outline"
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                      className="w-full border-white/20 hover:bg-white/5 hover:text-white h-12"
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <GoogleIcon />
                      )}{" "}
                      Sign up with Google
                    </Button>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/10" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-slate-950 px-2 text-gray-500">
                          Or sign up with
                        </span>
                      </div>
                    </div>
                    <form onSubmit={handleFormSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <Input
                          id="signup-email"
                          name="email"
                          type="email"
                          placeholder="m@example.com"
                          required
                          className="bg-black/30 border-white/10 focus-visible:ring-teal-500 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <Input
                          id="signup-password"
                          name="password"
                          type="password"
                          required
                          className="bg-black/30 border-white/10 focus-visible:ring-teal-500 text-white"
                        />
                      </div>
                      <div className="flex items-center space-x-2 pt-2">
                        <Checkbox
                          id="terms"
                          required
                          className="border-white/20 data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500 data-[state=checked]:text-black"
                        />
                        <label
                          htmlFor="terms"
                          className="text-xs text-gray-400 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          I agree to{" "}
                          <Link
                            href="/terms"
                            className="text-teal-400 hover:underline"
                          >
                            Terms
                          </Link>{" "}
                          and{" "}
                          <Link
                            href="/privacy"
                            className="text-teal-400 hover:underline"
                          >
                            Privacy Policy
                          </Link>
                        </label>
                      </div>
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-black font-semibold h-11 btn-glow"
                      >
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          "Create Account"
                        )}
                      </Button>
                    </form>
                  </motion.div>
                </TabsContent>
              )}

              {/* FORGOT PASSWORD */}
              {activeTab === "forgot-password" && (
                <motion.div
                  key="forgot-password"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="grid gap-4"
                >
                  <Button
                    variant="ghost"
                    onClick={() => setActiveTab("login")}
                    className="w-fit p-0 h-auto text-gray-400 hover:text-white hover:bg-transparent mb-2"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
                  </Button>
                  <p className="text-sm text-gray-400 mb-2">
                    Enter your email address and we'll send you a link to reset
                    your password.
                  </p>
                  <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <Input
                        id="reset-email"
                        name="email"
                        type="email"
                        placeholder="m@example.com"
                        required
                        className="bg-black/30 border-white/10 focus-visible:ring-teal-500 text-white"
                      />
                    </div>
                    {/* ✅ 5. Updated Button with Timer Logic */}
                    <Button
                      type="submit"
                      disabled={isLoading || resetTimer > 0}
                      className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-black font-semibold h-11 btn-glow mt-4"
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : resetTimer > 0 ? (
                        `Resend available in ${resetTimer}s`
                      ) : (
                        "Send Reset Link"
                      )}
                    </Button>
                  </form>
                </motion.div>
              )}

              {/* VERIFICATION PENDING */}
              {activeTab === "verification-pending" && (
                <motion.div
                  key="verification"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center text-center justify-center h-full gap-4"
                >
                  <div className="w-16 h-16 bg-teal-500/10 rounded-full flex items-center justify-center text-teal-400 mb-2">
                    <MailCheck className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    Check your email
                  </h3>
                  <p className="text-sm text-gray-400 max-w-[280px]">
                    We've sent a verification link to{" "}
                    <span className="text-white font-medium">
                      {pendingEmail}
                    </span>
                    .
                  </p>
                  <p className="text-xs text-gray-500">
                    Click the link in the email to activate your account.
                  </p>

                  <div className="w-full max-w-xs mt-4 space-y-3">
                    <Button
                      variant="outline"
                      onClick={handleResendEmail}
                      disabled={isLoading || resendTimer > 0}
                      className="w-full border-white/10 bg-white/5 hover:bg-white/10"
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw
                          className={`mr-2 h-4 w-4 ${
                            resendTimer > 0 ? "" : ""
                          }`}
                        />
                      )}
                      {resendTimer > 0
                        ? `Resend available in ${resendTimer}s`
                        : "Resend Email"}
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => setActiveTab("login")}
                      className="w-full text-gray-400 hover:text-white"
                    >
                      Back to Login
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
