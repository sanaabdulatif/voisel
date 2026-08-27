import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, LogOut, Plus, Mail, Edit3, Trash2 } from 'lucide-react';
import { useAppStore } from '../../../shared/lib/store';
import type { VoiselShop } from '../../../shared/lib/store';
import { supabase } from '../../../shared/lib/supabase';
import { Button } from '../../../shared/components/ui/Button';
import { inventoryService } from '../../../shared/services/inventoryService';

export function SettingsView() {
  const navigate = useNavigate();
  const { session, currentShop, setCurrentShop, reset } = useAppStore();
  const [shops, setShops] = useState<VoiselShop[]>([]);
  const [newShopName, setNewShopName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);



  useEffect(() => {
    fetchShops();
  }, [session]);

  const fetchShops = async () => {
    if (!session?.user?.id) return;
    try {
      const data = await inventoryService.getShops(session.user.id);
      setShops(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim() || !session?.user?.id) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await inventoryService.createShop(newShopName.trim(), session.user.id);
      setNewShopName('');
      setCurrentShop(data);
      fetchShops();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add shop.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditShop = async (shopId: string, currentName: string) => {
    const newName = window.prompt("Edit Shop Branch Name:", currentName);
    if (newName === null) return;
    if (!newName.trim()) {
      alert("Shop branch name cannot be empty.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const updated = await inventoryService.updateShop(shopId, newName.trim());
      if (currentShop?.id === shopId) {
        setCurrentShop(updated);
      }
      fetchShops();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to update shop branch name.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteShop = async (shopId: string, shopName: string) => {
    if (shops.length <= 1) {
      alert("You must keep at least one shop branch active.");
      return;
    }
    const confirmed = window.confirm(`Are you sure you want to delete "${shopName}"? This will permanently delete all its products and sales history. This action cannot be undone.`);
    if (!confirmed) return;

    setIsLoading(true);
    setErrorMsg(null);
    try {
      await inventoryService.deleteShop(shopId);
      if (currentShop?.id === shopId) {
        const remaining = shops.filter(s => s.id !== shopId);
        setCurrentShop(remaining[0]);
      }
      fetchShops();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to delete shop branch.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    reset();
    navigate('/login');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl pb-12">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-brand-dark tracking-tight">Settings</h2>
        <p className="text-xs text-brand-mutedText font-semibold mt-0.5">Manage branch outlets, language preferences, and profile credentials</p>
      </div>

      {/* USER PROFILE INFO */}
      <div className="glass-card p-6 flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="space-y-1.5 min-w-0 text-left">
          <h4 className="text-base font-bold text-brand-dark">{currentShop?.name || 'Loading Shop...'}</h4>
          <p className="text-xs text-brand-mutedText font-semibold flex items-center gap-1.5">
            <Mail size={14} className="text-brand-mutedText/70" /> 
            <span>{session?.user?.email || 'N/A'}</span>
          </p>
        </div>
        <Button 
          variant="ghost" 
          onClick={handleLogout} 
          className="flex items-center gap-2 text-brand-error hover:bg-red-50 text-xs py-2.5 px-4 self-stretch sm:self-auto border border-brand-error/10 rounded-xl"
        >
          <LogOut size={14} />
          <span>Logout</span>
        </Button>
      </div>



      {/* MULTI-SHOP LIST */}
      <div className="glass-card p-6 space-y-6">
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-brand-dark">Shop Outlets</h4>
          <p className="text-xs text-brand-mutedText mt-0.5">Switch between your active branch inventories</p>
        </div>

        <div className="space-y-2.5">
          {shops.map((shop) => (
            <div 
              key={shop.id} 
              className={`p-4 border rounded-xl flex items-center justify-between transition-all ${
                currentShop?.id === shop.id 
                  ? 'border-brand-primary/40 bg-brand-primary/5 shadow-sm' 
                  : 'border-brand-cream/80 hover:bg-brand-cream/25'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Store size={18} className={currentShop?.id === shop.id ? 'text-brand-primary shrink-0' : 'text-brand-mutedText shrink-0'} />
                <span className={`text-sm font-bold truncate ${currentShop?.id === shop.id ? 'text-brand-dark' : 'text-brand-darkText'}`}>
                  {shop.name}
                </span>
              </div>
              
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <button
                  onClick={() => handleEditShop(shop.id, shop.name)}
                  className="p-1.5 rounded-lg text-brand-mutedText hover:text-brand-primary hover:bg-brand-cream/50 transition-colors"
                  title="Rename Branch"
                  disabled={isLoading}
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => handleDeleteShop(shop.id, shop.name)}
                  className="p-1.5 rounded-lg text-brand-mutedText hover:text-brand-error hover:bg-red-50 transition-colors"
                  title="Delete Branch"
                  disabled={isLoading}
                >
                  <Trash2 size={14} />
                </button>

                {currentShop?.id === shop.id ? (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 bg-brand-primary text-white rounded-md">
                    Active
                  </span>
                ) : (
                  <Button 
                    variant="secondary" 
                    onClick={() => setCurrentShop(shop)}
                    className="px-3 py-1.5 text-xs rounded-lg"
                    disabled={isLoading}
                  >
                    Switch
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add new shop form */}
        <form onSubmit={handleCreateShop} className="border-t border-brand-cream/65 pt-6 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-brand-darkText uppercase tracking-wider">
              Add New Shop Branch
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="premium-input flex-1"
                placeholder="e.g. Fresh Mart - Market Branch"
                value={newShopName}
                onChange={(e) => setNewShopName(e.target.value)}
                required
              />
              <Button type="submit" className="flex items-center gap-1.5 px-4" disabled={isLoading}>
                <Plus size={16} />
                <span>Add</span>
              </Button>
            </div>
          </div>
          {errorMsg && <p className="text-xs text-brand-error font-medium">{errorMsg}</p>}
        </form>
      </div>

    </div>
  );
}
