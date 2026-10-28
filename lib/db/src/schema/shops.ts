import { pgTable, char, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const shopsTable = pgTable("shops", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  currency: char("currency", { length: 3 }).notNull().default("MVR"),
  timezone: text("timezone").notNull().default("Indian/Maldives"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Shop = typeof shopsTable.$inferSelect;
