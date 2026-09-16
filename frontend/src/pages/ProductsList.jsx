import React, { useState, useEffect } from 'react';
import {
  Layers,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useDraft } from '../hooks/useDraft';

export default function ProductsList() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    description: '',
    unit_measure: 'kg',
    current_stock: '',
    sale_price: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Draft recovery for product creation (silent resumption)
  const { savedDraft, saveDraft, clearDraft } = useDraft(
    'product_creation',
    null
  );

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [prodRes, catRes] = await Promise.all([
        api.get('/products'),
        api.get('/categories'),
      ]);

      if (prodRes.success) setProducts(prodRes.products || []);
      if (catRes.success) {
        setCategories(catRes.categories || []);
        if (catRes.categories.length > 0 && !formData.category_id) {
          setFormData((prev) => ({ ...prev, category_id: catRes.categories[0].id }));
        }
      }
    } catch (err) {
      setError(err.message || 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Open create modal: silently pre-fill with draft if present
  const openCreateModal = () => {
    setEditingProduct(null);
    if (savedDraft) {
      setFormData(savedDraft);
    } else {
      setFormData({
        name: '',
        category_id: categories[0]?.id || '',
        description: '',
        unit_measure: 'kg',
        current_stock: '',
        sale_price: '',
      });
    }
    setIsModalOpen(true);
  };

  const openEditModal = (prod) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      category_id: prod.category_id,
      description: prod.description || '',
      unit_measure: prod.unit_measure,
      current_stock: prod.current_stock,
      sale_price: prod.sale_price,
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (!editingProduct && (updated.name || updated.sale_price)) {
        saveDraft(updated);
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      if (editingProduct) {
        // Update product
        const res = await api.put(`/products/${editingProduct.id}`, {
          name: formData.name,
          category_id: formData.category_id,
          description: formData.description || undefined,
          unit_measure: formData.unit_measure,
          sale_price: Number(formData.sale_price),
        });
        if (res.success) {
          setSuccessMsg('Producto actualizado correctamente');
          setIsModalOpen(false);
          loadData();
        }
      } else {
        // Create product
        const res = await api.post('/products', {
          name: formData.name,
          category_id: formData.category_id,
          description: formData.description || undefined,
          unit_measure: formData.unit_measure,
          current_stock: Number(formData.current_stock) || 0,
          sale_price: Number(formData.sale_price),
        });
        if (res.success) {
          setSuccessMsg('Producto registrado exitosamente');
          clearDraft();
          setIsModalOpen(false);
          loadData();
        }
      }
    } catch (err) {
      setError(err.message || 'No fue posible guardar el producto.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`¿Estás seguro de eliminar o desactivar "${name}"?`)) return;
    setError('');
    try {
      const res = await api.delete(`/products/${id}`);
      if (res.success) {
        setSuccessMsg(res.message);
        loadData();
      }
    } catch (err) {
      setError(err.message || 'Error al eliminar producto');
    }
  };

  const filteredProducts = products.filter((p) => {
    if (categoryFilter !== 'ALL' && p.category_id !== categoryFilter) return false;
    if (
      search &&
      !p.name.toLowerCase().includes(search.toLowerCase()) &&
      !(p.description || '').toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 pb-24 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
            <Layers className="w-7 h-7 text-amber-600" />
            Productos Generales
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Pollo, embutidos, bebidas, condimentos y productos varios
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="touch-btn bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-600/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nuevo Producto
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter & Search */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar producto por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-1 focus:ring-amber-600 focus:bg-white"
          />
        </div>

        {/* Categories selector */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:ring-1 focus:ring-amber-600"
        >
          <option value="ALL">Todas las Categorías ({products.length})</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name} ({products.filter((p) => p.category_id === cat.id).length})
            </option>
          ))}
        </select>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="bg-white p-8 rounded-3xl border border-gray-200 text-center text-gray-400">
          Cargando productos...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl border border-gray-200 text-center text-gray-400">
          No se encontraron productos registrados.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredProducts.map((prod) => (
            <div
              key={prod.id}
              className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h4 className="font-bold text-gray-900 text-base">{prod.name}</h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    {prod.category?.name}
                  </span>
                </div>

                {prod.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-2">{prod.description}</p>
                )}

                <div className="text-xs text-gray-500">
                  Stock actual:{' '}
                  <span
                    className={`font-bold ${
                      Number(prod.current_stock) <= 5 ? 'text-red-600' : 'text-emerald-700'
                    }`}
                  >
                    {prod.current_stock} {prod.unit_measure}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="font-black text-gray-900 text-base">
                  ${Number(prod.sale_price).toLocaleString()}
                  <span className="text-xs font-normal text-gray-400">/{prod.unit_measure}</span>
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(prod)}
                    className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
                    title="Editar producto"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDelete(prod.id, prod.name)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      title="Eliminar o desactivar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 animate-scaleUp">
            <div className="p-4 sm:p-5 bg-amber-600 text-white flex items-center justify-between">
              <h3 className="font-bold text-lg">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto General'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-amber-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nombre del Producto
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Pechuga de Pollo, Hamburguesa Res x4"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Categoría
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => handleInputChange('category_id', e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Unidad de Medida
                  </label>
                  <select
                    value={formData.unit_measure}
                    onChange={(e) => handleInputChange('unit_measure', e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white"
                  >
                    <option value="kg">Kilogramo (kg)</option>
                    <option value="unidad">Unidad</option>
                    <option value="libra">Libra</option>
                    <option value="paquete">Paquete</option>
                    <option value="bandeja">Bandeja</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {!editingProduct && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Inventario Inicial
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0"
                      value={formData.current_stock}
                      onChange={(e) => handleInputChange('current_stock', e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white"
                    />
                  </div>
                )}

                <div className={editingProduct ? 'col-span-2' : ''}>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Precio de Venta ($)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    placeholder="Ej. 18000"
                    value={formData.sale_price}
                    onChange={(e) => handleInputChange('sale_price', e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Descripción (Opcional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Detalles adicionales..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 touch-btn bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm shadow-md shadow-amber-600/20 disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : editingProduct ? 'Actualizar' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
