import React, { useEffect, useMemo, useRef, useState } from "react";

// Farmers Marketplace — Blue & Dark Pink Theme (Multi‑page MVP with Bulk Orders)
// Notes:
// - Front‑end only demo. Replace mocks with your API.
// - Pages: Home, Shop, Services, Pricing (multi‑currency), About, Contact.
// - Bulk ordering (RFQ) flow without agents.
// - Currency toggle (INR/USD) with demo FX rate.
// - Optional 3D model viewer (web component) for a hero visual.
//
// Fix applied: model-viewer sometimes throws "THREE.GLTFLoader: Couldn't load texture" when textures are blocked by CORS
// or the external model host is unavailable. To make the app robust we now:
//  - lazy-load the model-viewer script with onload/onerror handlers,
//  - attach an error listener to the <model-viewer> element and fall back to a static hero image when an error occurs,
//  - set the crossorigin attribute on the element (helps when the GLB and textures are served with proper CORS headers),
//  - show a graceful loading placeholder while the script/model is loading.

// ----------------------------- Config -----------------------------
const FX = {
  // demo rate; replace with live API in production
  INREquivPerUSD: 83,
};
const CURRENCIES = Object.freeze(["INR", "USD"]);


// ----------------------------- Mock Data -----------------------------
const initialFarmers = [
  { id: "f1", name: "Green Valley Farm", location: "Nashik", rating: 4.7 },
  { id: "f2", name: "Sunrise Dairy", location: "Pune", rating: 4.5 },
  { id: "f3", name: "Riverbend Organics", location: "Nagpur", rating: 4.9 },
];

const initialProducts = [
  {
    id: "p1",
    name: "Alphonso Mangoes (1kg)",
    priceINR: 299,
    stock: 4200,
    moq: 50,
    category: "Fruits",
    image:
      "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?q=80&w=1200&auto=format&fit=crop",
    farmerId: "f1",
    rating: 4.8,
    bulkTiers: [
      { min: 50, priceINR: 285 },
      { min: 200, priceINR: 270 },
      { min: 1000, priceINR: 255 },
    ],
  },
  {
    id: "p2",
    name: "Organic Tomatoes (1kg)",
    priceINR: 89,
    stock: 9000,
    moq: 100,
    category: "Vegetables",
    image:
      "https://images.unsplash.com/photo-1546470427-0fd2772bca1c?q=80&w=1200&auto=format&fit=crop",
    farmerId: "f3",
    rating: 4.6,
    bulkTiers: [
      { min: 100, priceINR: 84 },
      { min: 500, priceINR: 80 },
      { min: 2500, priceINR: 76 },
    ],
  },
  {
    id: "p3",
    name: "Fresh Cow Milk (1L)",
    priceINR: 75,
    stock: 12000,
    moq: 200,
    category: "Dairy",
    image:
      "https://images.unsplash.com/photo-1550581190-9c1c48d21d6c?q=80&w=1200&auto=format&fit=crop",
    farmerId: "f2",
    rating: 4.4,
    bulkTiers: [
      { min: 200, priceINR: 72 },
      { min: 1000, priceINR: 69 },
      { min: 5000, priceINR: 66 },
    ],
  },
  {
    id: "p4",
    name: "Basmati Rice (5kg)",
    priceINR: 649,
    stock: 3000,
    moq: 20,
    category: "Grains",
    image:
      "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?q=80&w=1200&auto=format&fit=crop",
    farmerId: "f3",
    rating: 4.7,
    bulkTiers: [
      { min: 20, priceINR: 630 },
      { min: 200, priceINR: 610 },
      { min: 1000, priceINR: 595 },
    ],
  },
  {
    id: "p5",
    name: "Free‑range Eggs (12)",
    priceINR: 145,
    stock: 6000,
    moq: 50,
    category: "Dairy",
    image:
      "https://images.unsplash.com/photo-1517959105821-eaf2591984dd?q=80&w=1200&auto=format&fit=crop",
    farmerId: "f2",
    rating: 4.5,
    bulkTiers: [
      { min: 50, priceINR: 140 },
      { min: 500, priceINR: 135 },
      { min: 3000, priceINR: 128 },
    ],
  },
];

const CATEGORIES = ["All", "Fruits", "Vegetables", "Dairy", "Grains"];

// ----------------------------- Utilities -----------------------------
function classNames(...args) {
  return args.filter(Boolean).join(" ");
}

function toCurrency(amountINR, currency) {
  if (currency === "USD") {
    const usd = amountINR / FX.INREquivPerUSD;
    return usd.toLocaleString("en-US", { style: "currency", currency: "USD" });
  }
  return amountINR.toLocaleString("en-IN", { style: "currency", currency: "INR" });
}

// ------------------------------ Model viewer wrapper ------------------------------
function ModelViewerWrapper({ src, fallbackImg, style, className }) {
  const ref = useRef(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const id = "mv-script";
    let s = document.getElementById(id);
    if (!s) {
      s = document.createElement("script");
      s.id = id;
      s.type = "module";
      s.src = "https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js";
      s.onload = () => setScriptLoaded(true);
      s.onerror = (e) => {
        console.error("Failed to load model-viewer script", e);
        setError(true);
      };
      document.body.appendChild(s);
    } else {
      // script already present — assume it's loaded (this is safe for our demo)
      setScriptLoaded(true);
    }
  }, []);

  // Attach error listener to the custom element so we can fall back to a static image
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onError = (ev) => {
      // model-viewer dispatches an 'error' event on failure to load GLTF/textures
      console.error('model-viewer error event:', ev);
      setError(true);
    };
    // make sure the attribute is available for the loader (helps with cross-origin)
    try {
      el.setAttribute && el.setAttribute("crossorigin", "anonymous");
    } catch (e) {
      // ignore
    }
    el.addEventListener("error", onError);
    return () => el.removeEventListener("error", onError);
  }, [scriptLoaded]);

  // Loading placeholder
  if (error) {
    return (
      <div className={classNames("rounded-3xl overflow-hidden border border-blue-100 bg-white", className)} style={{ ...style }}>
        <img src={fallbackImg} alt="Hero fallback" className="w-full h-72 object-cover" />
      </div>
    );
  }

  if (!scriptLoaded) {
    return (
      <div className={classNames("rounded-3xl overflow-hidden border border-blue-100 bg-white flex items-center justify-center", className)} style={{ height: 288, ...style }}>
        <div className="text-blue-900/70">Loading 3D preview…</div>
      </div>
    );
  }

  // Render the <model-viewer> element; if it fails we'll catch via the error listener and fall back above
  return (
    <div className={classNames("rounded-3xl overflow-hidden border border-blue-100 bg-white", className)} style={{ ...style }}>
      <model-viewer
        ref={ref}
        src={src}
        ar
        auto-rotate
        camera-controls
        // Note: React doesn't automatically add a lowercase `crossorigin` attribute for custom elements in all cases,
        // but we set it after mount above. Keeping the property here improves readability.
        crossOrigin="anonymous"
        style={{ width: "100%", height: 288, background: "transparent" }}
      />
    </div>
  );
}

// ------------------------------ Global Components ------------------------------
function Header({ onOpenCart, cartCount, page, setPage, currency, setCurrency }) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b border-blue-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setPage("Home")}> 
          <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-blue-600 to-pink-700 grid place-content-center text-white font-bold shadow">
            FM
          </div>
          <span className="font-semibold text-blue-900 tracking-wide">Farmers Market</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {[["Home","Shop","Services","Pricing","About","Contact"]][0][0] /* noop to keep linters happy — menu rendered below */}
          {["Home","Shop","Services","Pricing","About","Contact"].map((p)=> (
            <button key={p} onClick={()=>setPage(p)} className={classNames("hover:text-pink-700 text-blue-700", page===p && "font-semibold text-blue-900")}>{p}</button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <select
            value={currency}
            onChange={(e)=>setCurrency(e.target.value)}
            className="px-3 py-2 rounded-2xl border border-blue-200 text-blue-800"
            aria-label="Currency"
          >
            {CURRENCIES.map(c=> <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            onClick={onOpenCart}
            className="relative px-3 py-2 rounded-2xl border border-blue-200 text-blue-800 hover:bg-blue-50 transition"
            aria-label="Open cart"
          >
            🛒 Cart
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 text-xs bg-pink-700 text-white rounded-full px-1.5 py-0.5">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

function Hero3D() {
  // Provide a farm hero image as fallback (used when 3D model fails)
  const fallbackHero = "https://images.unsplash.com/photo-1599599810694-9f532a0d4d4e?q=80&w=1600&auto=format&fit=crop";
  // Demo GLB (external host may not allow textures via CORS) — we still try, but gracefully fall back.
  const demoModel = "https://modelviewer.dev/shared-assets/models/Astronaut.glb";

  return (
    <section className="bg-gradient-to-br from-blue-50 via-white to-pink-50 border-b border-blue-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 md:py-16 grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-blue-900">
            Bulk & retail <span className="text-pink-700">farm‑fresh</span> marketplace.
          </h1>
          <p className="mt-4 text-blue-800/80 max-w-prose">
            Order pallets or single packs directly from verified farmers—no agents, no middlemen.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#shop" className="px-5 py-3 rounded-2xl bg-blue-700 text-white hover:bg-blue-800 shadow" onClick={(e)=>{e.preventDefault(); document.querySelector('#shop')?.scrollIntoView({behavior:'smooth'});}}>
              Start shopping
            </a>
            <a href="#services" className="px-5 py-3 rounded-2xl border border-pink-700 text-pink-700 hover:bg-pink-50" onClick={(e)=>{e.preventDefault(); document.querySelector('#services')?.scrollIntoView({behavior:'smooth'});}}>
              Explore services
            </a>
          </div>
          <div className="mt-4 text-xs text-blue-900/60">3D model is a demo asset — if it fails to load we show a static hero image.</div>
        </div>

        <div className="order-first md:order-last">
          <ModelViewerWrapper src={demoModel} fallbackImg={fallbackHero} style={{}} />
        </div>
      </div>
    </section>
  );
}

function SectionTitle({ id, title, subtitle }) {
  return (
    <div id={id} className="flex items-end justify-between">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900">{title}</h2>
        {subtitle && <p className="text-blue-900/70">{subtitle}</p>}
      </div>
      <div className="h-1 w-28 bg-gradient-to-r from-blue-600 to-pink-700 rounded-full" />
    </div>
  );
}

function Filters({ q, setQ, category, setCategory, sort, setSort }) {
  return (
    <div className="flex flex-col md:flex-row gap-3 md:items-center">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search products..."
        className="w-full md:w-72 px-4 py-2.5 rounded-2xl border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex gap-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-2.5 rounded-2xl border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="px-4 py-2.5 rounded-2xl border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="relevance">Sort: Relevance</option>
          <option value="priceAsc">Price: Low → High</option>
          <option value="priceDesc">Price: High → Low</option>
          <option value="ratingDesc">Rating: High → Low</option>
        </select>
      </div>
    </div>
  );
}

function PriceBlock({ priceINR, currency }) {
  return <span className="font-bold text-pink-700">{toCurrency(priceINR, currency)}</span>;
}

function BulkBadges({ moq, tiers, currency }) {
  return (
    <div className="mt-2 text-xs text-blue-900/70 flex flex-wrap gap-2">
      <span className="px-2 py-1 rounded-lg bg-blue-50 border border-blue-100">MOQ: {moq}</span>
      {tiers.slice(0,3).map((t,i)=> (
        <span key={i} className="px-2 py-1 rounded-lg bg-pink-50 border border-pink-100">
          {t.min}+ @ {toCurrency(t.priceINR, currency)}
        </span>
      ))}
    </div>
  );
}

function ProductCard({ p, farmer, onAdd, onBulk }) {
  return (
    <div className="rounded-3xl overflow-hidden border border-blue-100 bg-white hover:shadow-lg transition">
      <img src={p.image} alt={p.name} className="h-44 w-full object-cover" />
      <div className="p-4">
        <h3 className="font-semibold text-blue-900 line-clamp-2 min-h-[3.25rem]">{p.name}</h3>
        <div className="mt-1 text-sm text-blue-900/70">{farmer?.name} · ⭐ {p.rating}</div>
        <div className="mt-2 flex items-center justify-between">
          <div className="text-lg"><PriceBlock priceINR={p.priceINR} currency={farmer?.currency || "INR"} /></div>
          <div className="flex gap-2">
            <button
              onClick={() => onAdd(p)}
              className="px-3 py-2 rounded-xl bg-blue-700 text-white hover:bg-blue-800"
            >
              Add
            </button>
            <button
              onClick={() => onBulk(p)}
              className="px-3 py-2 rounded-xl border border-pink-700 text-pink-700 hover:bg-pink-50"
            >
              Bulk
            </button>
          </div>
        </div>
        <BulkBadges moq={p.moq} tiers={p.bulkTiers} currency={"INR"} />
      </div>
    </div>
  );
}

function CartDrawer({ open, items, onClose, onQty, onRemove, onCheckout, currency }) {
  const totalINR = items.reduce((s, it) => s + it.priceINR * it.qty, 0);
  return (
    <div className={classNames("fixed inset-0 z-40 transition", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
      <div className={classNames("absolute inset-0 bg-blue-900/20 backdrop-blur-sm transition-opacity", open ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <aside className={classNames("absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl border-l border-blue-100 p-4 flex flex-col","transition-transform duration-300", open ? "translate-x-0" : "translate-x-full")}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-blue-900">Your Cart</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-blue-50">✕</button>
        </div>
        <div className="mt-4 space-y-3 flex-1 overflow-auto">
          {items.length === 0 && (<div className="text-blue-900/60">Your cart is empty.</div>)}
          {items.map((it) => (
            <div key={it.id} className="flex gap-3 border border-blue-100 rounded-2xl p-2">
              <img src={it.image} alt={it.name} className="h-16 w-16 rounded-xl object-cover" />
              <div className="flex-1">
                <div className="font-medium text-blue-900 line-clamp-1">{it.name}</div>
                <div className="text-sm text-blue-900/70">{toCurrency(it.priceINR, currency)}</div>
                <div className="mt-1 flex items-center gap-2">
                  <button onClick={() => onQty(it.id, Math.max(1, it.qty - 1))} className="px-2 rounded-lg border border-blue-200">−</button>
                  <span className="min-w-[2ch] text-center">{it.qty}</span>
                  <button onClick={() => onQty(it.id, it.qty + 1)} className="px-2 rounded-lg border border-blue-200">+</button>
                  <button onClick={() => onRemove(it.id)} className="ml-auto text-pink-700 hover:underline">Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-blue-100 pt-3">
          <div className="flex items-center justify-between text-blue-900">
            <span>Total</span>
            <span className="font-semibold">{toCurrency(totalINR, currency)}</span>
          </div>
          <button disabled={items.length === 0} onClick={onCheckout} className="mt-3 w-full px-4 py-3 rounded-2xl bg-pink-700 text-white hover:bg-pink-800 disabled:opacity-50">
            Proceed to Checkout
          </button>
        </div>
      </aside>
    </div>
  );
}

function RFQModal({ open, onClose, product, onSubmit }) {
  const [qty, setQty] = useState(product?.moq || 0);
  const [location, setLocation] = useState("");
  const [target, setTarget] = useState("");
  const [notes, setNotes] = useState("");
  useEffect(()=>{ if (product) { setQty(product.moq); setLocation(""); setTarget(""); setNotes(""); } },[product]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-blue-900/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-blue-100 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Bulk RFQ — {product?.name}</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-blue-50">✕</button>
        </div>
        <div className="mt-3 grid gap-3">
          <input type="number" min={product?.moq || 1} value={qty} onChange={(e)=>setQty(Number(e.target.value))} className="px-4 py-2.5 rounded-2xl border border-blue-200" placeholder="Quantity" />
          <input value={location} onChange={(e)=>setLocation(e.target.value)} className="px-4 py-2.5 rounded-2xl border border-blue-200" placeholder="Delivery location" />
          <input value={target} onChange={(e)=>setTarget(e.target.value)} className="px-4 py-2.5 rounded-2xl border border-blue-200" placeholder="Target price (optional)" />
          <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} className="px-4 py-2.5 rounded-2xl border border-blue-200" placeholder="Notes (quality, packaging, logistics)" />
          <button onClick={()=>{ onSubmit({ productId: product.id, qty, location, target, notes }); onClose(); }} className="px-5 py-3 rounded-2xl bg-blue-700 text-white hover:bg-blue-800">Send RFQ</button>
        </div>
      </div>
    </div>
  );
}

function ServicesPage() {
  const items = [
    { title: "Bulk RFQ Matching", desc: "Post requirements and get direct quotes from verified farmers.", icon: "📦" },
    { title: "Quality & Grading", desc: "Optional third‑party grading and certifications upload.", icon: "🧪" },
    { title: "Escrow Payments", desc: "Funds released to farmers after buyer confirmation.", icon: "💳" },
    { title: "Logistics Support", desc: "Integrated courier/freight partners and shipment tracking.", icon: "🚚" },
  ];
  return (
    <section id="services" className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-6">
      <SectionTitle title="Services" subtitle="Everything you need for direct farm trade" />
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
        {items.map((it)=> (
          <div key={it.title} className="rounded-3xl border border-blue-100 p-5 bg-white">
            <div className="text-3xl">{it.icon}</div>
            <h4 className="mt-2 font-semibold text-blue-900">{it.title}</h4>
            <p className="text-sm text-blue-900/80 mt-1">{it.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PricingPage({ currency }) {
  const plans = [
    { name: "Starter", priceINR: 0, features: ["Unlimited browsing","Cart checkout","Email support"] },
    { name: "Pro Trader", priceINR: 999, features: ["Bulk RFQs","Priority support","Downloadable invoices"] },
    { name: "Enterprise", priceINR: 4999, features: ["Custom workflows","Account manager","API access"] },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-6">
      <SectionTitle title="Pricing" subtitle="Choose a plan; prices display in your currency" />
      <div className="grid md:grid-cols-3 gap-5">
        {plans.map(p => (
          <div key={p.name} className="rounded-3xl border border-blue-100 p-6 bg-white">
            <h3 className="text-xl font-semibold text-blue-900">{p.name}</h3>
            <div className="mt-2 text-3xl font-extrabold text-pink-700">{toCurrency(p.priceINR, currency)}</div>
            <ul className="mt-3 text-sm text-blue-900/80 list-disc ml-5">
              {p.features.map(f => <li key={f}>{f}</li>)}
            </ul>
            <button className="mt-4 w-full px-4 py-3 rounded-2xl bg-blue-700 text-white hover:bg-blue-800">Get started</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function AboutPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-6">
      <SectionTitle title="About us" subtitle="Our mission is fair, transparent farm trade" />
      <div className="grid md:grid-cols-2 gap-6 items-center">
        <img className="rounded-3xl shadow border border-blue-100" alt="Farm teamwork" src="https://images.unsplash.com/photo-1599599810694-9f532a0d4d4e?q=80&w=1600&auto=format&fit=crop" />
        <div className="text-blue-900/80">
          We connect farmers and buyers directly using secure payments and data‑backed quality. Our platform supports both household shopping and container‑scale procurement.
        </div>
      </div>
    </section>
  );
}

function ContactPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-6">
      <SectionTitle title="Contact us" subtitle="We usually reply within 1 business day" />
      <form className="grid md:grid-cols-2 gap-3">
        <input className="px-4 py-2.5 rounded-2xl border border-blue-200" placeholder="Your name" required />
        <input className="px-4 py-2.5 rounded-2xl border border-blue-200" placeholder="Email or phone" required />
        <input className="md:col-span-2 px-4 py-2.5 rounded-2xl border border-blue-200" placeholder="Subject" />
        <textarea className="md:col-span-2 px-4 py-2.5 rounded-2xl border border-blue-200" placeholder="Message" rows={5} />
        <button className="md:col-span-2 px-5 py-3 rounded-2xl bg-pink-700 text-white hover:bg-pink-800">Send message</button>
      </form>
    </section>
  );
}

function FarmerForm({ onSave, farmers }) {
  const [form, setForm] = useState({
    name: "",
    priceINR: "",
    stock: "",
    moq: 10,
    category: "Fruits",
    image: "",
    farmerId: farmers[0]?.id || "",
  });
  function handleSubmit(e) {
    e.preventDefault();
    const id = Math.random().toString(36).slice(2);
    onSave({
      id,
      name: form.name || "New Product",
      priceINR: Number(form.priceINR) || 0,
      stock: Number(form.stock) || 0,
      moq: Number(form.moq) || 1,
      category: form.category,
      image: form.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1200&auto=format&fit=crop",
      farmerId: form.farmerId,
      rating: 4.6,
      bulkTiers: [
        { min: Number(form.moq) || 1, priceINR: Math.max(1, Math.floor((Number(form.priceINR)||1)*0.95)) },
      ],
    });
    setForm({ name: "", priceINR: "", stock: "", moq: 10, category: "Fruits", image: "", farmerId: farmers[0]?.id || "" });
  }
  return (
    <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-3">
      <input className="px-4 py-2.5 rounded-2xl border border-blue-200" placeholder="Product name" value={form.name} onChange={(e)=>setForm({ ...form, name: e.target.value })} required />
      <input className="px-4 py-2.5 rounded-2xl border border-blue-200" placeholder="Price (₹)" type="number" min={0} value={form.priceINR} onChange={(e)=>setForm({ ...form, priceINR: e.target.value })} required />
      <input className="px-4 py-2.5 rounded-2xl border border-blue-200" placeholder="Stock" type="number" min={0} value={form.stock} onChange={(e)=>setForm({ ...form, stock: e.target.value })} required />
      <input className="px-4 py-2.5 rounded-2xl border border-blue-200" placeholder="MOQ" type="number" min={1} value={form.moq} onChange={(e)=>setForm({ ...form, moq: e.target.value })} />
      <select className="px-4 py-2.5 rounded-2xl border border-blue-200" value={form.category} onChange={(e)=>setForm({ ...form, category: e.target.value })}>
        {CATEGORIES.filter(c=>c!=="All").map(c=> <option key={c}>{c}</option>)}
      </select>
      <input className="px-4 py-2.5 rounded-2xl border border-blue-200 md:col-span-2" placeholder="Image URL (ensure license to use)" value={form.image} onChange={(e)=>setForm({ ...form, image: e.target.value })} />
      <select className="px-4 py-2.5 rounded-2xl border border-blue-200 md:col-span-2" value={form.farmerId} onChange={(e)=>setForm({ ...form, farmerId: e.target.value })}>
        {farmers.map(f=> <option key={f.id} value={f.id}>{f.name} ({f.location})</option>)}
      </select>
      <button className="mt-2 px-5 py-3 rounded-2xl bg-pink-700 text-white hover:bg-pink-800 md:col-span-2">Save Product</button>
    </form>
  );
}

function Tabs({ tabs, active, onChange }) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t} onClick={() => onChange(t)} className={classNames("px-4 py-2 rounded-2xl border", active === t ? "bg-blue-700 text-white border-blue-700" : "border-blue-200 text-blue-800 hover:bg-blue-50")}>{t}</button>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  // Routing
  const [page, setPage] = useState("Home");
  // State
  const [farmers, setFarmers] = useState(initialFarmers);
  const [products, setProducts] = useState(initialProducts);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("relevance");
  const [activeTab, setActiveTab] = useState("Shop");
  const [currency, setCurrency] = useState("INR");
  const [rfqProduct, setRfqProduct] = useState(null);
  const [rfqs, setRfqs] = useState([]);

  // Derived
  const farmersById = useMemo(() => Object.fromEntries(farmers.map((f) => [f.id, f])), [farmers]);
  const filtered = useMemo(() => {
    let arr = [...products];
    if (q.trim()) { const t = q.toLowerCase(); arr = arr.filter((p) => p.name.toLowerCase().includes(t)); }
    if (category !== "All") { arr = arr.filter((p) => p.category === category); }
    switch (sort) {
      case "priceAsc": arr.sort((a, b) => a.priceINR - b.priceINR); break;
      case "priceDesc": arr.sort((a, b) => b.priceINR - a.priceINR); break;
      case "ratingDesc": arr.sort((a, b) => b.rating - a.rating); break;
      default: break;
    }
    return arr;
  }, [products, q, category, sort]);

  // Cart handlers
  function addToCart(p) {
    setCart((prev) => {
      const existing = prev.find((x) => x.id === p.id);
      if (existing) return prev.map((x) => (x.id === p.id ? { ...x, qty: x.qty + 1 } : x));
      return [...prev, { ...p, qty: Math.max(1, p.moq || 1) }];
    });
    setCartOpen(true);
  }
  function setQty(id, qty) { setCart((prev) => prev.map((x) => (x.id === id ? { ...x, qty } : x))); }
  function removeItem(id) { setCart((prev) => prev.filter((x) => x.id !== id)); }
  function checkout() {
    const totalINR = cart.reduce((s, it) => s + it.priceINR * it.qty, 0);
    alert(`Demo checkout successful! Total: ${toCurrency(totalINR, currency)}\n(Connect Razorpay/Stripe/UPI in production)`);
    setCart([]); setCartOpen(false);
  }

  // RFQ handlers
  function submitRFQ(data) {
    const rfq = { id: Math.random().toString(36).slice(2), date: new Date().toISOString(), ...data };
    setRfqs(prev => [rfq, ...prev]);
    alert("RFQ submitted! Farmers will respond with quotes in the dashboard (demo).");
  }

  // Farmer CRUD (minimal)
  function saveProduct(newP) { setProducts((prev) => [newP, ...prev]); setActiveTab("Shop"); }

  // Pages
  const HomePage = (
    <>
      <Hero3D />
      <section id="shop" className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-6">
        <SectionTitle title="Shop fresh produce" subtitle="Retail & bulk purchasing" />
        <Filters q={q} setQ={setQ} category={category} setCategory={setCategory} sort={sort} setSort={setSort} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((p) => (
            <ProductCard key={p.id} p={p} farmer={farmersById[p.farmerId]} onAdd={addToCart} onBulk={(prod)=>setRfqProduct(prod)} />
          ))}
        </div>
      </section>
      <ServicesPage />
    </>
  );

  const ShopPage = (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-6">
      <SectionTitle title="Marketplace" subtitle="Direct deals with verified farmers" />
      <Filters q={q} setQ={setQ} category={category} setCategory={setCategory} sort={sort} setSort={setSort} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filtered.map((p) => (
          <ProductCard key={p.id} p={p} farmer={farmersById[p.farmerId]} onAdd={addToCart} onBulk={(prod)=>setRfqProduct(prod)} />
        ))}
      </div>
      <div className="mt-8 rounded-3xl border border-blue-100 p-5 bg-white">
        <h3 className="font-semibold text-blue-900">Recent RFQs</h3>
        {rfqs.length===0 ? (
          <p className="text-sm text-blue-900/70">No RFQs yet. Use the Bulk button on a product to submit one.</p>
        ) : (
          <ul className="text-sm text-blue-900/80 list-disc ml-5">
            {rfqs.map(r => <li key={r.id}>Req: {r.qty} of product #{r.productId} to {r.location} · {new Date(r.date).toLocaleString()}</li>)}
          </ul>
        )}
      </div>
    </section>
  );

  const Dashboards = (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-6">
      <SectionTitle title="Dashboards" subtitle="Buyer & Farmer tools" />
      <Tabs tabs={["Buyer Dashboard", "Farmer Dashboard"]} active={activeTab} onChange={setActiveTab} />
      {activeTab === "Buyer Dashboard" && (
        <div className="mt-6 grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <div className="rounded-3xl border border-blue-100 p-4">
              <h3 className="font-semibold text-blue-900">RFQs</h3>
              {rfqs.length===0 ? <p className="text-sm text-blue-900/70">You haven't posted any RFQs yet.</p> : (
                <ul className="mt-2 list-disc ml-5 text-sm text-blue-900/80">{rfqs.map(r=> <li key={r.id}>#{r.id.slice(0,5)} · {r.qty} units to {r.location} · Target {r.target || '—'}</li>)}</ul>
              )}
            </div>
            <div className="rounded-3xl border border-blue-100 p-4">
              <h3 className="font-semibold text-blue-900">Recent Orders</h3>
              <p className="text-sm text-blue-900/70">(Demo) Orders will appear here after checkout.</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded-3xl border border-blue-100 p-4"><h3 className="font-semibold text-blue-900">Wallet</h3><div className="text-2xl font-bold text-pink-700">{toCurrency(0, currency)}</div><p className="text-sm text-blue-900/70">(Demo) Link UPI/cards in production.</p></div>
          </div>
        </div>
      )}
      {activeTab === "Farmer Dashboard" && (
        <div className="mt-6 grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-3xl border border-blue-100 p-4">
              <h3 className="font-semibold text-blue-900">Add a New Product</h3>
              <p className="text-sm text-blue-900/70 mb-3">Include bulk info (MOQ, tiers) via the form.</p>
              <FarmerForm onSave={saveProduct} farmers={farmers} />
            </div>
            <div className="rounded-3xl border border-blue-100 p-4">
              <h3 className="font-semibold text-blue-900">Your Products</h3>
              <div className="mt-3 grid sm:grid-cols-2 gap-4">
                {products.filter((p) => p.farmerId === farmers[0].id).map((p) => (
                  <div key={p.id} className="border border-blue-100 rounded-2xl p-3">
                    <div className="flex gap-3">
                      <img src={p.image} alt={p.name} className="h-16 w-16 rounded-xl object-cover" />
                      <div className="flex-1">
                        <div className="font-medium line-clamp-1">{p.name}</div>
                        <div className="text-sm text-blue-900/70">{toCurrency(p.priceINR, currency)} · Stock {p.stock} · MOQ {p.moq}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded-3xl border border-blue-100 p-4"><h3 className="font-semibold text-blue-900">Sales Summary</h3><div className="text-sm text-blue-900/70">(Demo) Connect to real orders to populate.</div></div>
            <div className="rounded-3xl border border-blue-100 p-4"><h3 className="font-semibold text-blue-900">Payouts</h3><p className="text-sm text-blue-900/70">(Demo) Link bank/UPI for withdrawals. Use Razorpay/Stripe in prod.</p></div>
          </div>
        </div>
      )}
    </section>
  );

  return (
    <div className="min-h-screen bg-white text-blue-900">
      <Header onOpenCart={() => setCartOpen(true)} cartCount={cart.length} page={page} setPage={setPage} currency={currency} setCurrency={setCurrency} />
      <main>
        {page === "Home" && HomePage}
        {page === "Shop" && ShopPage}
        {page === "Services" && <ServicesPage />}
        {page === "Pricing" && <PricingPage currency={currency} />}
        {page === "About" && <AboutPage />}
        {page === "Contact" && <ContactPage />}
        {page === "Home" && <div className="mx-auto max-w-7xl px-4 sm:px-6">{Dashboards}</div>}
      </main>

      <footer className="border-t border-blue-100 mt-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 text-sm text-blue-900/70 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div>© {new Date().getFullYear()} Farmers Market</div>
          <div className="flex gap-4">
            <button onClick={()=>setPage("About")} className="hover:text-pink-700">About</button>
            <button onClick={()=>setPage("Pricing")} className="hover:text-pink-700">Pricing</button>
            <button onClick={()=>setPage("Contact")} className="hover:text-pink-700">Contact</button>
          </div>
        </div>
      </footer>

      <CartDrawer open={cartOpen} items={cart} onClose={() => setCartOpen(false)} onQty={setQty} onRemove={removeItem} onCheckout={checkout} currency={currency} />
      <RFQModal open={!!rfqProduct} product={rfqProduct} onClose={()=>setRfqProduct(null)} onSubmit={submitRFQ} />
    </div>
  );
}
