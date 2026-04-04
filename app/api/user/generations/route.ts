import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "../../../db";
import { imageGenerations } from "../../../db/schema";
import { eq, desc, lt, and, ilike, SQL } from "drizzle-orm";
// ✅ Import the R2 deletion helper
import { deleteFromR2 } from "@/lib/r2";

// GET: Fetch User's Generations with Server-Side Search & Cursor Pagination
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor"); // This will be an ISO String from the frontend
    const search = searchParams.get("search") || "";
    const limit = 20;

    // 🌟 1. Build a Dynamic Filter Array
    const filters: SQL[] = [eq(imageGenerations.userId, session.user.id)];

    // 🔍 2. Add Search Filter (ILIKE for case-insensitive partial matching)
    if (search) {
      filters.push(ilike(imageGenerations.prompt, `%${search}%`));
    }

    // ⏳ 3. Add Pagination Filter (if cursor exists)
    if (cursor) {
      // Convert the string cursor back into a Date object for the Database query
      filters.push(lt(imageGenerations.createdAt, new Date(cursor)));
    }

    // 📦 4. Execute Query
    const data = await db
      .select()
      .from(imageGenerations)
      .where(and(...filters))
      .orderBy(desc(imageGenerations.createdAt))
      .limit(limit + 1); // Fetch 21 to check if there is a next page

    // 🎯 5. Determine the next cursor
    let nextCursor: string | null = null;
    if (data.length > limit) {
      const nextItem = data.pop(); // Remove the 21st item

      // ✅ FIX: Convert Date to ISO String to satisfy TypeScript "string | null"
      if (nextItem && nextItem.createdAt) {
        nextCursor = nextItem.createdAt.toISOString();
      }
    }

    return NextResponse.json({
      generations: data,
      nextCursor,
    });
  } catch (error) {
    console.error("Fetch Generations Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 },
    );
  }
}

// DELETE: Remove a Generation (DB + R2)
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const lookupCondition = and(
      eq(imageGenerations.id, id),
      eq(imageGenerations.userId, session.user.id),
    );

    // 1. Fetch the item first to get the Image URL/Key
    const items = await db
      .select()
      .from(imageGenerations)
      .where(lookupCondition)
      .limit(1);

    const item = items[0];

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // 2. Delete from R2 if it exists
    if (item.imageUrl) {
      try {
        const urlObj = new URL(item.imageUrl);
        // Remove leading slash for the R2 key
        const fileKey = urlObj.pathname.startsWith("/")
          ? urlObj.pathname.substring(1)
          : urlObj.pathname;

        // Security check: Only delete if it's in our user's folder
        if (fileKey.includes("users/")) {
          await deleteFromR2(fileKey);
        }
      } catch (err) {
        console.warn("Could not parse URL for R2 deletion:", item.imageUrl);
      }
    }

    // 3. Delete from Database
    await db.delete(imageGenerations).where(lookupCondition);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
