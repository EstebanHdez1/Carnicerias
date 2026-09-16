import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Edit2,
  KeyRound,
  Power,
  CheckCircle,
  AlertCircle,
  X,
  Shield,
  User,
} from 'lucide-react';
import { api } from '../services/api';

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Create/Edit User Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    password: '',
    role: 'VENDEDOR',
  });
  const [submitting, setSubmitting] = useState(false);

  // Reset Password Modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [submittingPass, setSubmittingPass] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.get('/users');
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (err) {
      setError(err.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      name: '',
      password: '',
      role: 'VENDEDOR',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setFormData({
      username: u.username,
      name: u.name,
      password: '',
      role: u.role,
    });
    setIsModalOpen(true);
  };

  const openResetPasswordModal = (u) => {
    setPasswordTargetUser(u);
    setNewPassword('');
    setIsPasswordModalOpen(true);
  };

  const handleSubmitUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      if (editingUser) {
        const res = await api.put(`/users/${editingUser.id}`, {
          username: formData.username,
          name: formData.name,
          role: formData.role,
        });
        if (res.success) {
          setSuccessMsg('Usuario actualizado correctamente');
          setIsModalOpen(false);
          loadUsers();
        }
      } else {
        const res = await api.post('/users', formData);
        if (res.success) {
          setSuccessMsg('Usuario creado exitosamente');
          setIsModalOpen(false);
          loadUsers();
        }
      }
    } catch (err) {
      setError(err.message || 'Error al procesar usuario');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordTargetUser) return;
    setError('');
    setSuccessMsg('');
    setSubmittingPass(true);

    try {
      const res = await api.post(`/users/${passwordTargetUser.id}/reset-password`, {
        new_password: newPassword,
      });
      if (res.success) {
        setSuccessMsg(res.message);
        setIsPasswordModalOpen(false);
      }
    } catch (err) {
      setError(err.message || 'Error al restablecer contraseña');
    } finally {
      setSubmittingPass(false);
    }
  };

  const handleToggleStatus = async (u) => {
    setError('');
    try {
      const res = await api.patch(`/users/${u.id}/status`);
      if (res.success) {
        setSuccessMsg(res.message);
        loadUsers();
      }
    } catch (err) {
      setError(err.message || 'Error al cambiar estado');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-4 pb-24 space-y-4">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-700" />
            Gestión de Usuarios y Vendedores
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Crea vendedores, asigna roles y administra credenciales
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="touch-btn bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-700/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nuevo Usuario
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

      {/* Users List */}
      {loading ? (
        <div className="bg-white p-8 rounded-3xl border border-gray-200 text-center text-gray-400">
          Cargando usuarios...
        </div>
      ) : (
        <div className="space-y-2.5">
          {users.map((u) => (
            <div
              key={u.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                u.status === 'ACTIVE'
                  ? 'bg-white border-gray-200 shadow-sm'
                  : 'bg-gray-50 border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                    u.role === 'ADMIN'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-indigo-100 text-indigo-800'
                  }`}
                >
                  {u.role === 'ADMIN' ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-base">{u.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.role === 'ADMIN'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {u.role}
                    </span>
                    <span
                      className={`text-[10px] font-bold ${
                        u.status === 'ACTIVE' ? 'text-emerald-700' : 'text-gray-400'
                      }`}
                    >
                      ({u.status})
                    </span>
                  </div>

                  <div className="text-xs text-gray-500 mt-0.5">
                    Usuario: <strong className="font-mono">{u.username}</strong> • Ventas
                    registradas: <strong>{u._count?.sales || 0}</strong>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => openEditModal(u)}
                  className="p-2 text-gray-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-colors"
                  title="Editar datos"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => openResetPasswordModal(u)}
                  className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
                  title="Cambiar contraseña"
                >
                  <KeyRound className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleStatus(u)}
                  className={`p-2 rounded-xl transition-colors ${
                    u.status === 'ACTIVE'
                      ? 'text-emerald-600 hover:bg-red-50 hover:text-red-600'
                      : 'text-gray-400 hover:bg-emerald-50 hover:text-emerald-600'
                  }`}
                  title={u.status === 'ACTIVE' ? 'Desactivar usuario' : 'Activar usuario'}
                >
                  <Power className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-scaleUp">
            <div className="p-4 sm:p-5 bg-indigo-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-lg">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-indigo-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitUser} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nombre de Usuario (Login)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. juanperez"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-600"
                  autoCapitalize="none"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Contraseña Inicial
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Rol en el Sistema
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'VENDEDOR' })}
                    className={`py-2 px-3 rounded-xl font-bold text-xs border transition-colors ${
                      formData.role === 'VENDEDOR'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    Vendedor
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'ADMIN' })}
                    className={`py-2 px-3 rounded-xl font-bold text-xs border transition-colors ${
                      formData.role === 'ADMIN'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    Administrador
                  </button>
                </div>
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
                  className="flex-1 touch-btn bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl text-sm shadow-md shadow-indigo-700/20 disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : editingUser ? 'Actualizar' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reset Password */}
      {isPasswordModalOpen && passwordTargetUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-scaleUp">
            <div className="p-4 sm:p-5 bg-amber-600 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Restablecer Contraseña</h3>
                <p className="text-xs text-amber-200">Usuario: {passwordTargetUser.username}</p>
              </div>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="p-1.5 hover:bg-amber-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingPass}
                  className="flex-1 touch-btn bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm shadow-md shadow-amber-600/20 disabled:opacity-50"
                >
                  {submittingPass ? 'Guardando...' : 'Guardar Nueva Contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
