'use client';

import * as React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { getApiFieldErrors } from '../../services/api';
import { canDeleteCatalog, canWriteCatalog } from '../../lib/rbac';
import { Product } from '../../types/invoice';
import { 
  Package, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  AlertTriangle, 
  CheckCircle, 
  X,
  BadgePercent,
  Layers,
  Archive,
  Tag,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
  RefreshCw,
  Sliders,
  ClipboardList
} from 'lucide-react';
import { z } from 'zod';

// Zod validation for products
const productSchema = z.object({
  code: z.string().min(2, 'O código de barras/artigo deve ter pelo menos 2 caracteres.'),
  name: z.string().min(3, 'O nome do produto/serviço deve ter pelo menos 3 caracteres.'),
  category: z.string().min(2, 'Seleccione ou escreva uma categoria.'),
  price: z.number().min(0, 'O preço unitário não pode ser inferior a 0 (AOA).'),
  stock: z.number().int().min(0, 'O stock inicial não pode ser negativo.'),
  taxRate: z.number(),
  exemptionCode: z.string().optional(),
  unit: z.string().default('UN')
}).refine(data => {
  if (data.taxRate === 0 && !data.exemptionCode) {
    return false;
  }
  return true;
}, {
  message: "Os artigos isentos de IVA (0%) requerem um código de motivo de isenção oficial da AGT.",
  path: ["exemptionCode"]
});

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  type: 'In' | 'Out';
  quantity: number;
  reason: string;
  timestamp: string;
  operator: string;
}

export default function ProductsModule() {
  const { currentTenant, theme, user, addNotification } = useAuthStore();
  const { products, addProduct, updateProduct, deleteProduct } = useDataStore();
  const canWriteProducts = canWriteCatalog(user?.role);
  const canDeleteProducts = canDeleteCatalog(user?.role);

  // Navigation and extra views
  const [activeTab, setActiveTab] = React.useState<'catalog' | 'inventory'>('catalog');
  const [stockMovements, setStockMovements] = React.useState<StockMovement[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ndf_stock_movements');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          // ignore
        }
      }
    }
    const initialMovements: StockMovement[] = [
      {
        id: 'mv-01',
        productId: 'prod-002',
        productName: 'Subscrição Anual NDFATURA Cloud Enterprise SaaS',
        productCode: 'LIC-ERP-02',
        type: 'In',
        quantity: 50,
        reason: 'Entrada por Reposição',
        timestamp: '2026-05-24 10:15:30',
        operator: 'Eng. Manuel Bento'
      },
      {
        id: 'mv-02',
        productId: 'prod-004',
        productName: 'Switch de Rede Gerível Core Fiber (Acessórios)',
        productCode: 'HARD-04',
        type: 'Out',
        quantity: 2,
        reason: 'Saída por Quebra / Dano',
        timestamp: '2026-05-23 14:05:12',
        operator: 'Eng. Manuel Bento'
      }
    ];
    if (typeof window !== 'undefined') {
      localStorage.setItem('ndf_stock_movements', JSON.stringify(initialMovements));
    }
    return initialMovements;
  });

  // Adjustment Modal State
  const [adjustmentModalOpen, setAdjustmentModalOpen] = React.useState(false);
  const [adjProduct, setAdjProduct] = React.useState<Product | null>(null);
  const [adjType, setAdjType] = React.useState<'In' | 'Out'>('In');
  const [adjQty, setAdjQty] = React.useState<number>(10);
  const [adjReason, setAdjReason] = React.useState<string>('Entrada por Reposição');

  // Search/Filters specific to Inventory
  const [searchTermInventory, setSearchTermInventory] = React.useState('');
  const [inventoryStatusFilter, setInventoryStatusFilter] = React.useState<'ALL' | 'CRITICAL' | 'OK' | 'OUT_OF_STOCK'>('ALL');

  const [searchTerm, setSearchTerm] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('ALL');
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 6;

  // Modal forms
  const [modalOpen, setModalOpen] = React.useState(false);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [editingId, setEditingId] = React.useState('');

  // Fields
  const [code, setCode] = React.useState('');
  const [name, setName] = React.useState('');
  const [category, setCategory] = React.useState('Serviços');
  const [price, setPrice] = React.useState(0);
  const [stock, setStock] = React.useState(100);
  const [taxRate, setTaxRate] = React.useState(14); // 14% Standard Angola rate
  const [exemptionCode, setExemptionCode] = React.useState('');
  const [unit, setUnit] = React.useState('UN');

  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = React.useState(false);

  const handleOpenAdjustmentModal = (p: Product) => {
    setAdjProduct(p);
    setAdjType('In');
    setAdjQty(10);
    setAdjReason('Entrada por Reposição');
    setAdjustmentModalOpen(true);
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjProduct) return;

    if (adjQty <= 0) {
      alert('A quantidade deve ser superior a zero.');
      return;
    }

    const currentStock = adjProduct.stock;
    let newStock = currentStock;

    if (adjType === 'In') {
      newStock += adjQty;
    } else {
      if (currentStock < adjQty) {
        alert('Erro: A quantidade de saída excede o stock disponível em armazém.');
        return;
      }
      newStock -= adjQty;
    }

    // Call store update
    updateProduct(adjProduct.id, { stock: newStock }).catch((error) => {
      addNotification({
        title: 'Ajuste não sincronizado',
        desc: error instanceof Error ? error.message : 'Falha ao actualizar stock na API.',
        type: 'warning'
      });
    });

    // Append to stock movements trail
    const newMovement: StockMovement = {
      id: `mv-${Date.now()}`,
      productId: adjProduct.id,
      productName: adjProduct.name,
      productCode: adjProduct.code,
      type: adjType,
      quantity: adjQty,
      reason: adjReason,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      operator: 'Eng. Manuel Bento'
    };

    const updatedMovements = [newMovement, ...stockMovements];
    setStockMovements(updatedMovements);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ndf_stock_movements', JSON.stringify(updatedMovements));
    }

    addNotification({
      title: 'Ajuste de Stock Concluído',
      desc: `Movimentação de ${adjType === 'In' ? '+' : '-'}${adjQty} unidades registada para o artigo: ${adjProduct.name}.`,
      type: 'success'
    });

    setAdjustmentModalOpen(false);
  };

  if (!currentTenant) return null;

  const tenantProducts = products.filter(p => p.tenantId === currentTenant.id);
  const uniqueCategories = Array.from(new Set(tenantProducts.map(p => p.category)));

  // Inventory stats
  const physicalProducts = tenantProducts.filter(p => p.unit !== 'SERV');
  const lowStockProducts = physicalProducts.filter(p => p.stock > 0 && p.stock <= 5);
  const outOfStockProducts = physicalProducts.filter(p => p.stock === 0);
  const totalPhysicalUnits = physicalProducts.reduce((acc, cur) => acc + cur.stock, 0);
  const totalStockValue = physicalProducts.reduce((acc, cur) => acc + (cur.price * cur.stock), 0);

  // Filtered inventory products
  const filteredInventoryProducts = tenantProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTermInventory.toLowerCase()) || 
                          p.code.toLowerCase().includes(searchTermInventory.toLowerCase()) ||
                          p.category.toLowerCase().includes(searchTermInventory.toLowerCase());
    let matchesStatus = true;
    if (inventoryStatusFilter === 'CRITICAL') {
      matchesStatus = p.unit !== 'SERV' && p.stock > 0 && p.stock <= 5;
    } else if (inventoryStatusFilter === 'OUT_OF_STOCK') {
      matchesStatus = p.unit !== 'SERV' && p.stock === 0;
    } else if (inventoryStatusFilter === 'OK') {
      matchesStatus = p.unit === 'SERV' || p.stock > 5;
    }
    return matchesSearch && matchesStatus;
  });

  // Search filter
  const filteredProducts = tenantProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || p.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const handleOpenCreateModal = () => {
    setIsEditMode(false);
    setEditingId('');
    setCode(`PROD-${Math.floor(Math.random() * 899 + 100)}`);
    setName('');
    setCategory('Serviços');
    setPrice(0);
    setStock(100);
    setTaxRate(14);
    setExemptionCode('');
    setUnit('UN');
    setFormErrors({});
    setModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setIsEditMode(true);
    setEditingId(p.id);
    setCode(p.code);
    setName(p.name);
    setCategory(p.category);
    setPrice(p.price);
    setStock(p.stock);
    setTaxRate(p.taxRate);
    setExemptionCode(p.exemptionCode || '');
    setUnit(p.unit);
    setFormErrors({});
    setModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const formData = {
      code,
      name,
      category,
      price,
      stock,
      taxRate,
      exemptionCode: taxRate === 0 ? exemptionCode : undefined,
      unit
    };

    // Safe parse with refining
    const validationResult = productSchema.safeParse(formData);
    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      validationResult.error.issues.forEach(err => {
        const path = err.path[0]?.toString() || 'global';
        errors[path] = err.message;
      });
      setFormErrors(errors);
      return;
    }

    setIsSaving(true);
    try {
      if (isEditMode) {
        await updateProduct(editingId, formData);
        addNotification({
          title: 'Produto Actualizado',
          desc: `O artigo ${name} foi modificado no catálogo fiscal.`,
          type: 'success'
        });
      } else {
        await addProduct({
          ...formData,
          tenantId: currentTenant.id
        });
        addNotification({
          title: 'Produto Adicionado',
          desc: `Produto ${name} registado com as taxas IVA adequadas.`,
          type: 'success'
        });
      }
      setModalOpen(false);
    } catch (error) {
      const apiErrors = getApiFieldErrors(error);
      setFormErrors(Object.keys(apiErrors).length > 0 ? apiErrors : { global: error instanceof Error ? error.message : 'Falha ao guardar produto.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTrigger = (id: string, prodName: string) => {
    if (confirm(`Atenção: Tem a certeza que deseja remover o produto/serviço "${prodName}"? Linhas de faturamento que o utilizem não se perderão.`)) {
      deleteProduct(id)
        .then(() => addNotification({
          title: 'Produto Removido',
          desc: `O artigo ${prodName} foi apagado do catálogo.`,
          type: 'warning'
        }))
        .catch((error) => addNotification({
          title: 'Remoção bloqueada',
          desc: error instanceof Error ? error.message : 'Não foi possível remover o produto.',
          type: 'warning'
        }));
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-sans font-bold tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6 text-blue-500" />
            Produtos e Inventário
          </h1>
          <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>
            Gerencie o seu catálogo de bens e prestação de serviços com as correspondentes configurações de IVA e códigos de isenção da AGT, além do controlo físico de stocks.
          </p>
        </div>
        
        {activeTab === 'catalog' && (
        <button
          id="btn-add-product-trigger"
          onClick={handleOpenCreateModal}
          disabled={!canWriteProducts}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
          title={!canWriteProducts ? 'Perfil sem permissão para registar produtos' : 'Novo Produto'}
        >
            <Plus className="h-4.5 w-4.5" />
            <span>Novo Artigo</span>
          </button>
        )}
      </div>

      {/* Navigation Tabs (Products vs Stocks) */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 mt-2">
        <button
          id="btn-tab-catalog"
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2.5 text-xs font-semibold focus:outline-none border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'catalog'
              ? 'border-blue-500 text-blue-500 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Configuração / Catálogo IVA</span>
        </button>
        <button
          id="btn-tab-inventory"
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2.5 text-xs font-semibold focus:outline-none border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'inventory'
              ? 'border-blue-500 text-blue-500 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Archive className="h-4 w-4" />
          <span>Controlo de Inventário / Stocks</span>
          {lowStockProducts.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[9px] font-bold bg-red-500 text-white rounded-full">
              {lowStockProducts.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'catalog' ? (
        <>
          {/* Filter Bar */}
          <div className={`p-4 rounded-xl border ${
            theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'
          } flex flex-col sm:flex-row gap-3 items-center justify-between`}>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                id="search-products-input"
                type="text"
                placeholder="Pesquisar por Código, Nome ou Categoria..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className={`w-full pl-9 pr-4 py-2 text-xs rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-blue-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                } focus:outline-none transition-colors`}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto self-end">
              <span className="text-[10px] text-slate-500 font-semibold uppercase whitespace-nowrap">Categoria:</span>
              <select
                id="filter-category-select"
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                className={`text-[11px] font-semibold border rounded-lg p-1.5 w-44 ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <option value="ALL">Todas as categorias</option>
                {uniqueCategories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid items */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentProducts.length === 0 ? (
              <div className={`col-span-full py-16 text-center border rounded-xl border-dashed ${
                theme === 'dark' ? 'bg-slate-950 border-slate-900 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}>
                <Package className="h-12 w-12 mx-auto text-blue-500 opacity-40 mb-3" />
                <h3 className="font-bold text-sm">Sem produtos no catálogo</h3>
                <p className="text-[11px] mt-0.5 max-w-xs mx-auto">Nenhum produto cadastrado na presente organização.</p>
              </div>
            ) : (
              currentProducts.map((p) => {
                const isLowStock = p.stock <= 5 && p.unit !== 'SERV';
                return (
                  <div 
                    key={p.id} 
                    className={`p-5 rounded-xl border relative group transition-all hover:shadow-md ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'
                    }`}
                  >
                    
                    {/* Actions edit/delete */}
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-mono uppercase bg-blue-500/10 text-blue-400 font-bold px-2 py-0.5 rounded border border-blue-500/10">
                        {p.code}
                      </span>

                      {canWriteProducts && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4">
                        <button
                          id={`btn-edit-product-${p.id}`}
                          onClick={() => handleOpenEditModal(p)}
                          className="p-1.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-400 hover:text-blue-500 transition-colors"
                          title="Editar Artigo"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          id={`btn-delete-product-${p.id}`}
                          onClick={() => handleDeleteTrigger(p.id, p.name)}
                          disabled={!canDeleteProducts}
                          className="p-1.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-400 hover:text-red-500 transition-colors"
                          title="Remover Artigo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      )}
                    </div>

                    <div className="mt-4">
                      <h3 className="text-xs sm:text-sm font-bold truncate pr-12 leading-snug">
                        {p.name}
                      </h3>
                      <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase flex items-center gap-1">
                        <Layers className="h-3 w-3 text-blue-500" />
                        <span>{p.category}</span>
                      </p>

                      <div className="mt-4 border-t pt-3 border-slate-900/10 dark:border-slate-900/40 flex justify-between items-baseline">
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-slate-500 font-mono block">Preço Unitário</span>
                          <strong className="text-xs sm:text-sm font-bold font-mono text-blue-500">
                            {p.price.toLocaleString('pt-PT')} AOA
                          </strong>
                        </div>

                        <div className="text-right">
                          <span className="text-[9px] text-slate-500 font-mono block">Enquadramento IVA</span>
                          <span className={`text-[10px] font-mono leading-none font-bold ${
                            p.taxRate > 0 ? 'text-blue-400' : 'text-yellow-500'
                          }`}>
                            {p.taxRate > 0 ? `${p.taxRate}% IVA` : `Isento (${p.exemptionCode})`}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Archive className="h-3.5 w-3.5 text-slate-400" />
                          Unidade de Venda: <strong className="font-semibold text-slate-700 dark:text-slate-300">{p.unit}</strong>
                        </span>

                        {isLowStock ? (
                          <span className="text-[9px] px-2 py-0.5 bg-red-500/10 text-red-500 font-bold tracking-tight rounded border border-red-500/10 flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="h-3 w-3" /> Crítico ({p.stock})
                          </span>
                        ) : p.unit === 'SERV' ? (
                          <span className="text-[9px] px-2 py-0.5 bg-blue-500/10 text-blue-500 font-semibold rounded border border-blue-500/10">
                            Serviço (Ilimitado)
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-600">
                            Stock: <strong className="font-bold">{p.stock}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 pb-2 text-xs">
              <span className="text-slate-500">A mostrar página {currentPage} de {totalPages} ({filteredProducts.length} artigos)</span>
              <div className="flex items-center gap-1">
                <button
                  id="btn-products-prev-page"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="p-1 px-2 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-900 disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  id="btn-products-next-page"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="p-1 px-2 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-900 disabled:opacity-40"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* INVENTORY STOCK CONTROL DASHBOARD TAB */
        <div className="space-y-6">
          
          {/* Telemetry stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className={`p-5 rounded-xl border ${
              theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'
            } shadow-sm`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Artigos Físicos</span>
                <div className="p-1.5 bg-blue-500/10 text-blue-500 rounded">
                  <Package className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono mt-2">{physicalProducts.length}</div>
              <p className="text-[10px] text-slate-500 mt-1">Produtos com controlo ativo</p>
            </div>

            <div className={`p-5 rounded-xl border ${
              theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'
            } shadow-sm`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Unidades em Armazém</span>
                <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded">
                  <Archive className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono mt-2">{totalPhysicalUnits.toLocaleString('pt-PT')}</div>
              <p className="text-[10px] text-slate-500 mt-1">Total de unidades disponíveis</p>
            </div>

            <div className={`p-5 rounded-xl border ${
              theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'
            } shadow-sm`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Valoração do Ativo</span>
                <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="text-xl font-bold font-mono text-emerald-500 mt-2">{totalStockValue.toLocaleString('pt-PT')} Kz</div>
              <p className="text-[10px] text-slate-500 mt-1">Preço unitário × unidades em stock</p>
            </div>

            <div className={`p-5 rounded-xl border ${
              theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'
            } shadow-sm`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Sob Alerta Crítico</span>
                <div className="p-1.5 bg-red-500/10 text-red-500 rounded">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-red-500 mt-2">{lowStockProducts.length + outOfStockProducts.length}</div>
              <p className="text-[10px] text-slate-500 mt-1">
                {outOfStockProducts.length} esgotados, {lowStockProducts.length} baixos
              </p>
            </div>
          </div>

          {/* Low stock alerts panel warnings */}
          {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
            <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-slate-800 dark:text-red-200 flex gap-3.5 items-start">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5 animate-pulse" />
              <div className="flex-1 text-xs">
                <h4 className="font-bold text-red-500 leading-snug">Risco de Rutura em Faturamento</h4>
                <p className="opacity-85 mt-0.5">
                  Os seguintes artigos apresentam quantidades críticas ou nulas. Emissão síncrona de Notas e Faturas (fr) baseadas nestes bens pode originar inconsistências de rastreamento fiscal.
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {outOfStockProducts.map(p => (
                    <span key={p.id} className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-500 text-white rounded text-[10px] font-bold font-mono">
                      <span>{p.code} (Esgotado)</span>
                    </span>
                  ))}
                  {lowStockProducts.map(p => (
                    <span key={p.id} className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-500 text-white rounded text-[10px] font-bold font-mono">
                      <span>{p.code} ({p.stock} restam)</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Filtering bar for inventory */}
          <div className={`p-4 rounded-xl border ${
            theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'
          } flex flex-col sm:flex-row gap-3 items-center justify-between`}>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="search-inventory-input"
                type="text"
                placeholder="Pesquisar stock por Código ou Nome..."
                value={searchTermInventory}
                onChange={(e) => setSearchTermInventory(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 text-xs rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-blue-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                } focus:outline-none transition-colors`}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto self-end">
              <span className="text-[10px] text-slate-400 font-bold uppercase whitespace-nowrap">Status Stock:</span>
              <select
                id="filter-inventory-status"
                value={inventoryStatusFilter}
                onChange={(e) => setInventoryStatusFilter(e.target.value as any)}
                className={`text-[11px] font-semibold border rounded-lg p-1.5 w-44 ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <option value="ALL">Todo o Catálogo</option>
                <option value="OK">Estável (&gt; 5)</option>
                <option value="CRITICAL">Baixo Stock (1 a 5)</option>
                <option value="OUT_OF_STOCK">Esgotado (0)</option>
              </select>
            </div>
          </div>

          {/* Main Stock Table */}
          <div className={`border rounded-xl overflow-hidden ${
            theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                    theme === 'dark' ? 'bg-slate-900/60 border-slate-900 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    <th className="px-5 py-3.5">Código Artigo</th>
                    <th className="px-5 py-3.5">Descrição</th>
                    <th className="px-5 py-3.5">Categoria</th>
                    <th className="px-5 py-3.5 text-right flex-row-reverse">Preço Base (AOA)</th>
                    <th className="px-5 py-3.5 text-center">Unidade</th>
                    <th className="px-5 py-3.5 text-center">Qtd Física</th>
                    <th className="px-5 py-3.5 text-center">Estado Stock</th>
                    <th className="px-5 py-3.5 text-center">Ações de Inventário</th>
                  </tr>
                </thead>
                <tbody className={`divide-y text-xs ${
                  theme === 'dark' ? 'divide-slate-900 text-slate-300' : 'divide-slate-100 text-slate-700'
                }`}>
                  {filteredInventoryProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-400 font-medium">
                        Nenhum artigo localizado com as premissas seleccionadas.
                      </td>
                    </tr>
                  ) : (
                    filteredInventoryProducts.map(p => {
                      const isServ = p.unit === 'SERV';
                      const isOutOfStock = p.stock === 0;
                      const isCritical = p.stock > 0 && p.stock <= 5;
                      
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                          <td className="px-5 py-3 font-mono font-bold text-[11px] text-blue-500">{p.code}</td>
                          <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-150 select-text max-w-xs truncate" title={p.name}>{p.name}</td>
                          <td className="px-5 py-3"><span className="px-2 py-0.5 capitalize bg-slate-100 dark:bg-slate-900 text-slate-500 rounded text-[10px]">{p.category}</span></td>
                          <td className="px-5 py-3 text-right font-mono font-semibold">{p.price.toLocaleString('pt-PT')},00</td>
                          <td className="px-5 py-3 text-center"><span className="font-bold text-[10px]">{p.unit}</span></td>
                          <td className={`px-5 py-3 text-center font-bold font-mono text-[13px] ${
                            isServ ? 'text-slate-400' : isOutOfStock ? 'text-red-500' : isCritical ? 'text-amber-500' : 'text-emerald-500'
                          }`}>
                            {isServ ? '—' : p.stock}
                          </td>
                          <td className="px-5 py-3 text-center">
                            {isServ ? (
                              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[9px] font-bold">Serviço</span>
                            ) : isOutOfStock ? (
                              <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-500 text-[9px] font-bold uppercase animate-pulse">Esgotado</span>
                            ) : isCritical ? (
                              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[9px] font-bold uppercase">Reposição</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[9px] font-bold uppercase">Excelente</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-center">
                            {isServ ? (
                              <span className="text-[10px] text-slate-500 italic">Isento de Ajustes</span>
                            ) : !canWriteProducts ? (
                              <span className="text-[10px] text-slate-500 italic">Sem permissão</span>
                            ) : (
                              <button
                                id={`btn-adjust-stock-${p.id}`}
                                onClick={() => handleOpenAdjustmentModal(p)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-900 hover:bg-blue-600 dark:hover:bg-blue-600 hover:text-white dark:hover:text-white text-slate-600 dark:text-slate-350 rounded-lg text-[10px] font-bold transition-all border border-slate-200/10"
                                title="Ajuste Manual de Balanço (Auditável)"
                              >
                                <Sliders className="h-3 w-3 shrink-0" />
                                <span>Ajustar Stock</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* STOCK TRAIL LOG MOVEMENTS */}
          <div className={`p-6 rounded-xl border ${
            theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800/60 mb-4">
              <h3 className="font-bold flex items-center gap-2">
                <ClipboardList className="h-4.5 w-4.5 text-blue-500" />
                <span>Diário Geral de Movimentações (Histórico de Auditoria Fiscal)</span>
              </h3>
              <span className="text-[9px] uppercase font-mono px-2 py-0.5 bg-slate-100 dark:bg-slate-900 text-slate-500 rounded font-bold">Rastreamento AGT-Compliant</span>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-2">
              {stockMovements.length === 0 ? (
                <p className="text-center py-6 text-slate-500 italic text-[11px]">Nenhuma movimentação física registada recentemente.</p>
              ) : (
                stockMovements.map(m => {
                  const isIn = m.type === 'In';
                  return (
                    <div key={m.id} className={`p-3.5 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs leading-none ${
                      theme === 'dark' ? 'bg-slate-900/40 border-slate-900/60' : 'bg-slate-50 border-slate-200/60'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded mt-0.5 shrink-0 ${
                          isIn ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {isIn ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-slate-800 dark:text-slate-150 flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-blue-500 text-[11px]">{m.productCode}</span>
                            <span>{m.productName}</span>
                          </p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono pt-1">
                            <span>Razão: <strong className="font-semibold text-slate-600 dark:text-slate-400">{m.reason}</strong></span>
                            <span>•</span>
                            <span>Data: {m.timestamp}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-2.5 md:pt-0 border-slate-200 dark:border-slate-800">
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 font-mono">Operador</div>
                          <div className="font-bold text-slate-700 dark:text-slate-350 text-[10px] mt-0.5">{m.operator}</div>
                        </div>
                        <div className="text-right">
                          <span className={`px-2.5 py-1 rounded text-[11px] font-bold font-mono tracking-tight ${
                            isIn ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                          }`}>
                            {isIn ? '+' : '-'}{m.quantity} UN
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}

      {/* ADJUST STOCK MODAL */}
      {adjustmentModalOpen && adjProduct && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-xl border p-6 space-y-5 max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'bg-slate-950 border-slate-900 text-slate-100' : 'bg-white border-slate-200'
          }`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-900/10 dark:border-slate-800/40">
              <h2 className="text-sm font-bold flex items-center gap-2 font-sans text-blue-500">
                <Sliders className="h-5 w-5" />
                <span>Movimentação de Stock (Balanço)</span>
              </h2>
              <button
                id="btn-close-adjustment-modal"
                onClick={() => setAdjustmentModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="text-xs space-y-2 bg-slate-500/5 p-3 rounded-lg border border-slate-200/5 dark:border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-450 dark:text-slate-400">Artigo:</span>
                <strong className="text-slate-700 dark:text-slate-200">{adjProduct.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450 dark:text-slate-400">Código:</span>
                <strong className="font-mono text-blue-500 dark:text-blue-400">{adjProduct.code}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450 dark:text-slate-400">Stock Actual:</span>
                <strong className="font-mono text-slate-705 dark:text-slate-200">{adjProduct.stock} {adjProduct.unit}</strong>
              </div>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-4 text-xs select-none">
              
              {/* Type of operation (In or Out) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-550 dark:text-slate-400 block">Tipo de Operação *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    id="btn-adj-type-in"
                    type="button"
                    onClick={() => { setAdjType('In'); setAdjReason('Entrada por Fornecedor (Compra)'); }}
                    className={`p-3 rounded-lg border flex items-center justify-center gap-2 font-bold transition-all ${
                      adjType === 'In'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500'
                        : 'border-slate-200/10 dark:border-slate-800 text-slate-400 hover:bg-slate-500/5'
                    }`}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    <span>Entrada (+)</span>
                  </button>
                  <button
                    id="btn-adj-type-out"
                    type="button"
                    onClick={() => { setAdjType('Out'); setAdjReason('Saída por Quebra / Dano'); }}
                    className={`p-3 rounded-lg border flex items-center justify-center gap-2 font-bold transition-all ${
                      adjType === 'Out'
                        ? 'bg-red-500/10 border-red-500 text-red-500'
                        : 'border-slate-200/10 dark:border-slate-800 text-slate-400 hover:bg-slate-500/5'
                    }`}
                  >
                    <ArrowDownLeft className="h-4 w-4" />
                    <span>Saída (-)</span>
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 block">Quantidade a Ajustar *</label>
                <input
                  id="input-adj-qty"
                  type="number"
                  min="1"
                  required
                  value={adjQty}
                  onChange={(e) => setAdjQty(Math.max(1, Number(e.target.value)))}
                  className={`w-full text-xs p-2.5 border rounded-lg font-mono ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              {/* Reason / Motivation */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 block">Justificação / Motivo Oficial *</label>
                {adjType === 'In' ? (
                  <select
                    id="select-adj-reason-in"
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    className={`w-full text-xs p-2.5 border rounded-lg ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="Entrada por Fornecedor (Compra)">Entrada por Fornecedor (Compra)</option>
                    <option value="Entrada por Reposição">Entrada por Reposição</option>
                    <option value="Acerto Físico de Inventário">Acerto Físico de Inventário (Inventariação)</option>
                    <option value="Retorno de Cliente / Devolução">Retorno de Cliente / Devolução</option>
                  </select>
                ) : (
                  <select
                    id="select-adj-reason-out"
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    className={`w-full text-xs p-2.5 border rounded-lg ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="Saída por Quebra / Dano">Saída por Quebra / Dano (Quebras de Armazém)</option>
                    <option value="Saída por Consumo Interno">Saída por Consumo Interno</option>
                    <option value="Acerto Físico de Inventário">Acerto Físico de Inventário (Diferenças)</option>
                    <option value="Perda / Roubo Verificado">Perda / Roubo Verificado</option>
                  </select>
                )}
              </div>

              {/* Actions submit */}
              {formErrors.global && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] font-semibold text-red-400">
                  {formErrors.global}
                </div>
              )}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-900/10 dark:border-slate-800/40">
                <button
                  id="btn-dismiss-adjustment-modal"
                  type="button"
                  onClick={() => setAdjustmentModalOpen(false)}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg border ${
                    theme === 'dark' ? 'border-slate-800 text-slate-350 hover:bg-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirm-adjustment"
                  type="submit"
                  className={`px-4 py-2 text-xs font-bold text-white rounded-lg shadow-sm ${
                    adjType === 'In' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Confirmar Ajuste
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT PRODUCT MODAL DOCK */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-xl rounded-xl border p-6 space-y-5 max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'bg-slate-950 border-slate-900 text-slate-100' : 'bg-white border-slate-200'
          }`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-900/10 dark:border-slate-800/40">
              <h2 className="text-sm font-bold flex items-center gap-2 font-sans">
                <BadgePercent className="h-5 w-5 text-blue-500" />
                <span>{isEditMode ? 'Editar Artigo / Enquadramento do IVA' : 'Registar Novo Artigo de Faturamento'}</span>
              </h2>
              <button
                id="btn-close-product-modal"
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs select-none">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Code */}
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[11px] font-bold text-slate-500 block">Código Artigo *</label>
                  <input
                    id="input-product-code"
                    type="text"
                    required
                    placeholder="Ex: SERV-01"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className={`w-full text-xs p-2.5 border rounded-lg font-mono ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-850'
                    }`}
                  />
                  {formErrors.code && <p className="text-[10px] text-red-500 font-mono mt-0.5">{formErrors.code}</p>}
                </div>

                {/* Category */}
                <div className="space-y-1.5 col-span-1 sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-500 block">Categoria / Linha de Negócio *</label>
                  <input
                    id="input-product-category"
                    type="text"
                    required
                    placeholder="Ex: Serviços, Licenciamento, Combustível, Hardware"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={`w-full text-xs p-2.5 border rounded-lg ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                  {formErrors.category && <p className="text-[10px] text-red-500 font-mono mt-0.5">{formErrors.category}</p>}
                </div>
              </div>

              {/* Name description */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 block">Descrição do Produto ou Serviço *</label>
                <input
                  id="input-product-name"
                  type="text"
                  required
                  placeholder="Ex: Consultoria de Gestão e Auditoria Fiscal Informática..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full text-xs p-2.5 border rounded-lg ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
                {formErrors.name && <p className="text-[10px] text-red-500 font-mono mt-0.5">{formErrors.name}</p>}
              </div>

              {/* Price, Stock and Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Price */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 block">Preço Unitário (AOA) *</label>
                  <input
                    id="input-product-price"
                    type="number"
                    min="0"
                    required
                    value={price || ''}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className={`w-full text-xs p-2.5 border rounded-lg font-mono ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                  {formErrors.price && <p className="text-[10px] text-red-500 font-mono mt-0.5">{formErrors.price}</p>}
                </div>

                {/* Stock */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 block">Stock Inicial *</label>
                  <input
                    id="input-product-stock"
                    type="number"
                    min="0"
                    required
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value))}
                    className={`w-full text-xs p-2.5 border rounded-lg font-mono ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                  {formErrors.stock && <p className="text-[10px] text-red-500 font-mono mt-0.5">{formErrors.stock}</p>}
                </div>

                {/* Unit of sale */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 block">Unidade de Venda *</label>
                  <select
                    id="input-product-unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className={`w-full text-xs p-2.5 border rounded-lg ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="UN">Unidade (UN)</option>
                    <option value="SERV">Serviço (SERV)</option>
                    <option value="KG">Quilograma (KG)</option>
                    <option value="L">Litros (L)</option>
                    <option value="H">Horas de Trabalho (H)</option>
                  </select>
                </div>
              </div>

              {/* Tax configuration (IVA and exemption) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-950/10 dark:border-slate-900/40">
                {/* Direct Tax */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 block">Alíquota IVA em Angola *</label>
                  <select
                    id="input-product-tax"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className={`w-full text-xs p-2.5 border rounded-lg ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-805'
                    }`}
                  >
                    <option value={14}>14% Taxa Padrão Geral</option>
                    <option value={7}>7% Taxa Reduzida (Prestação Serviços / Província Cabinda)</option>
                    <option value={5}>5% Taxa Bens de Consumo Alimentar Base</option>
                    <option value={0}>0% Isento de IVA (Exige Justificação)</option>
                  </select>
                </div>

                {/* Exemption code */}
                {taxRate === 0 && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 block">Motivo de Isenção Oficial (AGT) *</label>
                    <select
                      id="input-product-exemption"
                      value={exemptionCode}
                      required
                      onChange={(e) => setExemptionCode(e.target.value)}
                      className={`w-full text-[11px] p-2.5 border rounded-lg ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-800 text-yellow-500' : 'bg-slate-50 border-slate-200 text-yellow-750'
                      }`}
                    >
                      <option value="">-- Seleccionar Código AGT --</option>
                      <option value="M10">M10 - Isento nos termos do Artigo 9.º do Código do IVA</option>
                      <option value="M12">M12 - Sujeito a taxa zero (Regime de exportação)</option>
                      <option value="M15">M15 - IVA - Regime de Exclusão (Microempresas)</option>
                      <option value="M16">M16 - Isenção por acordo bilateral internacional</option>
                    </select>
                    {formErrors.exemptionCode && <p className="text-[10px] text-red-500 font-mono mt-0.5">{formErrors.exemptionCode}</p>}
                  </div>
                )}
              </div>

              {/* Actions submit */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-900/10 dark:border-slate-800/40">
                <button
                  id="btn-dismiss-product-modal"
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg border ${
                    theme === 'dark' ? 'border-slate-800 text-slate-350 hover:bg-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirm-product-save"
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  {isSaving ? 'A guardar...' : 'Confirmar Guardar'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
