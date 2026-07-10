import { useState } from "react";
import { Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function BuyerMessageTemplatesPage() {
  const [form, setForm] = useState({ pickup_town: "Lawrence", price: "22", bundle_price: "45" });
  const [templates, setTemplates] = useState<Record<string, string>>({});
  async function load() {
    const res = await fetch("/api/buyer-message-template", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setTemplates((await res.json()).templates);
  }
  return <div className="space-y-5 max-w-4xl"><div><h2 className="text-2xl font-bold text-primary">Buyer Message Templates</h2><p className="text-sm text-muted-foreground">Quick replies for availability, pickup, negotiation, bundles, lowballs, and sold items.</p></div><Card><CardContent className="p-4 grid md:grid-cols-4 gap-3"><Input value={form.pickup_town} onChange={(e) => setForm({ ...form, pickup_town: e.target.value })} placeholder="Pickup town" /><Input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Floor price" /><Input value={form.bundle_price} onChange={(e) => setForm({ ...form, bundle_price: e.target.value })} placeholder="Bundle price" /><Button onClick={load}>Generate Replies</Button></CardContent></Card><div className="grid md:grid-cols-2 gap-3">{Object.entries(templates).map(([type, message]) => <Card key={type}><CardHeader><CardTitle className="text-base capitalize flex justify-between">{type}<Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(message)}><Copy className="mr-2 h-4 w-4" /> Copy</Button></CardTitle></CardHeader><CardContent className="text-sm">{message}</CardContent></Card>)}</div></div>;
}
