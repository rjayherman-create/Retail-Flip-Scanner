import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Settings as SettingsIcon, 
  Shield, 
  Brain, 
  Camera, 
  Upload, 
  Globe, 
  Keyboard,
  CheckCircle,
  AlertCircle,
  Info
} from "lucide-react";
import { Link } from "wouter";

const CAPTURE_METHODS = [
  {
    icon: Camera,
    title: "Photo Scan",
    desc: "Take a photo of any shelf tag, price sign, box, or barcode. AI vision extracts the item and scores the flip.",
    status: "active",
    href: "/photo-scan",
  },
  {
    icon: Globe,
    title: "Public Web Check",
    desc: "Attempts to check publicly visible Costco inventory pages. Will fail if login or CAPTCHA is required.",
    status: "compliance",
    href: "/web-check",
  },
  {
    icon: Upload,
    title: "Screenshot Upload",
    desc: "Upload screenshots from the Costco warehouse app or website. AI extracts multiple rows at once.",
    status: "active",
    href: "/upload-screenshot",
  },
  {
    icon: Keyboard,
    title: "Manual Add",
    desc: "Enter item details by hand and get an AI flip score and listing instantly.",
    status: "active",
    href: "/manual-add",
  },
];

const SCORING_TIERS = [
  { label: "BUY", range: "75–100", color: "bg-success text-success-foreground", desc: "Strong flip candidate. Good margin, high demand." },
  { label: "MAYBE", range: "55–74", color: "bg-warning text-warning-foreground", desc: "Buy 1 test unit. Research demand before buying more." },
  { label: "SKIP", range: "0–54", color: "bg-destructive text-destructive-foreground", desc: "Too risky, low margin, or poor demand signal." },
];

const MARKDOWN_CODES = [
  { code: ".97", name: "Clearance", desc: "Item being discontinued. Strongest flip signal.", color: "text-orange-600" },
  { code: ".88", name: "Manager Markdown", desc: "Discounted to move inventory. Good opportunity.", color: "text-amber-600" },
  { code: ".00", name: "Manager Special", desc: "Employee or manager priced. Investigate further.", color: "text-yellow-600" },
  { code: ".99", name: "Regular Retail", desc: "Standard pricing. Usually skip unless demand is very high.", color: "text-gray-500" },
];

export default function Settings() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
          <SettingsIcon className="h-6 w-6" /> Settings & Guide
        </h2>
        <p className="text-sm text-muted-foreground mt-1">How the app works, scoring rules, and compliance info.</p>
      </div>

      {/* Capture Methods */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Three Capture Methods</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {CAPTURE_METHODS.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.title} className="flex gap-3 pb-4 border-b border-border last:border-0 last:pb-0">
                <div className="shrink-0 mt-0.5 p-2 bg-primary/10 rounded-lg">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-sm">{m.title}</h3>
                    {m.status === "active" ? (
                      <Badge className="bg-success/10 text-success text-xs border-success/20">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-warning border-warning/30">Compliance-safe</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{m.desc}</p>
                </div>
                <Button size="sm" variant="ghost" className="shrink-0 text-xs" asChild>
                  <Link href={m.href}>Open</Link>
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Scoring Tiers */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" /> Flip Score Tiers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {SCORING_TIERS.map(tier => (
            <div key={tier.label} className="flex gap-3 items-start">
              <Badge className={`${tier.color} font-bold px-3 py-1 text-xs min-w-[60px] justify-center`}>{tier.label}</Badge>
              <div>
                <p className="text-xs font-semibold">{tier.range}</p>
                <p className="text-xs text-muted-foreground">{tier.desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Markdown Codes */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" /> Costco Markdown Codes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {MARKDOWN_CODES.map(code => (
            <div key={code.code} className="flex gap-3 items-start pb-3 border-b border-border last:border-0 last:pb-0">
              <span className={`text-lg font-black ${code.color} min-w-[40px]`}>{code.code}</span>
              <div>
                <p className="text-sm font-semibold">{code.name}</p>
                <p className="text-xs text-muted-foreground">{code.desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* AI Model Info */}
      <Card className="shadow-sm bg-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4" /> AI Model
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            <span className="text-sm font-medium">GPT-4.1 Mini Vision</span>
            <Badge variant="outline" className="text-xs">OpenAI</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Photo scans and screenshot uploads are processed using OpenAI's vision model. 
            Scoring uses a rule-based system layered with AI analysis for product name, price endings, category, and brand signals.
          </p>
        </CardContent>
      </Card>

      {/* Compliance */}
      <Card className="shadow-sm border-warning/20 bg-warning/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-warning" /> Compliance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-2 text-xs text-muted-foreground">
            {[
              "This app does NOT bypass Costco login, membership checks, or CAPTCHA.",
              "It does NOT scrape private Costco APIs or copy session cookies.",
              "Photo Scan and Screenshot Upload process images you personally capture.",
              "Public Web Check only reads pages visible without login; it fails gracefully otherwise.",
              "All AI processing uses OpenAI's API. Images are not stored by this app after scoring.",
              "Prices and stock status change frequently. Always verify in store before buying.",
            ].map((point, i) => (
              <div key={i} className="flex gap-2">
                <CheckCircle className="h-3 w-3 text-success shrink-0 mt-0.5" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground pb-8">
        Warehouse Flip Scanner — for personal reselling research only.
      </div>
    </div>
  );
}
