"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
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
  DollarSign,
  ArrowRight,
  Check,
  Sparkles,
  Zap,
  CreditCard,
} from "lucide-react";
import { Input } from "@/components/ui/input";

// --- CONSTANTS (Synced with Billing Page) ---
const COINS_PER_DOLLAR = 35;
const MIN_CUSTOM_TOP_UP_USD = 5;

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
    priceUSD: 97,
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
    priceUSD: 313,
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
    priceUSD: 853,
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

const PricingPageClient = () => {
  const router = useRouter();
  const [billingMode, setBillingMode] = useState<
    "one-time" | "monthly" | "yearly"
  >("one-time");
  const [amount, setAmount] = useState<string>(
    MIN_CUSTOM_TOP_UP_USD.toString(),
  );

  const calculatedCoins = useMemo(() => {
    const val = parseFloat(amount);
    if (isNaN(val) || val < 0) return 0;
    return Math.floor(val * COINS_PER_DOLLAR);
  }, [amount]);

  // Unified Redirect Handler
  const handleRedirect = (planId?: string) => {
    const baseUrl = "/dashboard/billing";
    const params = new URLSearchParams();

    if (planId) {
      params.set("plan", planId);
    } else {
      params.set("amount", amount);
    }

    router.push(`${baseUrl}?${params.toString()}`);
  };

  const renderPlanCards = (plans: typeof MONTHLY_PLANS, isYearly = false) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {plans.map((plan) => (
        <Card
          key={plan.id}
          className={`bg-slate-900/50 border flex flex-col relative transition-all duration-300 ${
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
                ${plan.priceUSD}
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
          <CardFooter>
            <Button
              onClick={() => handleRedirect(plan.id)}
              className={`w-full h-11 font-semibold flex items-center justify-center gap-2 ${
                plan.popular
                  ? "bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white shadow-lg"
                  : "bg-white/10 hover:bg-white/20 text-white"
              }`}
            >
              <Zap className="h-4 w-4 fill-current" /> Subscribe Now
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-gray-100">
      <Navbar />

      <main className="flex-grow container mx-auto px-4 pt-20 pb-12 md:pt-40 md:pb-24 relative z-10">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-2xl md:text-5xl font-bold text-white flex items-center justify-center gap-2 md:gap-4 flex-nowrap">
              {/* Adjusted icon size for mobile (h-7) so it doesn't push the row too wide */}
              <CreditCard className="h-7 w-7 md:h-12 md:w-12 text-teal-500 flex-shrink-0" />
              <span className="whitespace-nowrap">
                Simple, Transparent Pricing
              </span>
            </h1>
            <p className="text-gray-400 text-sm md:text-lg max-w-2xl mx-auto px-4">
              Fuel your creativity with flexible credit packs or professional
              subscriptions.
            </p>
          </div>

          {/* --- TOGGLE SWITCH --- */}
          <div className="flex justify-center">
            <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 p-1 rounded-full flex items-center shadow-2xl relative w-full max-w-[420px] md:max-w-[480px]">
              <button
                onClick={() => setBillingMode("one-time")}
                className={`flex-1 px-3 py-2 md:px-5 rounded-full text-xs md:text-sm font-medium transition-all duration-300 ${
                  billingMode === "one-time"
                    ? "bg-teal-600 text-white shadow-md"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Pay as you go
              </button>
              <button
                onClick={() => setBillingMode("monthly")}
                className={`flex-1 px-3 py-2 md:px-5 rounded-full text-xs md:text-sm font-medium transition-all duration-300 ${
                  billingMode === "monthly"
                    ? "bg-teal-600 text-white shadow-md"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingMode("yearly")}
                className={`flex-1 px-3 py-2 md:px-5 rounded-full text-xs md:text-sm font-medium transition-all duration-300 flex items-center justify-center gap-1.5 ${
                  billingMode === "yearly"
                    ? "bg-teal-600 text-white shadow-md"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Yearly
                <span className="text-[9px] md:text-[10px] bg-teal-800 text-teal-100 px-1.5 py-0.5 rounded-full border border-teal-500/30 whitespace-nowrap">
                  1 Month Free
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Content */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[450px]">
            {billingMode === "one-time" && (
              <div className="flex justify-center">
                <Card className="w-full max-w-md bg-slate-900/50 border border-white/10 shadow-2xl hover:border-teal-500/30 transition-all duration-300 relative overflow-hidden">
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
                  <CardContent className="space-y-6 pt-6">
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
                    <div className="text-center space-y-1 bg-teal-500/10 p-6 rounded-xl border border-teal-500/20">
                      <p className="text-xs md:text-sm text-gray-400 uppercase tracking-wider">
                        You Get
                      </p>
                      <p className="text-3xl md:text-4xl font-extrabold text-teal-400 flex items-center justify-center gap-2 break-all">
                        <Coins className="h-6 w-6 md:h-8 md:w-8 flex-shrink-0" />
                        {calculatedCoins.toLocaleString()}
                      </p>
                      <p className="text-xs md:text-sm text-gray-400">
                        credits (Lifetime Validity)
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={() => handleRedirect()}
                      className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold h-12 text-lg rounded-[4px] flex items-center justify-center gap-2 shadow-lg"
                    >
                      Get Started <ArrowRight className="h-5 w-5" />
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}

            {billingMode === "monthly" && renderPlanCards(MONTHLY_PLANS, false)}
            {billingMode === "yearly" && renderPlanCards(YEARLY_PLANS, true)}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PricingPageClient;
