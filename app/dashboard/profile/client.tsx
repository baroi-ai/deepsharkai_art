"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Coins,
  LogOut,
  Trash2,
  Mail,
  Loader2,
  AlertCircle,
  Gift,
  CreditCard,
  CheckCircle2,
  X,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { signOut } from "next-auth/react";
import Link from "next/link";

// ✅ Import Server Actions
import {
  getUserProfile,
  deleteAccountAction,
  cancelSubscriptionAction,
} from "@/app/actions/user-actions";

const ProfilePage = () => {
  const [currentUser, setCurrentUser] = useState<{
    name: string | null;
    email: string;
    image: string | null;
    credits: number;
    initials: string;
    subscription?: {
      planId: string;
      subscriptionId: string;
      status: string; // 'active', 'halted', 'cancelled', 'pending'
      currentPeriodEnd: string;
    } | null;
  } | null>(null);

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Coupon State
  const [couponCode, setCouponCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Subscription Cancel State
  const [isCancelSubModalOpen, setIsCancelSubModalOpen] = useState(false);
  const [isCancellingSub, setIsCancellingSub] = useState(false);

  // Delete Account State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const CONFIRMATION_PHRASE = "delete my account";

  // --- 1. Load Profile ---
  useEffect(() => {
    async function loadUser() {
      try {
        const user = await getUserProfile();
        if (user) {
          // @ts-ignore
          setCurrentUser(user);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoadingProfile(false);
      }
    }
    loadUser();
  }, []);

  // --- 2. Coupon Handler ---
  const handleRedeemCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error("Please enter a coupon code.");
      return;
    }
    setIsRedeeming(true);
    setTimeout(() => {
      setIsRedeeming(false);
      if (couponCode.toLowerCase() === "free500") {
        if (currentUser) {
          setCurrentUser((prev) =>
            prev ? { ...prev, credits: prev.credits + 500 } : null,
          );
        }
        toast.success("Successfully redeemed 500 credits!");
        setCouponCode("");
      } else {
        toast.error("Invalid coupon code.");
      }
    }, 1500);
  };

  // --- 3. Subscription Handler (Real) ---
  // --- 3. Subscription Handler (Real) ---
  const proceedWithSubscriptionCancellation = async () => {
    // 1. Check if we have the ID before trying to cancel
    if (!currentUser?.subscription?.subscriptionId) {
      toast.error("Could not find your subscription ID.");
      return;
    }

    setIsCancellingSub(true);
    try {
      // 2. Call the Dodo cancellation API we built
      const res = await fetch("/api/dodo/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId: currentUser.subscription.subscriptionId,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        toast.success("Subscription cancelled successfully.");

        // Refresh profile to reflect new 'canceled' status
        const updatedUser = await getUserProfile();
        // @ts-ignore
        if (updatedUser) setCurrentUser(updatedUser);

        setIsCancelSubModalOpen(false); // Close modal
      } else {
        toast.error(result.error || "Failed to cancel subscription.");
      }
    } catch (e) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsCancellingSub(false);
    }
  };

  // --- 4. Delete Account Handlers ---
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const handleDeleteAccountModalOpen = () => {
    setDeleteConfirmationText("");
    setIsDeleteDialogOpen(true);
  };

  const proceedWithAccountDeletion = async () => {
    if (deleteConfirmationText.toLowerCase() !== CONFIRMATION_PHRASE) {
      toast.error(`Please type "${CONFIRMATION_PHRASE}" to confirm.`);
      return;
    }
    setIsDeletingAccount(true);
    try {
      const result = await deleteAccountAction();
      if (result.error) {
        toast.error(result.error);
        setIsDeletingAccount(false);
        return;
      }
      toast.success("Account deleted successfully.");
      setIsDeleteDialogOpen(false);
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      toast.error("An unexpected error occurred.");
      setIsDeletingAccount(false);
    }
  };

  // Helper
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const cardClasses = `border border-teal-500/30 bg-slate-950/50 backdrop-blur-sm shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all duration-300 ease-in-out w-full max-w-3xl mx-auto`;

  if (isLoadingProfile) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p>User not found. Please log in.</p>
        <Button onClick={() => (window.location.href = "/")} className="mt-4">
          Go Home
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 px-4 md:px-8 pt-6 w-full max-w-5xl mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-100 text-center md:text-left">
        My Profile
      </h1>

      <Card className={cardClasses}>
        <CardHeader className="flex flex-col items-center justify-center text-center pb-6 border-b border-white/5 relative">
          <Avatar className="h-24 w-24 mb-4 border-2 border-teal-500/50 shadow-lg shadow-teal-500/20">
            <AvatarImage
              src={currentUser.image || ""}
              alt={`${currentUser.email}'s Avatar`}
              className="object-cover"
            />
            <AvatarFallback className="text-3xl bg-slate-800 text-teal-400 font-bold">
              {currentUser.initials}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl text-gray-100 break-all px-4">
            {currentUser.name || currentUser.email.split("@")[0]}
          </CardTitle>
          <CardDescription className="text-gray-400 break-all px-4">
            {currentUser.email}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Email & Credits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-white/10 bg-black/20 overflow-hidden">
              <Mail className="h-5 w-5 text-gray-400 shrink-0" />
              <span className="text-sm font-medium text-gray-200 truncate">
                {currentUser.email}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-black/20">
              <div className="flex items-center space-x-3">
                <Coins className="h-5 w-5 text-teal-400 shrink-0" />
                <span className="text-sm font-medium text-gray-200">
                  Balance
                </span>
              </div>
              <span className="font-bold text-teal-400 text-lg">
                {currentUser.credits.toLocaleString()}
              </span>
            </div>
          </div>

          {/* ✅ SUBSCRIPTION STATUS BOX */}
          <div className="space-y-2">
            <Label className="text-gray-300 font-medium ml-1">
              Subscription Status
            </Label>

            {/* ⚡️ CHANGED LOGIC: ONLY SHOW IF STRICTLY 'ACTIVE' */}
            {currentUser.subscription &&
            currentUser.subscription.status === "active" ? (
              // --- ACTIVE SUBSCRIPTION UI ---
              <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-900/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-teal-400" />
                      Plan:{" "}
                      <span className="uppercase text-teal-400 tracking-wide">
                        {currentUser.subscription.planId}
                      </span>
                    </h3>
                    <p className="text-xs md:text-sm text-gray-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      Active • Renews on{" "}
                      <span className="text-gray-200">
                        {formatDate(currentUser.subscription.currentPeriodEnd)}
                      </span>
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCancelSubModalOpen(true)}
                    className="border-red-500/30 text-red-400 hover:bg-red-950/30 hover:text-red-300 w-full md:w-auto h-9"
                  >
                    Cancel Plan
                  </Button>
                </div>
              </div>
            ) : (
              // --- DEFAULT / FREE TIER UI (For Null, Cancelled, Halted, etc.) ---
              <div className="p-5 rounded-xl border border-dashed border-white/10 bg-white/5 text-center flex flex-col items-center justify-center gap-3">
                <p className="text-sm text-gray-400">
                  You are currently on the Free Tier.
                </p>
                <Link href="/dashboard/billing" className="w-full md:w-auto">
                  <Button className="bg-teal-600 hover:bg-teal-500 text-white w-full md:w-auto">
                    <Sparkles className="w-4 h-4 mr-2" /> Upgrade to Pro
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Coupon Section */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <Label
              htmlFor="coupon-code"
              className="flex items-center gap-2 text-gray-300 font-medium"
            >
              <Gift className="h-4 w-4 text-pink-400" />
              Redeem Coupon
            </Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="coupon-code"
                placeholder="Enter code (Try 'free500')"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                disabled={isRedeeming}
                className="bg-gray-900/50 border-white/10 text-gray-200 focus:border-teal-500/50"
              />
              <Button
                onClick={handleRedeemCoupon}
                disabled={isRedeeming || !couponCode.trim()}
                className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0 sm:w-auto w-full shrink-0"
              >
                {isRedeeming && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Redeem
              </Button>
            </div>
          </div>
        </CardContent>

        {/* Footer Actions */}
        <CardFooter className="flex flex-col-reverse md:flex-row justify-between gap-3 pt-6 border-t border-white/5 bg-black/10">
          <Button
            variant="destructive"
            className="w-full md:w-auto bg-red-900/30 hover:bg-red-900/60 text-red-300 border border-red-900/30 transition-colors"
            onClick={handleDeleteAccountModalOpen}
            disabled={isDeletingAccount}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete Account
          </Button>
          <Button
            variant="outline"
            className="w-full md:w-auto border-white/10 hover:bg-white/5 text-gray-300 hover:text-white bg-transparent"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </CardFooter>
      </Card>

      {/* --- MODAL 1: CANCEL SUBSCRIPTION (IMMEDIATE) --- */}
      <Dialog
        open={isCancelSubModalOpen}
        onOpenChange={setIsCancelSubModalOpen}
      >
        <DialogContent className="bg-slate-950 border border-white/10 text-gray-200 w-[90%] max-w-[425px] rounded-xl sm:rounded-2xl">
          <DialogHeader className="space-y-3">
            <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mb-2">
              <AlertCircle className="h-6 w-6 text-yellow-500" />
            </div>
            <DialogTitle className="text-xl font-bold text-white">
              Cancel Subscription?
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-sm leading-relaxed">
              Are you sure you want to cancel?
              <br />
              <br />• Your plan will be cancelled <strong>immediately</strong>.
              <br />• You will keep your current credits, but they will not
              auto-renew next month.
              <br />• You can <strong>subscribe again</strong> at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsCancelSubModalOpen(false)}
              className="w-full sm:w-auto border-white/10 hover:bg-white/5 text-gray-300"
            >
              Go Back
            </Button>
            <Button
              variant="destructive"
              onClick={proceedWithSubscriptionCancellation}
              disabled={isCancellingSub}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white border-none"
            >
              {isCancellingSub && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Cancel Immediately
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- MODAL 2: DELETE ACCOUNT --- */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-slate-950 border border-red-500/20 text-gray-200 w-[90%] max-w-[425px] rounded-xl sm:rounded-2xl">
          <DialogHeader className="space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
              <X className="h-6 w-6 text-red-500" />
            </div>
            <DialogTitle className="text-xl font-bold text-white">
              Delete Account
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-sm leading-relaxed">
              This action represents a <strong>permanent data loss</strong>. We
              cannot recover your account, credits, or history once deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-gray-300 bg-red-950/30 p-3 rounded-lg border border-red-500/20">
              Type{" "}
              <span className="font-bold text-red-400">
                "{CONFIRMATION_PHRASE}"
              </span>{" "}
              below to confirm.
            </p>
            <Input
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              className="bg-black/40 border-white/10 text-white focus:border-red-500/50"
              placeholder={CONFIRMATION_PHRASE}
            />
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="w-full sm:w-auto border-white/10 hover:bg-white/5 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={proceedWithAccountDeletion}
              disabled={
                isDeletingAccount ||
                deleteConfirmationText.toLowerCase() !== CONFIRMATION_PHRASE
              }
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeletingAccount && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePage;
