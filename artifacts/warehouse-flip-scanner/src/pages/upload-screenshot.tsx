import { useState, useRef } from "react";
import { useScreenshotOcr, useCreateInventoryItem, getListInventoryQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, AlertCircle, CheckCircle, Loader2, ImageIcon, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STORES = ["Lawrence", "Oceanside", "Westbury", "Other"];

interface OcrRow {
  product_name?: string | null;
  item_number?: string | null;
  price?: number | null;
  markdown_code?: string | null;
  stock_status?: string | null;
  needs_review?: boolean;
  _editedProductName?: string;
  _editedPrice?: string;
}

export default function UploadScreenshot() {
  const [store, setStore] = useState("Lawrence");
  const [searchTerm, setSearchTerm] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<{ success: boolean; rows: OcrRow[]; store_location?: string; search_term?: string; viewed_at?: string; error_message?: string } | null>(null);
  const [editedRows, setEditedRows] = useState<OcrRow[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const screenshotOcr = useScreenshotOcr();
  const createItem = useCreateInventoryItem();

  function handleFile(f: File) {
    setFile(f);
    setOcrResult(null);
    setSavedCount(0);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) handleFile(f);
  }

  async function handleOcr() {
    if (!file) return;
    const formData = new FormData();
    formData.append("image", file);
    formData.append("store_location", store);
    formData.append("search_term", searchTerm);

    screenshotOcr.mutate({ data: formData as unknown as { image: Blob; store_location: string; search_term?: string } }, {
      onSuccess: (data) => {
        const d = data as unknown as typeof ocrResult;
        setOcrResult(d);
        setEditedRows(d?.rows ?? []);
      },
      onError: () => toast({ title: "OCR failed", description: "Could not process the screenshot. Try a clearer image.", variant: "destructive" }),
    });
  }

  async function handleSaveAll() {
    let count = 0;
    for (const row of editedRows) {
      const name = row._editedProductName ?? row.product_name;
      if (!name) continue;
      await createItem.mutateAsync({
        data: {
          source_type: "screenshot_upload",
          store_location: ocrResult?.store_location ?? store,
          product_name: name,
          item_number: row.item_number ?? undefined,
          price: row._editedPrice ? parseFloat(row._editedPrice) : (row.price ?? undefined),
          markdown_code: row.markdown_code ?? undefined,
          stock_status: row.stock_status ?? "In Stock",
          search_term: ocrResult?.search_term ?? searchTerm,
          viewed_at: ocrResult?.viewed_at ?? new Date().toISOString(),
        }
      });
      count++;
    }
    setSavedCount(count);
    queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    toast({ title: `Saved ${count} items`, description: "Items added to your inventory." });
  }

  function updateRow(idx: number, field: string, value: string) {
    setEditedRows(rows => rows.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary">Upload Screenshot</h2>
        <p className="text-sm text-muted-foreground mt-1">Upload Costco warehouse inventory screenshots from the app or website.</p>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div
            className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center p-8 bg-muted/30 cursor-pointer min-h-[160px]"
            onClick={() => fileRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {preview ? (
              <img src={preview} alt="Preview" className="max-h-48 object-contain rounded-lg" />
            ) : (
              <>
                <ImageIcon className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground text-center">Drag and drop or tap to upload a screenshot</p>
                <p className="text-xs text-muted-foreground mt-1">Supports JPG, PNG, WEBP</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

          <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Upload Screenshots
          </Button>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Store</Label>
              <Select value={store} onValueChange={setStore}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STORES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Search Term</Label>
              <Input placeholder="lego, toys..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>

          <Button className="w-full font-semibold" onClick={handleOcr} disabled={screenshotOcr.isPending || !file}>
            {screenshotOcr.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Extracting...</> : <><Upload className="mr-2 h-4 w-4" /> Extract Inventory Rows</>}
          </Button>
        </CardContent>
      </Card>

      {ocrResult && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {ocrResult.success ? (
                <><CheckCircle className="h-4 w-4 text-success" /> Found {editedRows.length} rows — review before saving</>
              ) : (
                <><AlertCircle className="h-4 w-4 text-destructive" /> {ocrResult.error_message}</>
              )}
            </CardTitle>
            {ocrResult.store_location && (
              <p className="text-xs text-muted-foreground">Store: {ocrResult.store_location} {ocrResult.search_term && `| Search: ${ocrResult.search_term}`} {ocrResult.viewed_at && `| ${new Date(ocrResult.viewed_at).toLocaleString()}`}</p>
            )}
          </CardHeader>

          {ocrResult.success && editedRows.length > 0 && (
            <CardContent className="space-y-3">
              {editedRows.map((row, idx) => (
                <div key={idx} className={`p-3 border rounded-lg space-y-2 ${row.needs_review ? "border-warning/50 bg-warning/5" : "border-border bg-muted/20"}`}>
                  {row.needs_review && <Badge className="bg-warning text-white text-xs">Needs Review</Badge>}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Product Name</Label>
                      <Input
                        className="text-sm h-8"
                        value={row._editedProductName ?? row.product_name ?? ""}
                        onChange={(e) => updateRow(idx, "_editedProductName", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Price ($)</Label>
                      <Input
                        className="text-sm h-8"
                        type="number"
                        step="0.01"
                        value={row._editedPrice ?? (row.price?.toString() ?? "")}
                        onChange={(e) => updateRow(idx, "_editedPrice", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {row.item_number && <span>Item #{row.item_number}</span>}
                    {row.stock_status && <span>{row.stock_status}</span>}
                    {row.markdown_code && <span>Code: {row.markdown_code}</span>}
                  </div>
                </div>
              ))}

              <div className="flex gap-2 pt-2">
                <Button className="flex-1 font-semibold" onClick={handleSaveAll} disabled={createItem.isPending}>
                  {createItem.isPending ? "Saving..." : `Save All ${editedRows.length} Items`}
                </Button>
              </div>

              {savedCount > 0 && (
                <p className="text-center text-sm text-success font-medium">{savedCount} items saved to inventory.</p>
              )}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
