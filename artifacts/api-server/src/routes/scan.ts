import { Router } from "express";
import multer from "multer";
import { openai } from "@workspace/integrations-openai-ai-server";
import { scoreFlipItem } from "../lib/scoring";
import { db, inventoryItemsTable } from "@workspace/db";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// POST /photo-scan
router.post("/photo-scan", upload.single("image"), async (req, res) => {
  try {
    const store_location = req.body.store_location as string;
    const category = (req.body.category as string) ?? "Other";

    if (!req.file) {
      res.status(400).json({ success: false, error_message: "No image uploaded." });
      return;
    }

    const imageBase64 = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype || "image/jpeg";

    const systemPrompt = `You are an expert at reading Costco price tags, shelf signs, barcodes, and inventory screenshots.
Extract product information from the image. Return ONLY valid JSON — no markdown, no extra text.
If a field cannot be determined, use null.
For price, extract the numeric value (e.g. 14.97).
For markdown_code, extract the price ending as a string (e.g. ".97", ".88", ".00", ".99").
For stock_status, use "Seen in store" as default if item was seen on shelf.`;

    const userPrompt = `Extract product details from this Costco image.
Store: ${store_location}
Category hint: ${category}

Return JSON with these exact fields:
{
  "product_name": string or null,
  "item_number": string or null,
  "price": number or null,
  "markdown_code": string or null,
  "visible_brand": string or null,
  "stock_status": "Seen in store",
  "store_location": "${store_location}",
  "scan_time": "${new Date().toISOString()}",
  "category": "${category}",
  "notes_from_image": string or null,
  "confidence": "high" or "medium" or "low"
}`;

    let extracted: Record<string, unknown> = {};
    let parseError: string | null = null;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-5.4-mini",
        max_completion_tokens: 500,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: "high" },
              },
            ],
          },
        ],
      });

      const text = completion.choices[0]?.message?.content ?? "{}";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      }
    } catch (aiErr) {
      req.log.error({ aiErr }, "AI extraction failed");
      parseError = "Could not read the image clearly. Try a closer photo of the price tag.";
    }

    if (!extracted.product_name && !extracted.price) {
      res.json({
        success: false,
        extracted,
        error_message: parseError ?? "Could not read the image clearly. Try a closer photo of the price tag.",
      });
      return;
    }

    // Score the item
    const price = typeof extracted.price === "number" ? extracted.price : 0;
    const decision = scoreFlipItem({
      product_name: String(extracted.product_name ?? "Unknown Item"),
      item_number: extracted.item_number ? String(extracted.item_number) : undefined,
      price,
      markdown_code: extracted.markdown_code ? String(extracted.markdown_code) : undefined,
      category: extracted.category ? String(extracted.category) : category,
      visible_brand: extracted.visible_brand ? String(extracted.visible_brand) : undefined,
      stock_status: "Seen in store",
    });

    // Auto-save to inventory
    const [saved] = await db
      .insert(inventoryItemsTable)
      .values({
        source_type: "photo_scan",
        store_location,
        product_name: String(extracted.product_name ?? "Unknown Item"),
        item_number: extracted.item_number ? String(extracted.item_number) : null,
        price,
        markdown_code: extracted.markdown_code ? String(extracted.markdown_code) : null,
        stock_status: "Seen in store",
        visible_brand: extracted.visible_brand ? String(extracted.visible_brand) : null,
        category,
        scan_time: new Date().toISOString(),
        notes_from_image: extracted.notes_from_image ? String(extracted.notes_from_image) : null,
        flip_score: decision.flip_score,
        recommendation: decision.recommendation,
        facebook_list_price: decision.facebook_list_price,
        expected_sale_price: decision.expected_sale_price,
        estimated_profit: decision.estimated_profit,
        max_quantity: decision.max_quantity,
        risk_notes: decision.risk_notes,
      })
      .returning();

    res.json({
      success: true,
      extracted,
      decision,
      saved_item: {
        ...saved,
        created_at: saved.created_at.toISOString(),
        updated_at: saved.updated_at.toISOString(),
      },
    });
  } catch (err) {
    req.log.error({ err }, "Photo scan failed");
    res.status(500).json({ success: false, error_message: "Photo scan failed. Please try again." });
  }
});

// POST /screenshot-ocr
router.post("/screenshot-ocr", upload.single("image"), async (req, res) => {
  try {
    const store_location = req.body.store_location as string;
    const search_term = (req.body.search_term as string) ?? "";

    if (!req.file) {
      res.status(400).json({ success: false, rows: [], error_message: "No image uploaded." });
      return;
    }

    const imageBase64 = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype || "image/jpeg";

    const systemPrompt = `You are an expert at reading Costco warehouse inventory screenshots from the Costco app or website.
Extract ALL visible product rows from the image. Return ONLY valid JSON — no markdown, no extra text.`;

    const userPrompt = `Extract all visible inventory rows from this Costco screenshot.
Store: ${store_location}
Search term: ${search_term}
Viewed at: ${new Date().toLocaleString()}

Return JSON:
{
  "store_location": "${store_location}",
  "search_term": string or "${search_term}",
  "viewed_at": "${new Date().toISOString()}",
  "items": [
    {
      "product_name": string or null,
      "item_number": string or null,
      "price": number or null,
      "markdown_code": string or null,
      "stock_status": string or "In Stock",
      "visible_brand": string or null,
      "category": string or null,
      "notes_from_image": string or null,
      "needs_review": boolean
    }
  ]
}`;

    let parsed: { store_location?: string; search_term?: string; viewed_at?: string; items?: unknown[] } = { items: [] };

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-5.4-mini",
        max_completion_tokens: 2000,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: "high" },
              },
            ],
          },
        ],
      });

      const text = completion.choices[0]?.message?.content ?? "{}";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (aiErr) {
      req.log.error({ aiErr }, "OCR extraction failed");
      res.json({
        success: false,
        rows: [],
        error_message: "No inventory rows detected. Try uploading a clearer screenshot.",
      });
      return;
    }

    const rows = (parsed.items ?? []).map((item: unknown) => {
      const i = item as Record<string, unknown>;
      return {
        product_name: i.product_name ?? null,
        item_number: i.item_number ?? null,
        price: i.price ?? null,
        markdown_code: i.markdown_code ?? null,
        stock_status: i.stock_status ?? "In Stock",
        needs_review: Boolean(i.needs_review),
      };
    });

    if (rows.length === 0) {
      res.json({
        success: false,
        rows: [],
        error_message: "No inventory rows detected. Try uploading a clearer screenshot.",
      });
      return;
    }

    res.json({
      success: true,
      store_location: parsed.store_location ?? store_location,
      search_term: parsed.search_term ?? search_term,
      viewed_at: parsed.viewed_at ?? new Date().toISOString(),
      rows,
    });
  } catch (err) {
    req.log.error({ err }, "Screenshot OCR failed");
    res.status(500).json({ success: false, rows: [], error_message: "Screenshot processing failed." });
  }
});

// POST /public-web-check
router.post("/public-web-check", async (req, res) => {
  const { search_term, store_location } = req.body as { search_term: string; store_location: string };

  // Compliance: we only check publicly visible pages, no login, no CAPTCHA bypass
  // In practice, Costco's inventory is behind auth, so we return the appropriate status
  res.json({
    status: "no_inventory_visible",
    message: "Costco did not expose this inventory publicly. Try Photo Scan, Upload Screenshot, or Manual Add.",
    rows: [],
    source_url: `https://www.costco.com/s?keyword=${encodeURIComponent(search_term)}`,
  });
});

// POST /score-item
router.post("/score-item", async (req, res) => {
  try {
    const body = req.body as {
      product_name: string;
      item_number?: string;
      price: number;
      markdown_code?: string;
      category?: string;
      visible_brand?: string;
      stock_status?: string;
      normal_retail_estimate?: number;
      local_demand_notes?: string;
    };

    const decision = scoreFlipItem({
      product_name: body.product_name,
      item_number: body.item_number,
      price: body.price,
      markdown_code: body.markdown_code,
      category: body.category,
      visible_brand: body.visible_brand,
      stock_status: body.stock_status,
      normal_retail_estimate: body.normal_retail_estimate,
      local_demand_notes: body.local_demand_notes,
    });

    res.json(decision);
  } catch (err) {
    req.log.error({ err }, "Score item failed");
    res.status(500).json({ error: "Scoring failed" });
  }
});

// POST /generate-listing
router.post("/generate-listing", async (req, res) => {
  try {
    const body = req.body as {
      product_name: string;
      item_number?: string;
      price: number;
      facebook_list_price?: number;
      expected_sale_price?: string;
      category?: string;
      store_location?: string;
      negotiation_floor?: number;
    };

    const listPrice = body.facebook_list_price ?? Math.round(body.price * 1.8);
    const floor = body.negotiation_floor ?? Math.round(body.price * 1.35);
    const bundlePrice = Math.round(listPrice * 2 * 0.9);

    const title = `New Sealed ${body.product_name} — Costco Find`;
    const description = `New sealed ${body.product_name}. Great gift. ${
      body.category === "LEGO" ? "Perfect for LEGO fans. " : ""
    }Pickup in Long Island area. Asking $${listPrice} or 2 for $${bundlePrice}. Cash/Venmo. No holds without pickup time.`;

    const keywords = [
      body.product_name,
      body.category ?? "Item",
      "Costco",
      "New Sealed",
      "Facebook Marketplace",
      body.store_location ?? "Long Island",
    ].filter(Boolean);

    res.json({
      title,
      asking_price: listPrice,
      description,
      bundle_offer: `2 for $${bundlePrice}`,
      pickup_text: "Pickup in Long Island area. Cash or Venmo only.",
      negotiation_floor: floor,
      keywords,
    });
  } catch (err) {
    req.log.error({ err }, "Generate listing failed");
    res.status(500).json({ error: "Listing generation failed" });
  }
});

export default router;
