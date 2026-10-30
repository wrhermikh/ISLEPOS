import { and, asc, eq, isNull } from "drizzle-orm";
import type { Request, Response } from "express";
import {
  auditLogTable,
  db,
  shopsTable,
  staffUsersTable,
  type StaffUser,
} from "@workspace/db";
import { verifySupabaseAccessToken } from "../lib/supabase-auth";

function fullNameFromMetadata(metadata: Record<string, unknown>): string | null {
  for (const key of ["full_name", "name"]) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  const firstName = metadata.first_name;
  const lastName = metadata.last_name;
  const name = [firstName, lastName]
    .filter((part): part is string => typeof part === "string" && Boolean(part.trim()))
    .join(" ")
    .trim();
  return name || null;
}

export async function resolveStaffUser(
  req: Request,
  res: Response,
): Promise<StaffUser | null> {
  const authorization = req.header("authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) {
    res.status(401).json({ error: "Sign in to continue." });
    return null;
  }

  const authUser = await verifySupabaseAccessToken(accessToken);
  if (!authUser) {
    res.status(401).json({ error: "Your sign-in has expired. Please sign in again." });
    return null;
  }

  const email = authUser.email?.trim().toLowerCase();
  if (!email || !authUser.email_confirmed_at) {
    res.status(403).json({ error: "A verified email address is required." });
    return null;
  }

  const fullName = fullNameFromMetadata(authUser.user_metadata ?? {});

  let [staffUser] = await db
    .select()
    .from(staffUsersTable)
    .where(eq(staffUsersTable.supabaseUserId, authUser.id))
    .limit(1);

  if (!staffUser) {
    const [shop] = await db
      .select()
      .from(shopsTable)
      .orderBy(asc(shopsTable.createdAt))
      .limit(1);

    if (!shop) {
      res.status(503).json({ error: "Shop setup is not complete." });
      return null;
    }

    const ownerEmail = process.env.SHOP_OWNER_EMAIL?.trim().toLowerCase();
    const [existingEmail] = await db
        .select()
        .from(staffUsersTable)
        .where(
          and(
            eq(staffUsersTable.shopId, shop.id),
            eq(staffUsersTable.email, email),
          ),
        )
        .limit(1);

    if (existingEmail) {
      const canLinkExistingAccess =
        (existingEmail.role === "owner" &&
          email === ownerEmail &&
          existingEmail.status === "active") ||
        (existingEmail.role === "cashier" &&
          (existingEmail.status === "pending" || existingEmail.status === "active"));

      if (canLinkExistingAccess && !existingEmail.supabaseUserId) {
        await db.transaction(async (tx) => {
          const [linked] = await tx
          .update(staffUsersTable)
          .set({
            supabaseUserId: authUser.id,
            fullName,
            status: "active",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(staffUsersTable.id, existingEmail.id),
              isNull(staffUsersTable.supabaseUserId),
            ),
          )
          .returning();

          if (linked) {
            await tx.insert(auditLogTable).values({
              shopId: shop.id,
              actorUserId: linked.id,
              action: "supabase_access_linked",
              entityType: "staff_user",
              entityId: linked.id,
              newValues: { email: linked.email, role: linked.role, status: linked.status },
            });
          }
        });
      }
    } else if (ownerEmail && email === ownerEmail) {
      await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(staffUsersTable)
          .values({
            shopId: shop.id,
            supabaseUserId: authUser.id,
            email,
            fullName,
            role: "owner",
            status: "active",
          })
          .onConflictDoNothing()
          .returning();

        if (created) {
          await tx.insert(auditLogTable).values({
            shopId: shop.id,
            actorUserId: created.id,
            action: "owner_access_bootstrapped",
            entityType: "staff_user",
            entityId: created.id,
            newValues: { email: created.email, role: created.role },
          });
        }
      });
    }

    [staffUser] = await db
      .select()
      .from(staffUsersTable)
      .where(eq(staffUsersTable.supabaseUserId, authUser.id))
      .limit(1);
  }

  if (!staffUser || staffUser.status !== "active") {
    res.status(403).json({
      error: "This verified account has not been granted access to the shop.",
    });
    return null;
  }

  return staffUser;
}

export function currentUserResponse(staffUser: StaffUser) {
  return {
    id: staffUser.id,
    email: staffUser.email,
    fullName: staffUser.fullName,
    role: staffUser.role,
    status: staffUser.status,
  };
}
