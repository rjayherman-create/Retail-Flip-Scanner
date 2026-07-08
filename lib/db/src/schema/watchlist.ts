import { pgTable, serial, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const watchlistItemsTable = pgTable("watchlist_items", {
  id: serial("id").primaryKey(),
  item_number: text("item_number").notNull(),
  product_name: text("product_name").notNull(),
  desired_buy_price: real("desired_buy_price"),
  target_resale_price: real("target_resale_price"),
  stores_to_watch: text("stores_to_watch"),
  notes: text("notes"),
  last_seen_price: real("last_seen_price"),
  last_seen_store: text("last_seen_store"),
  last_seen_at: text("last_seen_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const insertWatchlistItemSchema = createInsertSchema(watchlistItemsTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertWatchlistItem = z.infer<typeof insertWatchlistItemSchema>;
export type WatchlistItem = typeof watchlistItemsTable.$inferSelect;
