// app/dashboard/template.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "../db"; // Adjust this path if needed
import { users } from "../db/schema"; // Adjust this path if needed
import { eq } from "drizzle-orm";

export default async function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // 1. Not logged in at all? Kick to home.
  if (!session?.user?.id) {
    redirect("/");
  }

  // 2. Fetch their onboarding status securely on the server
  const [currentUser] = await db
    .select({ isOnboarded: users.isOnboarded })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  // 3. If they exist but haven't onboarded, trap them in the flow!
  if (currentUser && currentUser.isOnboarded === false) {
    redirect("/onboarding");
  }

  // 4. Everything is good, render the page content
  return <>{children}</>;
}
