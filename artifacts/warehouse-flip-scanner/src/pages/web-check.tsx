import { useState } from "react";
import { usePublicWebCheck } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Globe, AlertCircle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Link } from "wouter";

const STORES = ["Lawrence", "Oceanside", "Westbury"];

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; message: string }> = {
  public_check_success: {
    label: "Success",
    icon: <CheckCircle className="h-4 w-4" />,
    color: "text-success",
    message: "Public inventory data found.",
  },
  public_check_blocked: {
    label: "Blocked",
    icon: <XCircle className="h-4 w-4" />,
    color: "text-destructive",
    message: "Costco did not expose this inventory publicly. Try Photo Scan, Upload Screenshot, or Manual Add.",
  },
  login_required: {
    label: "Login Required",
    icon: <XCircle className="h-4 w-4" />,
    color: "text-destructive",
    message: "Login appears required. This app will not bypass login.",
  },
  captcha_detected: {
    label: "CAPTCHA Detected",
    icon: <XCircle className="h-4 w-4" />,
    color: "text-destructive",
    message: "CAPTCHA or bot protection detected. Use Photo Scan or Screenshot Upload.",
  },
  no_inventory_visible: {
    label: "No Inventory Visible",
    icon: <AlertCircle className="h-4 w-4" />,
    color: "text-warning",
    message: "Costco did not expose this inventory publicly. Try Photo Scan, Upload Screenshot, or Manual Add.",
  },
  parse_failed: {
    label: "Parse Failed",
    icon: <AlertCircle className="h-4 w-4" />,
    color: "text-warning",
    message: "No inventory data was visible on the public page.",
  },
  rate_limited: {
    label: "Rate Limited",
    icon: <AlertCircle className="h-4 w-4" />,
    color: "text-warning",
    message: "Too many requests. Please wait before trying again.",
  },
};

export default function WebCheck() {
  const [searchTerm, setSearchTerm] = useState("");
  const [store, setStore] = useState("Lawrence");
  const [result, setResult] = useState<{ status: string; message?: string; rows?: unknown[]; source_url?: string } | null>(null);

  const webCheck = usePublicWebCheck();

  function handleCheck() {
    if (!searchTerm.trim()) return;
    webCheck.mutate(
      { data: { search_term: searchTerm.trim(), store_location: store } },
      {
        onSuccess: (data) => setResult(data as unknown as typeof result),
        onError: () => setResult({ status: "parse_failed" }),
      }
    );
  }

  const statusConfig = result ? (STATUS_CONFIG[result.status] ?? STATUS_CONFIG.parse_failed) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary">Check Online</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Try to check public Costco inventory pages without login. Results may be unavailable due to site restrictions.
        </p>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Search Term</Label>
            <Input
              placeholder="lego, toys, tools, air fryer, generator"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCheck()}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Store</Label>
            <Select value={store} onValueChange={setStore}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STORES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full font-semibold" onClick={handleCheck} disabled={webCheck.isPending || !searchTerm.trim()}>
            {webCheck.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking...</>
            ) : (
              <><Globe className="mr-2 h-4 w-4" /> Check Public Inventory</>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && statusConfig && (
        <Card className={`shadow-sm border-2 ${
          result.status === "public_check_success" ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5"
        }`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span className={statusConfig.color}>{statusConfig.icon}</span>
              <span>Status: {statusConfig.label}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{result.message ?? statusConfig.message}</p>

            {result.source_url && (
              <a href={result.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline break-all">
                {result.source_url}
              </a>
            )}

            {result.status !== "public_check_success" && (
              <div className="border border-border rounded-lg p-4 bg-card space-y-3">
                <p className="text-sm font-semibold">Try these instead:</p>
                <div className="grid grid-cols-1 gap-2">
                  <Button variant="outline" size="sm" className="justify-start" asChild>
                    <Link href="/photo-scan">Photo Scan — Take a photo in-store</Link>
                  </Button>
                  <Button variant="outline" size="sm" className="justify-start" asChild>
                    <Link href="/upload-screenshot">Upload Screenshot — From Costco app</Link>
                  </Button>
                  <Button variant="outline" size="sm" className="justify-start" asChild>
                    <Link href="/manual-add">Manual Add — Enter item details directly</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Compliance Notice */}
      <Card className="bg-muted/30 border-muted shadow-none">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-semibold">Compliance Notice</p>
              <p>This checker only reads publicly visible Costco pages. It does not log in, bypass CAPTCHA, use private APIs, or copy cookies. If inventory is behind a login wall, the check will fail and you will be directed to Photo Scan or Screenshot Upload.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
