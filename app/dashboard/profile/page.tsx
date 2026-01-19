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
  DialogClose,
} from "@/components/ui/dialog";
import {
  Coins,
  LogOut,
  Trash2,
  Mail,
  Loader2,
  AlertCircle,
  Gift,
} from "lucide-react";
import { toast } from "sonner";
import { signOut } from "next-auth/react";

// ✅ Import Server Actions
import {
  getUserProfile,
  deleteAccountAction,
} from "@/app/actions/user-actions";

const ProfilePage = () => {
  const [currentUser, setCurrentUser] = useState<{
    name: string | null;
    email: string;
    image: string | null;
    credits: number;
    initials: string;
  } | null>(null);

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Coupon State
  const [couponCode, setCouponCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Delete Account State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const CONFIRMATION_PHRASE = "delete my account";

  useEffect(() => {
    async function loadUser() {
      try {
        const user = await getUserProfile();
        if (user) {
          // @ts-ignore
          setCurrentUser(user);
        } else {
          // If we can't load profile, maybe session expired?
          // Don't error immediately, just let it render null
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoadingProfile(false);
      }
    }
    loadUser();
  }, []);

  const handleRedeemCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error("Please enter a coupon code.");
      return;
    }
    setIsRedeeming(true);
    // Mock API Call
    setTimeout(() => {
      setIsRedeeming(false);
      if (couponCode.toLowerCase() === "free500") {
        if (currentUser) {
          setCurrentUser((prev) =>
            prev ? { ...prev, credits: prev.credits + 500 } : null
          );
        }
        toast.success("Successfully redeemed 500 credits!");
        setCouponCode("");
      } else {
        toast.error("Invalid coupon code.");
      }
    }, 1500);
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const handleDeleteAccountModalOpen = () => {
    setDeleteConfirmationText("");
    setIsDeleteDialogOpen(true);
  };

  // ✅ UPDATED: REAL DELETE LOGIC
  const proceedWithAccountDeletion = async () => {
    if (deleteConfirmationText.toLowerCase() !== CONFIRMATION_PHRASE) {
      toast.error(`Please type "${CONFIRMATION_PHRASE}" to confirm.`);
      return;
    }

    setIsDeletingAccount(true);

    try {
      // 1. Call Server Action
      const result = await deleteAccountAction();

      if (result.error) {
        toast.error(result.error);
        setIsDeletingAccount(false);
        return;
      }

      // 2. On Success
      toast.success("Account deleted successfully.");
      setIsDeleteDialogOpen(false);

      // 3. Force Logout & Redirect
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      toast.error("An unexpected error occurred.");
      setIsDeletingAccount(false);
    }
  };

  const cardClasses = `border border-teal-500/30 bg-slate-950/50 backdrop-blur-sm shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all duration-300 ease-in-out hover:border-teal-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] w-full max-w-2xl mx-auto`;

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
    <div className="space-y-8 pb-20 px-4 md:px-8 pt-6 w-full max-w-5xl mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-100 text-center md:text-left">
        My Profile
      </h1>

      <Card className={cardClasses}>
        <CardHeader className="flex flex-col items-center justify-center text-center pb-6 border-b border-white/5">
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
          <CardTitle className="text-2xl text-gray-100 break-all">
            {currentUser.name || currentUser.email.split("@")[0]}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {currentUser.email}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-6">
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
                Credit Balance
              </span>
            </div>
            <span className="font-bold text-teal-400 text-lg">
              {currentUser.credits.toLocaleString()}
            </span>
          </div>
        </CardContent>

        <CardContent>
          <div className="space-y-3 pt-4 border-t border-white/10">
            <Label
              htmlFor="coupon-code"
              className="flex items-center gap-2 text-gray-300 font-medium"
            >
              <Gift className="h-4 w-4 text-pink-400" />
              Have a Coupon Code?
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
                className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0 sm:w-auto w-full"
              >
                {isRedeeming && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Redeem
              </Button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-6 border-t border-white/5 bg-black/10">
          <Button
            variant="destructive"
            className="w-full sm:w-auto bg-red-900/50 hover:bg-red-900/80 text-red-200 border border-red-900/50"
            onClick={handleDeleteAccountModalOpen}
            disabled={isDeletingAccount}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete Account
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-auto border-white/10 hover:bg-white/5 text-gray-300 hover:text-white bg-transparent"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-gray-200 w-[90%] sm:max-w-[425px] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" /> Delete Account
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">
              This action cannot be undone. This will permanently delete your
              account and remove your data from our servers.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-gray-300">
              Type{" "}
              <span className="font-bold text-white">
                "{CONFIRMATION_PHRASE}"
              </span>{" "}
              to confirm.
            </p>
            <Input
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              className="bg-black/40 border-white/10 text-white"
              placeholder={CONFIRMATION_PHRASE}
            />
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <DialogClose asChild>
              <Button
                variant="outline"
                className="border-white/10 hover:bg-white/5 text-gray-300 w-full sm:w-auto"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={proceedWithAccountDeletion}
              disabled={
                isDeletingAccount ||
                deleteConfirmationText.toLowerCase() !== CONFIRMATION_PHRASE
              }
              className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
            >
              {isDeletingAccount && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePage;
