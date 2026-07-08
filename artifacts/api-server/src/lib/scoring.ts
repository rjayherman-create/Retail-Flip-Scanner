export interface ScoreInput {
  product_name: string;
  item_number?: string;
  price: number;
  markdown_code?: string;
  category?: string;
  visible_brand?: string;
  stock_status?: string;
  normal_retail_estimate?: number;
  local_demand_notes?: string;
}

export interface FlipDecisionResult {
  flip_score: number;
  recommendation: "BUY" | "MAYBE" | "SKIP";
  main_reason: string;
  facebook_list_price: number;
  expected_sale_price: string;
  estimated_profit: string;
  max_quantity: string;
  negotiation_floor: number;
  risk_notes: string;
  storage_notes: string;
  best_next_action: string;
}

const HIGH_DEMAND_CATEGORIES = ["LEGO", "Toys", "Electronics", "Sporting Goods"];
const BULKY_CATEGORIES = ["Appliances", "Seasonal", "Home"];

function detectMarkdownCode(price: number): string {
  const cents = Math.round((price % 1) * 100);
  if (cents === 97) return ".97";
  if (cents === 88) return ".88";
  if (cents === 0) return ".00";
  return ".99";
}

function detectBrand(product_name: string, visible_brand?: string): string {
  const name = (product_name + " " + (visible_brand ?? "")).toUpperCase();
  if (name.includes("LEGO")) return "LEGO";
  if (name.includes("DEWALT") || name.includes("MILWAUKEE") || name.includes("MAKITA")) return "TOOLS_BRAND";
  if (name.includes("INSTANT POT") || name.includes("AIR FRYER") || name.includes("NINJA")) return "KITCHEN_BRAND";
  return "GENERIC";
}

export function scoreFlipItem(input: ScoreInput): FlipDecisionResult {
  const { product_name, price, markdown_code, category, visible_brand, normal_retail_estimate } = input;

  let score = 50;
  const reasons: string[] = [];
  const risks: string[] = [];

  const detectedMarkdown = markdown_code ?? detectMarkdownCode(price);
  const brand = detectBrand(product_name, visible_brand);
  const cat = category ?? "Other";
  const retail = normal_retail_estimate ?? price * 2;

  // Markdown signals
  if (detectedMarkdown === ".97") {
    score += 20;
    reasons.push("Strong Costco clearance signal (.97 price)");
  } else if (detectedMarkdown === ".88") {
    score += 12;
    reasons.push("Markdown price signal (.88)");
  } else if (detectedMarkdown === ".00") {
    score += 8;
    reasons.push("Possible manager markdown (.00)");
  } else {
    score -= 5;
    reasons.push("Normal retail pricing (.99)");
  }

  // Category demand
  if (cat === "LEGO") {
    score += 20;
    reasons.push("LEGO has strong and consistent resale demand");
  } else if (HIGH_DEMAND_CATEGORIES.includes(cat)) {
    score += 12;
    reasons.push(`${cat} category has good resale demand`);
  } else if (BULKY_CATEGORIES.includes(cat)) {
    score -= 10;
    risks.push("Bulky category — harder to store and ship locally");
  }

  // Brand signals
  if (brand === "LEGO") {
    score += 10;
    reasons.push("LEGO brand commands premium resale");
  } else if (brand === "TOOLS_BRAND") {
    score += 8;
    reasons.push("Name-brand tools sell reliably");
  }

  // Spread analysis
  const spread = retail - price;
  const spreadPct = spread / price;

  if (spread >= 15) {
    score += 15;
    reasons.push("Strong price spread vs retail estimate");
  } else if (spread >= 7) {
    score += 8;
    reasons.push("Decent margin above cost");
  } else if (spread < 5) {
    score -= 15;
    risks.push("Low spread — thin margin after fees");
  }

  // Size / storage
  const isSmall = price < 30 && !BULKY_CATEGORIES.includes(cat);
  if (isSmall) {
    score += 8;
    reasons.push("Small item — easy to store and transport");
  }

  // Saturation risk
  if (cat === "LEGO" && price < 20) {
    risks.push("Watch for local Costco saturation on popular LEGO sets");
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));

  // Recommendation
  let recommendation: "BUY" | "MAYBE" | "SKIP";
  let quantity: string;
  let nextAction: string;
  let storageNotes: string;

  if (score >= 75) {
    recommendation = "BUY";
    quantity = "2–4";
    nextAction = "Buy 2-4 units, photograph, and list on Facebook Marketplace today";
    storageNotes = "Store sealed in a dry location. Stack carefully.";
  } else if (score >= 55) {
    recommendation = "MAYBE";
    quantity = "1 test unit";
    nextAction = "Buy 1 test unit first. Check local Facebook Marketplace demand before going back for more.";
    storageNotes = "Store 1 unit. Assess demand before buying more.";
  } else {
    recommendation = "SKIP";
    quantity = "0";
    nextAction = "Skip this item. Look for better markdown signals or higher-demand categories.";
    storageNotes = "Not recommended to buy.";
  }

  // Pricing logic
  let listPrice: number;
  let expectedSaleLow: number;
  let expectedSaleHigh: number;
  let profitLow: number;
  let profitHigh: number;
  let floor: number;

  if (price <= 15) {
    listPrice = 25;
    expectedSaleLow = 20;
    expectedSaleHigh = 22;
    floor = 19;
  } else if (price <= 20) {
    listPrice = 32;
    expectedSaleLow = 26;
    expectedSaleHigh = 29;
    floor = 24;
  } else if (price <= 30) {
    listPrice = 45;
    expectedSaleLow = 38;
    expectedSaleHigh = 42;
    floor = 36;
  } else if (price <= 50) {
    listPrice = Math.round(price * 1.8);
    expectedSaleLow = Math.round(price * 1.5);
    expectedSaleHigh = Math.round(price * 1.65);
    floor = Math.round(price * 1.4);
  } else {
    listPrice = Math.round(price * 1.6);
    expectedSaleLow = Math.round(price * 1.3);
    expectedSaleHigh = Math.round(price * 1.45);
    floor = Math.round(price * 1.25);
  }

  profitLow = expectedSaleLow - price;
  profitHigh = expectedSaleHigh - price;

  const mainReason = reasons.slice(0, 2).join(". ") || "Scored based on price and category signals";
  const riskNote = risks.length > 0 ? risks.join(". ") : "Moderate risk — assess local market demand";

  return {
    flip_score: score,
    recommendation,
    main_reason: mainReason,
    facebook_list_price: listPrice,
    expected_sale_price: `$${expectedSaleLow}–$${expectedSaleHigh}`,
    estimated_profit: `$${profitLow}–$${profitHigh} each`,
    max_quantity: quantity,
    negotiation_floor: floor,
    risk_notes: riskNote,
    storage_notes: storageNotes,
    best_next_action: nextAction,
  };
}
