import { useState } from "react";
import { useScoreItem, useCreateInventoryItem, getListInventoryQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RecommendationBadge, MarkdownCodeBadge } from "@/components/shared/badges";
import { Zap, Save, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const RETAILERS = ["Costco", "Walmart", "Target", "BJ's", "Sam's Club", "Home Depot", "Lowe's", "Other"];

const STORES_BY_RETAILER: Record<string, string[]> = {
  Costco: ["Lawrence", "Oceanside", "Westbury", "Other"],
  Walmart: ["My Local Walmart", "Other"],
  Target: ["My Local Target", "Other"],
  "BJ's": ["My Local BJ's", "Other"],
  "Sam's Club": ["My Local Sam's Club", "Other"],
  "Home Depot": ["My Local Home Depot", "Other"],
  "Lowe's": ["My Local Lowe's", "Other"],
  Other: ["Other"],
};

const CATEGORIES = ["LEGO", "Toys", "Tools", "Appliances", "Seasonal", "Sporting Goods", "Electronics", "Home", "Video Games", "Baby", "Beauty", "Other"];
const STOCK_STATUSES = ["In Stock", "Low Stock", "Out of Stock", "Seen in store", "Unknown"];
const BOX_CONDITIONS = ["sealed", "new", "open_box", "damaged"];

interface FlipDecision {
  flip_score: number;
  recommendation: string;
  main_reason?: string;
  facebook_list_price?: number;
  expected_sale_price?: string;
  estimated_profit?: string;
  max_quantity?: string;
  negotiation_floor?: number;
  risk_notes?: string;
  storage_notes?: string;
  best_next_action?: string;
}

export default function ManualAdd() {
  const [retailer, setRetailer] = useState("Costco");
  const [store, setStore] = useState("Lawrence");
  const [productName, setProductName] = useState("");
  const [itemNumber, setItemNumber] = useState("");
  const [price, setPrice] = useState("");
  const [regularPrice, setRegularPrice] = useState("");
  const [percentOff, setPercentOff] = useState("");
  const [stockStatus, setStockStatus] = useState("In Stock");
  const [category, setCategory] = useState("LEGO");
  const [boxCondition, setBoxCondition] = useState("");
  const [notes, setNotes] = useState("");
  const [decision, setDecision] = useState<FlipDecision | null>(null);
  const [saved, setSaved] = useState(false);

  const scoreItem = useScoreItem();
  const createItem = useCreateInventoryItem();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  function handleRetailerChange(r: string) {
    setRetailer(r);
    const stores = STORES_BY_RETAILER[r] ?? ["Other"];
    setStore(stores[0]);
  }

  function detectMarkdownCode(p: string): string {
    const num = parseFloat(p);
    if (isNaN(num)) return "";
    const cents = Math.round((num % 1) * 100);
    if (cents === 97) return ".97";
    if (cents === 88) return ".88";
    if (cents === 0) return ".00";
    return ".99";
  }

  async function handleScore() {
    if (!productName || !price) {
      toast({ title: "Missing fields", description: "Product name and price are required.", variant: "destructive" });
      return;
    }
    const parsedPrice = parseFloat(price);
    const parsedRegular = regularPrice ? parseFloat(regularPrice) : undefined;
    const parsedPctOff = percentOff ? parseFloat(percentOff) : undefined;

    scoreItem.mutate({
      data: {
        retailer,
        product_name: productName,
        item_number: itemNumber || undefined,
        price: parsedPrice,
        regular_price: parsedRegular,
        percent_off: parsedPctOff,
        markdown_code: detectMarkdownCode(price),
        category,
        stock_status: stockStatus,
        box_condition: boxCondition || undefined,
      }
    }, {
      onSuccess: (data) => setDecision(data as unknown as FlipDecision),
      onError: () => toast({ title: "Scoring failed", description: "Could not score this item.", variant: "destructive" }),
    });
  }

  async function handleSave() {
    if (!productName || !price) return;
    await createItem.mutateAsync({
      data: {
        retailer,
        source_type: "manual",
        store_location: store,
        product_name: productName,
        item_number: itemNumber || undefined,
        price: parseFloat(price),
        regular_price: regularPrice ? parseFloat(regularPrice) : undefined,
        percent_off: percentOff ? parseFloat(percentOff) : undefined,
        markdown_code: detectMarkdownCode(price),
        stock_status: stockStatus,
        category,
        box_condition: boxCondition || undefined,
        notes_from_image: notes || undefined,
        flip_score: decision?.flip_score,
        recommendation: decision?.recommendation as "BUY" | "MAYBE" | "SKIP" | undefined,
        facebook_list_price: decision?.facebook_list_price,
        expected_sale_price: decision?.expected_sale_price,
        estimated_profit: decision?.estimated_profit,
        max_quantity: decision?.max_quantity,
        risk_notes: decision?.risk_notes,
      }
    });
    setSaved(true);
    queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    toast({ title: "Item saved", description: "Added to your inventory." });
  }

  const stores = STORES_BY_RETAILER[retailer] ?? ["Other"];
  const showMarkdownCode = retailer === "Costco" || retailer === "BJ's" || retailer === "Sam's Club";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary">Manual Add</h2>
        <p className="text-sm text-muted-foreground mt-1">Enter item details manually if scanning or web check fails.</p>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Retailer</Label>
            <Select value={retailer} onValueChange={handleRetailerChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RETAILERS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 col-span-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Product Name *</Label>
              <Input placeholder="LEGO Speed Champions Assortment" value={productName} onChange={(e) => setProductName(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Store</Label>
              <Select value={store} onValueChange={setStore}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{stores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sale/Clearance Price ($) *</Label>
              <Input type="number" step="0.01" placeholder="14.97" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Regular Price ($)</Label>
              <Input type="number" step="0.01" placeholder="29.99" value={regularPrice} onChange={(e) => setRegularPrice(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">% Off (if shown)</Label>
              <Input type="number" step="1" placeholder="40" value={percentOff} onChange={(e) => setPercentOff(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Item Number / ID</Label>
              <Input placeholder="Item #, SKU, DPCI..." value={itemNumber} onChange={(e) => setItemNumber(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Stock Status</Label>
              <Select value={stockStatus} onValueChange={setStockStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STOCK_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Box Condition</Label>
              <Select value={boxCondition} onValueChange={setBoxCondition}>
                <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unknown</SelectItem>
                  {BOX_CONDITIONS.map(c => <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 col-span-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</Label>
              <Textarea placeholder="Any additional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} className="resize-none" rows={2} />
            </div>
          </div>

          {showMarkdownCode && price && <div className="flex gap-2"><MarkdownCodeBadge code={detectMarkdownCode(price)} /></div>}

          <Button className="w-full font-semibold py-6 text-base" onClick={handleScore} disabled={scoreItem.isPending || !productName || !price}>
            <Zap className="mr-2 h-5 w-5" />
            {scoreItem.isPending ? "Scoring..." : "Score This Item"}
          </Button>
        </CardContent>
      </Card>

      {decision && (
        <Card className={`shadow-md border-2 ${
          decision.recommendation === "BUY" ? "border-success/40 bg-success/5" :
          decision.recommendation === "MAYBE" ? "border-warning/40 bg-warning/5" :
          "border-destructive/40 bg-destructive/5"
        }`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <RecommendationBadge recommendation={decision.recommendation} />
              <span className="text-2xl font-bold text-muted-foreground">{decision.flip_score}/100</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {decision.main_reason && <p className="text-sm text-muted-foreground">{decision.main_reason}</p>}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-card border border-border rounded-lg p-3">
                <div className="text-muted-foreground text-xs uppercase font-semibold mb-1">FB List Price</div>
                <div className="font-bold text-lg text-primary">${decision.facebook_list_price ?? "—"}</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-3">
                <div className="text-muted-foreground text-xs uppercase font-semibold mb-1">Expected Sale</div>
                <div className="font-semibold">{decision.expected_sale_price ?? "—"}</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-3">
                <div className="text-muted-foreground text-xs uppercase font-semibold mb-1">Est. Profit</div>
                <div className="font-semibold text-success">{decision.estimated_profit ?? "—"}</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-3">
                <div className="text-muted-foreground text-xs uppercase font-semibold mb-1">Buy Qty</div>
                <div className="font-semibold">{decision.max_quantity ?? "—"}</div>
              </div>
            </div>

            {decision.risk_notes && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                <span className="font-semibold">Risk: </span>{decision.risk_notes}
              </div>
            )}

            {decision.best_next_action && (
              <div className="text-xs text-primary bg-primary/5 rounded-lg p-3">
                <span className="font-semibold">→ </span>{decision.best_next_action}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={handleSave} disabled={createItem.isPending || saved}>
                {saved ? <><CheckCircle className="mr-1 h-4 w-4" /> Saved</> : <><Save className="mr-1 h-4 w-4" /> Save to Inventory</>}
              </Button>
            </div>

            {saved && (
              <Button variant="outline" className="w-full" asChild>
                <Link href="/inventory">View in Inventory</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
