import { Router } from "express";
import { eq, isNull, or } from "drizzle-orm";
import {
  db,
  inventoryItemsTable,
  inventoryLotsTable,
  ledgerEntriesTable,
  listingDraftsTable,
  saleTransactionsTable,
  salesPipelineEventsTable,
} from "@workspace/db";
import { toIsoDateTime } from "../lib/date";

const router = Router();

type InventoryItem = typeof inventoryItemsTable.$inferSelect;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function moneyRound(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function daysBetween(start?: string | null, end = today()) {
  if (!start) return 0;
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0;
  return Math.max(0, Math.round((endMs - startMs) / 86400000));
}

function priceFromItem(item: InventoryItem) {
  const cost = item.current_store_price ?? item.price ?? 0;
  const asking = item.facebook_asking_price ?? item.current_listing_price ?? item.suggested_facebook_list_price ?? item.facebook_list_price ?? Math.ceil(cost * 1.8);
  const expected = item.expected_facebook_sale_price ?? item.facebook_asking_price ?? asking;
  const floor = item.floor_price ?? item.negotiation_floor ?? Math.ceil(cost * 1.35);
  return { cost, asking, expected, floor };
}

function buildListingDraft(item: InventoryItem, body: Record<string, unknown> = {}) {
  const { cost, asking, expected, floor } = priceFromItem(item);
  const condition = String(body.condition ?? item.box_condition ?? "New sealed");
  const quantity = Number(body.quantity_available ?? 1);
  const pickupTown = String(body.pickup_town ?? item.pickup_location ?? item.store_location ?? "local pickup");
  const payment = String(body.payment_wording ?? "Cash/Venmo. No holds without a pickup time.");
  const bundlePrice = Math.max(floor * 2, Math.round(asking * 2 * 0.9));
  const title = `${condition} ${item.product_name} - Great Gift`.slice(0, 80);
  const description = `${condition} ${item.product_name}. Great gift or personal use item. Pickup in ${pickupTown}. Asking $${asking}${quantity > 1 ? ` or 2 for $${bundlePrice}` : ""}. ${payment}`;
  const ebayTitle = `${item.product_name} ${condition}`.replace(/\s+/g, " ").slice(0, 80);
  const keywords = [item.product_name, item.category, item.retailer, condition, pickupTown].filter(Boolean).map(String);
  const negotiation = {
    availability: `Yes, it is still available. Pickup is in ${pickupTown}.`,
    pickup: "I can meet today or tomorrow. No holds without a pickup time.",
    negotiation: `I can do $${Math.max(floor, Math.round(asking * 0.9))} if you can pick up today.`,
    bundle: `I can do 2 for $${bundlePrice}.`,
    lowball: `Thanks, but I am firm at $${floor}.`,
    sold: "Sorry, this one sold, but I may have similar items soon.",
  };
  const priceDropSchedule = [
    { days: "1-3", action: "Keep full asking price", price: asking },
    { days: "4-7", action: "Drop 5-10% if no interest", price: Math.max(floor, Math.round(asking * 0.92)) },
    { days: "8-14", action: "Move toward expected sale price", price: expected },
    { days: "15+", action: "Move toward floor or bundle", price: floor },
    { days: "30+", action: "Return, bundle, or avoid this category next time", price: floor },
  ];
  return {
    title,
    description,
    asking_price: asking,
    floor_price: floor,
    bundle_offer: quantity > 1 ? `2 for $${bundlePrice}` : `Bundle similar items at $${bundlePrice}`,
    keywords: keywords.join(", "),
    condition_notes: condition,
    pickup_wording: `Pickup in ${pickupTown}.`,
    payment_wording: payment,
    negotiation_templates_json: negotiation,
    ebay_title: ebayTitle,
    ebay_description: `${description}\n\nShipping note: verify shipping cost before listing. Fees and shipping can reduce profit.`,
    ebay_condition_description: condition,
    ebay_item_specifics: `Category: ${item.category ?? "Other"}; Brand: ${item.brand ?? "See title"}; Retailer source: ${item.retailer}`,
    ebay_shipping_warning: "Do not offer free shipping unless the shipping cost is already included in your price.",
    ebay_start_price: Math.max(floor, Math.round(cost * 1.45)),
    ebay_buy_it_now_price: Math.max(asking, expected),
    price_drop_schedule_json: priceDropSchedule,
  };
}

async function logEvent(item: InventoryItem, eventType: string, newStatus: string, note?: string) {
  await db.insert(salesPipelineEventsTable).values({
    inventory_item_id: item.id,
    event_type: eventType,
    old_status: item.listing_status,
    new_status: newStatus,
    note: note ?? null,
  });
}

function serializeItem(item: InventoryItem) {
  return {
    ...item,
    created_at: toIsoDateTime(item.created_at),
    updated_at: toIsoDateTime(item.updated_at),
    days_listed: daysBetween(item.listed_date),
    selling_warning: sellingWarning(item),
  };
}

function sellingWarning(item: InventoryItem) {
  const status = item.listing_status ?? "not_listed";
  const daysListed = daysBetween(item.listed_date);
  const boughtAge = item.bought_status ? daysBetween(item.updated_at.toISOString().slice(0, 10)) : 0;
  const floor = item.floor_price ?? item.negotiation_floor ?? 0;
  const current = item.current_listing_price ?? item.facebook_asking_price ?? 0;
  if (item.bought_status && status === "not_listed" && boughtAge >= 1) return "You bought this item but have not listed it yet. Cash is tied up.";
  if (status === "listed" && daysListed >= 30) return "Consider return, bundle, deeper price cut, or avoid this category.";
  if (status === "listed" && daysListed >= 7 && (item.buyer_interest_count ?? 0) === 0) return "Consider a small price drop or bundle.";
  if (floor > 0 && current > 0 && current < floor) return "Warning: this price may wipe out your profit.";
  return null;
}

async function activeItems() {
  const rows = await db.select().from(inventoryItemsTable).where(or(eq(inventoryItemsTable.is_deleted, false), isNull(inventoryItemsTable.is_deleted)));
  return rows.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

router.get("/selling-assistant", async (_req, res) => {
  const items = await activeItems();
  const readyToList = items.filter((item) =>
    !item.sold_status &&
    item.listing_status === "not_listed" &&
    (item.bought_status || item.recommendation === "BUY") &&
    !!item.product_name,
  );
  const listed = items.filter((item) => item.listing_status === "listed");
  const pending = items.filter((item) => item.listing_status === "pending");
  const slowMovers = listed.filter((item) => daysBetween(item.listed_date) >= 14 || item.listing_status === "slow_mover");
  const needsPriceDrop = listed.filter((item) => daysBetween(item.listed_date) >= 7 && (item.buyer_interest_count ?? 0) === 0);
  const sold = items.filter((item) => item.listing_status === "sold" || item.sold_status);
  const soldThisWeek = sold.filter((item) => daysBetween(item.sold_date) <= 7);
  const profitThisWeek = soldThisWeek.reduce((sum, item) => sum + (item.final_profit ?? 0), 0);
  const categoryTotals = new Map<string, number>();
  sold.forEach((item) => categoryTotals.set(item.category ?? "Other", (categoryTotals.get(item.category ?? "Other") ?? 0) + (item.final_profit ?? 0)));
  const bestSellingCategory = Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  res.json({
    ready_to_list: readyToList.map(serializeItem),
    listed_items: listed.map(serializeItem),
    pending_items: pending.map(serializeItem),
    needs_price_drop: needsPriceDrop.map(serializeItem),
    slow_movers: slowMovers.map(serializeItem),
    sold_items: sold.map(serializeItem),
    listing_templates: ["Facebook local pickup", "eBay ship carefully", "Bundle discount", "Firm floor price"],
    widgets: {
      ready_to_list: readyToList.length,
      currently_listed: listed.length,
      pending_pickup: pending.length,
      slow_movers: slowMovers.length,
      sold_this_week: soldThisWeek.length,
      profit_this_week: moneyRound(profitThisWeek),
      needing_price_drop: needsPriceDrop.length,
      best_selling_category: bestSellingCategory,
    },
  });
});

router.post("/listing-generator", async (req, res) => {
  const itemId = Number(req.body.inventory_item_id);
  const [item] = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, itemId)).limit(1);
  if (!item) {
    res.status(404).json({ error: "Inventory item not found" });
    return;
  }
  const draft = buildListingDraft(item, req.body);
  const [savedDraft] = await db.insert(listingDraftsTable).values({
    inventory_item_id: item.id,
    platform: String(req.body.platform ?? "facebook"),
    ...draft,
  }).returning();
  await db.update(inventoryItemsTable).set({
    listing_title: draft.title,
    listing_description: draft.description,
    listing_generated: true,
    facebook_asking_price: draft.asking_price,
    ebay_asking_price: draft.ebay_buy_it_now_price,
    floor_price: draft.floor_price,
    bundle_offer: draft.bundle_offer,
    pickup_location: String(req.body.pickup_town ?? item.pickup_location ?? item.store_location ?? ""),
    current_listing_price: draft.asking_price,
    updated_at: new Date(),
  }).where(eq(inventoryItemsTable.id, item.id));
  await logEvent(item, "listing_created", item.listing_status ?? "not_listed", "Listing draft generated");
  res.status(201).json({ draft: { ...savedDraft, created_at: toIsoDateTime(savedDraft.created_at), updated_at: toIsoDateTime(savedDraft.updated_at) } });
});

router.post("/sales-pipeline/mark-listed", async (req, res) => {
  const result = await updatePipelineStatus(Number(req.body.inventory_item_id), "marked_listed", "listed", {
    listed_status: true,
    listing_status: "listed",
    listed_date: String(req.body.listed_date ?? today()),
    current_listing_price: req.body.current_listing_price ? Number(req.body.current_listing_price) : undefined,
  }, req.body.note);
  res.status(result.status).json(result.body);
});

router.post("/sales-pipeline/add-buyer-note", async (req, res) => {
  const itemId = Number(req.body.inventory_item_id);
  const [item] = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, itemId)).limit(1);
  if (!item) {
    res.status(404).json({ error: "Inventory item not found" });
    return;
  }
  const note = String(req.body.note ?? "Buyer interest");
  const [updated] = await db.update(inventoryItemsTable).set({
    buyer_interest_count: (item.buyer_interest_count ?? 0) + 1,
    selling_notes: [item.selling_notes, note].filter(Boolean).join("\n"),
    updated_at: new Date(),
  }).where(eq(inventoryItemsTable.id, item.id)).returning();
  await logEvent(item, "buyer_interest", item.listing_status, note);
  res.json(serializeItem(updated));
});

router.post("/sales-pipeline/mark-pending", async (req, res) => {
  const result = await updatePipelineStatus(Number(req.body.inventory_item_id), "pending_pickup", "pending", { listing_status: "pending" }, req.body.note);
  res.status(result.status).json(result.body);
});

router.post("/sales-pipeline/price-drop", async (req, res) => {
  const itemId = Number(req.body.inventory_item_id);
  const [item] = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, itemId)).limit(1);
  if (!item) {
    res.status(404).json({ error: "Inventory item not found" });
    return;
  }
  const newPrice = numberValue(req.body.new_price ?? req.body.current_listing_price);
  const [updated] = await db.update(inventoryItemsTable).set({
    current_listing_price: newPrice,
    facebook_asking_price: newPrice,
    last_price_drop_date: today(),
    selling_notes: [item.selling_notes, req.body.note ? String(req.body.note) : `Price dropped to $${newPrice}`].filter(Boolean).join("\n"),
    updated_at: new Date(),
  }).where(eq(inventoryItemsTable.id, item.id)).returning();
  await logEvent(item, "price_drop", item.listing_status, `Price dropped to $${newPrice}`);
  res.json(serializeItem(updated));
});

router.post("/sales-pipeline/mark-sold", async (req, res) => {
  const itemId = Number(req.body.inventory_item_id);
  const [item] = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, itemId)).limit(1);
  if (!item) {
    res.status(404).json({ error: "Inventory item not found" });
    return;
  }
  const soldPrice = numberValue(req.body.sold_price ?? item.current_listing_price ?? item.facebook_asking_price);
  const saleDate = String(req.body.sold_date ?? today());
  const cost = item.current_store_price ?? item.price ?? 0;
  const finalProfit = moneyRound(soldPrice - cost - numberValue(req.body.platform_fee) - numberValue(req.body.shipping_cost) - numberValue(req.body.packaging_cost) - numberValue(req.body.delivery_gas_cost));
  const [updated] = await db.update(inventoryItemsTable).set({
    sold_status: true,
    listed_status: true,
    listing_status: "sold",
    sold_price: soldPrice,
    sold_date: saleDate,
    sale_channel: String(req.body.sale_channel ?? "Facebook Marketplace"),
    final_profit: finalProfit,
    updated_at: new Date(),
  }).where(eq(inventoryItemsTable.id, item.id)).returning();
  await logEvent(item, "sold", "sold", `Sold for $${soldPrice}`);

  const [lot] = await db.select().from(inventoryLotsTable).where(eq(inventoryLotsTable.inventory_item_id, item.id)).limit(1);
  if (lot && lot.quantity_remaining > 0) {
    const quantity = Math.min(Number(req.body.quantity_sold ?? 1), lot.quantity_remaining);
    const costBasis = lot.average_unit_cost * quantity;
    const netProfit = moneyRound(soldPrice * quantity - costBasis - numberValue(req.body.platform_fee) - numberValue(req.body.shipping_cost) - numberValue(req.body.packaging_cost) - numberValue(req.body.delivery_gas_cost));
    const [sale] = await db.insert(saleTransactionsTable).values({
      inventory_lot_id: lot.id,
      inventory_item_id: item.id,
      sale_date: saleDate,
      quantity_sold: quantity,
      sold_price_per_unit: soldPrice,
      total_sold_price: soldPrice * quantity,
      sale_channel: String(req.body.sale_channel ?? "Facebook Marketplace"),
      platform_fee: numberValue(req.body.platform_fee),
      shipping_cost: numberValue(req.body.shipping_cost),
      packaging_cost: numberValue(req.body.packaging_cost),
      delivery_gas_cost: numberValue(req.body.delivery_gas_cost),
      net_sale_proceeds: soldPrice * quantity - numberValue(req.body.platform_fee) - numberValue(req.body.shipping_cost) - numberValue(req.body.packaging_cost) - numberValue(req.body.delivery_gas_cost),
      gross_profit: soldPrice * quantity - costBasis,
      net_profit: netProfit,
      profit_margin_percent: soldPrice > 0 ? moneyRound((netProfit / (soldPrice * quantity)) * 100) : 0,
      roi_percent: costBasis > 0 ? moneyRound((netProfit / costBasis) * 100) : 0,
      buyer_payment_method: String(req.body.buyer_payment_method ?? "Cash"),
      notes: req.body.note ? String(req.body.note) : null,
    }).returning();
    await db.update(inventoryLotsTable).set({
      quantity_sold: lot.quantity_sold + quantity,
      quantity_remaining: lot.quantity_remaining - quantity,
      status: lot.quantity_remaining - quantity <= 0 ? "Sold" : "Partially Sold",
      updated_at: new Date(),
    }).where(eq(inventoryLotsTable.id, lot.id));
    await db.insert(ledgerEntriesTable).values({
      entry_date: saleDate,
      entry_type: "sale",
      inventory_item_id: item.id,
      inventory_lot_id: lot.id,
      sale_transaction_id: sale.id,
      description: `Sale: ${item.product_name}`,
      retailer: item.retailer,
      store_location: item.store_location,
      product_name: item.product_name,
      category: item.category,
      quantity,
      money_out: soldPrice * quantity - sale.net_sale_proceeds,
      money_in: soldPrice * quantity,
      net_amount: netProfit,
      status: "Sold",
      notes: req.body.note ? String(req.body.note) : null,
    });
  }
  res.json(serializeItem(updated));
});

router.post("/price-markdown-planner", async (req, res) => {
  const asking = numberValue(req.body.original_asking_price ?? req.body.current_listing_price);
  const expected = numberValue(req.body.expected_sale_price, asking);
  const floor = numberValue(req.body.floor_price, Math.round(asking * 0.75));
  const days = Number(req.body.days_listed ?? 0);
  const interest = String(req.body.buyer_interest_level ?? "none").toLowerCase();
  let action = "keep price";
  let recommendedPrice = asking;
  let reason = "New listing. Give it time before dropping price.";
  if (days >= 30) {
    action = "return if possible";
    recommendedPrice = floor;
    reason = "30+ days unsold. Consider return, bundle, deeper cut, or avoid this category.";
  } else if (days >= 15) {
    action = "bundle offer";
    recommendedPrice = floor;
    reason = "Two weeks unsold. Move toward floor price or bundle.";
  } else if (days >= 8) {
    action = "drop price";
    recommendedPrice = Math.max(floor, expected);
    reason = "Past first week. Drop toward expected sale price.";
  } else if (days >= 4 && interest === "none") {
    action = "drop price";
    recommendedPrice = Math.max(floor, Math.round(asking * 0.92));
    reason = "No interest after several days. Try a small drop.";
  } else if (interest === "high") {
    action = "keep price";
    reason = "Interest is good. Hold price and push pickup.";
  }
  res.json({ action, recommended_price: recommendedPrice, floor_price: floor, reason, warning: recommendedPrice < floor ? "Warning: this price may wipe out your profit." : null });
});

router.post("/buyer-message-template", async (req, res) => {
  const town = String(req.body.pickup_town ?? "town");
  const price = String(req.body.price ?? req.body.floor_price ?? "");
  const bundle = String(req.body.bundle_price ?? "");
  const type = String(req.body.type ?? "availability");
  const templates: Record<string, string> = {
    availability: `Yes, it is still available. Pickup is in ${town}.`,
    pickup: "I can meet today after your pickup time or tomorrow. No holds without a pickup time.",
    negotiation: `I can do $${price} if you can pick up today.`,
    bundle: `I can do 2 for $${bundle || price}.`,
    lowball: `Thanks, but I am firm at $${price}.`,
    sold: "Sorry, this one sold, but I may have similar items soon.",
  };
  res.json({ type, message: templates[type] ?? templates.availability, templates });
});

router.post("/sales-pipeline/mark-slow-mover", async (req, res) => {
  const result = await updatePipelineStatus(Number(req.body.inventory_item_id), "slow_mover", "slow_mover", { listing_status: "slow_mover" }, req.body.note);
  res.status(result.status).json(result.body);
});

router.post("/sales-pipeline/mark-returned", async (req, res) => {
  const result = await updatePipelineStatus(Number(req.body.inventory_item_id), "returned", "returned", { listing_status: "returned" }, req.body.note);
  res.status(result.status).json(result.body);
});

async function updatePipelineStatus(itemId: number, eventType: string, status: string, patch: Partial<InventoryItem>, note?: unknown) {
  const [item] = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, itemId)).limit(1);
  if (!item) return { status: 404, body: { error: "Inventory item not found" } };
  const cleanPatch = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
  const [updated] = await db.update(inventoryItemsTable).set({ ...cleanPatch, updated_at: new Date() }).where(eq(inventoryItemsTable.id, item.id)).returning();
  await logEvent(item, eventType, status, note ? String(note) : undefined);
  return { status: 200, body: serializeItem(updated) };
}

export default router;
