import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Lang, RateMode } from '../types';

interface AppState {
  lang: Lang;
  theme: string;
  showBubbles: boolean;
  rateMode: RateMode;
  invoicePrefix: string;
  nextInvoiceNo: number;
  activeModule: string;
  sidebarCollapsed: boolean;
  setLang: (lang: Lang) => void;
  setTheme: (theme: string) => void;
  setShowBubbles: (show: boolean) => void;
  setRateMode: (mode: RateMode) => void;
  setInvoicePrefix: (prefix: string) => void;
  setNextInvoiceNo: (n: number) => void;
  setActiveModule: (m: string) => void;
  setSidebarCollapsed: (b: boolean) => void;
}

/** Local UI state (language, theme, active screen…) — persisted in localStorage */
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      lang: 'ur',
      theme: 'light',
      showBubbles: true,
      rateMode: 'sqft',
      invoicePrefix: 'AF',
      nextInvoiceNo: 1,
      activeModule: 'dashboard',
      sidebarCollapsed: false,
      setLang: (lang) => set({ lang }),
      setTheme: (theme) => set({ theme }),
      setShowBubbles: (showBubbles) => set({ showBubbles }),
      setRateMode: (rateMode) => set({ rateMode }),
      setInvoicePrefix: (invoicePrefix) => set({ invoicePrefix }),
      setNextInvoiceNo: (nextInvoiceNo) => set({ nextInvoiceNo }),
      setActiveModule: (activeModule) => set({ activeModule }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed })
    }),
    { name: 'almakka-app' }
  )
);
