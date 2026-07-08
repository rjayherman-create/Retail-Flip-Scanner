import { useState, useRef } from "react";
import { usePhotoScan, getListInventoryQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RecommendationBadge, MarkdownCodeBadge } from "@/components/shared/badges";
import { Camera, Upload, Zap, AlertCircle, Save, FileText, Map } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

const STORES = ["Lawrence", "Oceanside", "Westbury", "Other / Current Store"];
const CATEGORIES = ["LEGO", "Toys", "Tools", "Appliances", "Seasonal", "Sporting Goods", "Electronics", "Home", "Other"];

interface ScanResult {
  success: boolean;
  extracted?: Record<string, unknown>;
  decision?: {
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
  };
  error_message?: string;
  saved_item?: { id: number; product_name: string };
}

export default function PhotoScan() {
  const [store, setStore] = useState("Lawrence");
  const [category, setCategory] = useState("LEGO");
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const photoScan = usePhotoScan();

  function handleFile(f: File) {
    setFile(f);
    setResult(null);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  async function handleScan() {
    if (!file) {
      toast({ title: "No image selected", description: "Please take or upload a photo first.", variant: "destructive" });
      return;
    }
    const formData = new FormData();
    formData.append("image", file);
    formData.append("store_location", store === "Other / Current Store" ? "Other" : store);
    formData.append("category", category);

    photoScan.mutate({ data: formData as unknown as { image: Blob; store_location: string; category?: string } }, {
      onSuccess: (data) => {
        setResult(data as unknown as ScanResult);
        queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      },
      onError: () => {
        toast({ title: "Scan failed", description: "Could not process the image. Please try again.", variant: "destructive" });
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-32 md:pb-6">
      <div>
        <h2 className="text-2xl font-bold text-primary">Photo Scan</h2>
        <p className="text-sm text-muted-foreground mt-1">Take a quick in-store photo of a shelf tag, box, price sign, barcode, or Costco app screen.</p>
      </div>

      {/* Upload Area */}
      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div
            className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center p-6 bg-muted/30 cursor-pointer min-h-[200px] relative overflow-hidden"
            onClick={() => fileInputRef.current?.click()}
          >
            {preview ? (
              <img src={preview} alt="Preview" className="max-h-60 object-contain rounded-lg" />
            ) : (
              <>
                <Camera className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground text-center">Tap to upload an image or take a photo</p>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="w-full" onClick={() => cameraInputRef.current?.click()}>
              <Camera className="mr-2 h-4 w-4" /> Take Photo
            </Button>
            <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" /> Upload Image
            </Button>
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Store</Label>
              <Select value={store} onValueChange={setStore}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STORES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button className="w-full text-base font-bold py-6" onClick={handleScan} disabled={photoScan.isPending || !file}>
            <Zap className="mr-2 h-5 w-5" />
            {photoScan.isPending ? "Scanning..." : "Quick Scan"}
          </Button>
        </CardContent>
      </Card>

      {/* Result Card */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {result.success && result.decision ? (
              <Card className={`shadow-md border-2 ${
                result.decision.recommendation === "BUY" ? "border-success/40 bg-success/5" :
                result.decision.recommendation === "MAYBE" ? "border-warning/40 bg-warning/5" :
                "border-destructive/40 bg-destructive/5"
              }`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <motion.div
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <RecommendationBadge recommendation={result.decision.recommendation} />
                    </motion.div>
                    <span className="text-2xl font-bold text-muted-foreground">{result.decision.flip_score}/100</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold">{String(result.extracted?.product_name ?? "Unknown Item")}</h3>
                    {result.extracted?.item_number && (
                      <p className="text-sm text-muted-foreground">Item #{String(result.extracted.item_number)}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-card border border-border rounded-lg p-3">
                      <div className="text-muted-foreground text-xs uppercase font-semibold mb-1">Costco Price</div>
                      <div className="font-bold text-lg">${result.extracted?.price ?? "—"}</div>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-3">
                      <div className="text-muted-foreground text-xs uppercase font-semibold mb-1">FB List Price</div>
                      <div className="font-bold text-lg text-primary">${result.decision.facebook_list_price ?? "—"}</div>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-3">
                      <div className="text-muted-foreground text-xs uppercase font-semibold mb-1">Expected Sale</div>
                      <div className="font-semibold">{result.decision.expected_sale_price ?? "—"}</div>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-3">
                      <div className="text-muted-foreground text-xs uppercase font-semibold mb-1">Est. Profit</div>
                      <div className="font-semibold text-success">{result.decision.estimated_profit ?? "—"}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <MarkdownCodeBadge code={result.extracted?.markdown_code as string} />
                    {result.decision.max_quantity && result.decision.max_quantity !== "0" && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                        Buy: {result.decision.max_quantity}
                      </span>
                    )}
                  </div>

                  {result.decision.risk_notes && (
                    <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                      <span className="font-semibold">Risk: </span>{result.decision.risk_notes}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <Button size="sm" className="flex-1" asChild>
                      <Link href="/inventory">
                        <Save className="mr-1 h-3 w-3" /> Saved
                      </Link>
                    </Button>
                    {result.saved_item && (
                      <Button size="sm" variant="outline" className="flex-1" asChild>
                        <Link href={`/listing-generator/${result.saved_item.id}`}>
                          <FileText className="mr-1 h-3 w-3" /> Listing
                        </Link>
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="flex-1" asChild>
                      <Link href="/store-comparison">
                        <Map className="mr-1 h-3 w-3" /> Compare
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-destructive">Scan Issue</p>
                      <p className="text-sm text-muted-foreground mt-1">{result.error_message ?? "Could not read the image clearly. Try a closer photo of the price tag."}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile sticky action bar */}
      {result?.success && result.saved_item && (
        <div className="fixed bottom-0 left-0 right-0 md:hidden bg-card border-t border-border p-3 flex gap-2 z-20">
          <Button size="sm" className="flex-1" asChild>
            <Link href="/inventory"><Save className="mr-1 h-3 w-3" /> Saved</Link>
          </Button>
          <Button size="sm" variant="outline" className="flex-1" asChild>
            <Link href={`/listing-generator/${result.saved_item.id}`}><FileText className="mr-1 h-3 w-3" /> Listing</Link>
          </Button>
          <Button size="sm" variant="outline" className="flex-1" asChild>
            <Link href="/store-comparison"><Map className="mr-1 h-3 w-3" /> Compare</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
