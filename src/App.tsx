import { Component, useEffect } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import { ToastProvider, useToast } from './components/ui/Toast';
import { useLang } from './i18n';

import DashboardPage from './modules/dashboard/DashboardPage';
import CustomersPage from './modules/customers/CustomersPage';
import CustomerLedgerPage from './modules/customers/CustomerLedgerPage';
import InvoiceListPage from './modules/invoice/InvoiceListPage';
import InvoiceFormPage from './modules/invoice/InvoiceFormPage';
import LabourPage from './modules/labour/LabourPage';
import AttendancePage from './modules/labour/AttendancePage';
import LabourReportPage from './modules/labour/LabourReportPage';
import MachineryPage from './modules/machinery/MachineryPage';
import MarbleTypesPage from './modules/marble/MarbleTypesPage';
import MarbleSizesPage from './modules/marble/MarbleSizesPage';
import StockPage from './modules/stock/StockPage';
import ExpensesPage from './modules/expenses/ExpensesPage';
import ReportsPage from './modules/reports/ReportsPage';
import SettingsPage from './modules/settings/SettingsPage';

/** Friendly error boundary — something broke, reload instead of a white screen */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#134e4a', padding: 24, textAlign: 'center' }}>
          <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 32, maxWidth: 420 }}>
            <div style={{ fontSize: 40 }}>⚠️</div>
            <h1 style={{ fontWeight: 800, fontSize: 20, marginTop: 12 }}>کچھ غلط ہو گیا / Something went wrong</h1>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: 8, direction: 'ltr' }}>{String(this.state.error?.message ?? '')}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{ marginTop: 18, background: 'linear-gradient(90deg,#0f766e,#059669)', color: '#fff', fontWeight: 700, padding: '12px 28px', borderRadius: 10, border: 0, cursor: 'pointer' }}
            >
              دوبارہ لوڈ کریں / Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppInner() {
  const { lang, isUr, t } = useLang();
  const toast = useToast();

  // keep <html> in sync with the selected language
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isUr ? 'rtl' : 'ltr';
  }, [lang, isUr]);

  // service-worker update → "نیا ورژن دستیاب ہے" toast with Reload
  useEffect(() => {
    const handler = () => {
      toast.push(t('sw.updateAvailable'), 'info', {
        label: t('sw.reload'),
        onClick: () => window.location.reload()
      });
    };
    window.addEventListener('app-update-available', handler);
    return () => window.removeEventListener('app-update-available', handler);
  }, [toast, t]);

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/invoices" element={<InvoiceListPage />} />
        <Route path="/invoice/new" element={<InvoiceFormPage />} />
        <Route path="/invoice/edit/:id" element={<InvoiceFormPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customer/:id" element={<CustomerLedgerPage />} />
        <Route path="/labour" element={<LabourPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/labour-report" element={<LabourReportPage />} />
        <Route path="/machinery" element={<MachineryPage />} />
        <Route path="/marble-types" element={<MarbleTypesPage />} />
        <Route path="/marble-sizes" element={<MarbleSizesPage />} />
        <Route path="/stock" element={<StockPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ToastProvider>
          <AppInner />
        </ToastProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
