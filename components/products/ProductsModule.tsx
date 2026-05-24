'use client';

import * as React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
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
  Tag
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

export default function ProductsModule() {
  const { currentTenant, theme, addNotification } = useAuthStore();
  const { products, addProduct, updateProduct, deleteProduct } = useDataStore();

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

  if (!currentTenant) return null;

  const tenantProducts = products.filter(p => p.tenantId === currentTenant.id);
  const uniqueCategories = Array.from(new Set(tenantProducts.map(p => p.category)));

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

  const handleSaveProduct = (e: React.FormEvent) => {
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

    if (isEditMode) {
      updateProduct(editingId, formData);
      addNotification({
        title: 'Produto Actualizado',
        desc: `O artigo ${name} foi modificado no catálogo fiscal.`,
        type: 'success'
      });
    } else {
      addProduct({
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
  };

  const handleDeleteTrigger = (id: string, prodName: string) => {
    if (confirm(`Atenção: Tem a certeza que deseja remover o produto/serviço "${prodName}"? Linhas de faturamento que o utilizem não se perderão.`)) {
      deleteProduct(id);
      addNotification({
        title: 'Produto Removido',
        desc: `O artigo ${prodName} foi apagado do catálogo.`,
        type: 'warning'
      });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-sans font-bold tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6 text-blue-500" />
            Catálogo de Artigos e IVA
          </h1>
          <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>
            Gerencie o seu catálogo de bens e prestação de serviços com as correspondentes configurações de IVA e códigos de isenção da AGT.
          </p>
        </div>
        
        <button
          id="btn-add-product-trigger"
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Novo Artigo</span>
        </button>
      </div>

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
            const isLowStock = p.stock <= 5 && p.unit === 'UN';
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
                      className="p-1.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-400 hover:text-red-500 transition-colors"
                      title="Remover Artigo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
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
                        <AlertTriangle className="h-3 w-3" /> Retido ({p.stock})
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Confirmar Guardar
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
