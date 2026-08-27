import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { supabase } from './shared/lib/supabase';
import { useAppStore } from './shared/lib/store';
import { AppLayout } from './shared/components/layout/AppLayout';

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
  const { setSession } = useAppStore();

  useEffect(() => {
    // Listen to session updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setSession]);

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
