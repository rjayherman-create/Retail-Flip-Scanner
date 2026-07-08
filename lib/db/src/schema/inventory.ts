import { pgTable, serial, text, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const inventoryItemsTable = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  retailer: text("retailer").notNull().default("Costco"),
  source_type: text("source_type").notNull(),
  store_location: text("store_location").notNull(),
  search_term: text("search_term"),
  viewed_at: text("viewed_at"),
  scan_time: text("scan_time"),
  product_name: text("product_name").notNull(),
  brand: text("brand"),
  item_number: text("item_number"),
  upc: text("upc"),
  sku: text("sku"),
  dpci: text("dpci"),
  tcin: text("tcin"),
  aisle: text("aisle"),
  price: real("price"),
  regular_price: real("regular_price"),
  clearance_price: real("clearance_price"),
  percent_off: real("percent_off"),
  markdown_code: text("markdown_code"),
  stock_status: text("stock_status").notNull().default("Unknown"),
  visible_brand: text("visible_brand"),
  category: text("category"),
  box_condition: text("box_condition"),
  normal_retail_estimate: real("normal_retail_estimate"),
  facebook_list_price: real("facebook_list_price"),
  expected_sale_price: text("expected_sale_price"),
  estimated_profit: text("estimated_profit"),
  flip_score: integer("flip_score"),
  recommendation: text("recommendation"),
  max_quantity: text("max_quantity"),
  risk_notes: text("risk_notes"),
  listing_title: text("listing_title"),
  listing_description: text("listing_description"),
  photo_url: text("photo_url"),
  screenshot_url: text("screenshot_url"),
  source_url: text("source_url"),
  public_check_status: text("public_check_status"),
  notes_from_image: text("notes_from_image"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItemsTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryItem = typeof inventoryItemsTable.$inferSelect;
