import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Row = Record<string, any>;
const columns = [["Bought", "ready_to_list"], ["Listed", "listed_items"], ["Interested Buyer", "buyer"], ["Pending Pickup / Payment", "pending_items"], ["Sold", "sold_items"], ["Returned / Problem", "returned"], ["Slow Mover", "slow_movers"]];

export default function SalesPipelinePage() {
  const [data, setData] = useState<Row>({});
  async function load() { setData(await (await fetch("/api/selling-assistant")).json()); }
  useEffect(() => { void load(); }, []);
  async function action(path: string, item: Row, extra: Row = {}) {
    await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inventory_item_id: item.id, ...extra }) });
    await load();
  }
  return <div className="space-y-5"><div><h2 className="text-2xl font-bold text-primary">Sales Pipeline</h2><p className="text-sm text-muted-foreground">Move bought items from listed to pending to sold.</p></div><div className="grid xl:grid-cols-7 md:grid-cols-3 gap-3">{columns.map(([title, key]) => <Card key={key}><CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader><CardContent className="space-y-2">{(data[key] ?? []).map((item: Row) => <div key={item.id} className="rounded border border-border p-2 text-xs space-y-2"><div className="font-semibold">{item.product_name}</div><div>${item.current_listing_price ?? item.facebook_asking_price ?? item.price ?? "-"} - {item.days_listed ?? 0} days</div>{item.selling_warning && <div className="text-warning">{item.selling_warning}</div>}<div className="flex flex-wrap gap-1"><Button size="sm" variant="outline" onClick={() => action("/api/sales-pipeline/mark-listed", item)}>Listed</Button><Button size="sm" variant="outline" onClick={() => action("/api/sales-pipeline/add-buyer-note", item, { note: "Buyer asked about availability" })}>Interest</Button><Button size="sm" variant="outline" onClick={() => action("/api/sales-pipeline/mark-pending", item)}>Pending</Button><Button size="sm" variant="outline" onClick={() => action("/api/sales-pipeline/price-drop", item, { new_price: Math.max(1, Number(item.current_listing_price ?? item.facebook_asking_price ?? item.price ?? 1) - 2) })}>Drop</Button><Button size="sm" onClick={() => { const price = prompt("Sold price?", String(item.current_listing_price ?? item.facebook_asking_price ?? "")); if (price) action("/api/sales-pipeline/mark-sold", item, { sold_price: Number(price) }); }}>Sold</Button></div></div>)}{!(data[key] ?? []).length && <p className="text-xs text-muted-foreground">Empty</p>}</CardContent></Card>)}</div></div>;
}
