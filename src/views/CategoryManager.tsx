import React, { useState } from 'react';
import { useFinanceViewModel } from '../viewmodels/useFinanceViewModel';
import { ArrowLeft, Plus, Edit2, Trash2, X, Check, MoreHorizontal } from 'lucide-react';
import { Category } from '../models/types';
import { api } from '../services/api';
import { translations } from '../utils/translations';
import { CATEGORY_ICONS, getCategoryIcon } from '../utils/icons';

export default function CategoryManager({ viewModel, onClose }: { viewModel: ReturnType<typeof useFinanceViewModel>, onClose: () => void }) {
  const { categories, transactions, refresh, getSetting, translateName } = viewModel;
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('income');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('MoreHorizontal');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('MoreHorizontal');
  const [newParentId, setNewParentId] = useState<number | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean, message: string, onConfirm: () => void } | null>(null);
  const [alertDialog, setAlertDialog] = useState<{ isOpen: boolean, message: string } | null>(null);
  const [displayLimit, setDisplayLimit] = useState(15);
  const observerTarget = React.useRef<HTMLDivElement>(null);

  const language = getSetting('language', 'vi');
  const t = translations[language] || translations['vi'];

  const filteredCategories = categories.filter(c => c.type === activeTab);
  
  const sortCategories = (cats: Category[]) => {
    return [...cats].sort((a, b) => {
      const isAOther = a.name.toLowerCase() === 'khác' || a.name.toLowerCase() === 'other';
      const isBOther = b.name.toLowerCase() === 'khác' || b.name.toLowerCase() === 'other';
      if (isAOther && !isBOther) return 1;
      if (!isAOther && isBOther) return -1;
      return a.id - b.id;
    });
  };

  const parentCategories = sortCategories(filteredCategories.filter(c => c.parent_id === null));
  const displayedParents = parentCategories.slice(0, displayLimit);

  React.useEffect(() => {
    setDisplayLimit(15);
  }, [activeTab]);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayLimit < parentCategories.length) {
          setDisplayLimit(prev => prev + 15);
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [displayLimit, parentCategories.length]);

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditIcon(category.icon || 'MoreHorizontal');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await api.updateCategory(editingId, { name: editName, icon: editIcon });
      await refresh(true);
      setEditingId(null);
    } catch (err) {
      setAlertDialog({ isOpen: true, message: 'Lỗi khi cập nhật danh mục / Error updating category' });
    }
  };

  const handleDelete = async (category: Category) => {
    // Check if this category or any of its children have transactions
    const children = categories.filter(c => c.parent_id === category.id);
    const categoryIdsToCheck = [category.id, ...children.map(c => c.id)];
    
    const hasTransactions = transactions.some(t => {
      // Find the category object for the transaction to check its name or ID
      // The transaction model stores category name, but let's be safe and check both if possible
      // Actually, looking at AddTab.tsx, it saves the category name (string)
      return categoryIdsToCheck.some(id => {
        const cat = categories.find(c => c.id === id);
        return cat && t.category === cat.name;
      });
    });

    if (hasTransactions) {
      const typeText = category.type === 'income' ? (t.incomeType || 'thu') : (t.expenseType || 'chi');
      const errorMessage = (t.deleteCategoryError || 'Đã tồn tại dữ liệu {type} trong lịch sử giao dịch {category}. Không xoá được !')
        .replace('{type}', typeText)
        .replace('{category}', translateName(category.name));
        
      setAlertDialog({ 
        isOpen: true, 
        message: errorMessage
      });
      return;
    }

    const confirmMsg = `${t.confirmDeleteCat || 'Bạn có chắc muốn xóa danh mục'} "${translateName(category.name)}"?`;
    setConfirmDialog({
      isOpen: true,
      message: confirmMsg,
      onConfirm: async () => {
        try {
          // Delete children first
          for (const child of children) {
            await api.deleteCategory(child.id);
          }
          
          await api.deleteCategory(category.id);
          await refresh(true);
          setConfirmDialog(null);
        } catch (err) {
          setConfirmDialog(null);
          setAlertDialog({ isOpen: true, message: 'Lỗi khi xóa danh mục / Error deleting category' });
        }
      }
    });
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await api.addCategory({
        type: activeTab,
        name: newName,
        parent_id: newParentId,
        icon: newIcon
      });
      await refresh(true);
      setShowAdd(false);
      setNewName('');
      setNewIcon('MoreHorizontal');
      setNewParentId(null);
    } catch (err) {
      setAlertDialog({ isOpen: true, message: 'Lỗi khi thêm danh mục / Error adding category' });
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col max-w-md mx-auto shadow-xl">
      <header className="bg-red-600 text-white p-4 flex items-center shadow-md">
        <button onClick={onClose} className="p-2 -ml-2 hover:bg-red-700 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold ml-2">{t.categoryManagement}</h1>
      </header>

      <div className="flex bg-white shadow-sm">
        <button
          onClick={() => setActiveTab('expense')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'expense' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'}`}
        >
          {t.expense}
        </button>
        <button
          onClick={() => setActiveTab('income')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'income' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'}`}
        >
          {t.income}
        </button>
      </div>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {displayedParents.map(parent => (
          <div key={parent.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-white p-3 border-b border-gray-100 font-bold text-gray-800 flex justify-between items-center">
              {editingId === parent.id ? (
                <div className="flex-1 flex flex-col gap-3 mr-2">
                  <input 
                    type="text" 
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-normal"
                    autoFocus
                  />
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 bg-white rounded-lg border border-gray-100">
                    {Object.keys(CATEGORY_ICONS).map(icon => (
                      <button
                        key={icon}
                        onClick={() => setEditIcon(icon)}
                        className={`p-2 rounded-lg border-2 transition-colors ${editIcon === icon ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                      >
                        {CATEGORY_ICONS[icon]}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={handleSaveEdit} className="flex-1 py-2 bg-red-600 text-white rounded-xl font-medium text-xs">{t.save}</button>
                    <button onClick={() => setEditingId(null)} className="py-2 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium text-xs">{t.cancel}</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center">
                    <span className={`mr-3 ${activeTab === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                      {getCategoryIcon(parent.icon)}
                    </span>
                    <span>{translateName(parent.name)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {!parent.is_default && (
                      <>
                        <button onClick={() => handleEdit(parent)} className="text-blue-500 p-1 hover:bg-blue-50 rounded-full"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(parent)} className="text-red-500 p-1 hover:bg-red-50 rounded-full"><Trash2 size={16} /></button>
                      </>
                    )}
                    <button 
                      onClick={() => { setShowAdd(true); setNewParentId(parent.id); }}
                      className="text-red-600 p-1 hover:bg-red-50 rounded-full ml-1"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="divide-y divide-gray-50">
              {sortCategories(filteredCategories.filter(c => c.parent_id === parent.id)).map(child => (
                <div key={child.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                  {editingId === child.id ? (
                    <div className="flex-1 flex flex-col gap-3">
                      <input 
                        type="text" 
                        value={editName} 
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm"
                        autoFocus
                      />
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 bg-white rounded-lg border border-gray-100">
                        {Object.keys(CATEGORY_ICONS).map(icon => (
                          <button
                            key={icon}
                            onClick={() => setEditIcon(icon)}
                            className={`p-2 rounded-lg border-2 transition-colors ${editIcon === icon ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                          >
                            {CATEGORY_ICONS[icon]}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={handleSaveEdit} className="flex-1 py-2 bg-red-600 text-white rounded-xl font-medium text-xs">{t.save}</button>
                        <button onClick={() => setEditingId(null)} className="py-2 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium text-xs">{t.cancel}</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center pl-2">
                        <span className={`mr-3 ${activeTab === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                          {getCategoryIcon(child.icon)}
                        </span>
                        <span className="text-gray-700">{translateName(child.name)}</span>
                      </div>
                      <div className="flex gap-2">
                        {!child.is_default && (
                          <>
                            <button onClick={() => handleEdit(child)} className="text-blue-500 p-1 hover:bg-blue-50 rounded"><Edit2 size={16} /></button>
                            <button onClick={() => handleDelete(child)} className="text-red-500 p-1 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <button 
          onClick={() => { setShowAdd(true); setNewParentId(null); }}
          className="w-full py-3 border border-dashed border-gray-300 rounded-xl text-gray-500 font-medium hover:bg-gray-50 hover:border-red-300 hover:text-red-500 transition-colors flex items-center justify-center bg-white"
        >
          <Plus size={18} className="mr-2" />
          {t.addCatGroup}
        </button>

        {/* Infinite Scroll Sentinel & Loading Spinner */}
        {displayLimit < parentCategories.length && (
          <div ref={observerTarget} className="py-6 flex justify-center items-center">
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-red-600 border-t-transparent"></div>
              <span className="text-gray-400 text-xs font-medium">{t.loading || 'Đang tải thêm...'}</span>
            </div>
          </div>
        )}
      </main>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              {newParentId ? t.addCatChild : `${t.add} ${activeTab === 'expense' ? t.expense : t.income}`}
            </h3>
            
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 uppercase mb-2">{t.parentCategory || 'Nhóm cha'}</label>
              <select
                value={newParentId || ''}
                onChange={(e) => setNewParentId(e.target.value ? Number(e.target.value) : null)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
              >
                <option value="">{t.none || 'Không có (Tạo nhóm mới)'}</option>
                {parentCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{translateName(cat.name)}</option>
                ))}
              </select>
            </div>

            <input
              type="text"
              placeholder={t.catName}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
              autoFocus
            />
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 uppercase mb-2">{t.icon}</label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-gray-50 rounded-xl border border-gray-100">
                {Object.keys(CATEGORY_ICONS).map(icon => (
                  <button
                    key={icon}
                    onClick={() => setNewIcon(icon)}
                    className={`p-2 rounded-lg border-2 transition-colors ${newIcon === icon ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                  >
                    {CATEGORY_ICONS[icon]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowAdd(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
              >
                {t.cancel}
              </button>
              <button 
                onClick={handleAdd}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium"
              >
                {t.add}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-2">{t.confirmDeleteCat || 'Xác nhận xóa'}</h3>
            <p className="text-gray-600 mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
              >
                {t.cancel || 'Hủy'}
              </button>
              <button 
                onClick={confirmDialog.onConfirm}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium"
              >
                {t.delete || 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {alertDialog && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-2">{t.notification || 'Thông báo'}</h3>
            <p className="text-gray-600 mb-6">{alertDialog.message}</p>
            <button 
              onClick={() => setAlertDialog(null)}
              className="w-full py-3 bg-red-600 text-white rounded-xl font-medium"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
