import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bell, Box, Camera, ChevronRight, CircleDollarSign, Clock3, FileImage,
  Gauge, ImagePlus, LayoutDashboard, LineChart, PackagePlus, RefreshCw,
  Search, ShieldCheck, Sparkles, Target, TrendingUp, Upload, WalletCards, X
} from "lucide-react";
import "./styles.css";
import "./scanner.css";

type Signal = "HOLD" | "WATCH" | "SELL";
type ScanMode = "receipt" | "product";
type Item = { id:number; name:string; type:string; qty:number; cost:number; value:number; trend:number; signal:Signal; target:number; note:string; checkedAt?:string|null; sourceStatus?:string };
type ApiItem = { id:number; product_name:string; subcategory?:string|null; price?:number|null; current_store_price?:number|null; normal_retail_estimate?:number|null; expected_facebook_sale_price?:number|null; recommendation?:string|null; quantity?:number|null; analysis_json?:Record<string,unknown>|null; updated_at?:string|null };

const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n);
const numberValue=(value:unknown,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;

function mapApiItem(item:ApiItem):Item{
  const analysis=item.analysis_json??{};
  const quotes=Array.isArray(analysis.marketQuotes)?analysis.marketQuotes as Array<{value?:number|null}>:[];
  const quoteValues=quotes.map(q=>numberValue(q.value,NaN)).filter(Number.isFinite);
  const marketValue=numberValue(item.normal_retail_estimate,quoteValues.length?quoteValues.reduce((a,b)=>a+b,0)/quoteValues.length:numberValue(item.expected_facebook_sale_price));
  const cost=numberValue(item.price??item.current_store_price);
  const recommendation=String(item.recommendation??"HOLD").toUpperCase();
  const signal:Signal=recommendation.includes("SELL")?"SELL":recommendation.includes("WATCH")?"WATCH":"HOLD";
  return {id:item.id,name:item.product_name,type:item.subcategory||"Pokémon sealed product",qty:Math.max(1,numberValue(item.quantity,1)),cost,value:marketValue,trend:numberValue(analysis.trend30Day,0),signal,target:numberValue(analysis.targetPrice,0),note:String(analysis.marketNote??"No live market note yet."),checkedAt:String(analysis.marketCheckedAt??item.updated_at??"")||null,sourceStatus:quotes.length?`${quoteValues.length}/${quotes.length} sources reporting`:"No live source check yet"};
}

function App(){
  const [query,setQuery]=useState("");
  const [active,setActive]=useState("Dashboard");
  const [inventory,setInventory]=useState<Item[]>([]);
  const [dataMode,setDataMode]=useState<"loading"|"database"|"empty"|"error">("loading");
  const [refreshing,setRefreshing]=useState(false);
  const [message,setMessage]=useState("Connecting to PostgreSQL…");
  const [scanMode,setScanMode]=useState<ScanMode|null>(null);
  const [selectedFiles,setSelectedFiles]=useState<File[]>([]);
  const [scanMessage,setScanMessage]=useState("");
  const [scanning,setScanning]=useState(false);
  const cameraInput=useRef<HTMLInputElement>(null);
  const documentInput=useRef<HTMLInputElement>(null);

  const loadPortfolio=async()=>{
    try{
      const response=await fetch("/api/pokemon/portfolio",{headers:{Accept:"application/json"}});
      if(!response.ok)throw new Error(`Portfolio API returned ${response.status}`);
      const json=await response.json() as {items?:ApiItem[]};
      const items=(json.items??[]).map(mapApiItem);
      setInventory(items);
      if(items.length){setDataMode("database");setMessage(`${items.length} live products loaded from PostgreSQL.`)}
      else{setDataMode("empty");setMessage("PostgreSQL is connected. No Pokémon inventory exists yet. Scan your first product to begin live testing.")}
    }catch(error){
      setInventory([]);
      setDataMode("error");
      setMessage(error instanceof Error?`Database connection unavailable: ${error.message}`:"Database connection unavailable.");
    }
  };

  useEffect(()=>{void loadPortfolio()},[]);

  const refreshMarket=async()=>{
    if(dataMode!=="database"||!inventory.length){setMessage("Add live Pokémon inventory before running market checks.");return}
    setRefreshing(true);setMessage("Checking supported live market sources…");
    const results=await Promise.allSettled(inventory.map(item=>fetch(`/api/pokemon/market-check/${item.id}`,{method:"POST"})));
    const successful=results.filter(result=>result.status==="fulfilled"&&result.value.ok).length;
    await loadPortfolio();setRefreshing(false);
    setMessage(`Market check finished for ${successful} of ${inventory.length} live products.`);
  };

  const openScanner=(mode:ScanMode)=>{setScanMode(mode);setSelectedFiles([]);setScanMessage("")};
  const closeScanner=()=>{if(scanning)return;setScanMode(null);setSelectedFiles([]);setScanMessage("")};
  const handleFiles=(files:FileList|null)=>{if(files?.length){setSelectedFiles(Array.from(files));setScanMessage("")}};
  const startScan=async()=>{
    if(!selectedFiles.length){setScanMessage("Take a photo or choose a product image first.");return}
    if(scanMode==="receipt"){setScanMessage("Receipt OCR is not connected yet. Use Scan purchase for live product testing.");return}
    const images=selectedFiles.filter(file=>file.type.startsWith("image/")).slice(0,4);
    if(!images.length){setScanMessage("The Pokémon product scanner currently accepts image files, not PDFs.");return}
    setScanning(true);setScanMessage("Identifying the Pokémon product and saving it to PostgreSQL…");
    try{
      const body=new FormData();
      images.forEach(file=>body.append("images",file));
      body.append("retailer","Unknown retailer");
      body.append("store_location","Unknown location");
      body.append("purchase_price","0");
      body.append("quantity","1");
      body.append("purchase_date",new Date().toISOString().slice(0,10));
      const response=await fetch("/api/pokemon/scan",{method:"POST",body});
      const json=await response.json() as {success?:boolean;error?:string;extracted?:{product_name?:string};saved_items?:Array<{id:number}>};
      if(!response.ok||!json.success)throw new Error(json.error||`Scanner returned ${response.status}`);
      await loadPortfolio();
      setScanMessage(`${json.extracted?.product_name||"Pokémon product"} saved successfully. ${json.saved_items?.length||1} live inventory unit created.`);
      setMessage("Live Pokémon scan completed and saved to PostgreSQL.");
    }catch(error){setScanMessage(error instanceof Error?`Scan failed: ${error.message}`:"Pokémon scan failed.")}
    finally{setScanning(false)}
  };

  const handleNav=(label:string)=>{setActive(label);if(label==="Scan Receipt")openScanner("receipt");if(label==="Add Purchase")openScanner("product")};
  const filtered=useMemo(()=>inventory.filter(i=>i.name.toLowerCase().includes(query.toLowerCase())),[inventory,query]);
  const totals=useMemo(()=>{const invested=inventory.reduce((s,i)=>s+i.cost,0);const market=inventory.reduce((s,i)=>s+i.value,0);const onlineNet=market*.86;const gain=market-invested;return{invested,market,onlineNet,gain,roi:invested?(gain/invested)*100:0}},[inventory]);
  const nav=[["Dashboard",LayoutDashboard],["Add Purchase",PackagePlus],["Scan Receipt",Camera],["My Collection",Box],["Market Watch",LineChart],["Sell Signals",Gauge],["Price Targets",Target],["Capital Recovery",WalletCards],["Alerts",Bell]] as const;

  return <div className="app-shell">
    <input ref={cameraInput} className="hidden-file" type="file" accept="image/*" capture="environment" onChange={e=>handleFiles(e.target.files)}/>
    <input ref={documentInput} className="hidden-file" type="file" accept="image/*,.pdf,application/pdf" multiple onChange={e=>handleFiles(e.target.files)}/>
    <aside className="sidebar"><div className="brand"><div className="brand-mark">PV</div><div><strong>PokéVault</strong><span>Investment Tracker</span></div></div><nav>{nav.map(([label,Icon])=><button key={label} className={active===label?"active":""} onClick={()=>handleNav(label)}><Icon size={18}/><span>{label}</span></button>)}</nav><div className="side-card"><ShieldCheck size={20}/><div><b>{dataMode==="database"||dataMode==="empty"?"Database connected":"Connection check"}</b><span>{inventory.length} live products</span></div></div></aside>
    <main><header><div><p className="eyebrow">POKÉMON SEALED PORTFOLIO</p><h1>{active}</h1><p>{message}</p></div><div className="header-actions"><button className="ghost" onClick={()=>openScanner("receipt")}><Upload size={17}/>Import receipt</button><button className="ghost" onClick={()=>void refreshMarket()} disabled={refreshing||!inventory.length}><RefreshCw size={17}/>{refreshing?"Checking…":"Check market now"}</button><button className="primary" onClick={()=>openScanner("product")}><Camera size={17}/>Scan purchase</button></div></header>
      <section className="hero"><div><span className="live-pill"><Sparkles size={14}/> Live data only</span><h2>{inventory.length?<>Your collection is up <em>{totals.roi.toFixed(1)}%</em></>:"No inventory yet"}</h2><p>{inventory.length?`Current gross appreciation is ${money(totals.gain)}. Values are loaded only from PostgreSQL and supported live market sources.`:"Scan a real Pokémon product to create the first PostgreSQL inventory record. No sample products or fake portfolio values are displayed."}</p><div className="hero-actions"><button className="light" onClick={()=>openScanner("product")}>Scan first product <ChevronRight size={16}/></button></div></div><div className="score"><span>Live products</span><strong>{inventory.length}</strong><small>{dataMode==="error"?"Database unavailable":"PostgreSQL"}</small></div></section>
      <section className="metrics"><Metric icon={<CircleDollarSign/>} label="Total invested" value={money(totals.invested)} sub="Live database cost only"/><Metric icon={<TrendingUp/>} label="Gross market value" value={money(totals.market)} sub={`${money(totals.gain)} unrealized`}/><Metric icon={<WalletCards/>} label="Estimated online net" value={money(totals.onlineNet)} sub="Based on live portfolio values"/><Metric icon={<Clock3/>} label="Data mode" value={dataMode==="database"?"Live DB":dataMode==="empty"?"Empty DB":dataMode==="error"?"Offline":"Loading"} sub="No sample fallback"/></section>
      <section className="content-grid"><div className="panel portfolio-panel"><div className="panel-head"><div><h3>My sealed inventory</h3><p>Live PostgreSQL records only</p></div><div className="search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search products"/></div></div><div className="table-wrap"><table><thead><tr><th>Product</th><th>Cost</th><th>Market</th><th>Sources</th><th>Target</th><th>Signal</th></tr></thead><tbody>{filtered.length?filtered.map(item=><tr key={item.id}><td><div className="product"><div className="product-art">{item.name.slice(0,2).toUpperCase()}</div><div><b>{item.name}</b><span>{item.type}{item.qty>1?` · Qty ${item.qty}`:""}</span></div></div></td><td>{money(item.cost)}</td><td><b>{money(item.value)}</b></td><td>{item.sourceStatus}</td><td>{item.target?money(item.target):"Not set"}</td><td><span className={`signal ${item.signal.toLowerCase()}`}>{item.signal}</span></td></tr>):<tr><td colSpan={6}>No live inventory records found. Use Scan purchase to add one.</td></tr>}</tbody></table></div></div>
      <aside className="right-column"><div className="panel signal-card"><div className="panel-head"><div><h3>Live testing status</h3><p>No fake values or seeded products</p></div><span className="signal watch">LIVE</span></div><ul><li>PostgreSQL inventory only</li><li>Scanner saves real uploaded products</li><li>Market checks run only on saved items</li><li>Missing integrations show errors instead of fake results</li></ul><button className="full" onClick={()=>openScanner("product")}>Scan a real product</button></div><div className="panel alert-list"><div className="panel-head"><div><h3>Connection status</h3><p>Database and source diagnostics</p></div></div><Alert title={dataMode==="database"?"PostgreSQL inventory loaded":dataMode==="empty"?"PostgreSQL connected; inventory empty":"Database connection needs attention"} time={message}/><Alert title="No seeded portfolio" time="All totals start at zero"/><Alert title="Market values require source results" time="No fabricated fallback prices"/></div></aside></section>
    </main>
    {scanMode&&<div className="scan-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)closeScanner()}}><section className="scan-dialog" role="dialog" aria-modal="true" aria-labelledby="scan-title"><button className="scan-close" onClick={closeScanner} aria-label="Close scanner" disabled={scanning}><X size={20}/></button><div className="scan-icon"><Camera size={28}/></div><p className="eyebrow">POKÉVAULT SCANNER</p><h2 id="scan-title">{scanMode==="receipt"?"Scan or upload a receipt":"Photograph a Pokémon purchase"}</h2><p className="scan-help">Use your phone camera or choose up to four product photos. Front, back, barcode, and promo views improve matching.</p><div className="scan-options"><button className="scan-option" onClick={()=>cameraInput.current?.click()} disabled={scanning}><Camera size={24}/><span><b>Open camera</b><small>Take a new photo</small></span></button><button className="scan-option" onClick={()=>documentInput.current?.click()} disabled={scanning}><ImagePlus size={24}/><span><b>Choose file</b><small>Photo or image</small></span></button></div>{selectedFiles.length>0&&<div className="selected-files"><b>{selectedFiles.length===1?"Selected file":`${selectedFiles.length} selected files`}</b>{selectedFiles.map((file,index)=><div className="selected-file" key={`${file.name}-${index}`}><FileImage size={17}/><span>{file.name}</span><small>{Math.max(1,Math.round(file.size/1024))} KB</small></div>)}</div>}{scanMessage&&<p className="scan-message">{scanMessage}</p>}<button className="primary scan-submit" onClick={startScan} disabled={!selectedFiles.length||scanning}>{scanning?"Analyzing Pokémon product…":`Analyze ${scanMode==="receipt"?"receipt":"purchase"}`}</button></section></div>}
  </div>
}
function Metric({icon,label,value,sub}:{icon:React.ReactNode,label:string,value:string,sub:string}){return <div className="metric"><div className="metric-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{sub}</small></div></div>}
function Alert({title,time}:{title:string,time:string}){return <div className="alert"><div className="dot"/><div><b>{title}</b><span>{time}</span></div><ChevronRight size={16}/></div>}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
