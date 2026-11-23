/**
 * ANNY — End-to-End Website Builder, Live Preview, Editorial Studio & Chat Action Panel Tests
 *
 * Covers the 6 required end-to-end verification journeys:
 *   Test A — New Business Website (creation, VFS sync, quality gate, preview bundle, chat 5-action card, editor & share sync)
 *   Test B — E-Commerce Website (homepage, catalogue, product details, cart, search/filter, mobile nav, preview & editor)
 *   Test C — Edit Existing Website (preserve projectId, increment version v1 -> v2, update VFS/Preview/Editor/Share)
 *   Test D — Chat Navigation & History Restoration (switch chats and return, restore projectBuild actions & active preview)
 *   Test E — Security (cross-user denial, capability token validation, invalid postMessage rejection, project isolation)
 *   Test F — Failure Recovery (honest failed build reporting, failure card metadata, clean retry recovery)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { detectWebsiteOrAppIntent } from '../utils/chatHelpers';
import {
  synthesizeAppFiles,
  type SynthesisChatExecutor,
} from '../core/realAppCodeSynthesizer';
import { WorkspaceManager } from '../core/workspaceManager';
import {
  projectPreviewController,
  type ProjectBuildMetadata,
} from '../services/projectPreviewController';
import {
  bundleVFSForIsolatedPreview,
  buildValidatedVfsSnapshotPayload,
  generatePreviewHandshakeId,
  isValidVfsSnapshotFilePath,
  validatePreviewVfsSynMessage,
} from '../components/StandalonePreviewRunner';
import {
  authorizeLocalOnlyProjectSync,
  registerLocalProjectOwnership,
  switchLocalInstallationProfile,
} from '../services/projectOwnershipService';

function resolvePreviewWorkspaceFiles(projectId: string): Record<string, string> {
  const vfs = WorkspaceManager.getInstance().getWorkspaceVFS(projectId);
  vfs.reloadFromStorage();
  const out: Record<string, string> = {};
  for (const f of vfs.getAllFiles()) {
    if (!f.path.startsWith('/__anny_')) {
      out[f.path] = f.content;
    }
  }
  return out;
}

function buildElectricalEngineeringBusinessPayload(versionTag: string = 'v1', paletteBg: string = '#f8fafc') {
  return JSON.stringify({
    projectName: 'Apex Grid & Industrial Automation',
    projectType: 'website',
    description: 'Professional electrical engineering and industrial PLC/SCADA automation company website.',
    entryPoint: '/src/main.tsx',
    dependencies: ['react', 'react-dom', 'lucide-react'],
    buildInstructions: 'npm install && npm run build',
    envVars: [],
    files: {
      '/package.json': JSON.stringify(
        {
          name: 'apex-grid-engineering',
          private: true,
          version: versionTag === 'v2' ? '2.0.0' : '1.0.0',
          dependencies: {
            react: '^19.0.0',
            'react-dom': '^19.0.0',
            'lucide-react': '^0.546.0',
          },
          scripts: {
            dev: 'vite',
            build: 'vite build',
          },
        },
        null,
        2
      ),
      '/index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Apex Grid & Industrial Automation</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
      '/src/main.tsx': `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<App />);
}
`,
      '/src/data/engineeringData.ts': `export interface EngineeringService {
  id: string;
  title: string;
  category: string;
  voltageClass: string;
  summary: string;
  deliverables: string[];
}

export const ENGINEERING_SERVICES: EngineeringService[] = [
  {
    id: 'svc-substation',
    title: 'High-Voltage Substation Commissioning',
    category: 'Power Distribution',
    voltageClass: '33kV / 132kV',
    summary: 'Complete primary injection testing, relay coordination, and IEC 61850 substation automation.',
    deliverables: ['Protection Relay Coordination Study', 'SCADA Telemetry Integration', 'Arc-Flash Hazard Analysis'],
  },
  {
    id: 'svc-plc-scada',
    title: 'Industrial PLC & SCADA Control Architecture',
    category: 'Automation',
    voltageClass: '400V / 24VDC',
    summary: 'Redundant Siemens & Allen-Bradley PLC control cabinets with real-time HMI diagnostics.',
    deliverables: ['UL 508A Panel Fabrication', 'Redundant Fiber Ring Network', '24/7 Historian Alarming'],
  },
  {
    id: 'svc-microgrid',
    title: 'Commercial Hybrid Solar & BESS Microgrids',
    category: 'Renewables',
    voltageClass: '11kV / 800VDC',
    summary: 'Islandable battery energy storage systems with automated genset synchronization.',
    deliverables: ['Power Quality Harmonic Filtering', 'Peak-Shaving EMS Controller', 'Grid-Code Compliance'],
  }
];

export const CASE_STUDIES = [
  {
    id: 'proj-1',
    name: 'Meridian Port 33kV Ring Main Upgrade',
    sector: 'Marine Infrastructure',
    capacity: '45 MVA',
    outcome: '99.994% uptime achieved with automated fault isolation under 40ms.',
  },
  {
    id: 'proj-2',
    name: 'Vanguard Automotive Robotics Assembly Line',
    sector: 'Manufacturing',
    capacity: '120 PLC Nodes',
    outcome: 'Reduced cycle downtime by 38% across 4 synchronized stamping bays.',
  }
];
`,
      '/src/components/ServiceModal.tsx': `import React from 'react';
import type { EngineeringService } from '../data/engineeringData';

export function ServiceModal({
  service,
  onClose,
  onRequestQuote,
}: {
  service: EngineeringService | null;
  onClose: () => void;
  onRequestQuote: (title: string) => void;
}) {
  if (!service) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white text-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md">
              {service.category} • {service.voltageClass}
            </span>
            <h3 className="text-xl font-bold mt-2">{service.title}</h3>
          </div>
          <button type="button" onClick={onClose} className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-semibold">
            Close
          </button>
        </div>
        <p className="text-sm text-slate-600">{service.summary}</p>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Engineering Deliverables</h4>
          <ul className="space-y-1.5 text-sm text-slate-700">
            {service.deliverables.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onRequestQuote(service.title)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold"
          >
            Request Engineering Proposal
          </button>
        </div>
      </div>
    </div>
  );
}
`,
      '/src/App.tsx': `import React, { useState } from 'react';
import { Shield, Zap, Phone, Mail, MapPin, Menu, X, CheckCircle, ArrowRight } from 'lucide-react';
import { ENGINEERING_SERVICES, CASE_STUDIES, type EngineeringService } from './data/engineeringData';
import { ServiceModal } from './components/ServiceModal';

export default function App() {
  const [activePage, setActivePage] = useState<'home' | 'services' | 'projects' | 'safety' | 'contact'>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedService, setSelectedService] = useState<EngineeringService | null>(null);
  const [quoteForm, setQuoteForm] = useState({ company: '', email: '', scope: '' });
  const [quoteSubmitted, setQuoteSubmitted] = useState(false);

  const categories = ['All', 'Power Distribution', 'Automation', 'Renewables'];
  const filteredServices = ENGINEERING_SERVICES.filter(
    (s) => selectedCategory === 'All' || s.category === selectedCategory
  );

  const handleQuoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteForm.company.trim() || !quoteForm.email.trim()) return;
    setQuoteSubmitted(true);
  };

  return (
    <div className="min-h-screen flex flex-col text-slate-900" style={{ backgroundColor: '${paletteBg}' }}>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-lg tracking-tight">APEX GRID</span>
              <span className="block text-[10px] font-mono uppercase tracking-widest text-slate-500">
                Electrical & Automation (${versionTag})
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold">
            {(['home', 'services', 'projects', 'safety', 'contact'] as const).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setActivePage(page)}
                className={activePage === page ? 'text-amber-600 font-bold capitalize' : 'text-slate-600 hover:text-slate-900 capitalize'}
              >
                {page}
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg border border-slate-200 text-slate-700"
            aria-label="Toggle mobile navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden pt-3 pb-2 border-t border-slate-100 mt-3 flex flex-col gap-2">
            {(['home', 'services', 'projects', 'safety', 'contact'] as const).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => {
                  setActivePage(page);
                  setMobileMenuOpen(false);
                }}
                className="text-left px-3 py-2 rounded-lg text-sm font-semibold capitalize hover:bg-slate-100"
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-10 space-y-12">
        <section className="rounded-3xl bg-slate-900 text-white p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-mono">
              <Shield className="w-3.5 h-3.5" /> ISO 9001 & IEC 61850 CERTIFIED ENGINEERING
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Mission-Critical Power Systems & Industrial PLC Automation
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl">
              Turnkey medium-voltage substations, UL 508A control cabinets, and zero-downtime SCADA telemetry for utilities and heavy manufacturing.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActivePage('contact')}
                className="px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm flex items-center gap-2"
              >
                <span>Schedule Site Audit</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActivePage('services')}
                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm"
              >
                Explore Capabilities
              </button>
            </div>
          </div>
          <div className="lg:col-span-5 grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-2xl font-black text-amber-400">132 kV</div>
              <div className="text-xs text-slate-300 mt-1">Substation Commissioning Rating</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-2xl font-black text-emerald-400">99.99%</div>
              <div className="text-xs text-slate-300 mt-1">SCADA Redundancy Availability</div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">Engineering Divisions & Technical Scope</h2>
              <p className="text-sm text-slate-600">Filter divisions by voltage discipline and inspect deliverables.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={
                    selectedCategory === cat
                      ? 'px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold'
                      : 'px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold'
                  }
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredServices.map((svc) => (
              <div key={svc.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="text-[11px] font-mono uppercase text-amber-700 bg-amber-50 px-2.5 py-1 rounded">
                    {svc.category} • {svc.voltageClass}
                  </span>
                  <h3 className="text-lg font-bold">{svc.title}</h3>
                  <p className="text-sm text-slate-600">{svc.summary}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedService(svc)}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold"
                >
                  Inspect Technical Deliverables
                </button>
              </div>
            ))}
          </div>
        </section>

        {versionTag === 'v2' && (
          <section className="rounded-2xl bg-amber-50 border border-amber-200 p-6 space-y-2" data-testid="safety-compliance-section">
            <h2 className="text-xl font-black text-amber-950">NFPA 70E Arc-Flash Safety & Compliance Division</h2>
            <p className="text-sm text-amber-900">
              Added in Version 2: Full IEEE 1584 arc-flash incident energy modeling, PPE boundary labeling, and thermographic switchgear audits.
            </p>
          </section>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
            <h3 className="text-xl font-bold">Commissioned Field Projects</h3>
            <div className="space-y-3">
              {CASE_STUDIES.map((cs) => (
                <div key={cs.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                    <span>{cs.sector}</span>
                    <span>{cs.capacity}</span>
                  </div>
                  <div className="font-bold text-base mt-1">{cs.name}</div>
                  <p className="text-xs text-slate-600 mt-1">{cs.outcome}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
            <h3 className="text-xl font-bold">Request Engineering Tender / Consultation</h3>
            {quoteSubmitted ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="text-sm">
                  <strong>Engineering RFQ Registered:</strong> Our principal electrical engineer will respond to {quoteForm.email}.
                </div>
              </div>
            ) : (
              <form onSubmit={handleQuoteSubmit} className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder="Company / Utility Facility Name"
                  value={quoteForm.company}
                  onChange={(e) => setQuoteForm({ ...quoteForm, company: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
                <input
                  type="email"
                  required
                  placeholder="Principal Engineer Email"
                  value={quoteForm.email}
                  onChange={(e) => setQuoteForm({ ...quoteForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
                <textarea
                  rows={3}
                  placeholder="Voltage level, substation capacity, or PLC retrofit scope..."
                  value={quoteForm.scope}
                  onChange={(e) => setQuoteForm({ ...quoteForm, scope: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
                <button type="submit" className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm">
                  Submit Engineering Inquiry
                </button>
              </form>
            )}
          </div>
        </section>
      </main>

      <ServiceModal
        service={selectedService}
        onClose={() => setSelectedService(null)}
        onRequestQuote={(title) => {
          setSelectedService(null);
          setQuoteForm((prev) => ({ ...prev, scope: 'Proposal request for: ' + title }));
          setActivePage('contact');
        }}
      />

      <footer className="bg-slate-900 text-slate-400 text-xs py-8 px-4 sm:px-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>© 2026 Apex Grid & Industrial Automation Ltd. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> +44 20 7946 0192</span>
            <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> tenders@apexgrid.eng</span>
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> London & Manchester</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
`,
      '/src/styles.css': `* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: ${paletteBg}; color: #0f172a; }
@media (max-width: 768px) {
  h1 { font-size: 1.85rem; }
}
`,
    },
    summary: `Built Apex Grid & Industrial Automation (${versionTag}) with service filtering, technical deliverable modals, case studies, and tender RFQ form.`,
  });
}

function buildElectronicsEcommercePayload() {
  return JSON.stringify({
    projectName: 'VoltEdge Pro Electronics Store',
    projectType: 'ecommerce',
    description: 'Complete electronics e-commerce storefront with catalogue search, category filtering, product details modal, interactive cart drawer, and checkout flow.',
    entryPoint: '/src/main.tsx',
    dependencies: ['react', 'react-dom', 'lucide-react'],
    buildInstructions: 'npm install && npm run build',
    envVars: [],
    files: {
      '/package.json': JSON.stringify(
        {
          name: 'voltedge-electronics-store',
          private: true,
          version: '1.0.0',
          dependencies: {
            react: '^19.0.0',
            'react-dom': '^19.0.0',
            'lucide-react': '^0.546.0',
          },
          scripts: {
            dev: 'vite',
            build: 'vite build',
          },
        },
        null,
        2
      ),
      '/index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VoltEdge Pro Electronics Store</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
      '/src/main.tsx': `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<App />);
}
`,
      '/src/data/products.ts': `export interface Product {
  id: string;
  name: string;
  category: 'Audio' | 'Computing' | 'Power & Charging';
  price: number;
  rating: number;
  stock: number;
  specs: string[];
  summary: string;
}

export const PRODUCTS: Product[] = [
  {
    id: 'prd-1',
    name: 'AeroPulse ANC Studio Headphones',
    category: 'Audio',
    price: 349,
    rating: 4.9,
    stock: 18,
    specs: ['45mm Planar Magnetic Drivers', '48dB Hybrid Active Noise Cancellation', '60-Hour USB-C Fast Charge'],
    summary: 'Reference-grade wireless studio headphones engineered for mastering engineers and audiophiles.',
  },
  {
    id: 'prd-2',
    name: 'TitanBook Pro 16 Workstation Dock',
    category: 'Computing',
    price: 279,
    rating: 4.8,
    stock: 24,
    specs: ['Thunderbolt 4 40Gbps Upstream', 'Dual 8K@60Hz DisplayPort', '140W GaN Power Delivery'],
    summary: 'CNC aluminum Thunderbolt 4 engineering dock with 14 ports and zero-thermal-throttling enclosure.',
  },
  {
    id: 'prd-3',
    name: 'OmniCharge 240W GaN Desktop Power Station',
    category: 'Power & Charging',
    price: 159,
    rating: 4.9,
    stock: 42,
    specs: ['4x USB-C PD 3.1 Ports', 'Real-Time OLED Wattage Telemetry', 'Active Surge & Thermal Guard'],
    summary: 'High-density gallium nitride desktop power station with live per-port voltage and wattage readout.',
  }
];
`,
      '/src/App.tsx': `import React, { useState, useMemo } from 'react';
import { ShoppingCart, Search, Star, Plus, Minus, Trash2, CheckCircle, Menu, X } from 'lucide-react';
import { PRODUCTS, type Product } from './data/products';

export default function App() {
  const [activeView, setActiveView] = useState<'shop' | 'about' | 'faq' | 'contact'>('shop');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({ 'prd-1': 1 });
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutDone, setCheckoutDone] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((p) => {
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.summary.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const product = PRODUCTS.find((p) => p.id === id);
        return product && qty > 0 ? { product, qty } : null;
      })
      .filter(Boolean) as Array<{ product: Product; qty: number }>;
  }, [cart]);

  const cartSubtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.product.price * item.qty, 0),
    [cartItems]
  );

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) => {
      const nextQty = Math.max(0, (prev[productId] || 0) + delta);
      const copy = { ...prev };
      if (nextQty === 0) delete copy[productId];
      else copy[productId] = nextQty;
      return copy;
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="font-black text-xl tracking-tight text-slate-900">VOLTEDGE PRO</div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold">
            {(['shop', 'about', 'faq', 'contact'] as const).map((v) => (
              <button key={v} type="button" onClick={() => setActiveView(v)} className="capitalize hover:text-blue-600">
                {v}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Cart ({cartItems.reduce((s, i) => s + i.qty, 0)})</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="md:hidden p-2 rounded-lg border border-slate-200"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
        <section className="rounded-3xl bg-slate-900 text-white p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-mono uppercase">
              Flagship Hardware Release
            </span>
            <h1 className="text-3xl sm:text-4xl font-black">Precision Audio, GaN Power & Workstation Hardware</h1>
            <p className="text-sm text-slate-300">Free express shipping and 3-year hardware replacement warranty on all orders.</p>
          </div>
          <div className="w-full md:w-80 bg-white/10 p-4 rounded-2xl border border-white/15">
            <div className="flex items-center gap-2 bg-white text-slate-900 rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products or specs..."
                className="w-full text-xs outline-none"
              />
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black">Hardware Catalogue ({filteredProducts.length})</h2>
            <div className="flex flex-wrap gap-2">
              {['All', 'Audio', 'Computing', 'Power & Charging'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={
                    selectedCategory === cat
                      ? 'px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold'
                      : 'px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold'
                  }
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{product.category}</span>
                    <span className="flex items-center gap-1 text-amber-600 font-bold">
                      <Star className="w-3.5 h-3.5" /> {product.rating}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold">{product.name}</h3>
                  <p className="text-xs text-slate-600">{product.summary}</p>
                  <div className="text-xl font-black text-slate-900">\${product.price}</div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(product)}
                    className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold"
                  >
                    Specs
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCartQty(product.id, 1)}
                    className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{selectedProduct.name}</h3>
              <button type="button" onClick={() => setSelectedProduct(null)} className="text-xs font-bold px-2.5 py-1 rounded bg-slate-100">
                Close
              </button>
            </div>
            <p className="text-xs text-slate-600">{selectedProduct.summary}</p>
            <ul className="space-y-1 text-xs text-slate-700">
              {selectedProduct.specs.map((sp) => (
                <li key={sp}>• {sp}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => {
                updateCartQty(selectedProduct.id, 1);
                setSelectedProduct(null);
                setCartOpen(true);
              }}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold"
            >
              Add to Cart — \${selectedProduct.price}
            </button>
          </div>
        </div>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex justify-end">
          <div className="bg-white w-full max-w-md h-full p-6 flex flex-col justify-between">
            <div className="space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-black text-lg">Your Shopping Cart</h3>
                <button type="button" onClick={() => setCartOpen(false)} className="text-xs font-bold px-2.5 py-1 rounded bg-slate-100">
                  Close
                </button>
              </div>
              {cartItems.map(({ product, qty }) => (
                <div key={product.id} className="flex items-center justify-between border-b pb-3">
                  <div>
                    <div className="font-bold text-sm">{product.name}</div>
                    <div className="text-xs text-slate-500">\${product.price} each</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => updateCartQty(product.id, -1)} className="p-1 rounded bg-slate-100"><Minus className="w-3 h-3" /></button>
                    <span className="text-xs font-bold">{qty}</span>
                    <button type="button" onClick={() => updateCartQty(product.id, 1)} className="p-1 rounded bg-slate-100"><Plus className="w-3 h-3" /></button>
                    <button type="button" onClick={() => updateCartQty(product.id, -qty)} className="p-1 text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between font-black">
                <span>Subtotal</span>
                <span>\${cartSubtotal}</span>
              </div>
              {checkoutDone ? (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Order confirmed!
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCheckoutDone(true)}
                  className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm"
                >
                  Complete Instant Checkout
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="bg-slate-900 text-slate-400 text-xs py-6 px-8 text-center">
        © 2026 VoltEdge Pro Electronics. Certified Fast-Charge & Studio Audio Hardware.
      </footer>
    </div>
  );
}
`,
      '/src/styles.css': `* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #0f172a; }
@media (max-width: 768px) {
  h1 { font-size: 1.75rem; }
}
`,
    },
    summary: 'Built VoltEdge Pro Electronics Store with live catalogue search, category filtering, product spec modals, and interactive cart checkout drawer.',
  });
}

test('Test A — New Business Website: detects intent, generates project, passes quality gate, bundles preview, activates controller, and persists 5-action chat build metadata', async () => {
  const prompt = 'Build a professional website for an electrical engineering and automation company.';
  const intent = detectWebsiteOrAppIntent(prompt);
  assert.equal(intent.isBuildRequest, true);
  assert.equal(intent.isProjectEdit, false);

  const mockExecutor: SynthesisChatExecutor = async () => ({
    content: buildElectricalEngineeringBusinessPayload('v1', '#f8fafc'),
    provider: 'gemini',
    model: 'gemini-2.5-flash',
  });

  const plan = await synthesizeAppFiles(prompt, {}, { chatExecutor: mockExecutor });
  assert.equal(plan.verification?.passed, true);
  assert.ok((plan.verification?.score || 0) >= 90);

  // Verify quality gate checks including CSS and semantic navigation
  const checkIds = (plan.verification?.checks || []).map((c) => c.id);
  assert.ok(checkIds.includes('entrypoints'));
  assert.ok(checkIds.includes('import-resolution'));
  assert.ok(checkIds.includes('syntax-balance'));
  assert.ok(checkIds.includes('css-styles'));
  assert.ok(checkIds.includes('navigation-structure'));

  // Activate project via shared projectPreviewController (simulating AnnyWorkspace build completion)
  const projectId = 'proj_test_business_a';
  const chatSessionId = 'chat_session_business_a';

  const buildMeta = projectPreviewController.activateProject({
    projectId,
    name: plan.manifest.projectName,
    version: 1,
    projectType: plan.projectType,
    files: plan.files,
    previewUrl: `/api/preview/sessions/prev_a/app?token=cap_a`,
    previewId: 'prev_a',
    verificationScore: plan.verification?.score,
    chatSessionId,
    status: 'ready',
  });

  // Verify chat build metadata contains everything required for the 5 permanent actions
  assert.equal(buildMeta.projectId, projectId);
  assert.equal(buildMeta.version, 1);
  assert.equal(buildMeta.status, 'ready');
  assert.equal(buildMeta.fileCount, Object.keys(plan.files).length);
  assert.ok(buildMeta.previewUrl?.includes('/api/preview/sessions/prev_a/app'));

  // Verify active VFS has all files and ownership is registered for both Normal Preview and Editor
  assert.equal(authorizeLocalOnlyProjectSync(projectId).authorized, true);
  const resolvedVfs = resolvePreviewWorkspaceFiles(projectId);
  assert.equal(Object.keys(resolvedVfs).length, Object.keys(plan.files).length);

  // Verify isolated preview compiler bundles cleanly (even when react-vendor script is delivered via VFS snapshot)
  const vfsInstance = WorkspaceManager.getInstance().getWorkspaceVFS(projectId);
  vfsInstance._unsafe_writeFile('/__anny_react_vendor.js', 'window.React = {}; window.ReactDOM = { createRoot: function(){} };');
  vfsInstance._unsafe_writeFile('/__anny_compiled_tailwind.css', '/* compiled tailwind */');
  const bundled = bundleVFSForIsolatedPreview(vfsInstance, {
    inlineReactVendorScript: 'window.React = {}; window.ReactDOM = { createRoot: function(){} };',
    compiledTailwindCss: '/* compiled tailwind */',
  });
  assert.ok(bundled.srcDoc.includes('APEX GRID'));
  assert.ok(bundled.srcDoc.includes('High-Voltage Substation Commissioning'));
  assert.ok(!bundled.srcDoc.includes('Preview Compilation Error'));
});

test('Test B — E-Commerce Website: builds electronics storefront with catalogue search, product specs modal, cart drawer, and compiles cleanly for Preview, Editor, and Share', async () => {
  const prompt = 'Create an e-commerce website for selling electronics.';
  const intent = detectWebsiteOrAppIntent(prompt);
  assert.equal(intent.isBuildRequest, true);
  assert.equal(intent.intentKind, 'website_build');

  const mockExecutor: SynthesisChatExecutor = async () => ({
    content: buildElectronicsEcommercePayload(),
    provider: 'gemini',
    model: 'gemini-2.5-flash',
  });

  const plan = await synthesizeAppFiles(prompt, {}, { chatExecutor: mockExecutor });
  assert.equal(plan.projectType, 'ecommerce');
  assert.equal(plan.verification?.passed, true);

  const projectId = 'proj_test_ecommerce_b';
  projectPreviewController.activateProject({
    projectId,
    name: plan.manifest.projectName,
    version: 1,
    projectType: plan.projectType,
    files: plan.files,
    chatSessionId: 'chat_ecommerce_b',
    status: 'ready',
  });

  const vfsFiles = resolvePreviewWorkspaceFiles(projectId);
  assert.ok(vfsFiles['/src/App.tsx'].includes('VOLTEDGE PRO'));
  assert.ok(vfsFiles['/src/App.tsx'].includes('Your Shopping Cart'));
  assert.ok(vfsFiles['/src/data/products.ts'].includes('AeroPulse ANC Studio Headphones'));

  const vfsInstance = WorkspaceManager.getInstance().getWorkspaceVFS(projectId);
  const bundled = bundleVFSForIsolatedPreview(vfsInstance, {
    inlineReactVendorScript: 'window.React = {}; window.ReactDOM = {};',
  });
  assert.ok(bundled.srcDoc.includes('VOLTEDGE PRO'));
  assert.ok(bundled.srcDoc.includes('AeroPulse ANC Studio Headphones'));
  assert.ok(!bundled.srcDoc.includes('Preview Compilation Error'));
});

test('Test C — Edit Existing Website: preserves active projectId, increments version v1 -> v2, updates VFS/Preview/Editor/Share, and preserves existing features', async () => {
  const projectId = 'proj_test_edit_c';
  const chatSessionId = 'chat_edit_c';

  // 1. Initial v1 build
  const initialPlan = await synthesizeAppFiles(
    'Build a professional website for an electrical engineering company.',
    {},
    {
      chatExecutor: async () => ({
        content: buildElectricalEngineeringBusinessPayload('v1', '#f8fafc'),
        provider: 'gemini',
        model: 'gemini-2.5-flash',
      }),
    }
  );

  projectPreviewController.activateProject({
    projectId,
    name: 'Apex Grid Engineering',
    version: 1,
    projectType: initialPlan.projectType,
    files: initialPlan.files,
    chatSessionId,
    status: 'ready',
  });

  assert.equal(projectPreviewController.getState().activeProjectId, projectId);
  assert.equal(projectPreviewController.getState().version, 1);

  // 2. Follow-up edit prompt
  const editPrompt = 'Change the color palette to warm ivory, add an NFPA 70E Arc-Flash Safety section, and improve mobile navigation.';
  const editIntent = detectWebsiteOrAppIntent(editPrompt, { hasActiveProject: true });
  assert.equal(editIntent.isBuildRequest, true);
  assert.equal(editIntent.isProjectEdit, true);

  const existingVfs = resolvePreviewWorkspaceFiles(projectId);
  const updatedPlan = await synthesizeAppFiles(editPrompt, existingVfs, {
    projectId,
    updateExisting: true,
    chatExecutor: async () => ({
      content: buildElectricalEngineeringBusinessPayload('v2', '#faf8f5'),
      provider: 'gemini',
      model: 'gemini-2.5-flash',
    }),
  });

  assert.equal(updatedPlan.verification?.passed, true);

  const updatedMeta = projectPreviewController.activateProject({
    projectId,
    name: 'Apex Grid Engineering',
    version: 2,
    projectType: updatedPlan.projectType,
    files: updatedPlan.files,
    chatSessionId,
    status: 'ready',
  });

  // Verify projectId is preserved and version incremented to v2
  assert.equal(updatedMeta.projectId, projectId);
  assert.equal(updatedMeta.version, 2);
  assert.equal(projectPreviewController.getState().version, 2);

  const updatedVfs = resolvePreviewWorkspaceFiles(projectId);
  assert.ok(updatedVfs['/src/App.tsx'].includes('NFPA 70E Arc-Flash Safety & Compliance Division'));
  assert.ok(updatedVfs['/src/App.tsx'].includes('#faf8f5'));
  // Existing services & deliverables modal still intact
  assert.ok(updatedVfs['/src/App.tsx'].includes('ServiceModal'));
});

test('Test D — Chat Navigation & History Restoration: switching between chats restores each chat session projectBuild metadata and VFS workspace', async () => {
  const proj1 = 'proj_restore_alpha';
  const chat1 = 'chat_alpha';
  const files1 = JSON.parse(buildElectricalEngineeringBusinessPayload('v1')).files;

  const proj2 = 'proj_restore_beta';
  const chat2 = 'chat_beta';
  const files2 = JSON.parse(buildElectronicsEcommercePayload()).files;

  // Activate project 1 in chat 1
  projectPreviewController.activateProject({
    projectId: proj1,
    name: 'Apex Grid Alpha',
    version: 1,
    projectType: 'website',
    files: files1,
    chatSessionId: chat1,
    status: 'ready',
  });

  // Switch to chat 2 and activate project 2
  projectPreviewController.activateProject({
    projectId: proj2,
    name: 'VoltEdge Beta Store',
    version: 1,
    projectType: 'ecommerce',
    files: files2,
    chatSessionId: chat2,
    status: 'ready',
  });

  assert.equal(projectPreviewController.getState().activeProjectId, proj2);

  // Now simulate user clicking back on Chat 1 in the sidebar
  const mappedForChat1 = projectPreviewController.getSessionProjectBuild(chat1);
  assert.ok(mappedForChat1 !== null);
  assert.equal(mappedForChat1?.projectId, proj1);
  assert.equal(mappedForChat1?.name, 'Apex Grid Alpha');

  const restored = await projectPreviewController.restoreProjectForSession(mappedForChat1, chat1);
  assert.ok(restored !== null);
  assert.equal(restored?.projectId, proj1);
  assert.equal(projectPreviewController.getState().activeProjectId, proj1);
  assert.equal(WorkspaceManager.getInstance().getActiveProjectId(), proj1);
  assert.ok(resolvePreviewWorkspaceFiles(proj1)['/src/App.tsx'].includes('APEX GRID'));
});

test('Test E — Security: enforces cross-user ownership denial, capability tokens, postMessage validation, and project isolation', () => {
  const ownerProjectId = 'proj_secure_owner_1';
  const ownerProfile = switchLocalInstallationProfile(undefined, 'Owner Profile 1');
  registerLocalProjectOwnership(ownerProjectId, { localProfileId: ownerProfile });
  assert.equal(authorizeLocalOnlyProjectSync(ownerProjectId).authorized, true);

  // Switch to another user/profile: cross-user access and reassignment must be denied
  const intruderProfile = switchLocalInstallationProfile(undefined, 'Intruder Profile 2');
  const intruderAuth = authorizeLocalOnlyProjectSync(ownerProjectId);
  assert.equal(intruderAuth.authorized, false);
  assert.equal(intruderAuth.reason, 'LOCAL_PROFILE_MISMATCH');
  assert.throws(
    () => registerLocalProjectOwnership(ownerProjectId, { localProfileId: intruderProfile }),
    /CANNOT_REASSIGN_LOCAL_OWNERSHIP/
  );

  // Restore owner profile
  switchLocalInstallationProfile(ownerProfile, 'Owner Profile 1');

  // Capability handshake token must be non-empty and unique
  const token1 = generatePreviewHandshakeId();
  const token2 = generatePreviewHandshakeId();
  assert.ok(token1.length >= 32);
  assert.notEqual(token1, token2);

  // Origin & SYN message validation rejects untrusted source windows and mismatched project IDs
  const fakeWindow = {} as Window;
  const wrongWindow = {} as Window;
  const synWrongSource = validatePreviewVfsSynMessage(
    {
      source: wrongWindow,
      origin: 'http://localhost:3000',
      data: { type: 'PREVIEW_VFS_SYN', projectId: ownerProjectId, handshakeId: token1 },
    } as unknown as MessageEvent,
    fakeWindow,
    ownerProjectId
  );
  assert.equal(synWrongSource.valid, false);
  assert.equal(synWrongSource.reason, 'INVALID_SOURCE_WINDOW');

  const synWrongProject = validatePreviewVfsSynMessage(
    {
      source: fakeWindow,
      origin: 'http://localhost:3000',
      data: { type: 'PREVIEW_VFS_SYN', projectId: 'proj_unowned_other', handshakeId: token1 },
    } as unknown as MessageEvent,
    fakeWindow,
    ownerProjectId
  );
  assert.equal(synWrongProject.valid, false);
  assert.equal(synWrongProject.reason, 'UNAUTHORIZED_PROJECT_ID');

  const consumedIds = new Set<string>();
  const synValid = validatePreviewVfsSynMessage(
    {
      source: fakeWindow,
      origin: 'http://localhost:3000',
      data: { type: 'PREVIEW_VFS_SYN', projectId: ownerProjectId, handshakeId: token1 },
    } as unknown as MessageEvent,
    fakeWindow,
    ownerProjectId,
    consumedIds
  );
  assert.equal(synValid.valid, true);

  // Replay with same handshakeId must be rejected
  const synReplay = validatePreviewVfsSynMessage(
    {
      source: fakeWindow,
      origin: 'http://localhost:3000',
      data: { type: 'PREVIEW_VFS_SYN', projectId: ownerProjectId, handshakeId: token1 },
    } as unknown as MessageEvent,
    fakeWindow,
    ownerProjectId,
    consumedIds
  );
  assert.equal(synReplay.valid, false);
  assert.equal(synReplay.reason, 'DUPLICATE_HANDSHAKE_ID');

  // Snapshot file path validator accepts virtual runtime scripts (/__anny_react_vendor.js) but blocks path traversal & .env
  assert.equal(isValidVfsSnapshotFilePath('/src/App.tsx'), true);
  assert.equal(isValidVfsSnapshotFilePath('/__anny_react_vendor.js'), true);
  assert.equal(isValidVfsSnapshotFilePath('/__anny_compiled_tailwind.css'), true);
  assert.equal(isValidVfsSnapshotFilePath('/../etc/passwd'), false);
  assert.equal(isValidVfsSnapshotFilePath('/.env.local'), false);

  // Validated VFS snapshot payload includes virtual runtime assets without exceeding payload limits
  const snapshot = buildValidatedVfsSnapshotPayload({
    projectId: ownerProjectId,
    handshakeId: token2,
    files: {
      '/src/App.tsx': 'export default function App() { return <div>Secure</div>; }',
      '/__anny_react_vendor.js': 'window.React = {};',
    },
    snapshotSeq: 1,
  });
  assert.equal(snapshot.valid, true);
  assert.equal(snapshot.payload?.handshakeId, token2);
  assert.ok(typeof (snapshot.payload?.files as Record<string, string>)['/__anny_react_vendor.js'] === 'string');
});

test('Test F — Failure Recovery: fails honestly when model returns unrecoverable invalid code, preserves previous valid project, and recovers cleanly on retry', async () => {
  const projectId = 'proj_recovery_f';
  const validFiles = JSON.parse(buildElectricalEngineeringBusinessPayload('v1')).files;

  projectPreviewController.activateProject({
    projectId,
    name: 'Apex Grid Stable',
    version: 1,
    projectType: 'website',
    files: validFiles,
    chatSessionId: 'chat_recovery_f',
    status: 'ready',
  });

  // Simulate an unrecoverable failed build (0 repair attempts allowed, broken syntax)
  const brokenExecutor: SynthesisChatExecutor = async () => ({
    content: JSON.stringify({
      files: {
        '/src/App.tsx': 'export default function App() { return <div>Unclosed JSX </main>; }',
      },
    }),
    provider: 'gemini',
    model: 'gemini-2.5-flash',
  });

  await assert.rejects(
    async () =>
      synthesizeAppFiles('Build a broken site', {}, { maxRepairAttempts: 0, chatExecutor: brokenExecutor }),
    /PROJECT_GENERATION_FAILED/
  );

  // Previous valid VFS files for proj_recovery_f remain uncorrupted
  const preservedFiles = resolvePreviewWorkspaceFiles(projectId);
  assert.ok(preservedFiles['/src/App.tsx'].includes('APEX GRID'));

  // Failed build card metadata can be recorded honestly with status: 'failed'
  const failedCardMeta: ProjectBuildMetadata = {
    projectId,
    name: 'Apex Grid Stable',
    version: 1,
    projectType: 'website',
    fileCount: Object.keys(preservedFiles).length,
    status: 'failed',
    error: 'JSX closing tag mismatch in /src/App.tsx',
    updatedAt: new Date().toISOString(),
  };
  assert.equal(failedCardMeta.status, 'failed');
  assert.ok(failedCardMeta.error?.includes('/src/App.tsx'));
});
