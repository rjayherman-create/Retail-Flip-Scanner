import { useGetStoreComparison } from "@workspace/api-client-react";
import type { StoreComparisonRow } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Map, RefreshCw, AlertCircle, CheckCircle, XCircle, Minus } from "lucide-react";
import { Link } from "wouter";

function StoreCell({ price, stock }: { price?: number | null; stock?: string | null }) {
  if (price == null) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  return (
    <div>
      <div className="font-bold text-sm">${price.toFixed(2)}</div>
      {stock && <div className="text-xs text-muted-foreground">{stock}</div>}
    </div>
  );
}

function ScoreBadge({ score }: { score?: number | null }) {
  if (score == null) return null;
  const color = score >= 75 ? "text-success" : score >= 55 ? "text-warning" : "text-destructive";
  return <span className={`text-sm font-bold ${color}`}>{score}</span>;
}

export default function StoreComparison() {
  const { data, isLoading, isError, refetch } = useGetStoreComparison();

  const rows = (data ?? []) as StoreComparisonRow[];

  if (isLoading) {
    return (
      <div className="space-y-5">
        <h2 className="text-2xl font-bold text-primary">Store Comparison</h2>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center p-8 space-y-4">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Could not load store data.</p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="space-y-5">
        <h2 className="text-2xl font-bold text-primary">Store Comparison</h2>
        <Card className="text-center p-10 shadow-none border-dashed">
          <Map className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground font-medium">No store data yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Scan the same item at different Costco stores to compare prices.</p>
          <Button className="mt-4" asChild><Link href="/photo-scan">Start Scanning</Link></Button>
        </Card>
      </div>
    );
  }

  const stores = ["Lawrence", "Oceanside", "Westbury"] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-primary">Store Comparison</h2>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      <p className="text-sm text-muted-foreground -mt-2">
        Compare prices for the same items across your Costco stores.
      </p>

      {/* Desktop table */}
      <Card className="shadow-sm overflow-hidden hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 font-semibold text-muted-foreground text-xs uppercase">Item</th>
                  <th className="text-center p-3 font-semibold text-muted-foreground text-xs uppercase">Score</th>
                  <th className="text-center p-3 font-semibold text-muted-foreground text-xs uppercase">Lawrence</th>
                  <th className="text-center p-3 font-semibold text-muted-foreground text-xs uppercase">Oceanside</th>
                  <th className="text-center p-3 font-semibold text-muted-foreground text-xs uppercase">Westbury</th>
                  <th className="text-left p-3 font-semibold text-muted-foreground text-xs uppercase">Best Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.item_number ?? idx} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="p-3">
                      <div className="font-medium text-sm leading-tight max-w-[180px]">{row.product_name}</div>
                      {row.item_number && <div className="text-xs text-muted-foreground">#{row.item_number}</div>}
                      {row.estimated_profit && <div className="text-xs text-success font-medium">{row.estimated_profit}</div>}
                    </td>
                    <td className="p-3 text-center">
                      <ScoreBadge score={row.flip_score} />
                    </td>
                    <td className={`p-3 text-center ${row.cheapest_store === "Lawrence" ? "bg-success/5" : ""}`}>
                      <StoreCell price={row.lawrence_price} stock={row.lawrence_stock} />
                      {row.cheapest_store === "Lawrence" && <Badge className="bg-success/10 text-success text-xs mt-1 border-0">Cheapest</Badge>}
                    </td>
                    <td className={`p-3 text-center ${row.cheapest_store === "Oceanside" ? "bg-success/5" : ""}`}>
                      <StoreCell price={row.oceanside_price} stock={row.oceanside_stock} />
                      {row.cheapest_store === "Oceanside" && <Badge className="bg-success/10 text-success text-xs mt-1 border-0">Cheapest</Badge>}
                    </td>
                    <td className={`p-3 text-center ${row.cheapest_store === "Westbury" ? "bg-success/5" : ""}`}>
                      <StoreCell price={row.westbury_price} stock={row.westbury_stock} />
                      {row.cheapest_store === "Westbury" && <Badge className="bg-success/10 text-success text-xs mt-1 border-0">Cheapest</Badge>}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground max-w-[160px]">
                      {row.best_action ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Mobile cards */}
      <div className="space-y-4 md:hidden">
        {rows.map((row, idx) => (
          <Card key={row.item_number ?? idx} className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold leading-tight">{row.product_name}</CardTitle>
                  {row.item_number && <p className="text-xs text-muted-foreground">#{row.item_number}</p>}
                </div>
                <ScoreBadge score={row.flip_score} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="grid grid-cols-3 gap-2">
                {stores.map(store => {
                  const storeKey = store.toLowerCase() as "lawrence" | "oceanside" | "westbury";
                  const price = row[`${storeKey}_price`];
                  const stock = row[`${storeKey}_stock`];
                  const isCheapest = row.cheapest_store === store;
                  return (
                    <div key={store} className={`rounded-lg p-2 text-center border ${isCheapest ? "border-success/30 bg-success/5" : "border-border bg-muted/20"}`}>
                      <div className="text-xs font-semibold text-muted-foreground mb-1">{store}</div>
                      {price != null ? (
                        <>
                          <div className="font-bold text-sm">${price.toFixed(2)}</div>
                          {isCheapest && <CheckCircle className="h-3 w-3 text-success mx-auto mt-1" />}
                        </>
                      ) : (
                        <Minus className="h-3 w-3 text-muted-foreground mx-auto" />
                      )}
                    </div>
                  );
                })}
              </div>

              {row.best_action && (
                <p className="text-xs text-muted-foreground bg-muted/40 rounded p-2">{row.best_action}</p>
              )}
              {row.estimated_profit && (
                <p className="text-xs text-success font-medium">Profit: {row.estimated_profit}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
