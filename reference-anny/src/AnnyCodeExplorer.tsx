import React, { useState, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileJson,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Search,
  Code2,
  Terminal,
  X,
  Sparkles,
} from 'lucide-react';

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  language?: string;
  iconType?: 'tsx' | 'ts' | 'css' | 'json' | 'js' | 'md' | 'image';
  children?: FileNode[];
  content?: string;
}

const PROJECT_FILES: FileNode[] = [
  {
    id: 'src',
    name: 'src',
    type: 'folder',
    path: 'src',
    children: [
      {
        id: 'src-components',
        name: 'components',
        type: 'folder',
        path: 'src/components',
        children: [
          {
            id: 'header-tsx',
            name: 'Header.tsx',
            type: 'file',
            path: 'src/components/Header.tsx',
            language: 'typescript',
            iconType: 'tsx',
            content: `import React from 'react';
import { ShoppingBag, ShoppingCart, Heart, Search, User } from 'lucide-react';

interface HeaderProps {
  cartCount: number;
  onOpenCart: () => void;
}

export const Header: React.FC<HeaderProps> = ({ cartCount, onOpenCart }) => {
  return (
    <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#080b22]/90 sticky top-0 z-30 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <ShoppingBag className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-black tracking-wider text-white font-heading">
          SHOPIX
        </span>
      </div>

      <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
        <a href="#home" className="text-white font-bold hover:text-indigo-400 transition-colors">Home</a>
        <a href="#shop" className="hover:text-white transition-colors">Shop</a>
        <a href="#categories" className="hover:text-white transition-colors">Categories</a>
        <a href="#deals" className="hover:text-white transition-colors">Deals</a>
      </nav>

      <div className="flex items-center gap-4 text-slate-300">
        <Search className="w-4 h-4 hover:text-white cursor-pointer transition-colors" />
        <User className="w-4 h-4 hover:text-white cursor-pointer transition-colors" />
        <Heart className="w-4 h-4 hover:text-white cursor-pointer transition-colors" />
        <div className="relative cursor-pointer" onClick={onOpenCart}>
          <ShoppingCart className="w-5 h-5 hover:text-white transition-colors" />
          <span className="absolute -top-1.5 -right-2 bg-purple-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {cartCount}
          </span>
        </div>
      </div>
    </header>
  );
};`,
          },
          {
            id: 'hero-tsx',
            name: 'Hero.tsx',
            type: 'file',
            path: 'src/components/Hero.tsx',
            language: 'typescript',
            iconType: 'tsx',
            content: `import React from 'react';

interface HeroProps {
  onShopNow: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onShopNow }) => {
  return (
    <div className="p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-blue-950/30 border-b border-white/10">
      <div className="space-y-5">
        <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-bold uppercase tracking-widest">
          NEW COLLECTION 2026
        </span>
        <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight">
          Discover Amazing <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 text-transparent bg-clip-text">Products</span>
        </h1>
        <p className="text-sm text-slate-300 leading-relaxed max-w-lg">
          Shop the latest tech, fashion, and lifestyle collections with instant checkout and global delivery.
        </p>
        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={onShopNow}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(168,85,247,0.5)] transition-all cursor-pointer hover:scale-105"
          >
            Shop Now
          </button>
        </div>
      </div>

      <div className="relative flex items-center justify-center">
        <img
          src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80"
          alt="Wireless Headphones"
          className="w-64 h-64 sm:w-72 sm:h-72 object-contain relative z-10 filter drop-shadow-[0_25px_35px_rgba(0,0,0,0.8)]"
        />
      </div>
    </div>
  );
};`,
          },
          {
            id: 'productgrid-tsx',
            name: 'ProductGrid.tsx',
            type: 'file',
            path: 'src/components/ProductGrid.tsx',
            language: 'typescript',
            iconType: 'tsx',
            content: `import React from 'react';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: any[];
  selectedCategory: string | null;
  onSelectCategory: (cat: string | null) => void;
  onAddToCart: () => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  selectedCategory,
  onSelectCategory,
  onAddToCart
}) => {
  const filteredProducts = selectedCategory
    ? products.filter(p => p.category === selectedCategory)
    : products;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <h2 className="text-xl font-extrabold text-white">Featured Hardware</h2>
        <span className="text-xs text-slate-400">Showing {filteredProducts.length} products</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={onAddToCart}
          />
        ))}
      </div>
    </section>
  );
};`,
          },
          {
            id: 'productcard-tsx',
            name: 'ProductCard.tsx',
            type: 'file',
            path: 'src/components/ProductCard.tsx',
            language: 'typescript',
            iconType: 'tsx',
            content: `import React from 'react';
import { ShoppingCart, Star } from 'lucide-react';

export const ProductCard = ({ product, onAddToCart }: { product: any; onAddToCart: () => void }) => {
  return (
    <div className="bg-[#0b0f30] border border-white/10 rounded-2xl p-4 flex flex-col hover:border-indigo-500/50 transition-all duration-300 group">
      <div className="w-full h-48 rounded-xl overflow-hidden mb-4 bg-slate-900 relative">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <span className="absolute top-2 right-2 bg-indigo-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          \${product.price}
        </span>
      </div>

      <div className="flex items-center gap-1 text-amber-400 text-xs mb-1">
        <Star className="w-3.5 h-3.5 fill-current" />
        <span className="font-bold">{product.rating}</span>
      </div>

      <h3 className="text-sm font-bold text-white line-clamp-1 mb-2">{product.name}</h3>

      <div className="mt-auto pt-3 flex items-center justify-between border-t border-white/5">
        <span className="text-xs text-slate-400">{product.category}</span>
        <button
          onClick={onAddToCart}
          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 text-xs font-bold transition-all cursor-pointer"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Add
        </button>
      </div>
    </div>
  );
};`,
          },
        ],
      },
      {
        id: 'src-data',
        name: 'data',
        type: 'folder',
        path: 'src/data',
        children: [
          {
            id: 'products-ts',
            name: 'products.ts',
            type: 'file',
            path: 'src/data/products.ts',
            language: 'typescript',
            iconType: 'ts',
            content: `export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  rating: number;
  image: string;
}

export const products: Product[] = [
  {
    id: 'p1',
    name: 'Quantum Wireless Pro Headphones',
    price: 299,
    category: 'Audio',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80'
  },
  {
    id: 'p2',
    name: 'CyberWatch Ultra Edition',
    price: 399,
    category: 'Wearables',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80'
  },
  {
    id: 'p3',
    name: 'AeroBook Titanium Laptop',
    price: 1499,
    category: 'Computing',
    rating: 5.0,
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&q=80'
  },
  {
    id: 'p4',
    name: 'Lumix Mirrorless 4K Camera',
    price: 899,
    category: 'Cameras',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500&q=80'
  }
];`,
          },
        ],
      },
      {
        id: 'app-tsx',
        name: 'App.tsx',
        type: 'file',
        path: 'src/App.tsx',
        language: 'typescript',
        iconType: 'tsx',
        content: `import React, { useState } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ProductGrid } from './components/ProductGrid';
import { products } from './data/products';

export default function App() {
  const [cartCount, setCartCount] = useState(3);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#080b22] text-slate-100 font-sans">
      {/* Store Header */}
      <Header
        cartCount={cartCount}
        onOpenCart={() => alert('Cart drawer opened')}
      />

      {/* Hero Section */}
      <Hero onShopNow={() => setCartCount(c => c + 1)} />

      {/* Product Catalog Grid */}
      <main className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        <ProductGrid
          products={products}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          onAddToCart={() => setCartCount(c => c + 1)}
        />
      </main>
    </div>
  );
}`,
      },
      {
        id: 'main-tsx',
        name: 'main.tsx',
        type: 'file',
        path: 'src/main.tsx',
        language: 'typescript',
        iconType: 'tsx',
        content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
      },
      {
        id: 'index-css',
        name: 'index.css',
        type: 'file',
        path: 'src/index.css',
        language: 'css',
        iconType: 'css',
        content: `@import "tailwindcss";

@layer base {
  body {
    background-color: #080b22;
    color: #f8fafc;
    font-family: system-ui, -apple-system, sans-serif;
  }
}

/* Custom scrollbars */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: #040612;
}
::-webkit-scrollbar-thumb {
  background: #1e293b;
  border-radius: 9999px;
}`,
      },
    ],
  },
  {
    id: 'package-json',
    name: 'package.json',
    type: 'file',
    path: 'package.json',
    language: 'json',
    iconType: 'json',
    content: `{
  "name": "shopix-ecommerce-app",
  "private": true,
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "lucide-react": "^0.344.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.1"
  },
  "devDependencies": {
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.22",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.2.2",
    "vite": "^5.1.6"
  }
}`,
  },
  {
    id: 'vite-config-ts',
    name: 'vite.config.ts',
    type: 'file',
    path: 'vite.config.ts',
    language: 'typescript',
    iconType: 'ts',
    content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0'
  }
});`,
  },
  {
    id: 'tailwind-config-js',
    name: 'tailwind.config.js',
    type: 'file',
    path: 'tailwind.config.js',
    language: 'javascript',
    iconType: 'js',
    content: `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        shopix: {
          dark: '#080b22',
          accent: '#6366f1'
        }
      }
    }
  },
  plugins: []
};`,
  },
];

export interface AnnyCodeExplorerProps {
  vfsFiles?: Record<string, string>;
  onFileSave?: (path: string, content: string) => void;
}

export function buildTreeFromVFS(vfs: Record<string, string>): FileNode[] {
  const rootNodes: FileNode[] = [];
  const folderMap: Record<string, FileNode> = {};

  Object.entries(vfs).forEach(([filePath, content]) => {
    const parts = filePath.split('/');
    let currentPath = '';

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const id = currentPath.replace(/[\/\.]/g, '-');

      if (isFile) {
        const ext = part.split('.').pop()?.toLowerCase();
        let iconType: FileNode['iconType'] = 'ts';
        if (ext === 'tsx') iconType = 'tsx';
        else if (ext === 'ts') iconType = 'ts';
        else if (ext === 'css') iconType = 'css';
        else if (ext === 'json') iconType = 'json';
        else if (ext === 'js' || ext === 'jsx') iconType = 'js';
        else if (ext === 'md') iconType = 'md';

        const fileNode: FileNode = {
          id,
          name: part,
          type: 'file',
          path: filePath,
          language: ext === 'tsx' || ext === 'ts' ? 'typescript' : ext === 'json' ? 'json' : ext === 'css' ? 'css' : 'javascript',
          iconType,
          content,
        };

        if (parts.length === 1) {
          rootNodes.push(fileNode);
        } else {
          const parentFolder = folderMap[parts.slice(0, index).join('/')];
          if (parentFolder) {
            parentFolder.children = parentFolder.children || [];
            parentFolder.children.push(fileNode);
          } else {
            rootNodes.push(fileNode);
          }
        }
      } else {
        if (!folderMap[currentPath]) {
          const folderNode: FileNode = {
            id,
            name: part,
            type: 'folder',
            path: currentPath,
            children: [],
          };
          folderMap[currentPath] = folderNode;

          if (index === 0) {
            rootNodes.push(folderNode);
          } else {
            const parentFolder = folderMap[parts.slice(0, index).join('/')];
            if (parentFolder) {
              parentFolder.children = parentFolder.children || [];
              parentFolder.children.push(folderNode);
            }
          }
        }
      }
    });
  });

  return rootNodes;
}

export const AnnyCodeExplorer: React.FC<AnnyCodeExplorerProps> = ({
  vfsFiles,
  onFileSave,
}) => {
  const activeFiles = useMemo(() => {
    if (vfsFiles && Object.keys(vfsFiles).length > 0) {
      return buildTreeFromVFS(vfsFiles);
    }
    return PROJECT_FILES;
  }, [vfsFiles]);

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    src: true,
    'src-components': true,
    'src-data': true,
  });

  const [selectedFileId, setSelectedFileId] = useState<string>('app-tsx');
  const [openTabIds, setOpenTabIds] = useState<string[]>(['app-tsx', 'header-tsx', 'products-ts', 'package-json']);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Find file recursively by ID
  const findFileById = (nodes: FileNode[], id: string): FileNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findFileById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedFile = findFileById(activeFiles, selectedFileId) || activeFiles[0]?.children?.[0] || activeFiles[0];

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const handleSelectFile = (file: FileNode) => {
    if (file.type === 'folder') {
      toggleFolder(file.id);
      return;
    }
    setSelectedFileId(file.id);
    if (!openTabIds.includes(file.id)) {
      setOpenTabIds((prev) => [...prev, file.id]);
    }
  };

  const handleCloseTab = (e: React.MouseEvent, idToClose: string) => {
    e.stopPropagation();
    const nextTabs = openTabIds.filter((id) => id !== idToClose);
    setOpenTabIds(nextTabs);
    if (selectedFileId === idToClose && nextTabs.length > 0) {
      setSelectedFileId(nextTabs[nextTabs.length - 1]);
    }
  };

  const handleCopyCode = () => {
    if (selectedFile?.content) {
      navigator.clipboard.writeText(selectedFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Get icon for file type
  const getFileIcon = (node: FileNode) => {
    if (node.type === 'folder') {
      return expandedFolders[node.id] ? (
        <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      ) : (
        <Folder className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
      );
    }

    switch (node.iconType) {
      case 'tsx':
        return <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
      case 'ts':
        return <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
      case 'css':
        return <FileCode className="w-3.5 h-3.5 text-pink-400 shrink-0" />;
      case 'json':
        return <FileJson className="w-3.5 h-3.5 text-amber-300 shrink-0" />;
      case 'js':
        return <FileCode className="w-3.5 h-3.5 text-yellow-400 shrink-0" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    }
  };

  // Render tree node
  const renderTreeNode = (node: FileNode, depth = 0) => {
    const isFolder = node.type === 'folder';
    const isExpanded = expandedFolders[node.id];
    const isSelected = selectedFileId === node.id;

    // Filter by search query if set
    if (searchQuery && node.type === 'file' && !node.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return null;
    }

    return (
      <div key={node.id} className="select-none">
        <div
          onClick={() => handleSelectFile(node)}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          className={`flex items-center gap-1.5 py-1 pr-2 rounded-lg text-xs cursor-pointer transition-all ${
            isSelected
              ? 'bg-indigo-600/30 text-white font-bold border-l-2 border-indigo-400'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          {isFolder && (
            <span className="text-slate-400 shrink-0">
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </span>
          )}
          {getFileIcon(node)}
          <span className="truncate font-mono">{node.name}</span>
        </div>

        {isFolder && isExpanded && node.children && (
          <div className="space-y-0.5">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const codeLines = (selectedFile?.content || '').split('\n');

  return (
    <div className="flex-1 flex flex-col sm:flex-row h-full min-h-0 bg-[#040612] text-slate-200 overflow-hidden font-mono">
      {/* 1. LEFT SIDEBAR: FILE & FOLDER EXPLORER TREE */}
      <div className="w-full sm:w-60 md:w-64 bg-[#060818] border-r border-b sm:border-b-0 border-white/10 flex flex-col shrink-0">
        {/* Explorer Header */}
        <div className="p-3 border-b border-white/10 flex items-center justify-between gap-2 bg-[#090c24]">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-white tracking-wider font-sans uppercase">
              App Explorer
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold">
            10 Files
          </span>
        </div>

        {/* Search Files Input */}
        <div className="p-2 border-b border-white/5">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0b0e2b] border border-white/10 text-xs text-slate-300">
            <Search className="w-3 h-3 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-[11px] text-white placeholder-slate-500 font-sans"
            />
            {searchQuery && (
              <X
                className="w-3 h-3 text-slate-400 hover:text-white cursor-pointer shrink-0"
                onClick={() => setSearchQuery('')}
              />
            )}
          </div>
        </div>

        {/* File Tree List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
          {activeFiles.map((node) => renderTreeNode(node, 0))}
        </div>

        {/* Footer info */}
        <div className="p-2.5 border-t border-white/10 bg-[#07091f] text-[10px] text-slate-400 flex items-center justify-between font-sans">
          <span className="flex items-center gap-1 text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            TypeScript React
          </span>
          <span>SHOPIX v2.0</span>
        </div>
      </div>

      {/* 2. RIGHT SIDE: CODE TAB BAR & CODE VIEWER PANEL */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#050718]">
        {/* Open File Tabs Header */}
        <div className="flex items-center justify-between bg-[#080b22] border-b border-white/10 overflow-x-auto custom-scrollbar shrink-0">
          <div className="flex items-center">
            {openTabIds.map((tabId) => {
              const fileNode = findFileById(PROJECT_FILES, tabId);
              if (!fileNode) return null;
              const isActive = tabId === selectedFileId;

              return (
                <div
                  key={tabId}
                  onClick={() => setSelectedFileId(tabId)}
                  className={`flex items-center gap-2 px-3 py-2 border-r border-white/10 text-xs cursor-pointer transition-all shrink-0 ${
                    isActive
                      ? 'bg-[#050718] text-white font-bold border-t-2 border-t-indigo-500'
                      : 'bg-[#080a20] text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {getFileIcon(fileNode)}
                  <span className="truncate max-w-[120px]">{fileNode.name}</span>
                  <X
                    className="w-3 h-3 text-slate-500 hover:text-white rounded hover:bg-white/10 cursor-pointer shrink-0"
                    onClick={(e) => handleCloseTab(e, tabId)}
                  />
                </div>
              );
            })}
          </div>

          {/* Copy Code Action Button */}
          <div className="px-3 py-1.5 flex items-center gap-2 shrink-0 border-l border-white/10 bg-[#06081c]">
            <span className="text-[10px] text-slate-400 hidden lg:inline font-sans">
              {selectedFile?.path}
            </span>
            <button
              onClick={handleCopyCode}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs flex items-center gap-1 border border-white/10 transition-all cursor-pointer font-sans"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Code Content Container with Line Numbers */}
        <div className="flex-1 overflow-y-auto p-4 flex font-mono text-xs text-slate-200 custom-scrollbar leading-relaxed">
          {/* Line Numbers Gutter */}
          <div className="select-none pr-4 text-right text-slate-600 font-mono border-r border-white/10 mr-4 shrink-0 space-y-0.5">
            {codeLines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          {/* Code Text Block */}
          <pre className="flex-1 overflow-x-auto text-cyan-200 leading-relaxed font-mono whitespace-pre selection:bg-indigo-600 selection:text-white">
            {selectedFile?.content}
          </pre>
        </div>

        {/* Bottom IDE Status Footer */}
        <div className="px-4 py-1.5 bg-[#060818] border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400 font-mono shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-300">
              <Terminal className="w-3 h-3 text-indigo-400" />
              {selectedFile?.path}
            </span>
            <span>{codeLines.length} lines</span>
          </div>

          <div className="flex items-center gap-4">
            <span>UTF-8</span>
            <span>TypeScript JSX</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> AI Generated
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
