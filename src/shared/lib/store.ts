import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

export interface VoiselShop {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface VoiceConfirmation {
  type: 'sale' | 'stock_add' | 'price_update' | 'query' | 'product_create';
  productName: string;
  productId?: string;
  quantity?: number;
  unit?: string;
  price?: number;
  totalAmount?: number;
  profit?: number;
  originalStock?: number;
  newStock?: number;
  currentPrice?: number;
  newPrice?: number;
  queryResult?: any;
}

interface AppState {
  // Auth State
  session: Session | null;
  setSession: (session: Session | null) => void;
  
  // Shop State
  currentShop: VoiselShop | null;
  setCurrentShop: (shop: VoiselShop | null) => void;
  
  // Voice State
  isVoiceOverlayOpen: boolean;
  setVoiceOverlayOpen: (open: boolean) => void;
  voiceStatus: 'idle' | 'listening' | 'processing' | 'error' | 'success';
  setVoiceStatus: (status: 'idle' | 'listening' | 'processing' | 'error' | 'success') => void;
  voiceError: string | null;
  setVoiceError: (err: string | null) => void;
  voiceTranscript: string;
  setVoiceTranscript: (text: string) => void;
  voiceConfirmation: VoiceConfirmation | null;
  setVoiceConfirmation: (confirm: VoiceConfirmation | null) => void;
  
  // Reset all state on logout
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  
  currentShop: null,
  setCurrentShop: (currentShop) => {
    if (currentShop) {
      localStorage.setItem('voisel_current_shop_id', currentShop.id);
    } else {
      localStorage.removeItem('voisel_current_shop_id');
    }
    set({ currentShop });
  },
  
  isVoiceOverlayOpen: false,
  setVoiceOverlayOpen: (isVoiceOverlayOpen) => set({ isVoiceOverlayOpen }),
  voiceStatus: 'idle',
  setVoiceStatus: (voiceStatus) => set({ voiceStatus }),
  voiceError: null,
  setVoiceError: (voiceError) => set({ voiceError }),
  voiceTranscript: '',
  setVoiceTranscript: (voiceTranscript) => set({ voiceTranscript }),
  voiceConfirmation: null,
  setVoiceConfirmation: (voiceConfirmation) => set({ voiceConfirmation }),
  
  reset: () => {
    localStorage.removeItem('voisel_current_shop_id');
    set({
      session: null,
      currentShop: null,
      isVoiceOverlayOpen: false,
      voiceStatus: 'idle',
      voiceError: null,
      voiceTranscript: '',
      voiceConfirmation: null,
    });
  },
}));
