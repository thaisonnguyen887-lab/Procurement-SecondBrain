import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Search, ChevronRight, ChevronDown, BookOpen, Layers, Truck, FileText, Link2, ArrowLeft, BarChart3, CheckCircle2, Clock, AlertCircle, Brain, Map, Zap, Shield, TrendingUp, Target, Users, DollarSign, Package, Lightbulb, Briefcase, Network, Warehouse, Grid3x3, PlayCircle, GraduationCap, FileOutput, Pencil, Plus, Trash2, X, Save, Download, Upload, Loader2, ShieldCheck, BookMarked, RotateCcw, Menu } from "lucide-react";
import * as d3 from "d3";

/* ============================================================
   CONFIG
   ============================================================ */
const KB_KEY = "procurement-kb-v1";

const STATUS_CONFIG = {
  complete: { label: "Complete", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
  "in-progress": { label: "In Progress", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  draft: { label: "Draft", color: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB" }
};

const TIER = {
  verified: { label: "Verified", color: "#065F46", bg: "#ECFDF5", border: "#A7F3D0", I: ShieldCheck, short: "V",
    desc: "Có nguồn học thuật hoặc tổ chức chuẩn xác thực được. Dùng trực tiếp cho dự án thật." },
  derived: { label: "Derived", color: "#92400E", bg: "#FFFBEB", border: "#FDE68A", I: BookMarked, short: "D",
    desc: "Đúng tinh thần framework ngành nhưng diễn đạt lại, một số tham số do tôi đặt. Nên đối chiếu tài liệu gốc trước khi dùng làm chuẩn chính thức." },
  authored: { label: "Authored", color: "#5B21B6", bg: "#FAF5FF", border: "#E9D5FF", I: Pencil, short: "A",
    desc: "Do tôi tự thiết kế, không phải chuẩn của tổ chức nào. Hợp lý về logic nghiệp vụ nhưng cần hiệu chỉnh theo thực tế doanh nghiệp." }
};

const ICON_MAP = { Target, BarChart3, Layers, Users, FileText, Zap, DollarSign, Shield, TrendingUp, Brain, Truck, Map, Package, Search, Warehouse, Grid3x3, BookOpen, Network, RotateCcw };
const ICON_NAMES = Object.keys(ICON_MAP);
const Ico = ({ n, s = 16, ...p }) => { const C = ICON_MAP[n] || BookOpen; return <C size={s} {...p} />; };

const flatten = (kb) => {
  const out = [];
  Object.values(kb || {}).forEach(d => Object.values(d.children || {}).forEach(n =>
    out.push({ ...n, domain: d.id, domainTitle: d.title, domainColor: d.color })));
  return out;
};

const uid = (t) => t.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `fn-${Date.now()}`;

/* ============================================================
   MARKDOWN RENDERER
   ============================================================ */
function Markdown({ text }) {
  if (!text) return null;
  const lines = text.split("\n");
  const out = [];
  let tbl = null;
  const flush = (k) => {
    if (!tbl) return;
    out.push(
      <div key={k} className="my-2.5 rounded-md border border-[#E5E7EB] overflow-hidden">
        <div className="flex bg-[#F9FAFB]">{tbl.head.map((h, j) => <div key={j} className="flex-1 px-2.5 py-1.5 text-[11px] font-semibold text-[#374151] border-r border-[#E5E7EB] last:border-0">{h.trim().replace(/\*\*/g, "")}</div>)}</div>
        {tbl.rows.map((r, j) => <div key={j} className="flex border-t border-[#E5E7EB]">{r.map((c, k2) => <div key={k2} className="flex-1 px-2.5 py-1.5 text-[12px] text-[#4B5563] border-r border-[#E5E7EB] last:border-0">{c.trim().replace(/\*\*/g, "")}</div>)}</div>)}
      </div>
    );
    tbl = null;
  };
  lines.forEach((ln, i) => {
    if (ln.trim().startsWith("|")) {
      const cells = ln.split("|").filter(c => c.trim() !== "");
      if (cells.every(c => /^[-:\s]+$/.test(c))) return;
      if (!tbl) tbl = { head: cells, rows: [] }; else tbl.rows.push(cells);
      return;
    }
    flush(`t${i}`);
    if (ln.startsWith("## ")) out.push(<h2 key={i} className="text-[14px] font-semibold text-[#111827] mt-4 mb-1.5 pb-1 border-b border-[#F3F4F6]">{ln.slice(3)}</h2>);
    else if (ln.startsWith("### ")) out.push(<h3 key={i} className="text-[13px] font-semibold text-[#374151] mt-3 mb-1">{ln.slice(4)}</h3>);
    else if (ln.startsWith("**") && ln.trim().endsWith("**")) out.push(<p key={i} className="text-[12.5px] font-semibold text-[#111827] mt-2 mb-0.5">{ln.replace(/\*\*/g, "")}</p>);
    else if (ln.startsWith("**")) { const p = ln.split("**").filter(Boolean); out.push(<p key={i} className="text-[12.5px] text-[#4B5563] leading-[1.65] my-0.5"><b className="text-[#111827]">{p[0]}</b>{p.slice(1).join("")}</p>); }
    else if (/^\d+\.\s/.test(ln.trim())) out.push(<p key={i} className="text-[12.5px] text-[#4B5563] ml-2.5 my-0.5 leading-[1.65]">{ln}</p>);
    else if (ln.trim() === "") out.push(<div key={i} className="h-1.5" />);
    else out.push(<p key={i} className="text-[12.5px] text-[#4B5563] leading-[1.65] my-0.5">{ln.replace(/\*\*/g, "")}</p>);
  });
  flush("tend");
  return <>{out}</>;
}

/* ============================================================
   FULL-TEXT SEARCH
   ============================================================ */
function searchKB(notes, q) {
  if (!q || q.trim().length < 2) return [];
  const s = q.toLowerCase().trim();
  const hits = [];
  const snip = (txt) => {
    const i = txt.toLowerCase().indexOf(s);
    if (i < 0) return null;
    const a = Math.max(0, i - 45), b = Math.min(txt.length, i + s.length + 55);
    return (a > 0 ? "…" : "") + txt.slice(a, b).replace(/\n/g, " ") + (b < txt.length ? "…" : "");
  };
  notes.forEach(n => {
    const found = [];
    if (n.title.toLowerCase().includes(s)) found.push({ where: "Title", sub: "knowledge", text: n.title });
    if (n.summary?.toLowerCase().includes(s)) found.push({ where: "Summary", sub: "knowledge", text: snip(n.summary) });
    (n.tags || []).forEach(t => { if (t.toLowerCase().includes(s)) found.push({ where: "Tag", sub: "knowledge", text: `#${t}` }); });
    if (n.content?.toLowerCase().includes(s)) found.push({ where: "Framework", sub: "knowledge", text: snip(n.content) });
    (n.guidelines || []).forEach(g => { if (g.toLowerCase().includes(s)) found.push({ where: "Guideline", sub: "knowledge", text: snip(g) }); });
    if (n.caseStudy) {
      const cs = `${n.caseStudy.title} ${n.caseStudy.content}`;
      if (cs.toLowerCase().includes(s)) found.push({ where: "Case Study", sub: "knowledge", text: snip(cs) });
    }
    const ex = n.execution;
    if (ex) {
      if (ex.objective?.toLowerCase().includes(s)) found.push({ where: "Objective", sub: "execution", text: snip(ex.objective) });
      (ex.prerequisites || []).forEach(p => { if (p.toLowerCase().includes(s)) found.push({ where: "Prerequisite", sub: "execution", text: p }); });
      (ex.phases || []).forEach(ph => {
        if (ph.name?.toLowerCase().includes(s)) found.push({ where: "Phase", sub: "execution", text: ph.name });
        (ph.steps || []).forEach(st => {
          const all = `${st.title} ${st.desc} ${st.output}`;
          if (all.toLowerCase().includes(s)) found.push({ where: `Step · ${ph.name}`, sub: "execution", text: snip(all) });
        });
      });
      (ex.risks || []).forEach(r => { if (r.toLowerCase().includes(s)) found.push({ where: "Risk", sub: "execution", text: snip(r) }); });
    }
    if (found.length) hits.push({ note: n, matches: found.slice(0, 4), count: found.length });
  });
  return hits.sort((a, b) => b.count - a.count).slice(0, 12);
}

function Highlight({ text, q }) {
  if (!text) return null;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark className="bg-[#FEF08A] text-[#111827] rounded px-0.5">{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

/* ============================================================
   EDITOR PRIMITIVES
   ============================================================ */
const Fld = ({ label, children }) => (
  <div className="mb-3">
    <label className="block text-[10.5px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1">{label}</label>
    {children}
  </div>
);
const inp = "w-full px-2.5 py-1.5 text-[12.5px] rounded-md border border-[#D1D5DB] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE] text-[#111827]";
const ta = inp + " resize-y leading-[1.6] font-mono";

function ListEditor({ items, onChange, placeholder, rows = 2 }) {
  return (
    <div className="space-y-1.5">
      {(items || []).map((v, i) => (
        <div key={i} className="flex gap-1.5 items-start">
          <span className="text-[10px] font-mono text-[#9CA3AF] mt-2 w-4 shrink-0">{String(i + 1).padStart(2, "0")}</span>
          <textarea value={v} rows={rows} placeholder={placeholder}
            onChange={e => { const c = [...items]; c[i] = e.target.value; onChange(c); }}
            className={inp + " resize-y leading-[1.55]"} />
          <button onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="mt-1.5 p-1 rounded text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEF2F2] shrink-0"><Trash2 size={13} /></button>
        </div>
      ))}
      <button onClick={() => onChange([...(items || []), ""])}
        className="flex items-center gap-1 text-[11.5px] text-[#2563EB] hover:text-[#1D4ED8] font-medium px-1"><Plus size={12} />Thêm dòng</button>
    </div>
  );
}

function Modal({ title, onClose, onSave, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,17,21,.55)" }} onClick={onClose}>
      <div className={`bg-white rounded-xl shadow-2xl flex flex-col ${wide ? "max-w-3xl" : "max-w-xl"} w-full max-h-[88vh]`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#E5E7EB] shrink-0">
          <h3 className="text-[13.5px] font-semibold text-[#111827]">{title}</h3>
          <button onClick={onClose} className="p-1 rounded text-[#9CA3AF] hover:bg-[#F3F4F6]"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">{children}</div>
        <div className="flex justify-end gap-2 px-4 py-2.5 border-t border-[#E5E7EB] shrink-0">
          <button onClick={onClose} className="px-3 py-1.5 text-[12.5px] rounded-md border border-[#D1D5DB] text-[#4B5563] hover:bg-[#F9FAFB]">Hủy</button>
          <button onClick={onSave} className="px-3 py-1.5 text-[12.5px] rounded-md bg-[#2563EB] text-white hover:bg-[#1D4ED8] font-medium flex items-center gap-1.5"><Save size={13} />Lưu</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   EXECUTION EDITOR
   ============================================================ */
function ExecEditor({ value, onChange }) {
  const ex = value || { objective: "", prerequisites: [], phases: [], risks: [] };
  const set = (k, v) => onChange({ ...ex, [k]: v });
  const setPhase = (pi, k, v) => { const p = [...ex.phases]; p[pi] = { ...p[pi], [k]: v }; set("phases", p); };
  const setStep = (pi, si, k, v) => { const p = [...ex.phases]; const st = [...p[pi].steps]; st[si] = { ...st[si], [k]: v }; p[pi] = { ...p[pi], steps: st }; set("phases", p); };

  return (
    <>
      <Fld label="Objective"><textarea rows={2} value={ex.objective} onChange={e => set("objective", e.target.value)} className={inp + " resize-y leading-[1.6]"} /></Fld>
      <Fld label="Prerequisites"><ListEditor items={ex.prerequisites} onChange={v => set("prerequisites", v)} rows={1} placeholder="Điều kiện cần có" /></Fld>

      <div className="mb-3">
        <label className="block text-[10.5px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1.5">Phases &amp; Steps</label>
        <div className="space-y-2.5">
          {(ex.phases || []).map((ph, pi) => (
            <div key={pi} className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-2.5">
              <div className="flex gap-1.5 mb-2">
                <span className="w-5 h-5 rounded bg-[#2563EB] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-1">{pi + 1}</span>
                <input value={ph.name} placeholder="Tên phase" onChange={e => setPhase(pi, "name", e.target.value)} className={inp + " flex-1"} />
                <input value={ph.duration || ""} placeholder="Thời lượng" onChange={e => setPhase(pi, "duration", e.target.value)} className={inp + " w-28"} />
                <button onClick={() => set("phases", ex.phases.filter((_, j) => j !== pi))} className="p-1 rounded text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEF2F2]"><Trash2 size={13} /></button>
              </div>
              <div className="ml-6 space-y-2">
                {(ph.steps || []).map((st, si) => (
                  <div key={si} className="rounded-md border border-[#E5E7EB] bg-white p-2">
                    <div className="flex gap-1.5 mb-1.5">
                      <span className="text-[10px] font-mono text-[#9CA3AF] mt-2 shrink-0">{pi + 1}.{si + 1}</span>
                      <input value={st.title} placeholder="Tên bước" onChange={e => setStep(pi, si, "title", e.target.value)} className={inp + " flex-1 font-medium"} />
                      <button onClick={() => setPhase(pi, "steps", ph.steps.filter((_, j) => j !== si))} className="p-1 rounded text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEF2F2]"><Trash2 size={12} /></button>
                    </div>
                    <textarea rows={2} value={st.desc} placeholder="Mô tả cách làm" onChange={e => setStep(pi, si, "desc", e.target.value)} className={inp + " resize-y leading-[1.55] mb-1.5"} />
                    <div className="flex items-center gap-1.5">
                      <FileOutput size={12} className="text-[#059669] shrink-0" />
                      <input value={st.output || ""} placeholder="Output / Deliverable" onChange={e => setStep(pi, si, "output", e.target.value)} className={inp + " text-[#059669]"} />
                    </div>
                  </div>
                ))}
                <button onClick={() => setPhase(pi, "steps", [...(ph.steps || []), { title: "", desc: "", output: "" }])}
                  className="flex items-center gap-1 text-[11px] text-[#2563EB] hover:text-[#1D4ED8] font-medium"><Plus size={11} />Thêm step</button>
              </div>
            </div>
          ))}
          <button onClick={() => set("phases", [...(ex.phases || []), { name: "", duration: "", steps: [] }])}
            className="flex items-center gap-1 text-[11.5px] text-[#2563EB] hover:text-[#1D4ED8] font-medium px-1"><Plus size={12} />Thêm phase</button>
        </div>
      </div>

      <Fld label="Rủi ro triển khai"><ListEditor items={ex.risks} onChange={v => set("risks", v)} rows={1} /></Fld>
    </>
  );
}

/* ============================================================
   GRAPH
   ============================================================ */
const W = 1040, H = 700;
const trunc = (s, n = 20) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const labW = (s) => trunc(s).length * 4.7;

function GraphView({ kb, notes, activeNote, onSelect }) {
  const [hover, setHover] = useState(null);
  const [tick, setTick] = useState(0);
  const [running, setRunning] = useState(true);
  const [ready, setReady] = useState(0);
  const simRef = useRef(null);
  const dataRef = useRef(null);
  const dragRef = useRef(null);
  const svgRef = useRef(null);

  // build graph model once per kb
  useEffect(() => {
    const doms = Object.values(kb);
    const nodes = [];
    const links = [];
    const seedR = 230;

    doms.forEach((d, di) => {
      const a0 = (2 * Math.PI * di) / doms.length - Math.PI / 2;
      const hx = W / 2 + seedR * Math.cos(a0);
      const hy = H / 2 + seedR * Math.sin(a0) * 0.72;
      nodes.push({ id: `hub:${d.id}`, hub: true, domId: d.id, title: d.title, color: d.color,
                   count: Object.keys(d.children).length, x: hx, y: hy, fx: null, fy: null, ax: hx, ay: hy });
      Object.values(d.children).forEach((n, i) => {
        const a = (2 * Math.PI * i) / Object.keys(d.children).length;
        nodes.push({ id: n.id, hub: false, domId: d.id, title: n.title, color: d.color,
                     deg: (n.relatedNotes || []).length,
                     x: hx + 60 * Math.cos(a), y: hy + 60 * Math.sin(a), ax: hx, ay: hy });
        links.push({ source: `hub:${d.id}`, target: n.id, kind: "hub" });
      });
    });

    const ids = new Set(nodes.map(n => n.id));
    const seen = new Set();
    notes.forEach(n => (n.relatedNotes || []).forEach(r => {
      if (!ids.has(r)) return;
      const key = [n.id, r].sort().join("|");
      if (seen.has(key)) return;
      seen.add(key);
      links.push({ source: n.id, target: r, kind: "rel" });
    }));

    // prerequisite links are directional (prereq -> dependent), so no dedupe-by-pair
    notes.forEach(n => (n.prerequisiteNotes || []).forEach(p => {
      if (!ids.has(p) || p === n.id) return;
      links.push({ source: p, target: n.id, kind: "prereq" });
    }));

    dataRef.current = { nodes, links, doms };
    setTick(t => t + 1);
    setReady(r => r + 1); // triggers the simulation effect below (dataRef is a ref, not reactive)
  }, [kb, notes]);

  // run simulation
  useEffect(() => {
    if (!dataRef.current) return;
    const { nodes, links } = dataRef.current;

    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id)
        .distance(l => l.kind === "hub" ? 78 : 150)
        .strength(l => l.kind === "hub" ? 0.85 : 0.06))
      .force("charge", d3.forceManyBody().strength(d => d.hub ? -900 : -320))
      .force("collide", d3.forceCollide().radius(d => d.hub ? 46 : Math.max(20, labW(d.title) / 2 + 5)).strength(0.92).iterations(3))
      .force("x", d3.forceX(d => d.ax).strength(d => d.hub ? 0.055 : 0.018))
      .force("y", d3.forceY(d => d.ay).strength(d => d.hub ? 0.055 : 0.018))
      .force("bound", () => {
        for (const n of nodes) {
          const pad = n.hub ? 60 : 46;
          n.x = Math.max(pad, Math.min(W - pad, n.x));
          n.y = Math.max(pad + 14, Math.min(H - pad, n.y));
        }
      })
      .alpha(1).alphaDecay(0.018);

    sim.on("tick", () => setTick(t => t + 1));
    sim.on("end", () => setRunning(false));
    simRef.current = sim;
    setRunning(true);

    return () => sim.stop();
  }, [ready]);

  const toSvg = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: ((cx - r.left) / r.width) * W, y: ((cy - r.top) / r.height) * H };
  };

  const onDown = (n) => (e) => {
    e.preventDefault();
    dragRef.current = { node: n, moved: false };
    simRef.current?.alphaTarget(0.25).restart();
    setRunning(true);
    const p = toSvg(e); n.fx = p.x; n.fy = p.y;
  };

  useEffect(() => {
    const move = (e) => {
      const d = dragRef.current;
      if (!d || !svgRef.current) return;
      d.moved = true;
      const p = toSvg(e);
      d.node.fx = p.x; d.node.fy = p.y;
    };
    const up = () => {
      const d = dragRef.current;
      if (!d) return;
      d.node.fx = null; d.node.fy = null;
      simRef.current?.alphaTarget(0);
      dragRef.current = null;
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
  }, []);

  const reheat = () => { simRef.current?.alpha(0.9).restart(); setRunning(true); };

  if (!dataRef.current) return <div className="h-full flex items-center justify-center" style={{ background: "#05070d" }}><Loader2 size={20} className="text-[#60A5FA] animate-spin" /></div>;
  const { nodes, links } = dataRef.current;
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
  const active = notes.find(n => n.id === activeNote);
  const relSet = new Set(active?.relatedNotes || []);

  return (
    <div className="w-full h-full overflow-auto relative" style={{ background: "#05070d" }}>
      <div className="absolute top-2.5 left-4 flex items-center gap-2.5 z-10">
        <span className="text-[10.5px] text-white/35">
          <span className="hidden sm:inline">Kéo node để sắp xếp lại · Bấm để mở chi tiết · </span>
          <span style={{ color: "#F59E0B" }}>→ nét đứt = học trước</span>
        </span>
        <button onClick={reheat} className="flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] text-white/50 border border-white/10 hover:border-[#60A5FA]/50 hover:text-[#93C5FD] bg-white/[0.03]">
          <RotateCcw size={10} />Sắp xếp lại
        </button>
        {running && <Loader2 size={11} className="text-[#60A5FA] animate-spin" />}
      </div>

      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ minWidth: 860 }}>
        <defs>
          <radialGradient id="bgGlow" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor="#0d1220" />
            <stop offset="100%" stopColor="#05070d" />
          </radialGradient>
          <filter id="starGlow" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id="prereqArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#F59E0B" />
          </marker>
        </defs>
        <rect x="0" y="0" width={W} height={H} fill="url(#bgGlow)" />

        {links.map((l, i) => {
          const s = typeof l.source === "object" ? l.source : byId[l.source];
          const t = typeof l.target === "object" ? l.target : byId[l.target];
          if (!s || !t) return null;
          if (l.kind === "hub") return <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke={s.color || t.color} strokeWidth="0.7" opacity="0.28" />;
          const hot = [s.id, t.id].some(id => id === activeNote || id === hover);
          if (l.kind === "prereq") {
            const dx = t.x - s.x, dy = t.y - s.y, len = Math.hypot(dx, dy) || 1;
            const ex = t.x - (dx / len) * 9, ey = t.y - (dy / len) * 9; // stop short so arrowhead clears the node circle
            return <line key={i} x1={s.x} y1={s.y} x2={ex} y2={ey} stroke="#F59E0B" strokeWidth={hot ? 1.4 : 0.8} strokeDasharray="3,2" opacity={hot ? 0.95 : 0.45} markerEnd="url(#prereqArrow)" />;
          }
          return <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke={hot ? "#93C5FD" : "#3A4152"} strokeWidth={hot ? 1.6 : 0.6} opacity={hot ? 0.95 : 0.4} />;
        })}

        {nodes.filter(n => !n.hub).map(n => {
          const isA = activeNote === n.id, isH = hover === n.id, isR = relSet.has(n.id);
          const on = isA || isH || isR;
          const dim = active && !isA && !isR;
          const label = isH ? n.title : trunc(n.title);
          return (
            <g key={n.id} style={{ cursor: "grab" }}
              onMouseDown={onDown(n)} onTouchStart={onDown(n)}
              onClick={() => { if (!dragRef.current?.moved) onSelect(n.id); }}
              onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)}>
              <circle cx={n.x} cy={n.y} r="16" fill="transparent" />
              {on && <circle cx={n.x} cy={n.y} r={isA ? 13 : 11} fill={n.color} opacity="0.28" filter="url(#starGlow)" />}
              <circle cx={n.x} cy={n.y} r={isA ? 7.5 : isH ? 7 : 4.5}
                fill={n.color} opacity={dim ? 0.3 : on ? 1 : 0.85}
                stroke={on ? "#fff" : "none"} strokeWidth={on ? 1.8 : 0} />
              <rect x={n.x - (isH ? n.title.length * 2.5 : labW(n.title) / 2) - 3} y={n.y + 8}
                width={(isH ? n.title.length * 5 : labW(n.title)) + 6} height="13" rx="3"
                fill="#0a0e1a" opacity={dim ? 0.3 : 0.82} />
              <text x={n.x} y={n.y + 17.5} textAnchor="middle"
                fill={on ? n.color : "#9CA6BF"} fontSize="9" fontWeight={on ? 600 : 400}
                opacity={dim ? 0.35 : 1}>{label}</text>
            </g>
          );
        })}

        {nodes.filter(n => n.hub).map(n => (
          <g key={n.id} style={{ cursor: "grab" }} onMouseDown={onDown(n)} onTouchStart={onDown(n)}>
            <circle cx={n.x} cy={n.y} r="30" fill={n.color} opacity="0.15" filter="url(#starGlow)" />
            <circle cx={n.x} cy={n.y} r="20" fill={n.color} opacity="0.18" />
            <circle cx={n.x} cy={n.y} r="12" fill={n.color} filter="url(#starGlow)" />
            <circle cx={n.x} cy={n.y} r="12" fill={n.color} stroke="#0a0e1a" strokeWidth="2" />
            <text x={n.x} y={n.y + 3.5} textAnchor="middle" fill="#0a0e1a" fontSize="10" fontWeight="800">{n.count}</text>
            <rect x={n.x - n.title.length * 3.8 - 4} y={n.y - 42} width={n.title.length * 7.6 + 8} height="17" rx="4" fill="#0a0e1a" opacity="0.85" stroke={n.color} strokeOpacity="0.3" />
            <text x={n.x} y={n.y - 30} textAnchor="middle" fill={n.color} fontSize="12" fontWeight="700">{n.title}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ============================================================
   NOTE VIEW
   ============================================================ */
function NoteView({ note, sub, setSub, allNotes, onNavigate, onEdit }) {
  const [kTab, setKTab] = useState("content");
  const st = STATUS_CONFIG[note.status] || STATUS_CONFIG.draft;
  const related = (note.relatedNotes || []).map(id => allNotes.find(n => n.id === id)).filter(Boolean);
  const prereq = (note.prerequisiteNotes || []).map(id => allNotes.find(n => n.id === id)).filter(Boolean);
  const ex = note.execution;

  const EditBtn = ({ target }) => (
    <button onClick={() => onEdit(target)}
      className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-[#6B7280] border border-[#E5E7EB] hover:border-[#93C5FD] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-all">
      <Pencil size={11} />Edit
    </button>
  );

  return (
    <div className="h-full flex flex-col bg-white">
      {/* compact header */}
      <div className="shrink-0 px-3 sm:px-5 pt-3 pb-2.5 border-b border-[#F3F4F6]">
        <div className="flex items-center gap-1 mb-1.5 text-[10.5px] text-[#9CA3AF]">
          <span style={{ color: note.domainColor }} className="font-medium">{note.domainTitle}</span>
          <ChevronRight size={9} /><span>{note.title}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: `${note.domainColor}14`, color: note.domainColor }}>
            <Ico n={note.icon} s={14} />
          </div>
          <h1 className="text-[15px] font-semibold text-[#111827] leading-tight">{note.title}</h1>
          <span className="text-[10.5px] px-2 py-0.5 rounded-full font-medium border" style={{ color: st.color, background: st.bg, borderColor: st.border }}>{st.label}</span>
          {note.level && <span className="text-[10.5px] text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded-full">{note.level}</span>}
          {(() => { const T = TIER[note.source?.tier] || TIER.authored;
            return <span title={T.desc} className="text-[10.5px] px-2 py-0.5 rounded-full font-medium border flex items-center gap-1" style={{ color: T.color, background: T.bg, borderColor: T.border }}><T.I size={10} />{T.label}</span>; })()}
          <div className="ml-auto"><EditBtn target="meta" /></div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
          {(note.tags || []).map(t => <span key={t} className="text-[10.5px] text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.5 rounded">#{t}</span>)}
          {note.summary && <span className="text-[11.5px] text-[#9CA3AF] ml-1">{note.summary}</span>}
        </div>
      </div>

      {/* sub-function switcher */}
      <div className="shrink-0 flex items-center gap-1 px-3 sm:px-5 border-b border-[#E5E7EB] bg-[#FAFAFA]">
        {[{ k: "knowledge", l: "Knowledge", I: GraduationCap }, { k: "execution", l: "Execution", I: PlayCircle }].map(s => (
          <button key={s.k} onClick={() => setSub(s.k)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] border-b-2 transition-all ${sub === s.k ? "border-[#2563EB] text-[#111827] font-semibold bg-white" : "border-transparent text-[#9CA3AF] hover:text-[#4B5563]"}`}>
            <s.I size={13} />{s.l}
          </button>
        ))}
      </div>

      {sub === "knowledge" && (
        <>
          <div className="shrink-0 flex items-center px-3 sm:px-5 border-b border-[#F3F4F6] overflow-x-auto">
            {[{ k: "content", l: "Framework", I: BookOpen }, { k: "guidelines", l: "Guidelines", I: Lightbulb }, { k: "casestudy", l: "Case Study", I: Briefcase }, { k: "source", l: "Source", I: BookMarked }].map(t => (
              <button key={t.k} onClick={() => setKTab(t.k)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] border-b-2 transition-all ${kTab === t.k ? "border-[#111827] text-[#111827] font-medium" : "border-transparent text-[#9CA3AF] hover:text-[#4B5563]"}`}>
                <t.I size={12} />{t.l}
              </button>
            ))}
            <div className="ml-auto py-1"><EditBtn target={kTab} /></div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-3">
            {kTab === "content" && <Markdown text={note.content} />}
            {kTab === "guidelines" && (
              <div className="space-y-1.5">
                {(note.guidelines || []).length ? note.guidelines.map((g, i) => (
                  <div key={i} className="flex gap-2.5 p-2.5 rounded-md bg-[#FAFAFA] border border-[#F3F4F6] border-l-[3px]" style={{ borderLeftColor: note.domainColor }}>
                    <span className="text-[10px] font-semibold text-[#9CA3AF] mt-0.5 font-mono shrink-0">{String(i + 1).padStart(2, "0")}</span>
                    <p className="text-[12.5px] text-[#374151] leading-[1.65]">{g}</p>
                  </div>
                )) : <p className="text-[12px] text-[#9CA3AF] italic">Chưa có guidelines</p>}
              </div>
            )}
            {kTab === "source" && (() => {
              const src = note.source || { tier: "authored", refs: [], note: "Chưa gán nguồn." };
              const T = TIER[src.tier] || TIER.authored;
              return (
                <div>
                  <div className="p-3 rounded-md border mb-3" style={{ background: T.bg, borderColor: T.border }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <T.I size={14} style={{ color: T.color }} />
                      <span className="text-[12.5px] font-semibold" style={{ color: T.color }}>{T.label}</span>
                    </div>
                    <p className="text-[12px] leading-[1.6]" style={{ color: T.color }}>{T.desc}</p>
                  </div>
                  {(src.refs || []).length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-1.5">Tài liệu tham chiếu</h4>
                      <div className="space-y-1.5">
                        {src.refs.map((r, i) => (
                          <div key={i} className="flex gap-2 p-2 rounded-md bg-[#FAFAFA] border border-[#F3F4F6]">
                            <BookMarked size={12} className="text-[#6B7280] mt-0.5 shrink-0" />
                            <span className="text-[12px] text-[#374151] leading-[1.6]">{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {src.note && (
                    <div className="p-2.5 rounded-md border border-[#FDE68A] bg-[#FFFBEB]">
                      <h4 className="text-[10px] font-semibold text-[#B45309] uppercase tracking-wide mb-1 flex items-center gap-1"><AlertCircle size={11} />Lưu ý khi sử dụng</h4>
                      <p className="text-[12px] text-[#92400E] leading-[1.65]">{src.note}</p>
                    </div>
                  )}
                  {note.execution?.sourceNote && (
                    <div className="mt-2.5 p-2.5 rounded-md border border-[#E5E7EB] bg-[#FAFAFA]">
                      <h4 className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1 flex items-center gap-1"><PlayCircle size={11} />Về phần Execution</h4>
                      <p className="text-[12px] text-[#4B5563] leading-[1.65]">{note.execution.sourceNote}</p>
                    </div>
                  )}
                </div>
              );
            })()}
            {kTab === "casestudy" && (note.caseStudy ? (
              <div className="p-3 rounded-md border border-[#E9D5FF] bg-[#FAF5FF]">
                <h3 className="text-[13px] font-semibold text-[#7C3AED] mb-1.5 flex items-center gap-1.5"><Briefcase size={13} />{note.caseStudy.title}</h3>
                <p className="text-[12.5px] text-[#374151] leading-[1.7] whitespace-pre-line">{note.caseStudy.content}</p>
              </div>
            ) : <div className="text-center py-10"><Briefcase size={26} className="text-[#D1D5DB] mx-auto mb-2" /><p className="text-[12px] text-[#9CA3AF]">Chưa có case study</p></div>)}

            {prereq.length > 0 && (
              <div className="mt-4 pt-3 border-t border-[#F3F4F6]">
                <h4 className="text-[10px] font-semibold text-[#B45309] uppercase tracking-wide mb-1.5 flex items-center gap-1"><CheckCircle2 size={11} />Nên học trước</h4>
                <div className="flex flex-wrap gap-1.5">
                  {prereq.map(r => (
                    <button key={r.id} onClick={() => onNavigate(r.id)}
                      className="text-[11.5px] px-2 py-1 rounded-md border border-[#FDE68A] bg-[#FFFBEB] text-[#92400E] hover:border-[#FBBF24] hover:bg-[#FEF3C7] transition-all flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: r.domainColor }} />{r.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {related.length > 0 && (
              <div className="mt-4 pt-3 border-t border-[#F3F4F6]">
                <h4 className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-1.5 flex items-center gap-1"><Link2 size={11} />Linked</h4>
                <div className="flex flex-wrap gap-1.5">
                  {related.map(r => (
                    <button key={r.id} onClick={() => onNavigate(r.id)}
                      className="text-[11.5px] px-2 py-1 rounded-md border border-[#E5E7EB] text-[#4B5563] hover:border-[#93C5FD] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-all flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: r.domainColor }} />{r.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {sub === "execution" && (
        <>
          <div className="shrink-0 flex items-center justify-end px-3 sm:px-5 py-1.5 border-b border-[#F3F4F6]"><EditBtn target="execution" /></div>
          <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-3">
            {ex ? (
              <>
                <div className="p-2.5 rounded-md border border-[#BFDBFE] bg-[#EFF6FF] mb-3">
                  <h3 className="text-[10.5px] font-semibold text-[#1D4ED8] uppercase tracking-wide mb-1 flex items-center gap-1"><Target size={11} />Objective</h3>
                  <p className="text-[12.5px] text-[#1E3A5F] leading-[1.65]">{ex.objective}</p>
                </div>
                {(ex.prerequisites || []).length > 0 && (
                  <div className="mb-3.5">
                    <h3 className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-1.5 flex items-center gap-1"><CheckCircle2 size={11} />Prerequisites</h3>
                    <div className="flex flex-wrap gap-1">
                      {ex.prerequisites.map((p, i) => <span key={i} className="text-[11.5px] px-2 py-0.5 rounded bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]">{p}</span>)}
                    </div>
                  </div>
                )}
                <div className="space-y-3.5">
                  {(ex.phases || []).map((ph, pi) => (
                    <div key={pi}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: note.domainColor }}>{pi + 1}</div>
                        <h3 className="text-[13px] font-semibold text-[#111827]">{ph.name}</h3>
                        {ph.duration && <span className="text-[10.5px] text-[#6B7280] bg-[#F3F4F6] px-1.5 py-0.5 rounded-full flex items-center gap-1"><Clock size={9} />{ph.duration}</span>}
                      </div>
                      <div className="ml-2.5 border-l-2 pl-3 space-y-2" style={{ borderColor: `${note.domainColor}30` }}>
                        {(ph.steps || []).map((s, si) => (
                          <div key={si} className="relative">
                            <div className="absolute -left-[17px] top-2 w-2 h-2 rounded-full border-2 border-white" style={{ background: note.domainColor }} />
                            <div className="p-2.5 rounded-md border border-[#E5E7EB] bg-white">
                              <div className="flex items-start gap-1.5 mb-1">
                                <span className="text-[10px] font-mono text-[#9CA3AF] mt-0.5 shrink-0">{pi + 1}.{si + 1}</span>
                                <h4 className="text-[12.5px] font-semibold text-[#111827] leading-snug">{s.title}</h4>
                              </div>
                              <p className="text-[12.5px] text-[#4B5563] leading-[1.65] mb-1.5 ml-5">{s.desc}</p>
                              {s.output && <div className="ml-5 flex items-center gap-1"><FileOutput size={10} className="text-[#059669] shrink-0" /><span className="text-[11px] text-[#059669] font-medium">{s.output}</span></div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {(ex.risks || []).length > 0 && (
                  <div className="mt-4 p-2.5 rounded-md border border-[#FDE68A] bg-[#FFFBEB]">
                    <h3 className="text-[10.5px] font-semibold text-[#B45309] uppercase tracking-wide mb-1.5 flex items-center gap-1"><AlertCircle size={11} />Rủi ro triển khai</h3>
                    <div className="space-y-1">
                      {ex.risks.map((r, i) => <div key={i} className="flex gap-1.5 text-[12.5px] text-[#92400E]"><span className="text-[#F59E0B]">•</span><span className="leading-[1.6]">{r}</span></div>)}
                    </div>
                  </div>
                )}
              </>
            ) : <div className="text-center py-12"><PlayCircle size={28} className="text-[#D1D5DB] mx-auto mb-2" /><p className="text-[12px] text-[#9CA3AF]">Chưa có lộ trình thực thi</p></div>}
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function Dashboard({ kb, notes, onSelect, onAdd }) {
  const s = useMemo(() => ({
    total: notes.length,
    complete: notes.filter(n => n.status === "complete").length,
    inProgress: notes.filter(n => n.status === "in-progress").length,
    draft: notes.filter(n => n.status === "draft").length,
    cases: notes.filter(n => n.caseStudy).length,
    execs: notes.filter(n => n.execution?.phases?.length).length
  }), [notes]);

  const doms = Object.values(kb).map(d => {
    const kids = Object.values(d.children);
    const c = kids.filter(n => n.status === "complete").length;
    return { ...d, count: kids.length, pct: kids.length ? Math.round(c / kids.length * 100) : 0 };
  });

  return (
    <div className="h-full overflow-y-auto px-3 sm:px-5 py-4 bg-white">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-[17px] font-semibold text-[#111827] leading-tight">Procurement Second Brain</h1>
          <p className="text-[11.5px] text-[#6B7280] mt-0.5">CIPS &amp; CSCP Framework · {s.total} functions × Knowledge + Execution</p>
        </div>
        <button onClick={onAdd} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#2563EB] text-white text-[12px] font-medium hover:bg-[#1D4ED8]"><Plus size={13} />New function</button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
        {[
          { l: "Complete", v: s.complete, c: "#059669", b: "#ECFDF5", I: CheckCircle2 },
          { l: "In Progress", v: s.inProgress, c: "#D97706", b: "#FFFBEB", I: Clock },
          { l: "Draft", v: s.draft, c: "#6B7280", b: "#F9FAFB", I: AlertCircle },
          { l: "Case Studies", v: s.cases, c: "#7C3AED", b: "#FAF5FF", I: Briefcase },
          { l: "Execution", v: s.execs, c: "#2563EB", b: "#EFF6FF", I: PlayCircle }
        ].map(x => (
          <div key={x.l} className="p-2.5 rounded-lg border border-[#E5E7EB]">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: x.b }}><x.I size={11} style={{ color: x.c }} /></div>
              <span className="text-[10.5px] text-[#6B7280]">{x.l}</span>
            </div>
            <div className="flex items-baseline gap-1 mb-1.5">
              <span className="text-[20px] font-semibold text-[#111827] leading-none">{x.v}</span>
              <span className="text-[10.5px] text-[#9CA3AF]">/ {s.total}</span>
            </div>
            <div className="h-1 rounded-full bg-[#F3F4F6] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${s.total ? (x.v / s.total) * 100 : 0}%`, background: x.c }} /></div>
          </div>
        ))}
      </div>

      <div className="p-3 rounded-lg border border-[#E5E7EB] mb-4">
        <h3 className="text-[12.5px] font-semibold text-[#111827] mb-2">Mức độ tin cậy nội dung</h3>
        <div className="flex h-2 rounded-full overflow-hidden mb-2">
          {Object.entries(TIER).map(([k, v]) => {
            const c = notes.filter(n => (n.source?.tier || "authored") === k).length;
            return c ? <div key={k} style={{ width: `${(c / notes.length) * 100}%`, background: v.color }} /> : null;
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(TIER).map(([k, v]) => {
            const c = notes.filter(n => (n.source?.tier || "authored") === k).length;
            return (
              <div key={k} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: v.color }} />
                <span className="text-[11.5px] text-[#4B5563]">{v.label}</span>
                <span className="text-[11.5px] font-semibold text-[#111827]">{c}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {doms.map(d => (
          <div key={d.id} className="p-3 rounded-lg border border-[#E5E7EB]">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                <h3 className="text-[13px] font-semibold text-[#111827]">{d.title}</h3>
                <span className="text-[10.5px] text-[#9CA3AF]">{d.count} functions</span>
              </div>
              <span className="text-[11.5px] font-semibold" style={{ color: d.color }}>{d.pct}%</span>
            </div>
            <div className="h-1 rounded-full bg-[#F3F4F6] overflow-hidden mb-2"><div className="h-full rounded-full" style={{ width: `${d.pct}%`, background: d.color }} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {Object.values(d.children).map(n => {
                const st = STATUS_CONFIG[n.status] || STATUS_CONFIG.draft;
                return (
                  <div key={n.id} className="flex items-center gap-1.5 px-1.5 py-1 rounded border border-transparent hover:border-[#E5E7EB] hover:bg-[#FAFAFA]">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: st.color }} />
                    <span className="text-[12px] text-[#374151] truncate flex-1">{n.title}</span>
                    <button onClick={() => onSelect(n.id, "knowledge")} className="text-[10px] px-1.5 py-0.5 rounded text-[#6B7280] hover:bg-[#DBEAFE] hover:text-[#1D4ED8] flex items-center gap-0.5"><GraduationCap size={10} />K</button>
                    <button onClick={() => onSelect(n.id, "execution")} className="text-[10px] px-1.5 py-0.5 rounded text-[#6B7280] hover:bg-[#DBEAFE] hover:text-[#1D4ED8] flex items-center gap-0.5"><PlayCircle size={10} />E</button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {s.draft > 0 && (
        <div className="p-3 rounded-lg border border-[#FDE68A] bg-[#FFFBEB]">
          <h3 className="text-[12.5px] font-semibold text-[#B45309] mb-1.5 flex items-center gap-1.5"><AlertCircle size={13} />Knowledge Gaps</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {notes.filter(n => n.status === "draft").map(n => (
              <button key={n.id} onClick={() => onSelect(n.id, "knowledge")} className="flex items-center gap-1.5 text-[12px] text-[#92400E] hover:underline">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />{n.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   ONBOARDING / IMPORT
   ============================================================ */
function ImportScreen({ onImport, err, onCancel, hasData }) {
  const [raw, setRaw] = useState("");
  const [fileName, setFileName] = useState("");
  const fileRef = useRef(null);

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const r = new FileReader();
    r.onload = () => { const txt = String(r.result); setRaw(txt); onImport(txt); };
    r.readAsText(f);
  };

  return (
    <div className="h-screen overflow-y-auto bg-[#F9FAFB] p-4 sm:p-6">
      <div className="max-w-2xl w-full mx-auto bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-5 my-4">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] flex items-center justify-center shrink-0"><Brain size={18} className="text-[#2563EB]" /></div>
          <div className="flex-1">
            <h1 className="text-[15px] font-semibold text-[#111827] leading-none">Procurement Second Brain</h1>
            <p className="text-[11px] text-[#9CA3AF] mt-1">{hasData ? "Nạp dữ liệu từ file backup" : "Chưa có dữ liệu — cần import lần đầu"}</p>
          </div>
          {hasData && <button onClick={onCancel} className="p-1 rounded text-[#9CA3AF] hover:bg-[#F3F4F6]"><X size={16} /></button>}
        </div>

        {/* CÁCH 1 — chọn file */}
        <div className="rounded-lg border-2 border-dashed border-[#BFDBFE] bg-[#F8FBFF] p-5 text-center mb-3">
          <Upload size={22} className="text-[#2563EB] mx-auto mb-2" />
          <p className="text-[12.5px] text-[#374151] font-medium mb-1">Cách 1 — Chọn file JSON (khuyến nghị)</p>
          <p className="text-[11.5px] text-[#6B7280] mb-3 leading-[1.6]">
            Tải file <b>procurement-data.json</b> về máy trước, rồi bấm nút dưới đây để chọn file đó.
          </p>
          <input ref={fileRef} type="file" accept=".json,application/json" onChange={pickFile} className="hidden" />
          <button onClick={() => fileRef.current?.click()}
            className="px-4 py-2 rounded-md bg-[#2563EB] text-white text-[13px] font-medium hover:bg-[#1D4ED8] inline-flex items-center gap-1.5">
            <Upload size={14} />Chọn file từ máy
          </button>
          {fileName && <p className="text-[11px] text-[#059669] mt-2 flex items-center justify-center gap-1"><CheckCircle2 size={12} />{fileName}</p>}
        </div>

        {/* CÁCH 2 — dán */}
        <div className="rounded-lg border border-[#E5E7EB] p-3.5">
          <p className="text-[12.5px] text-[#374151] font-medium mb-1">Cách 2 — Dán nội dung JSON</p>
          <p className="text-[11.5px] text-[#6B7280] mb-2 leading-[1.6]">
            Mở file, chọn tất cả bằng Ctrl+A rồi Ctrl+C, dán vào ô dưới. Nội dung phải bắt đầu bằng <code className="bg-[#F3F4F6] px-1 rounded">&#123;</code> và kết thúc bằng <code className="bg-[#F3F4F6] px-1 rounded">&#125;</code>.
          </p>
          <textarea value={raw} onChange={e => setRaw(e.target.value)} rows={6}
            placeholder='{ "procurement": { "id": "procurement", ... } }'
            className="w-full px-2.5 py-2 text-[11px] font-mono rounded-md border border-[#D1D5DB] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE] resize-y leading-[1.5]" />
          <button onClick={() => onImport(raw)}
            className="mt-2 w-full py-2 rounded-md text-[13px] font-medium flex items-center justify-center gap-1.5 border border-[#2563EB] text-[#2563EB] hover:bg-[#EFF6FF]">
            <Upload size={14} />Import từ nội dung đã dán
          </button>
        </div>

        {err && (
          <div className="mt-3 p-2.5 rounded-md bg-[#FEF2F2] border border-[#FECACA]">
            <p className="text-[12px] text-[#DC2626] flex items-start gap-1.5"><AlertCircle size={13} className="mt-0.5 shrink-0" />{err}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   APP
   ============================================================ */
export default function App() {
  const [kb, setKb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [importErr, setImportErr] = useState("");
  const [saving, setSaving] = useState(false);

  const [view, setView] = useState("dashboard");
  const [activeNote, setActiveNote] = useState(null);
  const [sub, setSub] = useState("knowledge");
  const [q, setQ] = useState("");
  const [navOpen, setNavOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(null);
  const [showImport, setShowImport] = useState(false);

  /* ---- load ---- */
  useEffect(() => {
    (async () => {
      try {
        const raw = window.localStorage.getItem(KB_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setKb(parsed);
          setExpanded(Object.fromEntries(Object.keys(parsed).map((k, i) => [k, i === 0])));
        }
      } catch (e) { /* no data yet */ }
      setLoading(false);
    })();
  }, []);

  /* ---- persist ---- */
  const persist = useCallback(async (next) => {
    setKb(next);
    setSaving(true);
    try { window.localStorage.setItem(KB_KEY, JSON.stringify(next)); }
    catch (e) { console.error("Save failed", e); }
    setSaving(false);
  }, []);

  const notes = useMemo(() => flatten(kb), [kb]);
  const results = useMemo(() => searchKB(notes, q), [notes, q]);
  const current = notes.find(n => n.id === activeNote);

  const select = useCallback((id, s = "knowledge") => { setActiveNote(id); setSub(s); setView("note"); setQ(""); setMobileNavOpen(false); }, []);

  /* ---- import ---- */
  const doImport = (raw) => {
    const txt = (raw || "").trim();
    if (!txt) { setImportErr("Chưa có nội dung. Hãy chọn file hoặc dán JSON vào ô."); return; }
    let parsed;
    try { parsed = JSON.parse(txt); }
    catch (e) {
      setImportErr(`JSON chưa đúng định dạng (${e.message}). Kiểm tra xem đã copy đủ từ dấu { đầu tiên đến dấu } cuối cùng chưa.`);
      return;
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) { setImportErr("Nội dung phải là một object JSON."); return; }
    const doms = Object.values(parsed);
    if (!doms.length || !doms.every(d => d && typeof d.children === "object")) {
      setImportErr("Sai cấu trúc: cần object chứa các domain, mỗi domain phải có trường children.");
      return;
    }
    persist(parsed);
    setExpanded(Object.fromEntries(Object.keys(parsed).map((k, i) => [k, i === 0])));
    setImportErr(""); setShowImport(false);
  };

  /* ---- export ---- */
  const doExport = () => {
    const blob = new Blob([JSON.stringify(kb, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `procurement-kb-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(a.href);
  };

  /* ---- edit ---- */
  const openEdit = (target) => {
    if (!current) return;
    if (target === "meta") setDraft({ title: current.title, status: current.status, level: current.level, summary: current.summary, icon: current.icon, tags: [...(current.tags || [])], relatedNotes: [...(current.relatedNotes || [])], prerequisiteNotes: [...(current.prerequisiteNotes || [])] });
    else if (target === "content") setDraft({ content: current.content || "" });
    else if (target === "guidelines") setDraft({ guidelines: [...(current.guidelines || [])] });
    else if (target === "casestudy") setDraft({ caseStudy: current.caseStudy ? { ...current.caseStudy } : { title: "", content: "" } });
    else if (target === "execution") setDraft({ execution: current.execution ? JSON.parse(JSON.stringify(current.execution)) : { objective: "", prerequisites: [], phases: [], risks: [] } });
    else if (target === "source") setDraft({ source: current.source ? JSON.parse(JSON.stringify(current.source)) : { tier: "authored", refs: [], note: "" } });
    setEditing(target);
  };

  const saveEdit = () => {
    const next = JSON.parse(JSON.stringify(kb));
    const dom = next[current.domain];
    dom.children[current.id] = { ...dom.children[current.id], ...draft };
    persist(next); setEditing(null); setDraft(null);
  };

  const addFunction = () => {
    setDraft({ _new: true, domain: Object.keys(kb)[0], title: "", status: "draft", level: "", summary: "", icon: "BookOpen", tags: [], relatedNotes: [], prerequisiteNotes: [] });
    setEditing("new");
  };

  const saveNewFunction = () => {
    if (!draft.title.trim()) return;
    const id = uid(draft.title);
    const next = JSON.parse(JSON.stringify(kb));
    const { _new, domain, ...rest } = draft;
    next[domain].children[id] = { id, ...rest, guidelines: [], caseStudy: null, content: "", execution: { objective: "", prerequisites: [], phases: [], risks: [] } };
    persist(next); setEditing(null); setDraft(null); select(id, "knowledge");
  };

  const deleteFunction = () => {
    const next = JSON.parse(JSON.stringify(kb));
    delete next[current.domain].children[current.id];
    Object.values(next).forEach(d => Object.values(d.children).forEach(f => {
      f.relatedNotes = (f.relatedNotes || []).filter(r => r !== current.id);
    }));
    persist(next); setEditing(null); setDraft(null); setView("dashboard"); setActiveNote(null);
  };

  /* ---- render gates ---- */
  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <Loader2 size={22} className="text-[#2563EB] animate-spin" />
    </div>
  );
  if (!kb || showImport) return <ImportScreen onImport={doImport} err={importErr} hasData={!!kb} onCancel={() => { setShowImport(false); setImportErr(""); }} />;

  const coverage = notes.length ? Math.round(notes.filter(n => n.status === "complete").length / notes.length * 100) : 0;

  return (
    <div className="flex h-screen bg-white overflow-hidden" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>
      {/* mobile backdrop — tap để đóng drawer */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileNavOpen(false)} />
      )}

      {/* ============ DARK SIDEBAR ============ */}
      {(navOpen || mobileNavOpen) && (
        <div
          className={mobileNavOpen
            ? `flex fixed inset-y-0 left-0 z-50 w-[82%] max-w-[280px] shrink-0 flex-col ${navOpen ? "md:relative md:z-auto md:flex md:w-[236px] md:max-w-none" : "md:hidden"}`
            : `hidden w-[236px] shrink-0 flex-col ${navOpen ? "md:flex" : "md:hidden"}`}
          style={{ background: "#17191D" }}>
          <div className="px-3 py-3 border-b border-white/[0.07]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-[#2563EB]/20 flex items-center justify-center"><Brain size={14} className="text-[#60A5FA]" /></div>
              <div>
                <h1 className="text-[12.5px] font-semibold text-white leading-none">Procurement</h1>
                <p className="text-[9.5px] text-white/35 mt-0.5">Second Brain</p>
              </div>
              {saving && <Loader2 size={12} className="text-white/40 animate-spin ml-auto" />}
              <button onClick={() => setMobileNavOpen(false)} className="md:hidden ml-auto p-1 rounded text-white/40 hover:text-white/80"><X size={16} /></button>
            </div>
          </div>

          <div className="px-2.5 py-2">
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm trong toàn bộ nội dung"
                className="w-full h-[28px] pl-7 pr-2 text-[11.5px] rounded-md bg-white/[0.06] border border-white/[0.08] outline-none focus:border-[#3B82F6]/60 focus:bg-white/[0.09] text-white placeholder:text-white/25" />
            </div>
          </div>

          {/* full-text results */}
          {q.trim().length >= 2 && (
            <div className="px-2.5 pb-2 max-h-[45vh] overflow-y-auto">
              <div className="text-[9.5px] text-white/35 uppercase tracking-wide px-1 mb-1">
                {results.length ? `${results.length} functions khớp` : "Không tìm thấy"}
              </div>
              <div className="space-y-1">
                {results.map(r => (
                  <div key={r.note.id} className="rounded-md bg-white/[0.04] border border-white/[0.06] overflow-hidden">
                    <button onClick={() => select(r.note.id, r.matches[0].sub)}
                      className="w-full flex items-center gap-1.5 px-2 py-1.5 hover:bg-white/[0.06] text-left">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: r.note.domainColor }} />
                      <span className="text-[11.5px] text-white/90 truncate flex-1">{r.note.title}</span>
                      <span className="text-[9px] text-white/30">{r.count}</span>
                    </button>
                    {r.matches.map((m, i) => (
                      <button key={i} onClick={() => select(r.note.id, m.sub)}
                        className="w-full text-left px-2 py-1 border-t border-white/[0.05] hover:bg-white/[0.06]">
                        <div className="text-[9px] text-[#60A5FA] mb-0.5">{m.where}</div>
                        <div className="text-[10.5px] text-white/50 leading-[1.45] line-clamp-2"><Highlight text={m.text} q={q.trim()} /></div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!q && (
            <>
              <div className="px-2.5 pb-1.5 space-y-0.5">
                {[{ k: "dashboard", l: "Dashboard", I: BarChart3 }, { k: "graph", l: "Graph View", I: Network }].map(v => (
                  <button key={v.k} onClick={() => setView(v.k)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] transition-all ${view === v.k ? "bg-[#2563EB]/25 text-white font-medium" : "text-white/55 hover:bg-white/[0.06] hover:text-white/85"}`}>
                    <v.I size={13} />{v.l}
                  </button>
                ))}
              </div>

              <div className="h-px bg-white/[0.07] mx-2.5 my-1" />

              <div className="flex-1 overflow-y-auto px-2.5 py-1.5">
                {Object.values(kb).map(d => (
                  <div key={d.id} className="mb-1.5">
                    <button onClick={() => setExpanded(p => ({ ...p, [d.id]: !p[d.id] }))}
                      className="w-full flex items-center gap-1.5 px-1.5 py-1 text-[9.5px] font-semibold text-white/45 hover:text-white/75 uppercase tracking-wider">
                      {expanded[d.id] ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: d.color }} />
                      <span className="truncate">{d.title}</span>
                      <span className="ml-auto text-[9px] text-white/25 font-normal">{Object.keys(d.children).length}</span>
                    </button>
                    {expanded[d.id] && (
                      <div className="space-y-0.5 mt-0.5">
                        {Object.values(d.children).map(n => {
                          const isA = activeNote === n.id;
                          const st = STATUS_CONFIG[n.status] || STATUS_CONFIG.draft;
                          return (
                            <div key={n.id}>
                              <button onClick={() => select(n.id, sub)}
                                className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-left text-[11.5px] transition-all ${isA ? "bg-[#2563EB]/25 text-white font-medium" : "text-white/60 hover:bg-white/[0.06] hover:text-white/90"}`}>
                                <Ico n={n.icon} s={12} />
                                <span className="truncate flex-1">{n.title}</span>
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: st.color }} />
                              </button>
                              {isA && (
                                <div className="ml-4 mt-0.5 mb-1 space-y-0.5 border-l border-white/10 pl-1.5">
                                  {[{ k: "knowledge", l: "Knowledge", I: GraduationCap }, { k: "execution", l: "Execution", I: PlayCircle }].map(x => (
                                    <button key={x.k} onClick={() => select(n.id, x.k)}
                                      className={`w-full flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10.5px] ${sub === x.k ? "text-[#93C5FD] font-medium bg-white/[0.06]" : "text-white/40 hover:text-white/70"}`}>
                                      <x.I size={10} />{x.l}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="px-3 py-2 border-t border-white/[0.07]">
                <div className="flex justify-between text-[9.5px] text-white/40 mb-1">
                  <span>Coverage</span><span className="font-semibold text-white/75">{coverage}%</span>
                </div>
                <div className="h-1 rounded-full bg-white/[0.08] overflow-hidden mb-2">
                  <div className="h-full rounded-full bg-[#3B82F6]" style={{ width: `${coverage}%` }} />
                </div>
                <div className="flex gap-1">
                  <button onClick={doExport} className="flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] text-white/50 bg-white/[0.06] hover:bg-white/[0.1] hover:text-white/80"><Download size={10} />Export</button>
                  <button onClick={() => setShowImport(true)} className="flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] text-white/50 bg-white/[0.06] hover:bg-white/[0.1] hover:text-white/80"><Upload size={10} />Import</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ============ MAIN ============ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 h-9 flex items-center justify-between px-3 border-b border-[#E5E7EB] bg-white">
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileNavOpen(true)} className="md:hidden text-[#9CA3AF] hover:text-[#374151] p-1 -ml-1"><Menu size={17} /></button>
            <button onClick={() => setNavOpen(!navOpen)} className="hidden md:block text-[#9CA3AF] hover:text-[#374151]">
              {navOpen ? <ArrowLeft size={14} /> : <BookOpen size={14} />}
            </button>
          </div>
          <div className="flex items-center gap-0.5">
            {["dashboard", "note", "graph"].map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-2 py-0.5 text-[11px] rounded capitalize transition-all ${view === v ? "bg-[#F3F4F6] text-[#111827] font-medium" : "text-[#9CA3AF] hover:text-[#4B5563]"}`}>{v}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {view === "dashboard" && <Dashboard kb={kb} notes={notes} onSelect={select} onAdd={addFunction} />}
          {view === "graph" && <GraphView kb={kb} notes={notes} activeNote={activeNote} onSelect={id => select(id, "knowledge")} />}
          {view === "note" && current && <NoteView note={current} sub={sub} setSub={setSub} allNotes={notes} onNavigate={id => select(id, "knowledge")} onEdit={openEdit} />}
          {view === "note" && !current && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center"><BookOpen size={32} className="text-[#E5E7EB] mx-auto mb-2" /><p className="text-[12px] text-[#9CA3AF]">Chọn một function từ sidebar</p></div>
            </div>
          )}
        </div>
      </div>

      {/* ============ MODALS ============ */}
      {editing === "meta" && draft && (
        <Modal title="Edit function" onClose={() => setEditing(null)} onSave={saveEdit}>
          <Fld label="Title"><input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} className={inp} /></Fld>
          <div className="grid grid-cols-3 gap-2">
            <Fld label="Status">
              <select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })} className={inp}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Fld>
            <Fld label="Level"><input value={draft.level} onChange={e => setDraft({ ...draft, level: e.target.value })} className={inp} placeholder="CIPS L4" /></Fld>
            <Fld label="Icon">
              <select value={draft.icon} onChange={e => setDraft({ ...draft, icon: e.target.value })} className={inp}>
                {ICON_NAMES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </Fld>
          </div>
          <Fld label="Summary"><textarea rows={2} value={draft.summary} onChange={e => setDraft({ ...draft, summary: e.target.value })} className={inp + " resize-y"} /></Fld>
          <Fld label="Tags (phân cách bằng dấu phẩy)">
            <input value={(draft.tags || []).join(", ")} onChange={e => setDraft({ ...draft, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) })} className={inp} />
          </Fld>
          <Fld label="Linked functions">
            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-1.5 rounded-md border border-[#E5E7EB]">
              {notes.filter(n => n.id !== current.id).map(n => {
                const on = (draft.relatedNotes || []).includes(n.id);
                return (
                  <button key={n.id} onClick={() => setDraft({ ...draft, relatedNotes: on ? draft.relatedNotes.filter(r => r !== n.id) : [...(draft.relatedNotes || []), n.id] })}
                    className={`text-[11px] px-1.5 py-0.5 rounded border transition-all ${on ? "bg-[#EFF6FF] border-[#93C5FD] text-[#2563EB] font-medium" : "border-[#E5E7EB] text-[#6B7280] hover:border-[#D1D5DB]"}`}>
                    {n.title}
                  </button>
                );
              })}
            </div>
          </Fld>
          <Fld label="Học trước (prerequisite) — thứ tự học, khác Linked (quan hệ ngang hàng)">
            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-1.5 rounded-md border border-[#E5E7EB]">
              {notes.filter(n => n.id !== current.id).map(n => {
                const on = (draft.prerequisiteNotes || []).includes(n.id);
                return (
                  <button key={n.id} onClick={() => setDraft({ ...draft, prerequisiteNotes: on ? draft.prerequisiteNotes.filter(r => r !== n.id) : [...(draft.prerequisiteNotes || []), n.id] })}
                    className={`text-[11px] px-1.5 py-0.5 rounded border transition-all ${on ? "bg-[#FFFBEB] border-[#FBBF24] text-[#B45309] font-medium" : "border-[#E5E7EB] text-[#6B7280] hover:border-[#D1D5DB]"}`}>
                    {n.title}
                  </button>
                );
              })}
            </div>
          </Fld>
          <button onClick={() => { if (confirm(`Xóa function "${current.title}"?`)) deleteFunction(); }}
            className="mt-1 flex items-center gap-1.5 text-[12px] text-[#DC2626] hover:underline"><Trash2 size={12} />Xóa function này</button>
        </Modal>
      )}

      {editing === "new" && draft && (
        <Modal title="New function" onClose={() => setEditing(null)} onSave={saveNewFunction}>
          <Fld label="Domain">
            <select value={draft.domain} onChange={e => setDraft({ ...draft, domain: e.target.value })} className={inp}>
              {Object.values(kb).map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
          </Fld>
          <Fld label="Title"><input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} className={inp} placeholder="Demand Forecasting" /></Fld>
          <div className="grid grid-cols-3 gap-2">
            <Fld label="Status">
              <select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })} className={inp}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Fld>
            <Fld label="Level"><input value={draft.level} onChange={e => setDraft({ ...draft, level: e.target.value })} className={inp} placeholder="CSCP M1" /></Fld>
            <Fld label="Icon">
              <select value={draft.icon} onChange={e => setDraft({ ...draft, icon: e.target.value })} className={inp}>
                {ICON_NAMES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </Fld>
          </div>
          <Fld label="Summary"><textarea rows={2} value={draft.summary} onChange={e => setDraft({ ...draft, summary: e.target.value })} className={inp + " resize-y"} /></Fld>
          <Fld label="Tags"><input value={(draft.tags || []).join(", ")} onChange={e => setDraft({ ...draft, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) })} className={inp} /></Fld>
        </Modal>
      )}

      {editing === "content" && draft && (
        <Modal wide title="Edit Framework" onClose={() => setEditing(null)} onSave={saveEdit}>
          <p className="text-[11px] text-[#9CA3AF] mb-1.5">Hỗ trợ markdown: <code>## Heading</code>, <code>**bold**</code>, bảng dùng dấu <code>|</code></p>
          <textarea rows={20} value={draft.content} onChange={e => setDraft({ content: e.target.value })} className={ta + " text-[11.5px]"} />
        </Modal>
      )}

      {editing === "guidelines" && draft && (
        <Modal wide title="Edit Guidelines" onClose={() => setEditing(null)} onSave={saveEdit}>
          <ListEditor items={draft.guidelines} onChange={v => setDraft({ guidelines: v })} rows={3} placeholder="Nguyên tắc thực hành" />
        </Modal>
      )}

      {editing === "casestudy" && draft && (
        <Modal wide title="Edit Case Study" onClose={() => setEditing(null)} onSave={saveEdit}>
          <Fld label="Title"><input value={draft.caseStudy.title} onChange={e => setDraft({ caseStudy: { ...draft.caseStudy, title: e.target.value } })} className={inp} /></Fld>
          <Fld label="Nội dung"><textarea rows={12} value={draft.caseStudy.content} onChange={e => setDraft({ caseStudy: { ...draft.caseStudy, content: e.target.value } })} className={inp + " resize-y leading-[1.65]"} /></Fld>
        </Modal>
      )}

      {editing === "source" && draft && (
        <Modal wide title="Edit Source" onClose={() => setEditing(null)} onSave={saveEdit}>
          <Fld label="Mức độ tin cậy">
            <div className="space-y-1.5">
              {Object.entries(TIER).map(([k, v]) => (
                <button key={k} onClick={() => setDraft({ source: { ...draft.source, tier: k } })}
                  className={`w-full text-left p-2.5 rounded-md border transition-all ${draft.source.tier === k ? "border-2" : "border-[#E5E7EB] hover:border-[#D1D5DB]"}`}
                  style={draft.source.tier === k ? { borderColor: v.color, background: v.bg } : {}}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <v.I size={13} style={{ color: v.color }} />
                    <span className="text-[12.5px] font-semibold" style={{ color: v.color }}>{v.label}</span>
                  </div>
                  <p className="text-[11.5px] text-[#6B7280] leading-[1.55]">{v.desc}</p>
                </button>
              ))}
            </div>
          </Fld>
          <Fld label="Tài liệu tham chiếu"><ListEditor items={draft.source.refs} onChange={v => setDraft({ source: { ...draft.source, refs: v } })} rows={2} placeholder="Tác giả, năm, tên tài liệu" /></Fld>
          <Fld label="Lưu ý khi sử dụng"><textarea rows={4} value={draft.source.note} onChange={e => setDraft({ source: { ...draft.source, note: e.target.value } })} className={inp + " resize-y leading-[1.6]"} placeholder="Phần nào đã xác minh, phần nào cần kiểm chứng thêm" /></Fld>
        </Modal>
      )}

      {editing === "execution" && draft && (
        <Modal wide title="Edit Execution" onClose={() => setEditing(null)} onSave={saveEdit}>
          <ExecEditor value={draft.execution} onChange={v => setDraft({ execution: v })} />
        </Modal>
      )}
    </div>
  );
}
