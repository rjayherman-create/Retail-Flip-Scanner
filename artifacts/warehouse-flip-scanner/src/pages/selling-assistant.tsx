import { useEffect, useState } from "react";
import { Link } from "wouter";
import { FileText, MessageSquare, Tags, TrendingDown, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Row = Record<string, any>;

export default function SellingAssistantPage() {
  const [data, setData] = useState<Row>({});
  async function load() {
    setData(await (await fetch("/api/selling-assistant")).json());
  }
  useEffect(() => { void load(); }, []);
  const widgets = data.widgets ?? {};
  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-primary">Selling Assistant</h2>
          <p className="text-sm text-muted-foreground">Turn bought items into ready-to-post listings and track them until sold.</p>
        </div>
        <Button asChild><Link href="/listing-workbench"><FileText className="mr-2 h-4 w-4" /> Create Listings</Link></Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="Ready to list" value={widgets.ready_to_list ?? 0} />
        <Metric label="Currently listed" value={widgets.currently_listed ?? 0} />
        <Metric label="Pending pickup" value={widgets.pending_pickup ?? 0} />
        <Metric label="Needs price drop" value={widgets.needing_price_drop ?? 0} />
        <Metric label="Slow movers" value={widgets.slow_movers ?? 0} />
        <Metric label="Sold this week" value={widgets.sold_this_week ?? 0} />
        <Metric label="Profit this week" value={`$${Number(widgets.profit_this_week ?? 0).toFixed(2)}`} />
        <Metric label="Best category" value={widgets.best_selling_category ?? "-"} />
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        <ItemSection title="Ready to List" rows={data.ready_to_list ?? []} action="Generate Listing" href="/listing-workbench" />
        <ItemSection title="Listed Items" rows={data.listed_items ?? []} action="Pipeline" href="/sales-pipeline" />
        <ItemSection title="Needs Price Drop" rows={data.needs_price_drop ?? []} action="Plan Drop" href="/price-markdown-planner" />
        <ItemSection title="Sold Items" rows={data.sold_items ?? []} action="Ledger" href="/accounting-ledger" />
        <ItemSection title="Slow Movers" rows={data.slow_movers ?? []} action="Plan Drop" href="/price-markdown-planner" />
        <Card>
          <CardHeader><CardTitle className="text-base">Listing Templates</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(data.listing_templates ?? []).map((template: string) => <div key={template} className="rounded border border-border p-2 text-sm">{template}</div>)}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button variant="outline" asChild><Link href="/buyer-message-templates"><MessageSquare className="mr-2 h-4 w-4" /> Replies</Link></Button>
              <Button variant="outline" asChild><Link href="/price-markdown-planner"><TrendingDown className="mr-2 h-4 w-4" /> Markdown</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: unknown }) {
  return <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="text-xl font-black">{String(value)}</div></CardContent></Card>;
}

function ItemSection({ title, rows, action, href }: { title: string; rows: Row[]; action: string; href: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /> {title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {rows.length ? rows.slice(0, 6).map((row) => (
          <div key={row.id} className="rounded border border-border p-3 text-sm space-y-1">
            <div className="font-semibold">{row.product_name}</div>
            <div className="text-xs text-muted-foreground">{row.retailer} - {row.store_location} - ${row.current_listing_price ?? row.facebook_asking_price ?? row.suggested_facebook_list_price ?? row.price ?? "-"}</div>
            {row.selling_warning && <div className="text-xs text-warning">{row.selling_warning}</div>}
            <Button size="sm" variant="outline" asChild><Link href={`${href}?inventory_item_id=${row.id}`}><Tags className="mr-2 h-3 w-3" /> {action}</Link></Button>
          </div>
        )) : <p className="text-sm text-muted-foreground">No items here yet.</p>}
      </CardContent>
    </Card>
  );
}
