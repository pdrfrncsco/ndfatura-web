'use client';

import * as React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { getApiFieldErrors } from '../../services/api';
import { canDeleteCatalog, canWriteCatalog } from '../../lib/rbac';
import { Client } from '../../types/invoice';
import { 
  Users, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  CheckCircle, 
  AlertTriangle, 
  X,
  MapPin,
  Mail,
  Phone,
  Building,
  UserCheck
} from 'lucide-react';
import { z } from 'zod';

// Zod schema for client validation in Angola
const clientSchema = z.object({
  name: z.string().min(5, 'O nome deve ter pelo menos 5 caracteres.'),
  nif: z.string().length(9, 'O NIF em Angola deve ter exatamente 9 dígitos.').regex(/^[123579][0-9]{8}$/, 'O NIF em Angola deve iniciar com 1, 2, 3, 5, 7 ou 9.'),
  email: z.string().email('Introduza um endereço de e-mail corporativo válido.'),
  phone: z.string().optional(),
  address: z.string().min(6, 'Introduza o endereço completo com rua e número.'),
  city: z.string().min(3, 'Introduza a província/cidade.'),
  country: z.string().default('Angola')
});

export default function ClientsModule() {
  const { currentTenant, theme, user, addNotification } = useAuthStore();
  const { clients, addClient, updateClient, deleteClient } = useDataStore();
  const canWriteClients = canWriteCatalog(user?.role);
  const canDeleteClients = canDeleteCatalog(user?.role);

  const [searchTerm, setSearchTerm] = React.useState('');
  const [cityFilter, setCityFilter] = React.useState('ALL');
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 6;

  // Add / Edit Form State
  const [modalOpen, setModalOpen] = React.useState(false);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [editingId, setEditingId] = React.useState('');
  
  // Fields state
  const [name, setName] = React.useState('');
  const [nif, setNif] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [city, setCity] = React.useState('Luanda');

  // Error feedback state
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = React.useState(false);

  if (!currentTenant) return null;

  const tenantClients = clients.filter(c => c.tenantId === currentTenant.id);

  // Cities list for sorting filters
  const uniqueCities = Array.from(new Set(tenantClients.map(c => c.city)));

  // Search filter
  const filteredClients = tenantClients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.nif.includes(searchTerm) || 
                          c.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCity = cityFilter === 'ALL' || c.city === cityFilter;
    return matchesSearch && matchesCity;
  });

  // Pagination bounds
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentClients = filteredClients.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);

  // Form togglers
  const handleOpenCreateModal = () => {
    setIsEditMode(false);
    setEditingId('');
    setName('');
    setNif('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCity('Luanda');
    setFormErrors({});
    setModalOpen(true);
  };

  const handleOpenEditModal = (c: Client) => {
    setIsEditMode(true);
    setEditingId(c.id);
    setName(c.name);
    setNif(c.nif);
    setEmail(c.email);
    setPhone(c.phone ?? '');
    setAddress(c.address);
    setCity(c.city);
    setFormErrors({});
    setModalOpen(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const clientData = {
      name, nif, email, phone: phone || '', address, city, country: 'Angola'
    };

    // Validate using Zod
    const validationResult = clientSchema.safeParse(clientData);
    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      validationResult.error.issues.forEach(err => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      setFormErrors(errors);
      return;
    }

    setIsSaving(true);
    try {
      if (isEditMode) {
        await updateClient(editingId, clientData);
        addNotification({
          title: 'Cliente Actualizado',
          desc: `Os dados do cliente ${name} foram modificados com sucesso.`,
          type: 'success'
        });
      } else {
        await addClient({
          ...clientData,
          tenantId: currentTenant.id
        });
        addNotification({
          title: 'Cliente Registado',
          desc: `O cliente ${name} foi cadastrado com sucesso nas suas bases ERP.`,
          type: 'success'
        });
      }
      setModalOpen(false);
    } catch (error) {
      const apiErrors = getApiFieldErrors(error);
      setFormErrors(Object.keys(apiErrors).length > 0 ? apiErrors : { global: error instanceof Error ? error.message : 'Falha ao guardar cliente.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTrigger = (id: string, clientName: string) => {
    if (confirm(`Atenção: Tem a certeza que deseja excluir permanentemente o cliente: ${clientName}? Todas as propostas em rasunho ficarão órfãs.`)) {
      deleteClient(id)
        .then(() => addNotification({
          title: 'Cliente Removido',
          desc: `O cliente ${clientName} foi excluído da lista de faturamento.`,
          type: 'warning'
        }))
        .catch((error) => addNotification({
          title: 'Remoção bloqueada',
          desc: error instanceof Error ? error.message : 'Não foi possível remover o cliente.',
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
            <Users className="h-6 w-6 text-blue-500" />
            Agenda de Clientes (SaaS)
          </h1>
          <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>
            Cadastre os seus clientes nacionais e corporativos especificando os NIFs válidos para efeitos de facturação.
          </p>
        </div>
        
        <button
          id="btn-add-client-trigger"
          onClick={handleOpenCreateModal}
          disabled={!canWriteClients}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
          title={!canWriteClients ? 'Perfil sem permissão para registar clientes' : 'Novo Cliente'}
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className={`p-4 rounded-xl border ${
        theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'
      } flex flex-col sm:flex-row gap-3 items-center justify-between`}>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            id="search-clients-input"
            type="text"
            placeholder="Pesquisar por NIF, Razão Social ou Email..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className={`w-full pl-9 pr-4 py-2 text-xs rounded-lg border ${
              theme === 'dark' 
                ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-blue-500' 
                : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
            } focus:outline-none transition-colors`}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto self-end">
          <span className="text-[10px] text-slate-500 font-semibold uppercase whitespace-nowrap">Localização:</span>
          <select
            id="filter-city-select"
            value={cityFilter}
            onChange={(e) => { setCityFilter(e.target.value); setCurrentPage(1); }}
            className={`text-[11px] font-semibold border rounded-lg p-1.5 w-44 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <option value="ALL">Todas as províncias</option>
            {uniqueCities.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards / Grit layouts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentClients.length === 0 ? (
          <div className={`col-span-full py-16 text-center border rounded-xl border-dashed ${
            theme === 'dark' ? 'bg-slate-950 border-slate-900 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'
          }`}>
            <Users className="h-12 w-12 mx-auto text-blue-500 opacity-40 mb-3" />
            <h3 className="font-bold text-sm">Sem clientes registados</h3>
            <p className="text-[11px] mt-0.5 max-w-xs mx-auto">Nenhum registo fiscal atinge os limites de busca aplicados.</p>
          </div>
        ) : (
          currentClients.map((client) => (
            <div 
              key={client.id} 
              className={`p-5 rounded-xl border relative group transition-all hover:shadow-md ${
                theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'
              }`}
            >
              {/* Client ID info */}
              <div className="flex justify-between items-start">
                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                  <Building className="h-4.5 w-4.5" />
                </div>
                
                {canWriteClients && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4">
                  <button
                    id={`btn-edit-client-${client.id}`}
                    onClick={() => handleOpenEditModal(client)}
                    className="p-1.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-400 hover:text-blue-500 transition-colors"
                    title="Editar Cliente"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    id={`btn-delete-client-${client.id}`}
                    onClick={() => handleDeleteTrigger(client.id, client.name)}
                    disabled={!canDeleteClients}
                    className="p-1.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-400 hover:text-red-500 transition-colors"
                    title="Remover Cliente"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                )}
              </div>

              {/* Client specifications */}
              <div className="mt-4">
                <h3 className="text-xs sm:text-sm font-bold font-sans truncate pr-8">
                  {client.name}
                </h3>
                <span className="font-mono text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-900/40 px-2 py-0.5 rounded mt-1.5 inline-block font-semibold">
                  NIF: {client.nif}
                </span>

                <div className="mt-4 space-y-2 text-[11px] text-slate-500">
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span className="truncate">{client.address}, {client.city}</span>
                  </div>
                </div>
              </div>

            </div>
          ))
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 pb-2 text-xs">
          <span className="text-slate-500">A mostrar página {currentPage} de {totalPages} ({filteredClients.length} clientes)</span>
          <div className="flex items-center gap-1">
            <button
              id="btn-clients-prev-page"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="p-1 px-2 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-900 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              id="btn-clients-next-page"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="p-1 px-2 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-900 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {/* ADD / EDIT CLIENT INTERACTIVE MODAL DOCK */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-xl rounded-xl border p-6 space-y-5 max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'bg-slate-950 border-slate-900 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-900/10 dark:border-slate-800/40">
              <h2 className="text-sm font-bold flex items-center gap-2 font-sans">
                <UserCheck className="h-5 w-5 text-blue-500" />
                <span>{isEditMode ? 'Editar de Cadastro Fiscal' : 'Registar Novo Adquirente'}</span>
              </h2>
              <button
                id="btn-close-client-modal"
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-4">
              
              {/* Name field */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 block">Razão Social ou Nome Completo *</label>
                <input
                  id="input-client-name"
                  type="text"
                  required
                  placeholder="Ex: Angola Telecom E.P."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full text-xs p-2.5 border rounded-lg ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
                {formErrors.name && <p className="text-[10px] text-red-500 font-mono mt-0.5">{formErrors.name}</p>}
              </div>

              {/* NIF & Email row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* NIF */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 block">NIF Contribuinte (9 dígitos) *</label>
                  <input
                    id="input-client-nif"
                    type="text"
                    required
                    maxLength={9}
                    placeholder="Ex: 540203918"
                    value={nif}
                    onChange={(e) => setNif(e.target.value.replace(/\D/g, ''))} // only digits
                    className={`w-full text-xs p-2.5 border rounded-lg font-mono ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                  {formErrors.nif && <p className="text-[10px] text-red-500 font-mono mt-0.5">{formErrors.nif}</p>}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 block">Endereço de E-mail Corporativo *</label>
                  <input
                    id="input-client-email"
                    type="email"
                    required
                    placeholder="Ex: finanzas@empresa.ao"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full text-xs p-2.5 border rounded-lg ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                  {formErrors.email && <p className="text-[10px] text-red-500 font-mono mt-0.5">{formErrors.email}</p>}
                </div>
              </div>

              {/* Phone and City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 block font-sans">Contacto Telefónico</label>
                  <input
                    id="input-client-phone"
                    type="text"
                    placeholder="Ex: +244 923 000 000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`w-full text-xs p-2.5 border rounded-lg font-mono ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                {/* City */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 block font-sans">Província / Cidade *</label>
                  <select
                    id="input-client-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={`w-full text-xs p-2.5 border rounded-lg ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="Luanda">Luanda</option>
                    <option value="Benguela">Benguela</option>
                    <option value="Lubango">Lubango</option>
                    <option value="Huambo">Huambo</option>
                    <option value="Cabinda">Cabinda</option>
                    <option value="Soyo">Soyo</option>
                    <option value="Lobito">Lobito</option>
                  </select>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 block">Endereço Residencial/Fiscal Completo *</label>
                <input
                  id="input-client-address"
                  type="text"
                  required
                  placeholder="Ex: Rua Rainha Ginga, Edificio Torres Zimbo N.º 42"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={`w-full text-xs p-2.5 border rounded-lg ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
                {formErrors.address && <p className="text-[10px] text-red-500 font-mono mt-0.5">{formErrors.address}</p>}
              </div>

              {/* Actions submit */}
              {formErrors.global && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] font-semibold text-red-400">
                  {formErrors.global}
                </div>
              )}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-900/10 dark:border-slate-800/40">
                <button
                  id="btn-dismiss-client-modal"
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg border ${
                    theme === 'dark' ? 'border-slate-800 text-slate-350 hover:bg-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  id="btn-saving-client"
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
