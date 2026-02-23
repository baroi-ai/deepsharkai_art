import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "../../../db";
import { imageGenerations } from "../../../db/schema";
import { eq, desc, lt, and, type SQL } from "drizzle-orm";
// ✅ Import the R2 deletion helper
import { deleteFromR2 } from "@/lib/r2"; 

// GET: Fetch User's Generations with Cursor Pagination
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = 20;

    // ✅ FIX: Explicitly handle the 'and' logic to ensure a valid SQL object
    let whereClause: SQL<unknown> | undefined;

    if (cursor) {
      // We use 'and' and assert it is not undefined with '!' because we know we are passing args
      whereClause = and(
        eq(imageGenerations.userId, session.user.id),
        lt(imageGenerations.createdAt, new Date(cursor))
      )!; 
    } else {
      whereClause = eq(imageGenerations.userId, session.user.id);
    }

    // Double check to satisfy TS (though the logic above covers it)
    if (!whereClause) {
        whereClause = eq(imageGenerations.userId, session.user.id);
    }

    const data = await db
      .select()
      .from(imageGenerations)
      .where(whereClause) // Now TS knows this is SQL<unknown>
      .orderBy(desc(imageGenerations.createdAt))
      .limit(limit);

    const nextCursor = data.length === limit ? data[data.length - 1].createdAt : null;

    return NextResponse.json({ 
      generations: data,
      nextCursor 
    });

  } catch (error) {
    console.error("Fetch Generations Error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

// DELETE: Remove a Generation (DB + R2)
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    // ✅ FIX: Ensure 'and' is treated as defined here too
    const lookupCondition = and(
        eq(imageGenerations.id, id), 
        eq(imageGenerations.userId, session.user.id)
    )!;

    // 1. Fetch the item first to get the Image URL
    const [item] = await db
      .select()
      .from(imageGenerations)
      .where(lookupCondition)
      .limit(1);

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // 2. Delete from R2 if it exists (and is not just the fallback/fal url)
    // We check if the URL contains your R2 bucket domain or structure if possible, 
    // but generally deleting by key is safe if the key extraction works.
    if (item.imageUrl) {
      try {
        const urlObj = new URL(item.imageUrl);
        // The pathname includes the leading slash (e.g. "/users/..."), remove it for the key
        // Example: https://pub-xxx.r2.dev/users/123/image.png -> users/123/image.png
        const fileKey = urlObj.pathname.substring(1); 
        
        // Basic check to ensure we are deleting our own file structure
        if (fileKey.startsWith("users/")) {
           await deleteFromR2(fileKey);
        }
      } catch (err) {
        console.warn("Could not parse URL for deletion, skipping R2 delete:", item.imageUrl);
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