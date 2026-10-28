import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { shopsTable } from "./shops";

export type ShopRole = "owner" | "cashier";
export type StaffStatus = "active" | "pending" | "disabled";

export const staffUsersTable = pgTable(
  "staff_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shopsTable.id, { onDelete: "restrict" }),
    clerkUserId: text("clerk_user_id").unique(),
    email: text("email").notNull(),
    fullName: text("full_name"),
    role: text("role").$type<ShopRole>().notNull(),
    status: text("status").$type<StaffStatus>().notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("staff_users_shop_role_idx").on(table.shopId, table.role, table.status)],
);

export type StaffUser = typeof staffUsersTable.$inferSelect;
