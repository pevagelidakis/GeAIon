import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════
   GeAIon — GEOSPATIAL AI INTELLIGENCE ASSISTANT
   Full-spectrum Earth Observation + Medium Range Weather Platform
   Data: Sentinel-1/2, Landsat, MODIS, ECMWF IFS, GFS, SAR
   Use cases: Research · Forecasting · Climate Monitoring · Disaster Response
═══════════════════════════════════════════════════════════════ */

// ── Fonts & CSS ──────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@300;400;500;700&family=Lato:wght@300;400;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root {
    --bg0: #060a10;
    --bg1: #0a1020;
    --bg2: #0e1628;
    --bg3: #12202e;
    --border: rgba(56,189,248,0.12);
    --border-hi: rgba(56,189,248,0.35);
    --sky: #38bdf8;
    --sky-dim: rgba(56,189,248,0.15);
    --amber: #fbbf24;
    --red: #f87171;
    --green: #34d399;
    --purple: #a78bfa;
    --text0: #e8f4ff;
    --text1: #94afc4;
    --text2: #4a6a80;
    --font-display: 'Syne', sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
    --font-body: 'Lato', sans-serif;
  }
  body { background: var(--bg0); color: var(--text0); font-family: var(--font-body); }
  ::-webkit-scrollbar { width: 3px; height: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(56,189,248,0.18); border-radius: 3px; }
  textarea,input,button { font-family: var(--font-body); }
  textarea:focus,input:focus { outline: none; }
  button { cursor: pointer; border: none; background: none; }

  @keyframes fadeUp   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
  @keyframes slideR   { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
  @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes scan     { 0%{transform:translateY(0)} 100%{transform:translateY(100vh)} }
  @keyframes orbit    { from{transform:rotate(0deg) translateX(18px) rotate(0deg)} to{transform:rotate(360deg) translateX(18px) rotate(-360deg)} }
  @keyframes shimmer  { 0%{opacity:0.6} 50%{opacity:1} 100%{opacity:0.6} }
  @keyframes blink    { 0%,100%{opacity:1} 49%{opacity:1} 50%{opacity:0} 99%{opacity:0} }
  @keyframes flowBar  { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }
  @keyframes spin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes alertPop { 0%{transform:scale(0.9) translateX(20px);opacity:0} 100%{transform:scale(1) translateX(0);opacity:1} }
`;

// ── System Prompt ────────────────────────────────────────────
const SYSTEM_PROMPT = `You are GeAIon (Geospatial AI Intelligence Assistant), an expert operational AI system for Earth Observation and Medium Range Weather Forecasting.

CAPABILITIES:
1. DATASET QUERY — Search and retrieve from Sentinel-1 SAR, Sentinel-2 Optical, Landsat-8/9, MODIS Terra/Aqua, in-situ networks
2. FORECAST INTERPRETATION — Parse ECMWF IFS (deterministic + ensemble), GFS, ICON, Copernicus C3S seasonal forecasts with uncertainty quantification
3. REPORT GENERATION — Produce structured meteorological, agrometeo, maritime, and disaster-response bulletins in plain language
4. ALERT TRIGGERING — Detect and announce threshold breaches: extreme precipitation, wind gusts >25m/s, SST anomalies >2σ, NDVI stress, flood risk indices
5. ANOMALY DETECTION — Statistical Z-score and ML-based detection on time-series EO and NWP data
6. SAR ANALYSIS — Flood mapping, ship detection, surface deformation analysis from interferometric SAR

RESPONSE FORMAT: Always structure replies as:
[🔧 TOOL] → Which capability is being invoked and why
[📡 DATA] → What datasets/models are being queried
[📊 ANALYSIS] → Quantitative findings with confidence levels
[💬 INTERPRETATION] → Plain language explanation
[⚡ ACTION] → Recommended next steps or triggered alerts (if applicable)

Be precise, quantitative, and operationally minded. Use proper meteorological units and terminology. Always cite uncertainty ranges for forecast products. Flag data gaps explicitly.`;

// ── Static Data ──────────────────────────────────────────────
const DATA_SOURCES = [
  { id:"s2",   name:"Sentinel-2 MSI",    type:"Optical",   freq:"5d",  res:"10m",   status:"live",    provider:"ESA" },
  { id:"s1",   name:"Sentinel-1 SAR",    type:"Radar/SAR", freq:"6d",  res:"5-20m", status:"live",    provider:"ESA" },
  { id:"ls9",  name:"Landsat-9 OLI",     type:"Optical",   freq:"16d", res:"30m",   status:"live",    provider:"USGS" },
  { id:"mod",  name:"MODIS Terra/Aqua",  type:"Multispect",freq:"1d",  res:"250m",  status:"live",    provider:"NASA" },
  { id:"ecm",  name:"ECMWF IFS",         type:"NWP Model", freq:"6h",  res:"9km",   status:"live",    provider:"ECMWF" },
  { id:"gfs",  name:"NOAA GFS",          type:"NWP Model", freq:"6h",  res:"13km",  status:"live",    provider:"NOAA" },
  { id:"ens",  name:"ECMWF ENS (51)",    type:"Ensemble",  freq:"12h", res:"18km",  status:"live",    provider:"ECMWF" },
  { id:"cop",  name:"Copernicus C3S",    type:"Seasonal",  freq:"1mo", res:"1°",    status:"live",    provider:"C3S" },
  { id:"insitu",name:"In-Situ WMO Net",  type:"Surface",   freq:"1h",  res:"point", status:"delayed", provider:"WMO" },
];

const FORECAST_METRICS = [
  { label:"2m Temperature",  unit:"°C",   value:16.4,  ens_spread:1.8,  trend:"+1.2", trendUp:true,  icon:"🌡️",  conf:94 },
  { label:"10m Wind Speed",  unit:"m/s",  value:13.2,  ens_spread:2.4,  trend:"-0.6", trendUp:false, icon:"💨",  conf:88 },
  { label:"Total Precip",    unit:"mm/6h",value:4.8,   ens_spread:3.1,  trend:"+3.2", trendUp:true,  icon:"🌧️",  conf:71 },
  { label:"MSLP",            unit:"hPa",  value:1002.4,ens_spread:1.2,  trend:"-5.8", trendUp:false, icon:"📊",  conf:97 },
  { label:"850hPa Temp",     unit:"°C",   value:4.1,   ens_spread:2.0,  trend:"+0.4", trendUp:true,  icon:"⛰️",  conf:91 },
  { label:"TPW",             unit:"mm",   value:28.4,  ens_spread:4.2,  trend:"+6.1", trendUp:true,  icon:"💧",  conf:83 },
];

const ALERT_PRESETS = [
  { id:"a1", severity:"critical", type:"Heavy Precipitation",   region:"SE Mediterranean",  value:"68mm/24h (>99th pct)",   time:"T+18h", icon:"🌊" },
  { id:"a2", severity:"warning",  type:"Wind Gust Alert",        region:"Aegean Sea",         value:"31 m/s · Beaufort 11",   time:"T+36h", icon:"💨" },
  { id:"a3", severity:"info",     type:"NDVI Stress Detected",   region:"Crete, Zone 4-7",    value:"NDVI -0.18 vs baseline", time:"Now",    icon:"🌿" },
  { id:"a4", severity:"warning",  type:"SST +2.3°C Anomaly",     region:"E. Mediterranean",   value:"2.3σ above 1991-2020",   time:"Now",    icon:"🌡️" },
];

const AGENT_TOOLS = [
  { id:"query_dataset",       label:"Query Dataset",       icon:"🛰️",  color:"#38bdf8", desc:"Retrieve EO data autonomously" },
  { id:"interpret_forecast",  label:"Interpret Forecast",  icon:"🌦️",  color:"#a78bfa", desc:"Parse NWP model outputs" },
  { id:"generate_report",     label:"Generate Report",     icon:"📋",  color:"#34d399", desc:"Structured met/EO bulletins" },
  { id:"trigger_alert",       label:"Trigger Alert",       icon:"🚨",  color:"#f87171", desc:"Threshold breach detection" },
  { id:"analyze_anomaly",     label:"Anomaly Detection",   icon:"🔍",  color:"#fbbf24", desc:"Statistical + ML anomaly flagging" },
  { id:"sar_analysis",        label:"SAR Analysis",        icon:"📡",  color:"#06b6d4", desc:"Flood/ship/deformation detection" },
  { id:"climate_baseline",    label:"Climate Baseline",    icon:"📈",  color:"#fb923c", desc:"Vs 1991-2020 climatology" },
  { id:"disaster_response",   label:"Disaster Response",   icon:"⛑️",  color:"#e879f9", desc:"Impact assessment & routing" },
];

// ── Helpers ──────────────────────────────────────────────────
function ts() { return new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}); }

function ConfBar({ value, color="#38bdf8" }) {
  return (
    <div style={{ height:3, background:"rgba(255,255,255,0.06)", borderRadius:3, overflow:"hidden", marginTop:4 }}>
      <div style={{ height:"100%", width:`${value}%`, background:color, borderRadius:3,
        boxShadow:`0 0 6px ${color}` }} />
    </div>
  );
}

function Dot({ color, glow=true, pulse=false }) {
  return (
    <div style={{ width:7, height:7, borderRadius:"50%", background:color, flexShrink:0,
      boxShadow: glow ? `0 0 6px ${color}` : "none",
      animation: pulse ? "shimmer 2s ease-in-out infinite" : "none" }} />
  );
}

// ── Background ───────────────────────────────────────────────
function DeepSpaceBG() {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:0, overflow:"hidden", background:"var(--bg0)" }}>
      {/* Hex grid overlay */}
      <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.04 }}>
        <defs>
          <pattern id="hexgrid" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
            <polygon points="30,2 56,16 56,36 30,50 4,36 4,16"
              fill="none" stroke="#38bdf8" strokeWidth="0.8"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hexgrid)"/>
      </svg>
      {/* Glow layers */}
      <div style={{ position:"absolute", top:"5%", left:"5%", width:700, height:500, borderRadius:"50%",
        background:"radial-gradient(ellipse, rgba(56,189,248,0.07) 0%, transparent 65%)",
        animation:"shimmer 10s ease-in-out infinite" }} />
      <div style={{ position:"absolute", bottom:"15%", right:"5%", width:500, height:400, borderRadius:"50%",
        background:"radial-gradient(ellipse, rgba(167,139,250,0.07) 0%, transparent 65%)",
        animation:"shimmer 13s ease-in-out infinite 2s" }} />
      <div style={{ position:"absolute", top:"40%", left:"40%", width:400, height:300, borderRadius:"50%",
        background:"radial-gradient(ellipse, rgba(52,211,153,0.04) 0%, transparent 65%)",
        animation:"shimmer 8s ease-in-out infinite 1s" }} />
      {/* Scanline */}
      <div style={{ position:"absolute", left:0, right:0, height:1,
        background:"linear-gradient(90deg, transparent, rgba(56,189,248,0.06), transparent)",
        animation:"scan 12s linear infinite", top:0 }} />
    </div>
  );
}

// ── Top Header ───────────────────────────────────────────────
function Header({ activeView, setActiveView, alertCount }) {
  const views = ["COMMAND","FORECAST","SOURCES","ALERTS","REPORTS"];
  return (
    <header style={{ position:"relative", zIndex:20, height:52,
      borderBottom:"1px solid var(--border)",
      background:"rgba(6,10,16,0.92)", backdropFilter:"blur(16px)",
      display:"flex", alignItems:"center", padding:"0 20px", gap:16 }}>
      {/* Logo */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginRight:8 }}>
        <div style={{ position:"relative", width:32, height:32 }}>
          <div style={{ width:32, height:32, borderRadius:8,
            background:"linear-gradient(135deg, rgba(56,189,248,0.2), rgba(167,139,250,0.15))",
            border:"1px solid rgba(56,189,248,0.3)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:16 }}>🌍</div>
          <div style={{ position:"absolute", top:-2, right:-2, width:8, height:8,
            borderRadius:"50%", background:"#34d399",
            boxShadow:"0 0 8px #34d399", animation:"shimmer 2s infinite" }} />
        </div>
        <div>
          <div style={{ fontFamily:"var(--font-display)", fontSize:15, fontWeight:800,
            letterSpacing:3, color:"var(--sky)" }}>GeAIon</div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:8, color:"var(--text2)",
            letterSpacing:2 }}>GEO·AI·INTELLIGENCE</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ display:"flex", gap:2 }}>
        {views.map(v => (
          <button key={v} onClick={() => setActiveView(v)} style={{
            padding:"5px 14px", borderRadius:6, fontSize:11, fontWeight:700,
            fontFamily:"var(--font-display)", letterSpacing:1,
            color: activeView===v ? "var(--sky)" : "var(--text2)",
            background: activeView===v ? "rgba(56,189,248,0.1)" : "transparent",
            border: activeView===v ? "1px solid rgba(56,189,248,0.3)" : "1px solid transparent",
            transition:"all 0.15s", position:"relative",
          }}>
            {v}
            {v==="ALERTS" && alertCount>0 && (
              <span style={{ position:"absolute", top:2, right:2, width:6, height:6,
                borderRadius:"50%", background:"var(--red)",
                boxShadow:"0 0 6px var(--red)", animation:"pulse 1.5s infinite" }} />
            )}
          </button>
        ))}
      </nav>

      <div style={{ flex:1 }} />

      {/* Status pills */}
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:5,
          background:"rgba(52,211,153,0.08)", border:"1px solid rgba(52,211,153,0.2)",
          borderRadius:20, padding:"3px 10px" }}>
          <Dot color="#34d399" pulse />
          <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"#34d399",
            fontWeight:700 }}>OPERATIONAL</span>
        </div>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--text2)",
          background:"var(--bg2)", border:"1px solid var(--border)",
          borderRadius:6, padding:"3px 8px" }}>
          {new Date().toUTCString().slice(0,25)} UTC
        </div>
      </div>
    </header>
  );
}

// ── Left Sidebar ─────────────────────────────────────────────
function Sidebar({ activeTools, toggleTool }) {
  return (
    <aside style={{ width:220, flexShrink:0, borderRight:"1px solid var(--border)",
      background:"rgba(10,16,32,0.7)", backdropFilter:"blur(8px)",
      display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ padding:"12px 12px 8px",
        borderBottom:"1px solid var(--border)",
        fontFamily:"var(--font-mono)", fontSize:9,
        color:"var(--text2)", letterSpacing:2, fontWeight:700 }}>
        AGENT CAPABILITIES
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"8px 8px" }}>
        {AGENT_TOOLS.map((tool, i) => {
          const on = activeTools.includes(tool.id);
          return (
            <button key={tool.id} onClick={() => toggleTool(tool.id)}
              style={{
                width:"100%", display:"flex", alignItems:"center", gap:8,
                padding:"8px 10px", borderRadius:8, marginBottom:2,
                background: on ? `${tool.color}14` : "transparent",
                border:`1px solid ${on ? tool.color+"50" : "transparent"}`,
                color: on ? tool.color : "var(--text1)",
                textAlign:"left", transition:"all 0.15s",
                boxShadow: on ? `0 0 12px ${tool.color}18` : "none",
                animation:`fadeUp 0.3s ease ${i*0.04}s both`,
              }}>
              <span style={{ fontSize:15, flexShrink:0 }}>{tool.icon}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11, fontWeight:700,
                  fontFamily:"var(--font-display)" }}>{tool.label}</div>
                <div style={{ fontSize:9, color: on ? tool.color+"aa" : "var(--text2)",
                  marginTop:1, fontFamily:"var(--font-mono)" }}>{tool.desc}</div>
              </div>
              {on && <div style={{ width:5, height:5, borderRadius:"50%",
                background:tool.color, boxShadow:`0 0 6px ${tool.color}`, flexShrink:0 }} />}
            </button>
          );
        })}
      </div>
      {/* Active tool count */}
      <div style={{ padding:"10px 12px", borderTop:"1px solid var(--border)",
        fontFamily:"var(--font-mono)", fontSize:10, color:"var(--text2)",
        display:"flex", justifyContent:"space-between" }}>
        <span>PRIMED TOOLS</span>
        <span style={{ color: activeTools.length>0 ? "var(--sky)" : "var(--text2)",
          fontWeight:700 }}>{activeTools.length}/{AGENT_TOOLS.length}</span>
      </div>
    </aside>
  );
}

// ── Message Bubble ───────────────────────────────────────────
function Bubble({ msg }) {
  const user = msg.role==="user";
  return (
    <div style={{ display:"flex", flexDirection:user?"row-reverse":"row",
      gap:10, marginBottom:18, animation:"fadeUp 0.25s ease both" }}>
      <div style={{ width:30, height:30, borderRadius:"50%", flexShrink:0,
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:13,
        background: user
          ? "linear-gradient(135deg,#7c3aed,#4c1d95)"
          : "linear-gradient(135deg,rgba(56,189,248,0.15),rgba(6,10,16,0.8))",
        border: user ? "none" : "1px solid rgba(56,189,248,0.25)" }}>
        {user ? "👤" : "🛰️"}
      </div>
      <div style={{ maxWidth:"80%", minWidth:80 }}>
        {!user && msg.tools?.length>0 && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:6 }}>
            {msg.tools.map(t => {
              const def = AGENT_TOOLS.find(a=>a.id===t)||{color:"var(--sky)",icon:"⚡"};
              return (
                <span key={t} style={{ fontSize:9, fontWeight:700, letterSpacing:1,
                  color:def.color, background:`${def.color}12`,
                  border:`1px solid ${def.color}30`,
                  borderRadius:4, padding:"2px 7px",
                  fontFamily:"var(--font-mono)" }}>
                  {def.icon} {t.replace(/_/g," ").toUpperCase()}
                </span>
              );
            })}
          </div>
        )}
        <div style={{
          background: user
            ? "linear-gradient(135deg,rgba(124,58,237,0.22),rgba(91,33,182,0.15))"
            : "rgba(255,255,255,0.035)",
          border:`1px solid ${user?"rgba(124,58,237,0.3)":"var(--border)"}`,
          borderRadius: user ? "14px 3px 14px 14px" : "3px 14px 14px 14px",
          padding:"12px 16px",
          color:"var(--text0)", fontSize:13, lineHeight:1.75,
          whiteSpace:"pre-wrap", fontFamily:"var(--font-body)",
        }}>{msg.content}</div>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--text2)",
          marginTop:3, textAlign:user?"right":"left" }}>{msg.ts}</div>
      </div>
    </div>
  );
}

// ── COMMAND VIEW ─────────────────────────────────────────────
function CommandView({ messages, loading, input, setInput, onSend, activeTools }) {
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages, loading]);
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", padding:"20px 28px" }}>
        {messages.map((m,i) => <Bubble key={i} msg={m} />)}
        {loading && (
          <div style={{ display:"flex", gap:10, alignItems:"flex-start",
            animation:"fadeIn 0.2s ease" }}>
            <div style={{ width:30, height:30, borderRadius:"50%", flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:13, background:"linear-gradient(135deg,rgba(56,189,248,0.15),rgba(6,10,16,0.8))",
              border:"1px solid rgba(56,189,248,0.25)" }}>🛰️</div>
            <div style={{ background:"rgba(255,255,255,0.035)", border:"1px solid var(--border)",
              borderRadius:"3px 14px 14px 14px", padding:"14px 18px",
              display:"flex", gap:5, alignItems:"center" }}>
              {[0,1,2].map(i=>(
                <div key={i} style={{ width:7, height:7, borderRadius:"50%",
                  background:"var(--sky)", animation:`pulse 1.4s ease ${i*0.18}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Primed tools strip */}
      {activeTools.length>0 && (
        <div style={{ padding:"6px 28px", borderTop:"1px solid var(--border)",
          display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
          <span style={{ fontFamily:"var(--font-mono)", fontSize:9,
            color:"var(--text2)", letterSpacing:1 }}>PRIMED →</span>
          {activeTools.map(tid=>{
            const t = AGENT_TOOLS.find(x=>x.id===tid)||{};
            return (
              <span key={tid} style={{ fontSize:10, fontWeight:700,
                color:t.color, background:`${t.color}12`,
                border:`1px solid ${t.color}30`, borderRadius:20, padding:"3px 10px",
                fontFamily:"var(--font-display)" }}>
                {t.icon} {t.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Input bar */}
      <div style={{ padding:"14px 28px 16px",
        borderTop:"1px solid var(--border)",
        background:"rgba(6,10,16,0.85)", backdropFilter:"blur(12px)" }}>
        <div style={{ display:"flex", gap:10, alignItems:"flex-end",
          background:"rgba(255,255,255,0.04)",
          border:"1px solid rgba(56,189,248,0.2)",
          borderRadius:12, padding:"10px 14px",
          boxShadow:"0 0 0 0 transparent",
          transition:"border-color 0.2s, box-shadow 0.2s" }}
          onFocus={e=>e.currentTarget.style.borderColor="rgba(56,189,248,0.5)"}
          onBlur={e=>e.currentTarget.style.borderColor="rgba(56,189,248,0.2)"}>
          <textarea value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();onSend();}}}
            placeholder="Ask GeAIon — query EO datasets, interpret forecasts, detect anomalies, generate reports..."
            rows={2} style={{ flex:1, background:"transparent", border:"none", resize:"none",
              color:"var(--text0)", fontSize:13, lineHeight:1.65,
              fontFamily:"var(--font-body)" }} />
          <button onClick={onSend} disabled={loading||!input.trim()} style={{
            width:36, height:36, borderRadius:8, flexShrink:0,
            background: loading||!input.trim()
              ? "rgba(56,189,248,0.08)"
              : "linear-gradient(135deg,#0ea5e9,#38bdf8)",
            color: loading||!input.trim() ? "var(--text2)" : "#060a10",
            fontSize:16, fontWeight:700, transition:"all 0.2s",
            opacity: loading||!input.trim() ? 0.5 : 1,
          }}>↑</button>
        </div>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--text2)",
          textAlign:"center", marginTop:6 }}>
          ENTER to send · SHIFT+ENTER for newline · Toggle tools in sidebar to prime agent
        </div>
      </div>
    </div>
  );
}

// ── FORECAST VIEW ────────────────────────────────────────────
function ForecastView() {
  const days = ["D-2","D-1","NOW","D+1","D+2","D+3","D+4","D+5","D+6","D+7"];
  // Fake ensemble data
  const tempMean   = [12,13,16.4,17,16,14,12,11,13,15];
  const tempHi     = [14,15,18,19,18,16,14,13.5,15.5,17];
  const tempLo     = [10,11,14.8,15,14,12,10,8,11,13];

  const W=560, H=100, pad=30;
  const xScale = i => pad + (i/(days.length-1))*(W-2*pad);
  const yScale = v => H - pad - ((v-7)/(22-7))*(H-2*pad);

  const linePath = pts => pts.map((v,i)=>`${i===0?"M":"L"}${xScale(i)},${yScale(v)}`).join(" ");
  const bandPath = (hi,lo) => [
    ...hi.map((v,i)=>`${i===0?"M":"L"}${xScale(i)},${yScale(v)}`),
    ...[...lo].reverse().map((v,i)=>`L${xScale(lo.length-1-i)},${yScale(v)}`),
    "Z"
  ].join(" ");

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 28px" }}>
      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--text2)",
          letterSpacing:2, marginBottom:4 }}>MEDIUM RANGE FORECAST · ECMWF IFS + ENS(51)</div>
        <div style={{ fontFamily:"var(--font-display)", fontSize:24, fontWeight:800,
          color:"var(--text0)" }}>Operational Forecast Dashboard</div>
        <div style={{ display:"flex", gap:12, marginTop:8, flexWrap:"wrap" }}>
          {["ECMWF IFS 00Z","GFS 12Z","ENS 51-member","Copernicus C3S"].map(m=>(
            <span key={m} style={{ fontFamily:"var(--font-mono)", fontSize:10,
              color:"var(--sky)", background:"var(--sky-dim)",
              border:"1px solid rgba(56,189,248,0.2)", borderRadius:4, padding:"2px 8px" }}>{m}</span>
          ))}
        </div>
      </div>

      {/* Metric cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",
        gap:12, marginBottom:24 }}>
        {FORECAST_METRICS.map((m,i)=>(
          <div key={m.label} style={{
            background:"rgba(255,255,255,0.025)",
            border:`1px solid ${m.trendUp?"rgba(248,113,113,0.18)":"rgba(56,189,248,0.15)"}`,
            borderRadius:12, padding:"14px 16px",
            animation:`fadeUp 0.4s ease ${i*0.07}s both`,
            transition:"border-color 0.2s, background 0.2s",
          }}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(56,189,248,0.05)";}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.025)";}}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <span style={{ fontSize:18 }}>{m.icon}</span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:9, fontWeight:700,
                color: m.trendUp ? "var(--red)" : "var(--green)",
                background: m.trendUp ? "rgba(248,113,113,0.1)" : "rgba(52,211,153,0.1)",
                padding:"2px 7px", borderRadius:4 }}>{m.trend}</span>
            </div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:22, fontWeight:700,
              color:"var(--text0)" }}>
              {m.value}
              <span style={{ fontSize:11, fontWeight:400, color:"var(--text2)", marginLeft:3 }}>{m.unit}</span>
            </div>
            <div style={{ fontFamily:"var(--font-display)", fontSize:11, color:"var(--text1)",
              marginTop:4 }}>{m.label}</div>
            <ConfBar value={m.conf} color={m.trendUp?"var(--red)":"var(--sky)"} />
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--text2)" }}>CONF</span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--text1)" }}>{m.conf}% · σ±{m.ens_spread}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Ensemble temperature chart */}
      <div style={{ background:"rgba(255,255,255,0.025)",
        border:"1px solid var(--border)", borderRadius:14, padding:"20px 24px",
        marginBottom:16 }}>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:9, letterSpacing:2,
          color:"var(--text2)", marginBottom:16 }}>
          10-DAY TEMPERATURE ENSEMBLE · 51 MEMBERS · ECMWF IFS
        </div>
        <div style={{ overflowX:"auto" }}>
          <svg width={W} height={H+10} viewBox={`0 0 ${W} ${H+10}`} style={{ minWidth:W }}>
            <defs>
              <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f87171" stopOpacity="0.25"/>
                <stop offset="100%" stopColor="#f87171" stopOpacity="0"/>
              </linearGradient>
            </defs>
            {/* Y gridlines */}
            {[8,12,16,20].map(v=>(
              <g key={v}>
                <line x1={pad} y1={yScale(v)} x2={W-pad} y2={yScale(v)}
                  stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
                <text x={pad-4} y={yScale(v)+4} fill="#4a6a80"
                  fontSize="9" fontFamily="JetBrains Mono" textAnchor="end">{v}°</text>
              </g>
            ))}
            {/* NOW line */}
            <line x1={xScale(2)} y1={0} x2={xScale(2)} y2={H}
              stroke="rgba(251,191,36,0.5)" strokeWidth="1.5" strokeDasharray="5,3"/>
            <text x={xScale(2)+4} y={14} fill="#fbbf24"
              fontSize="9" fontFamily="JetBrains Mono">NOW</text>
            {/* Ensemble spread */}
            <path d={bandPath(tempHi,tempLo)} fill="url(#tempGrad)"/>
            <path d={linePath(tempHi)} fill="none" stroke="rgba(248,113,113,0.3)" strokeWidth="1" strokeDasharray="3,2"/>
            <path d={linePath(tempLo)} fill="none" stroke="rgba(56,189,248,0.3)" strokeWidth="1" strokeDasharray="3,2"/>
            {/* Mean */}
            <path d={linePath(tempMean)} fill="none" stroke="#f87171" strokeWidth="2.5"
              strokeLinejoin="round" strokeLinecap="round"/>
            {/* Points */}
            {tempMean.map((v,i)=>(
              <circle key={i} cx={xScale(i)} cy={yScale(v)} r={i===2?4:2.5}
                fill={i===2?"#fbbf24":"#f87171"}
                stroke={i===2?"rgba(251,191,36,0.3)":"none"} strokeWidth={i===2?6:0}/>
            ))}
            {/* X labels */}
            {days.map((d,i)=>(
              <text key={d} x={xScale(i)} y={H+8} fill={d==="NOW"?"#fbbf24":"#4a6a80"}
                fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle"
                fontWeight={d==="NOW"?700:400}>{d}</text>
            ))}
          </svg>
        </div>
      </div>

      {/* AI interpretation box */}
      <div style={{ background:"rgba(52,211,153,0.05)",
        border:"1px solid rgba(52,211,153,0.2)", borderRadius:12, padding:"16px 20px",
        display:"flex", gap:14 }}>
        <div style={{ fontSize:20, flexShrink:0 }}>🤖</div>
        <div>
          <div style={{ fontFamily:"var(--font-display)", fontSize:11, fontWeight:800,
            color:"#34d399", letterSpacing:1, marginBottom:6 }}>GeAIon FORECAST INTERPRETATION</div>
          <div style={{ fontFamily:"var(--font-body)", fontSize:12, color:"var(--text1)",
            lineHeight:1.7 }}>
            Model ensemble shows <strong style={{color:"var(--text0)"}}>high deterministic skill (ACC &gt;0.9)</strong> through T+72h.
            Ensemble spread narrows over Eastern Mediterranean due to strong synoptic forcing.
            After D+5, divergence in upper-level trough positioning introduces <strong style={{color:"var(--amber)"}}>significant uncertainty</strong> for precipitation. 
            GFS indicates 15% probability of a secondary cyclogenesis event in the Ionian by T+120h — not captured by ECMWF deterministic. 
            Recommend ensemble-based decision threshold rather than deterministic for &gt;D+5 planning.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SOURCES VIEW ─────────────────────────────────────────────
function SourcesView() {
  const archLayers = [
    { layer:"Ingestion",   tech:"STAC 1.0 API · COG · Zarr",             color:"var(--sky)" },
    { layer:"Processing",  tech:"xarray · Dask · GDAL · rasterio",        color:"var(--purple)" },
    { layer:"Analytics",   tech:"DuckDB · Parquet · PostGIS · InfluxDB",   color:"var(--green)" },
    { layer:"Serving",     tech:"OGC WMS/WCS · EDR API · gRPC · REST",     color:"var(--amber)" },
  ];
  return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 28px" }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--text2)",
          letterSpacing:2, marginBottom:4 }}>DATA INGESTION & STORAGE LAYER</div>
        <div style={{ fontFamily:"var(--font-display)", fontSize:24, fontWeight:800,
          color:"var(--text0)" }}>Active Data Sources</div>
      </div>

      {/* Source table */}
      <div style={{ background:"rgba(255,255,255,0.025)", border:"1px solid var(--border)",
        borderRadius:14, overflow:"hidden", marginBottom:20 }}>
        <div style={{ display:"grid",
          gridTemplateColumns:"1fr 100px 80px 70px 60px 80px",
          padding:"8px 16px",
          background:"rgba(56,189,248,0.05)",
          borderBottom:"1px solid var(--border)",
          fontFamily:"var(--font-mono)", fontSize:9, color:"var(--text2)",
          letterSpacing:1 }}>
          {["SOURCE","TYPE","FREQ","RES","STATUS","PROVIDER"].map(h=>(
            <span key={h}>{h}</span>
          ))}
        </div>
        {DATA_SOURCES.map((s,i)=>(
          <div key={s.id} style={{
            display:"grid", gridTemplateColumns:"1fr 100px 80px 70px 60px 80px",
            padding:"10px 16px", borderBottom: i<DATA_SOURCES.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            animation:`slideR 0.3s ease ${i*0.05}s both`,
            transition:"background 0.15s",
          }}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(56,189,248,0.04)"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <Dot color={s.status==="live"?"#34d399":"#fbbf24"} pulse={s.status==="live"} />
              <span style={{ fontFamily:"var(--font-display)", fontSize:12,
                fontWeight:600, color:"var(--text0)" }}>{s.name}</span>
            </div>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:10,
              color:"var(--text1)", alignSelf:"center" }}>{s.type}</span>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:10,
              color:"var(--text1)", alignSelf:"center" }}>{s.freq}</span>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:10,
              color:"var(--sky)", alignSelf:"center" }}>{s.res}</span>
            <span style={{
              fontFamily:"var(--font-mono)", fontSize:9, fontWeight:700,
              color: s.status==="live"?"#34d399":"#fbbf24",
              background: s.status==="live"?"rgba(52,211,153,0.1)":"rgba(251,191,36,0.1)",
              border: `1px solid ${s.status==="live"?"rgba(52,211,153,0.2)":"rgba(251,191,36,0.2)"}`,
              borderRadius:4, padding:"2px 7px",
              alignSelf:"center", textTransform:"uppercase",
            }}>{s.status}</span>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:10,
              color:"var(--text2)", alignSelf:"center" }}>{s.provider}</span>
          </div>
        ))}
      </div>

      {/* Architecture */}
      <div style={{ background:"rgba(255,255,255,0.025)",
        border:"1px solid var(--border)", borderRadius:14, padding:"20px 24px" }}>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:9, letterSpacing:2,
          color:"var(--text2)", marginBottom:16 }}>STORAGE ARCHITECTURE</div>
        <div style={{ display:"flex", gap:0, position:"relative" }}>
          <div style={{ position:"absolute", top:"50%", left:16, right:16, height:2,
            background:"linear-gradient(90deg,var(--sky),var(--purple),var(--green),var(--amber))",
            opacity:0.2, zIndex:0 }} />
          {archLayers.map((l,i)=>(
            <div key={l.layer} style={{
              flex:1, position:"relative", zIndex:1, padding:"0 8px",
              animation:`fadeUp 0.4s ease ${i*0.1}s both`,
            }}>
              <div style={{ background:"var(--bg2)", border:`1px solid ${l.color}30`,
                borderRadius:10, padding:"14px 12px", textAlign:"center" }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:l.color,
                  boxShadow:`0 0 10px ${l.color}`, margin:"0 auto 8px" }} />
                <div style={{ fontFamily:"var(--font-display)", fontSize:11, fontWeight:800,
                  color:l.color, marginBottom:4 }}>{l.layer}</div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--text2)",
                  lineHeight:1.5 }}>{l.tech}</div>
              </div>
              {i<archLayers.length-1 && (
                <div style={{ position:"absolute", right:-8, top:"50%",
                  transform:"translateY(-50%)",
                  fontFamily:"var(--font-mono)", fontSize:14, color:"var(--text2)",
                  zIndex:2 }}>→</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── ALERTS VIEW ──────────────────────────────────────────────
function AlertsView() {
  const [dismissed, setDismissed] = useState([]);
  const [newAlert, setNewAlert] = useState(null);

  const severityStyle = (s) => ({
    critical: { color:"var(--red)", bg:"rgba(248,113,113,0.08)", border:"rgba(248,113,113,0.3)" },
    warning:  { color:"var(--amber)", bg:"rgba(251,191,36,0.08)", border:"rgba(251,191,36,0.3)" },
    info:     { color:"var(--sky)", bg:"rgba(56,189,248,0.08)", border:"rgba(56,189,248,0.25)" },
  }[s]);

  const active = ALERT_PRESETS.filter(a=>!dismissed.includes(a.id));

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 28px" }}>
      <div style={{ marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
        <div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--text2)",
            letterSpacing:2, marginBottom:4 }}>ACTIVE ALERT MONITORING</div>
          <div style={{ fontFamily:"var(--font-display)", fontSize:24, fontWeight:800,
            color:"var(--text0)" }}>Alert Center</div>
        </div>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--text2)" }}>
          {active.length} active · {dismissed.length} dismissed
        </div>
      </div>

      {/* Alert cards */}
      <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:24 }}>
        {active.map((a,i)=>{
          const st = severityStyle(a.severity);
          return (
            <div key={a.id} style={{
              background:st.bg, border:`1px solid ${st.border}`,
              borderRadius:12, padding:"16px 20px",
              display:"flex", alignItems:"center", gap:16,
              animation:`alertPop 0.3s ease ${i*0.1}s both`,
            }}>
              <div style={{ fontSize:24, flexShrink:0 }}>{a.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:9, fontWeight:700,
                    color:st.color, background:`${st.border}`,
                    border:`1px solid ${st.border}`, borderRadius:4,
                    padding:"1px 7px", textTransform:"uppercase",
                    letterSpacing:1 }}>{a.severity}</span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:9,
                    color:"var(--text2)" }}>{a.time}</span>
                </div>
                <div style={{ fontFamily:"var(--font-display)", fontSize:14, fontWeight:700,
                  color:st.color, marginBottom:2 }}>{a.type}</div>
                <div style={{ fontFamily:"var(--font-body)", fontSize:12, color:"var(--text1)" }}>
                  <strong>{a.region}</strong> · {a.value}
                </div>
              </div>
              <button onClick={()=>setDismissed(p=>[...p,a.id])} style={{
                padding:"5px 12px", borderRadius:6, border:"1px solid rgba(255,255,255,0.1)",
                color:"var(--text2)", fontSize:11, background:"transparent",
                fontFamily:"var(--font-mono)",
                transition:"all 0.15s",
              }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.3)";e.currentTarget.style.color="var(--text0)";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";e.currentTarget.style.color="var(--text2)";}}>
                DISMISS
              </button>
            </div>
          );
        })}
        {active.length===0 && (
          <div style={{ textAlign:"center", padding:"40px 0",
            fontFamily:"var(--font-mono)", fontSize:13, color:"var(--text2)" }}>
            <div style={{ fontSize:32, marginBottom:8 }}>✅</div>
            All alerts dismissed. System nominal.
          </div>
        )}
      </div>

      {/* Alert threshold config */}
      <div style={{ background:"rgba(255,255,255,0.025)",
        border:"1px solid var(--border)", borderRadius:14, padding:"20px 24px" }}>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:9, letterSpacing:2,
          color:"var(--text2)", marginBottom:16 }}>CONFIGURED ALERT THRESHOLDS</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:10 }}>
          {[
            { var:"Total Precipitation",  thresh:"≥40mm/24h",  unit:"mm", color:"var(--sky)" },
            { var:"Wind Gust",            thresh:"≥25 m/s",    unit:"m/s",color:"var(--amber)" },
            { var:"NDVI Anomaly",         thresh:"< -0.15 vs clim", unit:"", color:"var(--green)" },
            { var:"SST Anomaly",          thresh:"≥2σ vs 1991-2020", unit:"", color:"var(--red)" },
            { var:"MSLP Tendency",        thresh:"≥6 hPa/3h",  unit:"hPa",color:"var(--purple)" },
            { var:"SAR Flood Detection",  thresh:"IW change >0.3 dB",unit:"", color:"var(--sky)" },
          ].map(t=>(
            <div key={t.var} style={{ padding:"10px 12px",
              background:"rgba(255,255,255,0.025)",
              border:`1px solid ${t.color}20`, borderRadius:8,
              display:"flex", gap:8, alignItems:"center" }}>
              <Dot color={t.color} />
              <div>
                <div style={{ fontFamily:"var(--font-display)", fontSize:11,
                  fontWeight:700, color:t.color }}>{t.var}</div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:10,
                  color:"var(--text2)" }}>{t.thresh}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── REPORTS VIEW ─────────────────────────────────────────────
function ReportsView({ onGenerateReport }) {
  const [generating, setGenerating] = useState(null);
  const [generated, setGenerated] = useState([]);

  const templates = [
    { id:"met_bulletin", title:"Meteorological Bulletin",  desc:"ECMWF + GFS synthesis for operational forecasting", icon:"🌦️", color:"var(--sky)" },
    { id:"eo_summary",   title:"EO Data Summary",          desc:"Satellite acquisition status + cloud cover analysis", icon:"🛰️", color:"var(--purple)" },
    { id:"anomaly_rep",  title:"Anomaly Detection Report", desc:"SST, NDVI, precipitation anomalies vs climatology", icon:"🔍", color:"var(--amber)" },
    { id:"disaster",     title:"Disaster Impact Assessment",desc:"Flood extent from SAR + humanitarian exposure", icon:"⛑️", color:"var(--red)" },
    { id:"climate",      title:"Climate Monitoring Report", desc:"Monthly/seasonal departure from 1991-2020 baseline", icon:"📈", color:"var(--green)" },
    { id:"maritime",     title:"Maritime Forecast Package", desc:"Wave, wind, SST bulletin for sea operations", icon:"⛵", color:"#06b6d4" },
  ];

  const handleGenerate = async (t) => {
    setGenerating(t.id);
    await new Promise(r=>setTimeout(r,1800));
    setGenerated(p=>[...p,{...t, ts:ts(), status:"ready"}]);
    setGenerating(null);
    if(onGenerateReport) onGenerateReport(t.title);
  };

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 28px" }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--text2)",
          letterSpacing:2, marginBottom:4 }}>AUTOMATED REPORT GENERATION</div>
        <div style={{ fontFamily:"var(--font-display)", fontSize:24, fontWeight:800,
          color:"var(--text0)" }}>Report Templates</div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",
        gap:14, marginBottom:24 }}>
        {templates.map((t,i)=>{
          const isGen = generating===t.id;
          const isDone = generated.find(g=>g.id===t.id);
          return (
            <div key={t.id} style={{
              background:"rgba(255,255,255,0.025)",
              border:`1px solid ${isDone?t.color+"50":"var(--border)"}`,
              borderRadius:14, padding:"18px 20px",
              animation:`fadeUp 0.35s ease ${i*0.07}s both`,
              transition:"border-color 0.2s",
            }}
              onMouseEnter={e=>!isDone&&(e.currentTarget.style.borderColor=`${t.color}40`)}
              onMouseLeave={e=>!isDone&&(e.currentTarget.style.borderColor="var(--border)")}>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"flex-start", marginBottom:10 }}>
                <span style={{ fontSize:24 }}>{t.icon}</span>
                {isDone && (
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:9,
                    color:"var(--green)", background:"rgba(52,211,153,0.1)",
                    border:"1px solid rgba(52,211,153,0.2)",
                    borderRadius:4, padding:"2px 7px" }}>✓ READY</span>
                )}
              </div>
              <div style={{ fontFamily:"var(--font-display)", fontSize:13,
                fontWeight:800, color:t.color, marginBottom:4 }}>{t.title}</div>
              <div style={{ fontFamily:"var(--font-body)", fontSize:11,
                color:"var(--text2)", lineHeight:1.6, marginBottom:14 }}>{t.desc}</div>
              <button onClick={()=>handleGenerate(t)} disabled={isGen||!!isDone} style={{
                width:"100%", padding:"8px 0", borderRadius:8,
                background: isGen ? "rgba(255,255,255,0.05)"
                  : isDone ? `${t.color}15` : `${t.color}18`,
                border:`1px solid ${isGen?"rgba(255,255,255,0.1)":t.color+"40"}`,
                color: isDone ? t.color : isGen ? "var(--text2)" : t.color,
                fontFamily:"var(--font-display)", fontSize:11, fontWeight:700,
                letterSpacing:1, transition:"all 0.15s",
                cursor: isGen||isDone ? "not-allowed" : "pointer",
              }}>
                {isGen ? (
                  <span style={{ display:"flex", alignItems:"center",
                    justifyContent:"center", gap:6 }}>
                    <div style={{ width:10, height:10, borderRadius:"50%",
                      border:`2px solid ${t.color}`, borderTopColor:"transparent",
                      animation:"spin 0.8s linear infinite" }} />
                    GENERATING...
                  </span>
                ) : isDone ? "DOWNLOAD REPORT" : "GENERATE REPORT"}
              </button>
            </div>
          );
        })}
      </div>

      {generated.length>0 && (
        <div style={{ background:"rgba(52,211,153,0.05)",
          border:"1px solid rgba(52,211,153,0.2)", borderRadius:12, padding:"16px 20px" }}>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:9, letterSpacing:2,
            color:"#34d399", marginBottom:10 }}>GENERATED REPORTS</div>
          {generated.map(g=>(
            <div key={g.id+g.ts} style={{ display:"flex", alignItems:"center", gap:10,
              padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
              <span>{g.icon}</span>
              <span style={{ fontFamily:"var(--font-display)", fontSize:12,
                fontWeight:700, color:"var(--text0)", flex:1 }}>{g.title}</span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:10,
                color:"var(--text2)" }}>{g.ts}</span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"#34d399",
                padding:"2px 8px", background:"rgba(52,211,153,0.1)",
                border:"1px solid rgba(52,211,153,0.2)", borderRadius:4 }}>PDF</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ROOT APP ─────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("COMMAND");
  const [messages, setMessages] = useState([{
    role:"assistant",
    content:`GeAIon online and fully operational.\n\nI'm your Geospatial AI Intelligence Assistant, configured for:\n• 🛰️  Satellite EO: Sentinel-1 SAR, Sentinel-2, Landsat-9, MODIS\n• 🌦️  NWP Models: ECMWF IFS (det + 51-member ensemble), NOAA GFS\n• 🔍  Use cases: Research · Operational Forecasting · Climate Monitoring · Disaster Response\n\nAll agent capabilities are available. Toggle tools in the sidebar to prime specific workflows, or ask me anything directly.\n\nWhat would you like to analyze?`,
    tools:[], ts:ts(),
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTools, setActiveTools] = useState([]);
  const historyRef = useRef([]);

  const toggleTool = (id) =>
    setActiveTools(p => p.includes(id) ? p.filter(t=>t!==id) : [...p,id]);

  const alertCount = ALERT_PRESETS.length;

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    setLoading(true);

    const userMsg = { role:"user", content:text, tools:[], ts:ts() };
    setMessages(p=>[...p,userMsg]);
    historyRef.current.push({ role:"user", content:text });

    const toolCtx = activeTools.length
      ? `\n\n[ACTIVE TOOL PRIMING: ${activeTools.join(", ")}] — Prefer invoking these in your response.`
      : "";

    const sysPrompt = SYSTEM_PROMPT + toolCtx +
      `\n\n[LIVE FORECAST STATE — ECMWF IFS T+0 ref]:\n` +
      FORECAST_METRICS.map(m=>`${m.label}: ${m.value}${m.unit} (Δ${m.trend}, ens spread ±${m.ens_spread}, conf ${m.conf}%)`).join("\n") +
      `\n\n[DATA SOURCE STATUS]:\n` +
      DATA_SOURCES.map(s=>`${s.name} (${s.type}): ${s.status}, freq=${s.freq}, res=${s.res}`).join("\n") +
      `\n\n[ACTIVE ALERTS]:\n` +
      ALERT_PRESETS.map(a=>`[${a.severity.toUpperCase()}] ${a.type} — ${a.region} — ${a.value} @ ${a.time}`).join("\n");

    try {
      const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "";
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          ...(ANTHROPIC_KEY && { "x-api-key": ANTHROPIC_KEY }),
        },
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          system:sysPrompt,
          messages:historyRef.current,
        }),
      });
      const data = await res.json();
      const reply = data.content?.map(b=>b.text||"").join("\n") || "⚠️ No response.";

      const usedTools = AGENT_TOOLS
        .filter(t=>reply.toLowerCase().includes(t.label.toLowerCase()) ||
                   reply.toLowerCase().includes(t.id.replace(/_/g," ")))
        .map(t=>t.id);

      historyRef.current.push({ role:"assistant", content:reply });
      setMessages(p=>[...p,{ role:"assistant", content:reply, tools:usedTools, ts:ts() }]);
    } catch(err) {
      setMessages(p=>[...p,{ role:"assistant",
        content:`⚠️ Connection error: ${err.message}`, tools:[], ts:ts() }]);
    }
    setLoading(false);
  }, [input, loading, activeTools]);

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <DeepSpaceBG />
      <div style={{ position:"relative", zIndex:5, height:"100vh",
        display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <Header activeView={view} setActiveView={setView} alertCount={alertCount} />
        <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
          {(view==="COMMAND") && <Sidebar activeTools={activeTools} toggleTool={toggleTool} />}
          {view==="COMMAND" && (
            <CommandView messages={messages} loading={loading}
              input={input} setInput={setInput} onSend={sendMessage}
              activeTools={activeTools} />
          )}
          {view==="FORECAST" && <ForecastView />}
          {view==="SOURCES"  && <SourcesView />}
          {view==="ALERTS"   && <AlertsView />}
          {view==="REPORTS"  && <ReportsView onGenerateReport={title=>{
            setMessages(p=>[...p,{
              role:"assistant",
              content:`📋 Report generated: "${title}"\n\n[🔧 TOOL] generate_report invoked\n[📡 DATA] Aggregating from ECMWF IFS, GFS, active EO sources\n[📊 ANALYSIS] Report compiled with current forecast state and active alert context\n[💬 INTERPRETATION] Your ${title} has been generated and is ready for download.\n[⚡ ACTION] PDF available in the Reports panel. Consider scheduling automated delivery every 6h to coincide with model update cycles.`,
              tools:["generate_report"], ts:ts(),
            }]);
            setView("COMMAND");
          }} />}
        </div>
      </div>
    </>
  );
}
