import { createClerkClient } from "@clerk/backend";
import { getAuth } from "@clerk/express";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { Request, Response } from "express";
import {
  auditLogTable,
  db,
  shopsTable,
  staffUsersTable,
  type StaffUser,
} from "@workspace/db";

function getClerkClient() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is required to verify signed-in users.");
  }
  return createClerkClient({ secretKey });
}

export async function resolveStaffUser(
  req: Request,
  res: Response,
): Promise<StaffUser | null> {
  const clerkUserId = getAuth(req).userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "Sign in to continue." });
    return null;
  }

  const clerkUser = await getClerkClient().users.getUser(clerkUserId);
  const primaryEmail = clerkUser.emailAddresses.find(
    (email) => email.id === clerkUser.primaryEmailAddressId,
  );

  if (
    !primaryEmail ||
    primaryEmail.verification?.status !== "verified"
  ) {
    res.status(403).json({ error: "A verified email address is required." });
    return null;
  }

  const email = primaryEmail.emailAddress.trim().toLowerCase();
  const fullName =
    [clerkUser.firstName, clerkUser.lastName]
      .filter((part): part is string => Boolean(part))
      .join(" ")
      .trim() || null;

  let [staffUser] = await db
    .select()
    .from(staffUsersTable)
    .where(eq(staffUsersTable.clerkUserId, clerkUserId))
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
    if (ownerEmail && email === ownerEmail) {
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

      if (!existingEmail) {
        await db.transaction(async (tx) => {
          const [created] = await tx
            .insert(staffUsersTable)
            .values({
              shopId: shop.id,
              clerkUserId,
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
    } else {
      await db.transaction(async (tx) => {
        const [activated] = await tx
          .update(staffUsersTable)
          .set({ clerkUserId, fullName, status: "active", updatedAt: new Date() })
          .where(
            and(
              eq(staffUsersTable.shopId, shop.id),
              eq(staffUsersTable.email, email),
              eq(staffUsersTable.role, "cashier"),
              eq(staffUsersTable.status, "pending"),
              isNull(staffUsersTable.clerkUserId),
            ),
          )
          .returning();

        if (activated) {
          await tx.insert(auditLogTable).values({
            shopId: shop.id,
            actorUserId: activated.id,
            action: "cashier_access_activated",
            entityType: "staff_user",
            entityId: activated.id,
            newValues: { email: activated.email, role: activated.role },
          });
        }
      });
    }

    [staffUser] = await db
      .select()
      .from(staffUsersTable)
      .where(eq(staffUsersTable.clerkUserId, clerkUserId))
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
