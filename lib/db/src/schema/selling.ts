import { jsonb, integer, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";

export const listingDraftsTable = pgTable("listing_drafts", {
  id: serial("id").primaryKey(),
  inventory_item_id: integer("inventory_item_id").notNull(),
  platform: text("platform").notNull().default("facebook"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  asking_price: real("asking_price").notNull().default(0),
  floor_price: real("floor_price").notNull().default(0),
  bundle_offer: text("bundle_offer"),
  keywords: text("keywords"),
  condition_notes: text("condition_notes"),
  pickup_wording: text("pickup_wording"),
  payment_wording: text("payment_wording"),
  negotiation_templates_json: jsonb("negotiation_templates_json"),
  ebay_title: text("ebay_title"),
  ebay_description: text("ebay_description"),
  ebay_condition_description: text("ebay_condition_description"),
  ebay_item_specifics: text("ebay_item_specifics"),
  ebay_shipping_warning: text("ebay_shipping_warning"),
  ebay_start_price: real("ebay_start_price"),
  ebay_buy_it_now_price: real("ebay_buy_it_now_price"),
  price_drop_schedule_json: jsonb("price_drop_schedule_json"),
  status: text("status").notNull().default("draft"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const salesPipelineEventsTable = pgTable("sales_pipeline_events", {
  id: serial("id").primaryKey(),
  inventory_item_id: integer("inventory_item_id").notNull(),
  event_type: text("event_type").notNull(),
  old_status: text("old_status"),
  new_status: text("new_status"),
  note: text("note"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export type ListingDraft = typeof listingDraftsTable.$inferSelect;
export type SalesPipelineEvent = typeof salesPipelineEventsTable.$inferSelect;
