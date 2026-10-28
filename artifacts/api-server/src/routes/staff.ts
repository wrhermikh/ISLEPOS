import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import {
  InviteCashierBody,
  ListStaffResponse,
  ListStaffResponseItem,
} from "@workspace/api-zod";
import {
  auditLogTable,
  db,
  staffUsersTable,
} from "@workspace/db";
import { resolveStaffUser } from "./staff-access";

const router: IRouter = Router();

router.get("/staff", async (req, res): Promise<void> => {
  const currentUser = await resolveStaffUser(req, res);
  if (!currentUser) return;
  if (currentUser.role !== "owner") {
    res.status(403).json({ error: "Owner role required." });
    return;
  }

  const staff = await db
    .select()
    .from(staffUsersTable)
    .where(eq(staffUsersTable.shopId, currentUser.shopId))
    .orderBy(asc(staffUsersTable.createdAt));

  res.json(
    ListStaffResponse.parse(
      staff.map((member) => ({
        id: member.id,
        email: member.email,
        role: member.role,
        status: member.status,
        createdAt: member.createdAt,
      })),
    ),
  );
});

router.post("/staff/invitations", async (req, res): Promise<void> => {
  const currentUser = await resolveStaffUser(req, res);
  if (!currentUser) return;
  if (currentUser.role !== "owner") {
    res.status(403).json({ error: "Owner role required." });
    return;
  }

  const parsed = InviteCashierBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  const [existing] = await db
    .select({ id: staffUsersTable.id })
    .from(staffUsersTable)
    .where(
      and(
        eq(staffUsersTable.shopId, currentUser.shopId),
        eq(staffUsersTable.email, email),
      ),
    )
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "This email already has shop access." });
    return;
  }

  const member = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(staffUsersTable)
      .values({
        shopId: currentUser.shopId,
        email,
        role: "cashier",
        status: "pending",
      })
      .returning();

    await tx.insert(auditLogTable).values({
      shopId: currentUser.shopId,
      actorUserId: currentUser.id,
      action: "cashier_access_granted",
      entityType: "staff_user",
      entityId: created.id,
      newValues: { email: created.email, role: created.role, status: created.status },
    });

    return created;
  });

  res.status(201).json(
    ListStaffResponseItem.parse({
      id: member.id,
      email: member.email,
      role: member.role,
      status: member.status,
      createdAt: member.createdAt,
    }),
  );
});

export default router;
