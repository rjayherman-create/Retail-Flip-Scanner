import { Badge } from "@/components/ui/badge";

export function RecommendationBadge({ recommendation }: { recommendation?: "BUY" | "MAYBE" | "SKIP" | string | null }) {
  if (!recommendation) return null;
  
  if (recommendation === "BUY") {
    return <Badge className="bg-success text-success-foreground hover:bg-success/90 font-bold px-3 py-1 uppercase tracking-wider">BUY</Badge>;
  }
  if (recommendation === "MAYBE") {
    return <Badge className="bg-warning text-warning-foreground hover:bg-warning/90 font-bold px-3 py-1 uppercase tracking-wider">MAYBE</Badge>;
  }
  if (recommendation === "SKIP") {
    return <Badge variant="destructive" className="font-bold px-3 py-1 uppercase tracking-wider">SKIP</Badge>;
  }
  
  return <Badge variant="outline">{recommendation}</Badge>;
}

export function SourceTypeBadge({ type }: { type: string }) {
  switch (type) {
    case "photo_scan":
      return <Badge variant="outline" className="text-blue-500 border-blue-200 bg-blue-50">Photo Scan</Badge>;
    case "public_web_check":
      return <Badge variant="outline" className="text-purple-500 border-purple-200 bg-purple-50">Online Check</Badge>;
    case "screenshot_upload":
      return <Badge variant="outline" className="text-teal-500 border-teal-200 bg-teal-50">Screenshot</Badge>;
    case "manual":
      return <Badge variant="outline" className="text-slate-500 border-slate-200 bg-slate-50">Manual</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

export function MarkdownCodeBadge({ code }: { code?: string | null }) {
  if (!code) return null;
  
  if (code === ".97") return <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">Clearance (.97)</Badge>;
  if (code === ".00") return <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">Manager Mark (.00)</Badge>;
  if (code === ".88") return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Markdown (.88)</Badge>;
  if (code === ".99") return <Badge variant="outline" className="text-gray-500 border-gray-200 bg-gray-50">Retail (.99)</Badge>;
  
  return <Badge variant="outline">{code}</Badge>;
}
