import { useEffect, useMemo, useState } from "react";
import { Copy, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Row = Record<string, any>;

export default function ListingWorkbenchPage() {
  const inventoryItemId = useMemo(() => new URLSearchParams(window.location.search).get("inventory_item_id") ?? "", []);
  const [items, setItems] = useState<Row[]>([]);
  const [draft, setDraft] = useState<Row | null>(null);
  const [form, setForm] = useState({ inventory_item_id: inventoryItemId, condition: "New sealed", quantity_available: "1", asking_price: "", floor_price: "", bundle_offer: "", pickup_town: "Lawrence", payment_wording: "Cash/Venmo. No holds without pickup time.", notes: "" });
  useEffect(() => { fetch("/api/inventory").then((r) => r.json()).then(setItems); }, []);
  useEffect(() => {
    if (!inventoryItemId) return;
    fetch(`/api/inventory/${inventoryItemId}`).then((r) => r.json()).then((item) => setForm((prev) => ({
      ...prev,
      inventory_item_id: String(item.id),
      asking_price: String(item.facebook_asking_price ?? item.suggested_facebook_list_price ?? item.facebook_list_price ?? ""),
      floor_price: String(item.floor_price ?? item.negotiation_floor ?? ""),
      pickup_town: item.pickup_location ?? item.store_location ?? prev.pickup_town,
    })));
  }, [inventoryItemId]);
  async function generate() {
    const response = await fetch("/api/listing-generator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, inventory_item_id: Number(form.inventory_item_id), quantity_available: Number(form.quantity_available) }),
    });
    const data = await response.json();
    setDraft(data.draft);
  }
  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
  }
  return (
    <div className="space-y-5">
      <div><h2 className="text-2xl font-bold text-primary">Listing Workbench</h2><p className="text-sm text-muted-foreground">Create marketplace-ready listings without auto-posting.</p></div>
      <Card><CardHeader><CardTitle className="text-base">Listing Inputs</CardTitle></CardHeader><CardContent className="grid md:grid-cols-4 gap-3">
        <div className="space-y-1"><Label>Inventory item</Label><select className="h-10 rounded-md border border-input bg-background px-3" value={form.inventory_item_id} onChange={(e) => setForm({ ...form, inventory_item_id: e.target.value })}><option value="">Choose item</option>{items.map((item) => <option key={item.id} value={item.id}>{item.product_name}</option>)}</select></div>
        <Field label="Condition" value={form.condition} onChange={(v) => setForm({ ...form, condition: v })} />
        <Field label="Quantity" value={form.quantity_available} onChange={(v) => setForm({ ...form, quantity_available: v })} />
        <Field label="Asking price" value={form.asking_price} onChange={(v) => setForm({ ...form, asking_price: v })} />
        <Field label="Floor price" value={form.floor_price} onChange={(v) => setForm({ ...form, floor_price: v })} />
        <Field label="Pickup town" value={form.pickup_town} onChange={(v) => setForm({ ...form, pickup_town: v })} />
        <Field label="Payment wording" value={form.payment_wording} onChange={(v) => setForm({ ...form, payment_wording: v })} />
        <div className="md:col-span-4"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        <Button onClick={generate} disabled={!form.inventory_item_id}><FileText className="mr-2 h-4 w-4" /> Generate Listing Draft</Button>
      </CardContent></Card>
      {draft && <div className="grid lg:grid-cols-2 gap-4">
        <Output title="Facebook Marketplace" text={`Title:\n${draft.title}\n\nPrice:\n$${draft.asking_price}\n\nDescription:\n${draft.description}\n\nBundle:\n${draft.bundle_offer}\n\nFloor:\n$${draft.floor_price}\n\nKeywords:\n${draft.keywords}`} onCopy={copy} />
        <Output title="eBay Listing" text={`Title:\n${draft.ebay_title}\n\nDescription:\n${draft.ebay_description}\n\nCondition:\n${draft.ebay_condition_description}\n\nSpecifics:\n${draft.ebay_item_specifics}\n\nStart price: $${draft.ebay_start_price}\nBuy It Now: $${draft.ebay_buy_it_now_price}\n\n${draft.ebay_shipping_warning}`} onCopy={copy} />
        <Output title="Negotiation Replies" text={Object.values(draft.negotiation_templates_json ?? {}).join("\n\n")} onCopy={copy} />
        <Output title="Price-Drop Schedule" text={(draft.price_drop_schedule_json ?? []).map((r: Row) => `${r.days}: ${r.action} - $${r.price}`).join("\n")} onCopy={copy} />
      </div>}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div className="space-y-1"><Label>{label}</Label><Input value={value} onChange={(e) => onChange(e.target.value)} /></div>;
}
function Output({ title, text, onCopy }: { title: string; text: string; onCopy: (text: string) => void }) {
  return <Card><CardHeader><CardTitle className="text-base flex items-center justify-between">{title}<Button size="sm" variant="outline" onClick={() => onCopy(text)}><Copy className="mr-2 h-4 w-4" /> Copy</Button></CardTitle></CardHeader><CardContent><Textarea className="min-h-[260px] font-mono text-sm" value={text} readOnly /></CardContent></Card>;
}
