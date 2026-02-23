"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
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
  CreditCard,
  HelpCircle,
  DollarSign,
  IndianRupee,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Check,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";

// --- CONSTANTS ---
const COINS_PER_DOLLAR = 40;
const COINS_PER_RUPEE = 0.5; // 100 INR = 60 Credits

// --- SUBSCRIPTION DATA ---
// ✅ Features updated to show real-world generation value
const SUBSCRIPTION_PLANS = [
  {
    id: "starter",
    name: "Starter",
    priceUSD: 9,
    priceINR: 699,
    credits: 400, // Margin: ~45%
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
    priceINR: 2499,
    credits: 1500, // Margin: ~40%
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
    priceINR: 6499,
    credits: 4200, // Margin: ~35%
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

const PricingPageClient = () => {
  // Input State for "Calculator" functionality
  const [amountUSD, setAmountUSD] = useState<string>("10");
  const [amountINR, setAmountINR] = useState<string>("500");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Toggle State: 'one-time' | 'subscription'
  const [billingMode, setBillingMode] = useState<"one-time" | "subscription">(
    "one-time",
  );

  // Location State
  const [isIndia, setIsIndia] = useState<boolean>(false);

  // IP-based Location Detection
  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then((res) => res.json())
      .then((data) => {
        if (data.country_code === "IN") {
          setIsIndia(true);
        } else {
          setIsIndia(false);
        }
      })
      .catch((err) => {
        console.error("Failed to get location", err);
        setIsIndia(false); // Default to International on error
      });
  }, []);

  // --- DYNAMIC FAQ DATA ---
  const dynamicFaqs = useMemo(() => {
    return [
      {
        question: "How do credits work?",
        answer:
          "Credits are the currency used to generate content. Approx cost: 1 Credit for Standard Image (Flux), 8 Credits for 4K Upscale, 15 Credits for AI Magic Erase. Costs vary based on the AI model's power.",
      },
      {
        question: "Do my credits expire?",
        answer:
          billingMode === "subscription"
            ? "Subscription credits roll over for one month on the Pro plan. On the Starter plan, they reset monthly."
            : "No! For one-time purchases, your credits never expire. You can use them whenever you want.",
      },
      {
        question: "Can I get a refund?",
        answer:
          "No, we do not offer refunds. All purchases are final. Please check our terms before purchasing credits.",
      },
      {
        question: "What payment methods do you accept?",
        answer: isIndia
          ? "We accept Razorpay (UPI, Cards, Netbanking) for seamless transactions in India."
          : "We accept PayPal for secure international payments.",
      },
    ];
  }, [isIndia, billingMode]);

  // Calculations
  const coinsUSD = useMemo(() => {
    const amount = parseFloat(amountUSD);
    return !isNaN(amount) && amount >= 0
      ? Math.floor(amount * COINS_PER_DOLLAR)
      : 0;
  }, [amountUSD]);

  const coinsINR = useMemo(() => {
    const amount = parseFloat(amountINR);
    return !isNaN(amount) && amount >= 0
      ? Math.floor(amount * COINS_PER_RUPEE)
      : 0;
  }, [amountINR]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-gray-100">
      <Navbar />
      <div className="absolute inset-0 hero-gradient z-0 pointer-events-none"></div>

      {/* Main Content Area */}
      <main className="flex-grow container mx-auto px-4 md:px-6 py-12 md:py-24 relative z-10">
        <div className="max-w-5xl mx-auto">
          {/* --- Header --- */}
          <div className="text-center space-y-4 mb-8">
            <h1 className="text-3xl md:text-5xl font-bold text-white flex flex-col md:flex-row items-center justify-center gap-3">
              <CreditCard className="h-10 w-10 text-teal-500" />
              <span>Simple, Transparent Pricing</span>
            </h1>
            <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto">
              Choose the plan that works for you. No hidden fees.
            </p>
          </div>

          {/* --- MOBILE-FRIENDLY TOGGLE SWITCH --- */}
          <div className="flex justify-center mb-8 md:mb-12">
            <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 p-1 rounded-full flex items-center shadow-2xl relative w-full max-w-[340px] md:max-w-fit mx-4 md:mx-0">
              <div className="flex relative z-10 w-full">
                <button
                  onClick={() => setBillingMode("one-time")}
                  className={`flex-1 md:flex-none px-3 py-2 md:px-6 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                    billingMode === "one-time"
                      ? "bg-teal-600 text-white shadow-md"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Pay as you go
                </button>
                <button
                  onClick={() => setBillingMode("subscription")}
                  className={`flex-1 md:flex-none px-3 py-2 md:px-6 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-300 flex items-center justify-center gap-1.5 md:gap-2 whitespace-nowrap ${
                    billingMode === "subscription"
                      ? "bg-teal-600 text-white shadow-md"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Subscription
                  <span className="text-[9px] md:text-[10px] bg-teal-800 text-teal-100 px-1.5 py-0.5 rounded-full border border-teal-500/30">
                    -20%
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* --- CONTENT AREA --- */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* VIEW 1: ONE-TIME PAYMENT (CALCULATOR) */}
            {billingMode === "one-time" && (
              <div className="flex justify-center">
                {/* CASE 1: India View (INR Only) */}
                {isIndia ? (
                  <Card className="w-full max-w-md bg-slate-900/50 border border-white/10 shadow-2xl hover:border-teal-500/30 transition-all duration-300 flex flex-col">
                    <CardHeader className="text-center pb-2">
                      <CardTitle className="text-xl md:text-2xl font-semibold text-white flex items-center justify-center gap-2">
                        <IndianRupee className="h-6 w-6 text-teal-400" />
                        India Pricing (INR)
                      </CardTitle>
                      <CardDescription>
                        Enter amount to calculate credits
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6 flex-grow">
                      <div>
                        <div className="relative max-w-[200px] mx-auto">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 text-xl font-bold">
                            ₹
                          </span>
                          <Input
                            type="number"
                            value={amountINR}
                            onChange={(e) => setAmountINR(e.target.value)}
                            className="pl-8 text-center text-2xl font-bold bg-black/20 border-white/10 text-white h-14 focus:border-teal-500/50 w-full"
                          />
                        </div>
                      </div>
                      <div className="text-center space-y-1 bg-teal-500/10 p-6 rounded-xl border border-teal-500/20">
                        <p className="text-sm text-gray-400 uppercase tracking-wider">
                          You Get
                        </p>
                        <p className="text-4xl font-extrabold text-teal-400 flex items-center justify-center gap-2 break-all">
                          <Coins className="h-8 w-8 flex-shrink-0" />
                          {coinsINR.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-400">
                          credits (Lifetime Validity)
                        </p>
                      </div>
                    </CardContent>
                    <CardFooter className="p-6 pt-0">
                      <Link
                        href={`/dashboard/billing?amount=${amountINR}&currency=INR`}
                        className="w-full"
                      >
                        <Button className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white shadow-lg font-bold h-12 text-lg rounded-md transition-all shadow-lg hover:shadow-cyan-500/20 flex items-center justify-center gap-2">
                          Pay with Razorpay
                          {/* ✅ INR Logo */}
                          <img
                            src="/icons/upi.png"
                            alt="UPI"
                            className="h-5 w-auto object-contain bg-white rounded-sm px-1 py-0.5"
                          />
                          <ArrowRight className="h-5 w-5" />
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                ) : (
                  /* CASE 2: International View (USD Only) */
                  <Card className="w-full max-w-md bg-slate-900/50 border border-white/10 shadow-2xl hover:border-blue-500/30 transition-all duration-300 flex flex-col">
                    <CardHeader className="text-center pb-2">
                      <CardTitle className="text-xl md:text-2xl font-semibold text-white flex items-center justify-center gap-2">
                        <DollarSign className="h-6 w-6 text-blue-400" />
                        International Pricing (USD)
                      </CardTitle>
                      <CardDescription>
                        Enter amount to calculate credits
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
                            value={amountUSD}
                            onChange={(e) => setAmountUSD(e.target.value)}
                            className="pl-8 text-center text-2xl font-bold bg-black/20 border-white/10 text-white h-14 focus:border-blue-500/50 w-full"
                          />
                        </div>
                      </div>
                      <div className="text-center space-y-1 bg-blue-500/10 p-6 rounded-xl border border-blue-500/20">
                        <p className="text-sm text-gray-400 uppercase tracking-wider">
                          You Get
                        </p>
                        <p className="text-4xl font-extrabold text-blue-400 flex items-center justify-center gap-2 break-all">
                          <Coins className="h-8 w-8 flex-shrink-0" />
                          {coinsUSD.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-400">
                          credits (Lifetime Validity)
                        </p>
                      </div>
                    </CardContent>
                    <CardFooter className="p-6 pt-0">
                      <Link
                        href={`/dashboard/billing?amount=${amountUSD}&currency=USD`}
                        className="w-full"
                      >
                        <Button className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white shadow-lg font-bold h-12 text-lg rounded-md transition-all shadow-lg hover:shadow-blue-500/20 flex items-center justify-center gap-2">
                          Pay with PayPal
                          {/* ✅ USD Logo */}
                          <img
                            src="/icons/paypal.png"
                            alt="PayPal"
                            className="h-5 w-auto object-contain bg-white rounded-sm px-1 py-0.5"
                          />
                          <ArrowRight className="h-5 w-5" />
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                )}
              </div>
            )}

            {/* VIEW 2: SUBSCRIPTION PLANS (Automatically localized) */}
            {billingMode === "subscription" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {SUBSCRIPTION_PLANS.map((plan) => (
                  <Card
                    key={plan.id}
                    className={`bg-slate-900/50 border flex flex-col relative ${
                      plan.popular
                        ? "border-teal-500/50 shadow-[0_0_30px_-10px_rgba(20,184,166,0.3)] bg-slate-900/80 scale-105 z-10"
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
                          {isIndia ? "₹" : "$"}
                          {isIndia
                            ? plan.priceINR.toLocaleString()
                            : plan.priceUSD}
                        </span>
                        <span className="text-gray-500 text-sm font-medium">
                          /mo
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-grow space-y-6">
                      <div className="text-center bg-white/5 rounded-lg py-3 border border-white/5">
                        <p className="text-teal-400 font-bold text-lg flex items-center justify-center gap-2">
                          <Coins className="w-5 h-5" />{" "}
                          {plan.credits.toLocaleString()} Credits
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
                      <Link
                        href={`/dashboard/billing?plan=${plan.id}`}
                        className="w-full"
                      >
                        <Button
                          className={`w-full h-11 font-semibold flex items-center justify-center gap-2 ${
                            plan.popular
                              ? "bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white shadow-lg"
                              : "bg-white/10 hover:bg-white/20 text-white"
                          }`}
                        >
                          Subscribe Now
                          {/* ✅ Payment Logo */}
                          <img
                            src={
                              isIndia ? "/icons/upi.png" : "/icons/paypal.png"
                            }
                            alt={isIndia ? "UPI" : "PayPal"}
                            className="h-5 w-auto object-contain bg-white rounded-sm px-1 py-0.5"
                          />
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* --- FAQ Section --- */}
          <section className="pt-20 pb-8 max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-8">
              <HelpCircle className="h-6 w-6 text-teal-500" />
              <h2 className="text-xl md:text-2xl font-bold text-gray-100 text-center">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-4">
              {dynamicFaqs.map((faq, index) => (
                <Card
                  key={index}
                  className={`bg-slate-900/30 border transition-all duration-200 cursor-pointer ${
                    openFaqIndex === index
                      ? "border-teal-500/50 bg-teal-900/10"
                      : "border-white/10 hover:border-white/20"
                  }`}
                  onClick={() =>
                    setOpenFaqIndex(openFaqIndex === index ? null : index)
                  }
                >
                  <div className="p-6 flex items-center justify-between text-left">
                    <h3 className="font-semibold text-gray-200 pr-4">
                      {faq.question}
                    </h3>
                    {openFaqIndex === index ? (
                      <ChevronUp className="h-5 w-5 text-teal-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                    )}
                  </div>
                  {openFaqIndex === index && (
                    <div className="px-5 pt-0 pb-6 text-sm text-gray-400 leading-relaxed border-t-0 animate-in fade-in slide-in-from-top-1 text-left pl-6">
                      {faq.answer}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PricingPageClient;
