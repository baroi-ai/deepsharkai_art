"use client";

import React, { useState, useMemo, useEffect } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useSession } from "next-auth/react";
import { AuthModal } from "@/components/AuthModal";
import { Button } from "@/components/ui/button";
import { getUserTransactions } from "@/app/actions/getTransactions";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Coins,
  CreditCard,
  History,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  IndianRupee,
  Loader2,
  LogIn,
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
const COINS_PER_DOLLAR = 50;
const MIN_CUSTOM_TOP_UP_USD = 5;
const COINS_PER_RUPEE = 0.6;
const MIN_CUSTOM_TOP_UP_INR = 100;

// --- HELPER: Load Razorpay Script ---
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const BillingPage = () => {
  // Session
  const { data: session, update, status } = useSession();
  const isLoggedIn = status === "authenticated";
  const currentCoins = session?.user?.credits || 0;

  // Real Transaction Data State
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Payment States
  const [amountUSD, setAmountUSD] = useState<string>("10");
  const [amountINR, setAmountINR] = useState<string>("500");
  const [processingINR, setProcessingINR] = useState(false);

  // ✅ LOCATION STATE
  const [userCountry, setUserCountry] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // ✅ FETCH LOCATION ON LOAD
  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then((res) => res.json())
      .then((data) => {
        setUserCountry(data.country_code); // e.g., "IN", "US"
      })
      .catch((err) => {
        console.error("Failed to get location", err);
        setUserCountry("US"); // Default to US/International on error
      });
  }, []);

  // ✅ FETCH TRANSACTIONS
  useEffect(() => {
    async function loadData() {
      if (isLoggedIn) {
        const data = await getUserTransactions();
        setTransactions(data);
      }
      setLoadingHistory(false);
    }
    loadData();
  }, [isLoggedIn, currentCoins]);

  // Pagination Logic
  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const currentTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return transactions.slice(start, start + itemsPerPage);
  }, [currentPage, transactions]);

  // Calculations
  const coinsUSD = useMemo(() => {
    const amount = parseFloat(amountUSD);
    return !isNaN(amount) && amount >= 0.01
      ? Math.floor(amount * COINS_PER_DOLLAR)
      : 0;
  }, [amountUSD]);

  const coinsINR = useMemo(() => {
    const amount = parseFloat(amountINR);
    return !isNaN(amount) && amount >= 0.01
      ? Math.floor(amount * COINS_PER_RUPEE)
      : 0;
  }, [amountINR]);

  // --- HANDLER: Razorpay ---
  const handleRazorpayPayment = async () => {
    const amount = parseFloat(amountINR);
    if (isNaN(amount) || amount < MIN_CUSTOM_TOP_UP_INR) {
      toast.error(`Minimum amount is ₹${MIN_CUSTOM_TOP_UP_INR}`);
      return;
    }

    setProcessingINR(true);

    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast.error("Failed to load Razorpay SDK.");
        setProcessingINR(false);
        return;
      }

      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      const data = await res.json();
      if (!data.orderId)
        throw new Error(data.error || "Failed to create order");

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: amount * 100,
        currency: "INR",
        name: "DeepShark AI",
        description: "Purchase Credits",
        order_id: data.orderId,
        handler: async function (response: any) {
          toast.info("Verifying payment...");
          try {
            const verifyRes = await fetch("/api/razorpay/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amountINR: amount,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              toast.success(
                `Success! Added ${verifyData.creditsAdded} credits.`
              );
              await update();
            } else {
              toast.error("Payment verification failed.");
            }
          } catch (err) {
            console.error(err);
            toast.error("Error verifying payment");
          } finally {
            setProcessingINR(false);
          }
        },
        prefill: {
          name: session?.user?.name || "",
          email: session?.user?.email || "",
        },
        theme: { color: "#0d9488" },
        modal: {
          ondismiss: function () {
            setProcessingINR(false);
            toast("Payment cancelled");
          },
        },
      };

      // @ts-ignore
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong with Razorpay.");
      setProcessingINR(false);
    }
  };

  return (
    <PayPalScriptProvider
      options={{
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
        currency: "USD",
        intent: "capture",
      }}
    >
      <div className="space-y-8 px-4 py-6 w-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-100 flex items-center gap-2">
              <CreditCard className="h-6 w-6 md:h-8 md:w-8 text-teal-500" />
              Billing & Credits
            </h1>
            <p className="text-sm md:text-base text-gray-400 mt-1">
              Purchase credits securely to generate more content.
            </p>
          </div>
          <div className="w-full md:w-auto bg-slate-900 border border-white/10 rounded-xl px-6 py-4 flex flex-row md:flex-col justify-between items-center md:items-end shadow-lg shadow-teal-500/10">
            <p className="text-sm text-gray-400 mb-0 md:mb-1">
              Current Balance
            </p>
            <p className="text-2xl md:text-3xl font-bold text-teal-400 flex items-center gap-2">
              <Coins className="h-5 w-5 md:h-6 md:w-6" />
              <span>{isLoggedIn ? currentCoins.toLocaleString() : "--"}</span>
            </p>
          </div>
        </div>

        {/* Payment Options Grid */}
        <section
          className={`grid gap-6 ${
            userCountry === "IN"
              ? "grid-cols-1 md:grid-cols-2"
              : "grid-cols-1 max-w-xl mx-auto"
          }`}
        >
          {/* ✅ 1. RAZORPAY CARD (MOVED FIRST) */}
          {userCountry === "IN" && (
            <Card className="bg-slate-950/50 border border-white/10 backdrop-blur-sm shadow-xl relative overflow-hidden order-1">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl font-semibold text-gray-100 flex items-center justify-center gap-2">
                  <IndianRupee className="h-5 w-5 text-teal-400" />
                  India (INR)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2 text-center">
                    Amount (₹)
                  </label>
                  <div className="relative max-w-[200px] mx-auto">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 text-lg">
                      ₹
                    </span>
                    <Input
                      type="number"
                      value={amountINR}
                      onChange={(e) => setAmountINR(e.target.value)}
                      min={MIN_CUSTOM_TOP_UP_INR}
                      className="pl-8 text-center text-xl bg-black/20 border-white/10 text-white h-12 focus:border-teal-500/50"
                    />
                  </div>
                </div>
                <div className="text-center space-y-1 bg-teal-500/5 p-4 rounded-lg border border-teal-500/10">
                  <p className="text-sm text-gray-400">You will receive</p>
                  <p className="text-3xl font-bold text-teal-400">
                    {coinsINR.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-400">credits</p>
                </div>
              </CardContent>
              <CardFooter className="p-6 pt-0 flex flex-col justify-center">
                {!isLoggedIn ? (
                  <AuthModal
                    trigger={
                      <Button className="w-full bg-[#3399CC] hover:bg-[#2b86b4] text-white font-bold h-[44px] text-lg rounded-[4px]">
                        <LogIn className="mr-2 h-5 w-5" /> Login to Pay
                      </Button>
                    }
                  />
                ) : (
                  <Button
                    onClick={handleRazorpayPayment}
                    disabled={processingINR}
                    className="w-full bg-[#3399CC] hover:bg-[#2b86b4] text-white font-bold h-[44px] text-lg rounded-[4px] transition-all"
                  >
                    {processingINR ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      "Pay with Razorpay [UPI]"
                    )}
                  </Button>
                )}
                <p className="text-xs text-gray-500 mt-3 text-center">
                  Secured by Razorpay. Minimum purchase ₹{MIN_CUSTOM_TOP_UP_INR}
                  .
                </p>
              </CardFooter>
            </Card>
          )}

          {/* ✅ 2. PAYPAL CARD (MOVED SECOND) */}
          <Card className="bg-slate-950/50 border border-white/10 backdrop-blur-sm shadow-xl order-2">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl font-semibold text-gray-100 flex items-center justify-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-400" />
                International (USD)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 text-center">
                  Amount ($)
                </label>
                <div className="relative max-w-[200px] mx-auto">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 text-lg">
                    $
                  </span>
                  <Input
                    type="number"
                    value={amountUSD}
                    onChange={(e) => setAmountUSD(e.target.value)}
                    min={MIN_CUSTOM_TOP_UP_USD}
                    className="pl-8 text-center text-xl bg-black/20 border-white/10 text-white h-12 focus:border-blue-500/50"
                  />
                </div>
              </div>
              <div className="text-center space-y-1 bg-blue-500/5 p-4 rounded-lg border border-blue-500/10">
                <p className="text-sm text-gray-400">You will receive</p>
                <p className="text-3xl font-bold text-blue-400">
                  {coinsUSD.toLocaleString()}
                </p>
                <p className="text-sm text-gray-400">credits</p>
              </div>
            </CardContent>
            <CardFooter className="p-6 pt-0 flex justify-center flex-col">
              <div className="w-full min-h-[50px] z-0">
                {!isLoggedIn ? (
                  <AuthModal
                    trigger={
                      <Button className="w-full bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold h-12 text-lg rounded-full">
                        <LogIn className="mr-2 h-5 w-5" /> Login to Pay
                      </Button>
                    }
                  />
                ) : (
                  <PayPalButtons
                    style={{
                      layout: "horizontal",
                      color: "blue",
                      shape: "rect",
                      label: "pay",
                    }}
                    forceReRender={[amountUSD]}
                    createOrder={async (data, actions) => {
                      const res = await fetch("/api/paypal/create-order", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ amount: parseFloat(amountUSD) }),
                      });
                      const order = await res.json();
                      return order.id;
                    }}
                    onApprove={async (data, actions) => {
                      const res = await fetch("/api/paypal/capture-order", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ orderID: data.orderID }),
                      });
                      const result = await res.json();
                      if (result.success) {
                        toast.success(
                          `Success! Added ${result.creditsAdded} credits.`
                        );
                        await update();
                      } else {
                        toast.error("Payment failed.");
                      }
                    }}
                  />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-3 text-center">
                Secured by PayPal. Minimum purchase ${MIN_CUSTOM_TOP_UP_USD}.
              </p>
            </CardFooter>
          </Card>
        </section>

        {/* REAL TRANSACTION HISTORY */}
        {isLoggedIn && (
          <section className="space-y-4 pt-4">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-teal-500" />
              <h2 className="text-xl font-bold text-gray-100">
                Transaction History
              </h2>
            </div>

            <Card className="bg-slate-950/50 border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-white/5">
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-gray-300 min-w-[100px]">
                        Date
                      </TableHead>
                      <TableHead className="text-gray-300 min-w-[120px]">
                        Type
                      </TableHead>
                      <TableHead className="text-gray-300 text-right min-w-[80px]">
                        Credits
                      </TableHead>
                      <TableHead className="text-gray-300 text-right min-w-[100px]">
                        Amount
                      </TableHead>
                      <TableHead className="text-gray-300 text-center min-w-[100px]">
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
                          className="text-center py-8 text-gray-400"
                        >
                          No transactions yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentTransactions.map((txn) => (
                        <TableRow
                          key={txn.id}
                          className="border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <TableCell className="text-gray-400 font-mono text-xs md:text-sm whitespace-nowrap">
                            {txn.createdAt
                              ? new Date(txn.createdAt).toLocaleDateString()
                              : "-"}
                          </TableCell>
                          <TableCell className="text-gray-200 capitalize text-xs md:text-sm whitespace-nowrap">
                            {txn.amount > 0 ? "Credit Purchase" : "Usage"}
                          </TableCell>
                          <TableCell
                            className={`text-right font-bold text-xs md:text-sm whitespace-nowrap ${
                              txn.credits > 0
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {txn.credits > 0 ? "+" : ""}
                            {txn.credits}
                          </TableCell>
                          <TableCell className="text-right text-gray-400 text-xs md:text-sm whitespace-nowrap">
                            {txn.amount > 0
                              ? `${
                                  txn.currency === "INR" ? "₹" : "$"
                                }${txn.amount.toFixed(2)}`
                              : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] md:text-xs capitalize ${
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

              {/* Pagination Controls */}
              {transactions.length > itemsPerPage && (
                <div className="flex items-center justify-between p-4 border-t border-white/10 bg-white/5">
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
                      className="h-8 w-8 border-white/10 hover:bg-white/10 text-gray-300"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={currentPage === totalPages}
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      className="h-8 w-8 border-white/10 hover:bg-white/10 text-gray-300"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </section>
        )}
      </div>
    </PayPalScriptProvider>
  );
};

export default BillingPage;
