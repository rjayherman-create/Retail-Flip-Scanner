export type Retailer = "Costco" | "Walmart" | "Target" | "BJ's" | "Sam's Club" | "Home Depot" | "Lowe's" | "Other";

export interface ScoreInput {
  retailer?: Retailer | string;
  product_name: string;
  item_number?: string;
  price: number;
  regular_price?: number;
  clearance_price?: number;
  percent_off?: number;
  markdown_code?: string;
  category?: string;
  visible_brand?: string;
  brand?: string;
  stock_status?: string;
  box_condition?: string;
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

const HIGH_DEMAND_CATEGORIES = ["LEGO", "Toys", "Electronics", "Sporting Goods", "Video Games", "Baby"];
const BULKY_CATEGORIES = ["Appliances", "Seasonal", "Home", "Furniture", "Outdoor", "Mattress"];

function detectMarkdownCode(price: number): string {
  const cents = Math.round((price % 1) * 100);
  if (cents === 97) return ".97";
  if (cents === 88) return ".88";
  if (cents === 0) return ".00";
  return ".99";
}

function detectBrand(product_name: string, visible_brand?: string, brand?: string): string {
  const name = (product_name + " " + (visible_brand ?? "") + " " + (brand ?? "")).toUpperCase();
  if (name.includes("LEGO")) return "LEGO";
  if (name.includes("DEWALT") || name.includes("MILWAUKEE") || name.includes("MAKITA")) return "TOOLS_BRAND";
  if (name.includes("INSTANT POT") || name.includes("AIR FRYER") || name.includes("NINJA")) return "KITCHEN_BRAND";
  if (name.includes("NINTENDO") || name.includes("PLAYSTATION") || name.includes("XBOX")) return "GAMING_BRAND";
  if (name.includes("DYSON") || name.includes("SHARK") || name.includes("ROOMBA")) return "HOME_APPLIANCE";
  return "GENERIC";
}

export function scoreFlipItem(input: ScoreInput): FlipDecisionResult {
  const { retailer = "Costco", product_name, price, markdown_code, category, visible_brand, brand,
    normal_retail_estimate, regular_price, clearance_price, percent_off, box_condition } = input;

  let score = 50;
  const reasons: string[] = [];
  const risks: string[] = [];

  const detectedBrand = detectBrand(product_name, visible_brand, brand);
  const cat = category ?? "Other";
  const effectiveRetail = regular_price ?? normal_retail_estimate ?? clearance_price ?? price * 2;

  // ─── Retailer-specific markdown logic ────────────────────────────────────────

  if (retailer === "Costco") {
    const detectedMarkdown = markdown_code ?? detectMarkdownCode(price);
    if (detectedMarkdown === ".97") {
      score += 20;
      reasons.push("Strong Costco clearance signal (.97 price ending)");
    } else if (detectedMarkdown === ".88") {
      score += 12;
      reasons.push("Markdown price signal (.88 ending)");
    } else if (detectedMarkdown === ".00") {
      score += 8;
      reasons.push("Possible manager markdown (.00 ending)");
    } else {
      score -= 5;
      reasons.push("Normal retail pricing (.99 ending)");
    }
  } else if (retailer === "Walmart") {
    // Walmart clearance scoring — percent off is the primary signal
    const pctOff = percent_off ?? (clearance_price && regular_price
      ? Math.round((1 - clearance_price / regular_price) * 100)
      : null);

    if (pctOff != null) {
      if (pctOff >= 50) {
        score += 22;
        reasons.push(`Walmart clearance ${pctOff}% off — strong signal`);
      } else if (pctOff >= 40) {
        score += 15;
        reasons.push(`Walmart clearance ${pctOff}% off — good deal`);
      } else if (pctOff >= 25) {
        score += 8;
        reasons.push(`Walmart clearance ${pctOff}% off — moderate discount`);
      } else if (pctOff > 0) {
        score += 2;
        reasons.push(`Walmart ${pctOff}% off — mild discount`);
      }
    } else {
      // No percent info — check price endings
      const detectedMarkdown = markdown_code ?? detectMarkdownCode(price);
      if (detectedMarkdown === ".00" || detectedMarkdown === ".50") {
        score += 8;
        reasons.push("Possible Walmart clearance price ending (.00/.50)");
      }
    }
    // Spread vs regular price
    if (regular_price && regular_price > price) {
      const spread = regular_price - price;
      if (spread >= 15) { score += 8; reasons.push("Good spread vs regular price"); }
    }
  } else if (retailer === "Target") {
    const pctOff = percent_off ?? (clearance_price && regular_price
      ? Math.round((1 - clearance_price / regular_price) * 100)
      : null);

    if (pctOff != null) {
      if (pctOff >= 90) {
        score += 20;
        reasons.push(`Target ${pctOff}% clearance — very strong but may be picked over`);
        risks.push("90%+ clearance may have poor selection remaining");
      } else if (pctOff >= 70) {
        score += 22;
        reasons.push(`Target ${pctOff}% clearance — strong flip signal`);
      } else if (pctOff >= 50) {
        score += 15;
        reasons.push(`Target ${pctOff}% clearance — good deal`);
      } else if (pctOff >= 30) {
        score += 5;
        reasons.push(`Target ${pctOff}% clearance — moderate`);
      } else {
        score -= 3;
        reasons.push("Low Target clearance — weak flip signal");
      }
    }
  } else if (retailer === "Home Depot" || retailer === "Lowe's") {
    const pctOff = percent_off ?? (clearance_price && regular_price
      ? Math.round((1 - clearance_price / regular_price) * 100)
      : null);
    if (pctOff != null && pctOff >= 40) {
      score += 12;
      reasons.push(`${retailer} clearance ${pctOff}% off — tools/hardware flip potential`);
    }
    const detectedMarkdown = markdown_code ?? detectMarkdownCode(price);
    if (detectedMarkdown === ".00" || detectedMarkdown === ".97") {
      score += 6;
      reasons.push("Markdown price signal");
    }
  } else if (retailer === "BJ's" || retailer === "Sam's Club") {
    // Club stores — same .97/.88/.00 logic as Costco
    const detectedMarkdown = markdown_code ?? detectMarkdownCode(price);
    if (detectedMarkdown === ".97") {
      score += 18;
      reasons.push(`${retailer} clearance price signal (.97 ending)`);
    } else if (detectedMarkdown === ".88") {
      score += 10;
      reasons.push(`${retailer} markdown signal (.88 ending)`);
    } else if (detectedMarkdown === ".00") {
      score += 6;
      reasons.push("Possible manager markdown");
    } else {
      score -= 4;
      reasons.push("Normal retail pricing");
    }
  } else {
    // Generic retailer
    const pctOff = percent_off;
    if (pctOff != null && pctOff >= 40) {
      score += 12;
      reasons.push(`${pctOff}% off — strong discount`);
    } else if (pctOff != null && pctOff >= 25) {
      score += 6;
      reasons.push(`${pctOff}% off — moderate discount`);
    }
  }

  // ─── Box condition ────────────────────────────────────────────────────────────
  if (box_condition === "damaged" || box_condition === "open_box") {
    score -= 12;
    risks.push("Damaged or open box — reduces resale value");
  } else if (box_condition === "new" || box_condition === "sealed") {
    score += 5;
    reasons.push("New/sealed condition — commands full resale price");
  }

  // ─── Category demand ─────────────────────────────────────────────────────────
  if (cat === "LEGO") {
    score += 20;
    reasons.push("LEGO has strong and consistent resale demand");
  } else if (HIGH_DEMAND_CATEGORIES.includes(cat)) {
    score += 12;
    reasons.push(`${cat} category has good resale demand`);
  } else if (BULKY_CATEGORIES.includes(cat)) {
    score -= 10;
    risks.push("Bulky category — harder to store and transport locally");
  }

  // ─── Brand signals ────────────────────────────────────────────────────────────
  if (detectedBrand === "LEGO") {
    score += 10;
    reasons.push("LEGO brand commands premium resale");
  } else if (detectedBrand === "TOOLS_BRAND") {
    score += 8;
    reasons.push("Name-brand tools sell reliably on Marketplace");
  } else if (detectedBrand === "GAMING_BRAND") {
    score += 10;
    reasons.push("Gaming brand — strong demand on Facebook Marketplace");
  } else if (detectedBrand === "HOME_APPLIANCE") {
    score += 6;
    reasons.push("Known appliance brand has consistent buyer interest");
  }

  // ─── Price spread analysis ────────────────────────────────────────────────────
  const retail = effectiveRetail;
  const spread = retail - price;
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

  // ─── Size / storage ───────────────────────────────────────────────────────────
  const isSmall = price < 30 && !BULKY_CATEGORIES.includes(cat);
  if (isSmall) {
    score += 8;
    reasons.push("Small item — easy to store and transport");
  }

  // ─── Saturation risk ──────────────────────────────────────────────────────────
  if (cat === "LEGO" && price < 20) {
    risks.push(`Watch for local ${retailer} saturation on popular LEGO sets`);
  }
  if (retailer === "Target" && percent_off != null && percent_off >= 70) {
    risks.push("Target deep clearance — check that stock remains before buying multiples");
  }

  // ─── Clamp ────────────────────────────────────────────────────────────────────
  score = Math.max(0, Math.min(100, score));

  // ─── Recommendation ───────────────────────────────────────────────────────────
  let recommendation: "BUY" | "MAYBE" | "SKIP";
  let quantity: string;
  let nextAction: string;
  let storageNotes: string;

  if (score >= 75) {
    recommendation = "BUY";
    quantity = "2–4";
    nextAction = "Buy 2–4 units, photograph, and list on Facebook Marketplace today";
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

  // ─── Pricing logic ────────────────────────────────────────────────────────────
  let listPrice: number;
  let expectedSaleLow: number;
  let expectedSaleHigh: number;
  let floor: number;

  if (price <= 15) {
    listPrice = 25; expectedSaleLow = 20; expectedSaleHigh = 22; floor = 19;
  } else if (price <= 20) {
    listPrice = 32; expectedSaleLow = 26; expectedSaleHigh = 29; floor = 24;
  } else if (price <= 30) {
    listPrice = 45; expectedSaleLow = 38; expectedSaleHigh = 42; floor = 36;
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

  const profitLow = expectedSaleLow - price;
  const profitHigh = expectedSaleHigh - price;

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
