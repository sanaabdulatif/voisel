import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Mic } from 'lucide-react';

import { supabase } from './shared/lib/supabase';
import { useAppStore } from './shared/lib/store';
import { AppLayout } from './shared/components/layout/AppLayout';
import { inventoryService } from './shared/services/inventoryService';

// Features
import { AuthView } from './features/auth/components/AuthView';
import { ShopSetupView } from './features/shops/components/ShopSetupView';
import { InventoryView } from './features/inventory/components/InventoryView';
import { SalesHistoryView } from './features/sales/components/SalesHistoryView';
import { SettingsView } from './features/shops/components/SettingsView';
import { VoiceAssistantOverlay } from './features/voice/components/VoiceAssistantOverlay';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Guard component to redirect unauthenticated users
function ProtectedRoute() {
  const { session } = useAppStore();
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

// Guard component to make sure the user has a selected shop
function ShopRequiredRoute() {
  const { currentShop } = useAppStore();
  if (!currentShop) {
    return <Navigate to="/shop-setup" replace />;
  }
  return <AppLayout />;
}

export function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const { setSession, setCurrentShop } = useAppStore();

  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (isMounted) {
          setSession(initialSession);
          if (initialSession) {
            const shops = await inventoryService.getShops(initialSession.user.id);
            if (shops && shops.length > 0) {
              const savedShopId = localStorage.getItem('voisel_current_shop_id');
              const matchedShop = shops.find((s) => s.id === savedShopId);
              setCurrentShop(matchedShop || shops[0]);
            } else {
              setCurrentShop(null);
            }
          } else {
            setCurrentShop(null);
          }
        }
      } catch (err) {
        console.error('Error during auth initialization:', err);
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    }

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);

      if (event === 'SIGNED_IN' && newSession) {
        try {
          const shops = await inventoryService.getShops(newSession.user.id);
          if (shops && shops.length > 0) {
            const savedShopId = localStorage.getItem('voisel_current_shop_id');
            const matchedShop = shops.find((s) => s.id === savedShopId);
            setCurrentShop(matchedShop || shops[0]);
          } else {
            setCurrentShop(null);
          }
        } catch (err) {
          console.error('Error loading shops on SIGNED_IN:', err);
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentShop(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [setSession, setCurrentShop]);

  if (isInitializing) {
    return (
      <div className="fixed inset-0 bg-brand-dark flex flex-col items-center justify-center text-white z-50 p-6">
        <div className="flex flex-col items-center max-w-sm text-center">
          <div className="flex items-center gap-1.5 mb-6 h-12">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="w-1.5 bg-brand-success rounded-full animate-waveform"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
            <div className="w-12 h-12 rounded-2xl bg-brand-primary flex items-center justify-center text-white ml-2 shadow-premium">
              <Mic size={24} />
            </div>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">Voisel</h1>
          <p className="text-brand-cream/80 text-sm font-medium tracking-wide mb-8">
            “Run your fresh shop with your voice.”
          </p>
          <div className="w-8 h-8 rounded-full border-4 border-white/20 border-t-brand-success animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication */}
          <Route path="/login" element={<AuthView />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/shop-setup" element={<ShopSetupView />} />
            
            {/* Shop Context Required */}
            <Route element={<ShopRequiredRoute />}>
              <Route path="/" element={<InventoryView />} />
              <Route path="/sales" element={<SalesHistoryView />} />
              <Route path="/settings" element={<SettingsView />} />
            </Route>
          </Route>

          {/* Catch-all Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Global Voice Assistant Overlay */}
        <VoiceAssistantOverlay />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
