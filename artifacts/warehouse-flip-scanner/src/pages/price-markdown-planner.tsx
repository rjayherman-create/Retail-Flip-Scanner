import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PriceMarkdownPlannerPage() {
  const [form, setForm] = useState({ original_asking_price: "25", expected_sale_price: "23", floor_price: "20", days_listed: "7", buyer_interest_level: "none", category: "LEGO", seasonality: "" });
  const [result, setResult] = useState<any>(null);
  async function plan() {
    const res = await fetch("/api/price-markdown-planner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setResult(await res.json());
  }
  return <div className="space-y-5 max-w-3xl"><div><h2 className="text-2xl font-bold text-primary">Price Markdown Planner</h2><p className="text-sm text-muted-foreground">Decide whether to keep price, drop, bundle, relist, or return.</p></div><Card><CardContent className="p-4 grid md:grid-cols-3 gap-3">{Object.entries(form).map(([key, value]) => <div key={key} className="space-y-1"><Label>{key.replace(/_/g, " ")}</Label><Input value={value} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></div>)}<Button onClick={plan}>Suggest Action</Button></CardContent></Card>{result && <Card><CardHeader><CardTitle className="text-base">{result.action}</CardTitle></CardHeader><CardContent className="space-y-2"><div className="text-3xl font-black">${result.recommended_price}</div><p className="text-sm text-muted-foreground">{result.reason}</p>{result.warning && <p className="text-sm text-warning">{result.warning}</p>}</CardContent></Card>}</div>;
}
