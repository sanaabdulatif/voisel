import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Package, 
  TrendingUp, 
  Mic, 
  Store, 
  Settings, 
  ChevronDown, 
  LogOut,
  Trash2
} from 'lucide-react';
import { useAppStore } from '../../lib/store';
import type { VoiselShop } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import { inventoryService } from '../../services/inventoryService';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export function AppLayout() {
  const { 
    currentShop, 
    setCurrentShop, 
    setVoiceOverlayOpen, 
    session,
    reset 
  } = useAppStore();
  
  const navigate = useNavigate();
  const location = useLocation();
  const [shops, setShops] = useState<VoiselShop[]>([]);
  const [isShopDropdownOpen, setIsShopDropdownOpen] = useState(false);
  const isSettingsPage = location.pathname === '/settings';

  const [isAddShopOpen, setIsAddShopOpen] = useState(false);
  const [newShopName, setNewShopName] = useState('');
  const [isSubmittingShop, setIsSubmittingShop] = useState(false);
  const [shopError, setShopError] = useState<string | null>(null);

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim() || !session?.user?.id) return;
    setIsSubmittingShop(true);
    setShopError(null);
    try {
      const data = await inventoryService.createShop(newShopName.trim(), session.user.id);
      setNewShopName('');
      setCurrentShop(data);
      // Reload shops list
      const updatedShops = await inventoryService.getShops(session.user.id);
      setShops(updatedShops);
      setIsAddShopOpen(false);
    } catch (err: any) {
      setShopError(err.message || 'Failed to add shop branch.');
    } finally {
      setIsSubmittingShop(false);
    }
  };

  // Fetch shops
  useEffect(() => {
    async function fetchShops() {
      if (!session?.user?.id) return;
      try {
        const data = await inventoryService.getShops(session.user.id);
        setShops(data);
        if (data.length > 0) {
          const savedShopId = localStorage.getItem('voisel_current_shop_id');
          const matchedShop = data.find(s => s.id === savedShopId);
          if (matchedShop) {
            if (!currentShop || currentShop.id !== matchedShop.id) {
              setCurrentShop(matchedShop);
            }
          } else if (!currentShop) {
            setCurrentShop(data[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load shops:', err);
      }
    }
    fetchShops();
  }, [session, currentShop, setCurrentShop]);

  const handleDeleteShop = async (shopId: string, shopName: string) => {
    if (shops.length <= 1) {
      alert("You must keep at least one shop branch active.");
      return;
    }
    const confirmed = window.confirm(`Are you sure you want to delete "${shopName}"? This will permanently delete all its products and sales history.`);
    if (!confirmed) return;

    try {
      await inventoryService.deleteShop(shopId);
      
      const remaining = shops.filter(s => s.id !== shopId);
      setShops(remaining);

      if (currentShop?.id === shopId) {
        setCurrentShop(remaining[0]);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete shop branch.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    reset();
    navigate('/login');
  };

  const menuItems = [
    { label: 'Home', icon: Package, path: '/' },
    { label: 'Sales', icon: TrendingUp, path: '/sales' },
    { label: 'Settings', icon: Settings, path: '/settings' },
  ];

  return (
    <div className="min-h-screen flex bg-brand-softCream text-brand-darkText">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-brand-cream/60 shrink-0 sticky top-0 h-screen">
        {/* Brand Header */}
        <div className="p-6 border-b border-brand-cream/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center text-white shadow-premium">
            <Store size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-brand-dark">Voisel</h1>
            <p className="text-[10px] text-brand-mutedText font-semibold tracking-widest uppercase">AI Retail Engine</p>
          </div>
        </div>

        {/* Shop Switcher */}
        <div className="px-4 py-4 border-b border-brand-cream/40 relative">
          <button
            onClick={() => setIsShopDropdownOpen(!isShopDropdownOpen)}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-brand-cream/40 border border-brand-cream transition-all duration-200"
          >
            <div className="flex items-center gap-2.5 text-left min-w-0">
              <Store className="text-brand-primary shrink-0" size={18} />
              <div className="min-w-0">
                <p className="text-[10px] text-brand-mutedText font-bold uppercase tracking-wider leading-none mb-0.5">Active Shop</p>
                <p className="text-sm font-bold truncate leading-tight">{currentShop?.name || 'Loading Shop...'}</p>
              </div>
            </div>
            <ChevronDown size={16} className={`text-brand-mutedText transition-transform duration-200 ${isShopDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Shop Switcher Dropdown */}
          {isShopDropdownOpen && (
            <div className="absolute left-4 right-4 mt-2 bg-white rounded-xl shadow-premium border border-brand-cream/60 z-30 max-h-48 overflow-y-auto p-1.5">
              {shops.map((shop) => (
                <div
                  key={shop.id}
                  className={`w-full px-3 py-1.5 text-sm rounded-lg flex items-center justify-between transition-colors ${
                    currentShop?.id === shop.id 
                      ? 'bg-brand-primary/10 text-brand-dark font-semibold' 
                      : 'hover:bg-brand-cream/50 text-brand-darkText'
                  }`}
                >
                  <button
                    onClick={() => {
                      setCurrentShop(shop);
                      setIsShopDropdownOpen(false);
                    }}
                    className="flex-1 text-left truncate min-w-0"
                  >
                    {shop.name}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteShop(shop.id, shop.name);
                    }}
                    className="p-1 rounded text-brand-mutedText hover:text-brand-error hover:bg-red-50 transition-colors ml-2 shrink-0"
                    title="Delete Branch"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <div className="border-t border-brand-cream/60 mt-1.5 pt-1.5">
                <button
                  onClick={() => {
                    setIsShopDropdownOpen(false);
                    setIsAddShopOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-brand-primary hover:text-brand-dark"
                >
                  + Add New Shop
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive 
                    ? 'bg-brand-primary text-white shadow-premium' 
                    : 'text-brand-mutedText hover:text-brand-darkText hover:bg-brand-cream/40'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Voice Assistant Button (Desktop Sidebar Specific) */}
          <button
            onClick={() => setVoiceOverlayOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-brand-primary hover:text-brand-dark hover:bg-brand-primary/10 transition-all duration-200 border border-brand-primary/20 bg-brand-primary/5 mt-4"
          >
            <Mic size={18} className="animate-pulse" />
            <span>Voice Assistant</span>
          </button>
        </nav>

        {/* Bottom Profile Info */}
        <div className="p-4 border-t border-brand-cream/60 mt-auto">
          <div className="flex items-center justify-between p-2">
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">{session?.user?.email || 'Shopkeeper'}</p>
              <p className="text-[10px] text-brand-mutedText truncate">Owner Account</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-brand-mutedText hover:text-brand-error hover:bg-red-50 transition-all duration-200"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE PAGE WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0 h-screen overflow-y-auto">
        {/* UNIVERSAL TOP HEADER */}
        {!isSettingsPage && (
          <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-brand-cream/60 sticky top-0 z-20">
            {/* Shop Selector Button */}
            <div className="relative">
              <button
                onClick={() => setIsShopDropdownOpen(!isShopDropdownOpen)}
                className="flex items-center gap-1.5 text-brand-darkText font-bold text-base"
              >
                <span>{currentShop?.name || 'Voisel'}</span>
                <ChevronDown size={16} className={`text-brand-mutedText transition-transform ${isShopDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isShopDropdownOpen && (
                <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-premium border border-brand-cream/60 z-30 max-h-48 overflow-y-auto p-1.5">
                   {shops.map((shop) => (
                    <div
                      key={shop.id}
                      className={`w-full px-3 py-1.5 text-sm rounded-lg flex items-center justify-between transition-colors ${
                        currentShop?.id === shop.id 
                          ? 'bg-brand-primary/10 text-brand-dark font-semibold' 
                          : 'hover:bg-brand-cream/50 text-brand-darkText'
                      }`}
                    >
                      <button
                        onClick={() => {
                          setCurrentShop(shop);
                          setIsShopDropdownOpen(false);
                        }}
                        className="flex-1 text-left truncate min-w-0"
                      >
                        {shop.name}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteShop(shop.id, shop.name);
                        }}
                        className="p-1 rounded text-brand-mutedText hover:text-brand-error hover:bg-red-50 transition-colors ml-2 shrink-0"
                        title="Delete Branch"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <div className="border-t border-brand-cream/60 mt-1.5 pt-1.5">
                    <button
                      onClick={() => {
                        setIsShopDropdownOpen(false);
                        setIsAddShopOpen(true);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs font-semibold text-brand-primary"
                    >
                      + Add New Shop
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Prominent Voice Assistant Microphone Button */}
              <button
                onClick={() => setVoiceOverlayOpen(true)}
                className="flex items-center justify-center w-11 h-11 bg-brand-primary text-white rounded-full hover:bg-brand-dark transition-all duration-200 active:scale-95 shadow-md listening-ring cursor-pointer"
                title="Open Voice Assistant"
              >
                <Mic size={18} className="animate-pulse" />
              </button>
            </div>
          </header>
        )}

        {/* PAGE CONTENT CONTAINER */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-brand-cream/60 px-4 py-2 flex items-center justify-around z-40 shadow-[0_-4px_20px_-4px_rgba(24,32,26,0.08)]">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl transition-all duration-200 ${
                isActive ? 'text-brand-primary' : 'text-brand-mutedText'
              }`}
            >
              <Icon size={22} />
              <span className="text-[10px] font-semibold tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* ADD SHOP MODAL */}
      <Modal
        isOpen={isAddShopOpen}
        onClose={() => {
          setIsAddShopOpen(false);
          setNewShopName('');
          setShopError(null);
        }}
        title="Add New Shop Branch"
      >
        <form onSubmit={handleCreateShop} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-brand-darkText uppercase tracking-wider">
              Shop / Branch Name
            </label>
            <input
              type="text"
              className="premium-input"
              placeholder="e.g. Sana Mart - Kaloor Branch"
              value={newShopName}
              onChange={(e) => setNewShopName(e.target.value)}
              required
              disabled={isSubmittingShop}
              autoFocus
            />
          </div>
          
          {shopError && (
            <p className="text-xs text-brand-error font-medium">{shopError}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsAddShopOpen(false);
                setNewShopName('');
                setShopError(null);
              }}
              className="flex-1 py-2.5 text-xs font-bold"
              disabled={isSubmittingShop}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 py-2.5 text-xs font-bold"
              disabled={isSubmittingShop}
            >
              {isSubmittingShop ? 'Adding...' : 'Create Branch'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
