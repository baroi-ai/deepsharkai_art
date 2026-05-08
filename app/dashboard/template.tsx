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

  // 🌟 FIX: We ONLY check the database if a session actually exists.
  // Guests (unlogged-in users) will completely skip this block!
  if (session?.user?.id) {
    const [currentUser] = await db
      .select({ isOnboarded: users.isOnboarded })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    // If they are logged in but haven't onboarded, redirect them
    if (currentUser && currentUser.isOnboarded === false) {
      redirect("/onboarding");
    }
  }

  // 🌟 Guests AND fully onboarded users will both reach this point safely!
  return <>{children}</>;
}
