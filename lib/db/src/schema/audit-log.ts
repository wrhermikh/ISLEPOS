import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { shopsTable } from "./shops";
import { staffUsersTable } from "./staff-users";

export const auditLogTable = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shopsTable.id, { onDelete: "restrict" }),
  actorUserId: uuid("actor_user_id").references(() => staffUsersTable.id, {
    onDelete: "restrict",
  }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
