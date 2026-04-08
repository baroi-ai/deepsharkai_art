import { auth } from "@/auth";
import { redirect } from "next/navigation";
import OnboardingClient from "./client";

// Tell Next.js to NEVER try to statically generate this page
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await auth();

  // Guard: Instantly redirect if not logged in
  if (!session?.user) {
    redirect("/");
  }

  // Pass the user's name to the client component so we don't need useSession!
  const userName = session.user.name?.split(" ")[0] || "there";

  return <OnboardingClient userName={userName} />;
}
