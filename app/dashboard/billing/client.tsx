"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AuthModal } from "@/components/AuthModal";
import { Button } from "@/components/ui/button";
import { getUserTransactions } from "@/app/actions/getTransactions";
import { getUserProfile } from "@/app/actions/user-actions";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Coins,
  History,
  ArrowRight,
  ArrowLeft,
  Loader2,
  LogIn,
  DollarSign,
  Sparkles,
  Check,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// --- CONSTANTS ---
const COINS_PER_DOLLAR = 35;
const MIN_CUSTOM_TOP_UP_USD = 5;

// --- SUBSCRIPTION DATA ---
const MONTHLY_PLANS = [
  {
    id: "starter",
    name: "Starter",
    priceUSD: 9,
    credits: 400,
    features: [
      "400 Credits / month",
      "Generate up to 500 images (Flux)",
      "Or upscale ~60 images to 4K",
      "Or perform ~30 Magic Edits",
      "Credits never expire",
    ],
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    priceUSD: 29,
    credits: 1500,
    features: [
      "1,500 Credits / month",
      "Generate up to 1,500 images (Flux)",
      "Or upscale ~187 images to 4K",
      "Priority generation queue",
      "Rollover unused credits",
    ],
    popular: true,
  },
  {
    id: "elite",
    name: "Elite",
    priceUSD: 79,
    credits: 4200,
    features: [
      "4,200 Credits / month",
      "Generate up to 4,200 images (Flux)",
      "Or upscale ~525 images to 4K",
      "Private Mode & API Access",
      "Dedicated VIP support",
    ],
    popular: false,
  },
];

const YEARLY_PLANS = [
  {
    id: "starter_yearly",
    name: "Starter",
    priceUSD: 97, // 10% off $108
    credits: 4800,
    features: [
      "4,800 Credits UPFRONT",
      "Generate up to 6,000 images (Flux)",
      "Or upscale ~720 images to 4K",
      "Or perform ~360 Magic Edits",
      "Credits never expire",
    ],
    popular: false,
  },
  {
    id: "pro_yearly",
    name: "Pro",
    priceUSD: 313, // 10% off $348
    credits: 18000,
    features: [
      "18,000 Credits UPFRONT",
      "Generate up to 18,000 images (Flux)",
      "Or upscale ~2,244 images to 4K",
      "Priority generation queue",
      "Rollover unused credits",
    ],
    popular: true,
  },
  {
    id: "elite_yearly",
    name: "Elite",
    priceUSD: 853, // 10% off $948
    credits: 50400,
    features: [
      "50,400 Credits UPFRONT",
      "Generate up to 50,400 images (Flux)",
      "Or upscale ~6,300 images to 4K",
      "Private Mode & API Access",
      "Dedicated VIP support",
    ],
    popular: false,
  },
];

const BillingPage = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";
  const currentCoins = session?.user?.credits || 0;

  // --- STATE ---
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [amount, setAmount] = useState<string>(
    MIN_CUSTOM_TOP_UP_USD.toString(),
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const [billingMode, setBillingMode] = useState<
    "one-time" | "monthly" | "yearly"
  >("one-time");
  const [activeSubscription, setActiveSubscription] = useState<any>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // --- Fetch Data & Subscription Status ---
  useEffect(() => {
    async function loadData() {
      if (isLoggedIn) {
        const txns = await getUserTransactions();
        setTransactions(txns);

        try {
          const profile = await getUserProfile();
          if (profile?.subscription?.status === "active") {
            setActiveSubscription(profile.subscription);
            // Auto-select the right tab based on active plan
            const isYearly = profile.subscription.planId?.includes("_yearly");
            setBillingMode(isYearly ? "yearly" : "monthly");
          }
        } catch (e) {
          console.error("Failed to load profile", e);
        }
      }
      setLoadingHistory(false);
    }

    loadData();
  }, [isLoggedIn, currentCoins]);

  // --- Helpers & Logic ---
  const calculatedCoins = useMemo(() => {
    const val = parseFloat(amount);
    if (isNaN(val) || val < 0) return 0;
    return Math.floor(val * COINS_PER_DOLLAR);
  }, [amount]);

  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const currentTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return transactions.slice(start, start + itemsPerPage);
  }, [currentPage, transactions]);

  // --- HANDLER: Polar One-Time Payment ---
  const handleOneTimePayment = async () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val < MIN_CUSTOM_TOP_UP_USD) {
      toast.error(`Minimum amount is $${MIN_CUSTOM_TOP_UP_USD}`);
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch("/api/polar/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: val,
          coins: calculatedCoins,
        }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to create checkout session");

      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    } catch (error: any) {
      toast.error(error.message || "Payment initiation failed.");
      setIsProcessing(false);
    }
  };

  // --- HANDLER: Polar Subscription ---
  const handleSubscription = async (planId: string) => {
    if (activeSubscription) {
      toast.error("You already have an active subscription!");
      return;
    }

    setSubscribingId(planId);
    try {
      const res = await fetch("/api/polar/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Subscription creation failed");

      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    } catch (error: any) {
      toast.error(error.message || "Subscription failed.");
      setSubscribingId(null);
    }
  };

  // --- Shared plan card renderer ---
  const renderPlanCards = (plans: typeof MONTHLY_PLANS, isYearly = false) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {plans.map((plan) => (
        <Card
          key={plan.id}
          className={`bg-slate-900/50 border flex flex-col relative ${
            plan.popular
              ? "border-teal-500/50 shadow-[0_0_30px_-10px_rgba(20,184,166,0.3)] bg-slate-900/80 scale-100 md:scale-105 z-10"
              : "border-white/10 hover:border-white/20"
          }`}
        >
          {plan.popular && (
            <div className="absolute -top-4 left-0 right-0 flex justify-center">
              <div className="bg-gradient-to-r from-teal-500 to-cyan-500 text-black text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                <Sparkles className="w-3 h-3" /> Most Popular
              </div>
            </div>
          )}
          <CardHeader className="text-center pb-4 pt-8">
            <CardTitle className="text-xl font-bold text-white">
              {plan.name}
            </CardTitle>
            <div className="flex items-center justify-center gap-1 mt-2">
              <span className="text-3xl font-bold text-white">
                $
                {isYearly
                  ? (plan as (typeof YEARLY_PLANS)[0]).priceUSD
                  : plan.priceUSD}
              </span>
              <span className="text-gray-500 text-sm font-medium">
                {isYearly ? "/yr" : "/mo"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex-grow space-y-6">
            <div className="text-center bg-white/5 rounded-lg py-3 border border-white/5">
              <p className="text-teal-400 font-bold text-lg flex items-center justify-center gap-2">
                <Coins className="w-5 h-5" /> {plan.credits.toLocaleString()}{" "}
                Credits
              </p>
            </div>
            <ul className="space-y-3">
              {plan.features.map((feature, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 text-sm text-gray-300"
                >
                  <Check className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="flex-col">
            {!isLoggedIn ? (
              <AuthModal
                trigger={
                  <Button
                    className={`w-full h-11 font-semibold flex items-center justify-center gap-2 ${
                      plan.popular
                        ? "bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white shadow-lg"
                        : "bg-white/10 hover:bg-white/20 text-white"
                    }`}
                  >
                    <LogIn className="h-4 w-4" /> Login to Subscribe
                  </Button>
                }
              />
            ) : (
              <div className="w-full">
                {activeSubscription ? (
                  <div className="w-full text-center">
                    {activeSubscription.planId === plan.id ? (
                      <Button
                        disabled
                        className="w-full bg-green-500/20 text-green-400 border border-green-500/50 cursor-not-allowed"
                      >
                        <Check className="mr-2 h-4 w-4" /> Current Plan
                      </Button>
                    ) : (
                      <Button
                        disabled
                        className="w-full bg-white/5 text-gray-400 border border-white/10 cursor-not-allowed"
                      >
                        Already Subscribed
                      </Button>
                    )}
                    <Link
                      href="/dashboard/profile"
                      className="text-[10px] text-gray-500 mt-2 hover:text-gray-300 hover:underline cursor-pointer block"
                    >
                      Manage in Profile
                    </Link>
                  </div>
                ) : (
                  <Button
                    onClick={() => handleSubscription(plan.id)}
                    disabled={subscribingId === plan.id}
                    className={`w-full h-11 font-semibold flex items-center justify-center gap-2 ${
                      plan.popular
                        ? "bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white shadow-lg"
                        : "bg-white/10 hover:bg-white/20 text-white"
                    }`}
                  >
                    {subscribingId === plan.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span className="flex items-center gap-2">
                        <Zap className="h-4 w-4 fill-current" /> Subscribe Now
                      </span>
                    )}
                  </Button>
                )}
              </div>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-8 md:space-y-12 px-3 py-6 md:px-6 md:py-8 w-full max-w-6xl mx-auto">
      {/* --- HEADER --- */}
      <div className="text-center space-y-3 md:space-y-4">
        <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight flex items-center justify-center gap-2 md:gap-3">
          <Coins className="h-6 w-6 md:h-8 md:w-8 text-teal-500" />
          Billing & Credits
        </h1>
        <p className="text-gray-400 text-sm md:text-lg max-w-2xl mx-auto">
          Manage your plan and top up credits instantly.
        </p>
        <div className="inline-flex items-center gap-2 bg-slate-900 border border-teal-500/30 rounded-full px-4 py-1.5 md:px-5 md:py-2 mt-2">
          <span className="text-gray-400 text-xs md:text-sm">Balance:</span>
          <span className="text-teal-400 font-bold text-sm md:text-base flex items-center gap-1">
            <Coins className="h-3 w-3 md:h-4 md:w-4" />
            {isLoggedIn ? currentCoins.toLocaleString() : "--"}
          </span>
        </div>
      </div>

      {/* --- TOGGLE SWITCH --- */}
      <div className="flex justify-center mb-6 md:mb-8">
        <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 p-1 rounded-full flex items-center shadow-2xl relative w-full max-w-[420px] md:max-w-[460px]">
          <div className="flex relative z-10 w-full">
            <button
              onClick={() => setBillingMode("one-time")}
              className={`flex-1 px-3 py-2 md:px-5 rounded-full text-xs md:text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                billingMode === "one-time"
                  ? "bg-teal-600 text-white shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Pay as you go
            </button>
            <button
              onClick={() => setBillingMode("monthly")}
              className={`flex-1 px-3 py-2 md:px-5 rounded-full text-xs md:text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                billingMode === "monthly"
                  ? "bg-teal-600 text-white shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingMode("yearly")}
              className={`flex-1 px-3 py-2 md:px-5 rounded-full text-xs md:text-sm font-medium transition-all duration-300 flex items-center justify-center gap-1.5 whitespace-nowrap ${
                billingMode === "yearly"
                  ? "bg-teal-600 text-white shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Yearly
              <span className="text-[9px] md:text-[10px] bg-teal-800 text-teal-100 px-1.5 py-0.5 rounded-full border border-teal-500/30">
                1 Month Free
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[400px]">
        {/* VIEW 1: ONE-TIME PAYMENT */}
        {billingMode === "one-time" && (
          <div className="flex justify-center">
            <Card className="w-full max-w-md bg-slate-900/50 border border-white/10 shadow-2xl hover:border-teal-500/30 transition-all duration-300 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl md:text-2xl font-semibold text-white flex items-center justify-center gap-2">
                  <DollarSign className="h-5 w-5 text-teal-400" />
                  Top-up Credits
                </CardTitle>
                <CardDescription>
                  Enter USD amount to calculate credits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6 flex-grow">
                <div>
                  <div className="relative max-w-[200px] mx-auto">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 text-xl font-bold">
                      $
                    </span>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min={MIN_CUSTOM_TOP_UP_USD}
                      className="pl-8 text-center text-xl md:text-2xl font-bold bg-black/20 border-white/10 text-white h-12 md:h-14 focus:border-teal-500/50 w-full"
                    />
                  </div>
                </div>
                <div className="text-center space-y-1 bg-teal-500/10 p-4 md:p-6 rounded-xl border border-teal-500/20">
                  <p className="text-xs md:text-sm text-gray-400 uppercase tracking-wider">
                    You Get
                  </p>
                  <p className="text-3xl md:text-4xl font-extrabold text-teal-400 flex items-center justify-center gap-2 break-all">
                    <Coins className="h-6 w-6 md:h-8 md:w-8 flex-shrink-0" />{" "}
                    {calculatedCoins.toLocaleString()}
                  </p>
                  <p className="text-xs md:text-sm text-gray-400">
                    credits (Lifetime Validity)
                  </p>
                </div>
              </CardContent>
              <CardFooter className="p-6 pt-0 flex flex-col justify-center">
                {!isLoggedIn ? (
                  <AuthModal
                    trigger={
                      <Button className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold h-11 md:h-[48px] text-base md:text-lg rounded-[4px]">
                        <LogIn className="mr-2 h-4 w-4 md:h-5 md:w-5" /> Login
                        to Pay
                      </Button>
                    }
                  />
                ) : (
                  <Button
                    onClick={handleOneTimePayment}
                    disabled={isProcessing}
                    className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white shadow-lg hover:shadow-cyan-500/20 font-bold h-11 md:h-[48px] text-base md:text-lg rounded-[4px] transition-all"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin" />
                    ) : (
                      <span className="flex items-center gap-2">
                        Continue to Checkout
                      </span>
                    )}
                  </Button>
                )}
                <p className="text-[10px] md:text-xs text-gray-500 mt-3 text-center flex flex-col items-center">
                  <span>
                    Secure global checkout via Polar. Minimum purchase $
                    {MIN_CUSTOM_TOP_UP_USD}.
                  </span>
                </p>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* VIEW 2: MONTHLY PLANS */}
        {billingMode === "monthly" && renderPlanCards(MONTHLY_PLANS, false)}

        {/* VIEW 3: YEARLY PLANS */}
        {billingMode === "yearly" && renderPlanCards(YEARLY_PLANS, true)}
      </div>

      {/* --- TRANSACTION HISTORY --- */}
      {isLoggedIn && (
        <section className="no-sidebar-swipe space-y-4 pt-8 md:pt-10 border-t border-white/5">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg md:text-xl font-bold text-gray-200">
              Transaction History
            </h2>
          </div>
          <Card className="no-sidebar-swipe bg-slate-950/50 border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-gray-300">Date</TableHead>
                    <TableHead className="text-gray-300">Type</TableHead>
                    <TableHead className="text-gray-300 text-right">
                      Credits
                    </TableHead>
                    <TableHead className="text-gray-300 text-right">
                      Amount
                    </TableHead>
                    <TableHead className="text-gray-300 text-center">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingHistory ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-gray-400"
                      >
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        Loading history...
                      </TableCell>
                    </TableRow>
                  ) : currentTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-gray-400 text-sm"
                      >
                        No transactions yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentTransactions.map((txn) => (
                      <TableRow
                        key={txn.id}
                        className="border-white/5 hover:bg-white/5"
                      >
                        <TableCell className="text-gray-400 font-mono text-xs">
                          {txn.createdAt
                            ? new Date(txn.createdAt).toLocaleDateString()
                            : "-"}
                        </TableCell>

                        <TableCell className="text-gray-200 capitalize text-xs">
                          {txn.amount <= 0
                            ? "Top Up"
                            : txn.provider?.includes("subscription")
                              ? "Subscription"
                              : "Credit Top-Up"}
                        </TableCell>

                        <TableCell
                          className={`text-right font-bold text-xs ${txn.credits > 0 ? "text-green-400" : "text-red-400"}`}
                        >
                          {txn.credits > 0 ? "+" : ""}
                          {txn.credits}
                        </TableCell>

                        <TableCell className="text-right text-gray-400 text-xs">
                          {txn.amount > 0
                            ? new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: txn.currency || "USD",
                              }).format(txn.amount)
                            : "-"}
                        </TableCell>

                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] capitalize ${
                              txn.status === "completed"
                                ? "border-green-500/50 text-green-400 bg-green-500/10"
                                : "border-red-500/50 text-red-400 bg-red-500/10"
                            }`}
                          >
                            {txn.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {transactions.length > itemsPerPage && (
              <div className="flex items-center justify-between p-3 md:p-4 border-t border-white/10 bg-white/5">
                <span className="text-xs md:text-sm text-gray-400">
                  Page <span className="text-white">{currentPage}</span> of{" "}
                  {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-7 w-7 border-white/10 hover:bg-white/10 text-gray-300"
                  >
                    <ArrowLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    className="h-7 w-7 border-white/10 hover:bg-white/10 text-gray-300"
                  >
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </section>
      )}
    </div>
  );
};

export default BillingPage;
