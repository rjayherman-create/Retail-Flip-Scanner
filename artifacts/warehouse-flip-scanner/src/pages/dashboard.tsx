import { useGetDashboardSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecommendationBadge } from "@/components/shared/badges";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, AlertCircle, Scan, Keyboard, Globe, Image as ImageIcon } from "lucide-react";

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary();

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl w-full" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-8 text-center bg-card rounded-xl border border-border shadow-sm">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-bold">Failed to load dashboard</h2>
        <p className="text-muted-foreground mt-2">Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-primary">Overview</h2>
        <Link href="/photo-scan">
          <Button size="sm" className="font-semibold">
            <Scan className="mr-2 h-4 w-4" /> Scan New Item
          </Button>
        </Link>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-sm border-success/20 bg-success/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recommended BUYS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{summary.buy_count}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-warning/20 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MAYBE Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{summary.maybe_count}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">SKIP Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{summary.skip_count}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Scans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.total_items}</div>
          </CardContent>
        </Card>
      </div>

      {/* Capture breakdown & Insights */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Capture Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scan className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Photo Scans</span>
                </div>
                <span className="font-bold">{summary.photo_scan_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">Online Checks</span>
                </div>
                <span className="font-bold">{summary.online_check_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-teal-500" />
                  <span className="text-sm font-medium">Screenshots</span>
                </div>
                <span className="font-bold">{summary.screenshot_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Keyboard className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium">Manual Entries</span>
                </div>
                <span className="font-bold">{summary.manual_count}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {summary.highest_profit_item && (
          <Card className="shadow-sm bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> 
                Highest Profit Potential
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-lg font-bold truncate" title={summary.highest_profit_item.product_name}>
                    {summary.highest_profit_item.product_name}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                    <RecommendationBadge recommendation={summary.highest_profit_item.recommendation} />
                    <span>Costco: ${summary.highest_profit_item.price}</span>
                  </div>
                </div>
                
                <div className="p-3 bg-white dark:bg-black rounded-lg border border-border">
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="text-muted-foreground">Est. Resale:</span>
                    <span className="font-medium">{summary.highest_profit_item.expected_sale_price}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-success">Est. Profit:</span>
                    <span className="text-success">{summary.highest_profit_item.estimated_profit}</span>
                  </div>
                </div>

                <Link href={`/flip-decision/${summary.highest_profit_item.id}`}>
                  <Button variant="outline" className="w-full mt-2" size="sm">
                    View Details
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Activity */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Recent Scans</CardTitle>
          <Link href="/inventory">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              View All <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {summary.recent_items && summary.recent_items.length > 0 ? (
            <div className="space-y-4">
              {summary.recent_items.slice(0, 5).map(item => (
                <div key={item.id} className="flex items-center justify-between pb-4 border-b border-border last:border-0 last:pb-0">
                  <div className="flex flex-col gap-1 max-w-[60%]">
                    <span className="font-medium truncate" title={item.product_name}>{item.product_name}</span>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{item.store_location}</span>
                      <span>•</span>
                      <span>${item.price}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <RecommendationBadge recommendation={item.recommendation} />
                    <Link href={`/flip-decision/${item.id}`}>
                      <Button variant="secondary" size="sm" className="hidden md:flex">
                        Decision
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No recent scans found. Get out there and start scanning!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
