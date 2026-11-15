import React, { useEffect, useState } from 'react';
import {
  X,
  ShieldCheck,
  Package,
  Calendar,
  Users,
  Mail,
  RefreshCw,
  AlertCircle,
  Loader2,
  CheckCircle2,
  MessageSquare,
  IndianRupee,
  FileDown,
  FileSpreadsheet,
  ExternalLink,
  PlusCircle,
  BarChart3,
  DatabaseBackup,
  Send,
  ShoppingBag,
  Copy,
} from 'lucide-react';
import { getAuthIdToken } from '../utils/authStorage';
import { buildOrdersCsv, buildWhatsAppInquiryUrl, formatLeadSheetRow } from '../utils/storeLogic';
import {
  connectGoogleSheets,
  getCachedSheetsAccessToken,
  getCachedSheetsAccountEmail,
  getSavedSpreadsheetId,
  setSavedSpreadsheetId,
  extractSpreadsheetIdFromInput,
  createLeadsSpreadsheet,
  appendLeadRowsToSheet,
} from '../utils/googleSheets';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [tab, setTab] = useState<'orders' | 'inventory' | 'bookings' | 'leads' | 'outbox' | 'reviews' | 'subscribers' | 'analytics'>('orders');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [overview, setOverview] = useState<any>(null);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [sheetsToken, setSheetsToken] = useState<string | null>(() => getCachedSheetsAccessToken());
  const [sheetsEmail, setSheetsEmail] = useState<string | null>(() => getCachedSheetsAccountEmail());
  const [sheetIdInput, setSheetIdInput] = useState<string>(() => getSavedSpreadsheetId());
  const [sheetsBusy, setSheetsBusy] = useState(false);
  const [confirmSyncPrompt, setConfirmSyncPrompt] = useState(false);
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Single Crystal Bracelets');
  const [newProdPrice, setNewProdPrice] = useState('599');
  const [newProdInventory, setNewProdInventory] = useState('25');
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [downloadingBackup, setDownloadingBackup] = useState(false);

  const fetchOverview = async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getAuthIdToken();
      if (!token) {
        setError('Sign in with your verified administrator Google account first.');
        setLoading(false);
        return;
      }
      const res = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Unable to load admin console.');
      } else {
        setOverview(data);
        const drafts: Record<string, string> = {};
        for (const p of data.products || []) {
          drafts[p.id] = String(p.price ?? '');
        }
        setPriceDrafts(drafts);
      }
    } catch {
      setError('Failed to connect to admin endpoint.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOverview();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdateOrder = async (
    orderId: string,
    fulfillmentStatus: string,
    trackingNumber: string
  ) => {
    setNotice('');
    try {
      const token = await getAuthIdToken();
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fulfillmentStatus,
          trackingNumber,
          courierName: trackingNumber ? 'Delhivery Express' : '',
        }),
      });
      if (res.ok) {
        setNotice(`Order ${orderId} updated.`);
        fetchOverview();
      }
    } catch {
      setError('Failed to update order.');
    }
  };

  const handleUpdateProduct = async (
    productId: string,
    payload: { inventory?: number; price?: number; active?: boolean }
  ) => {
    setNotice('');
    try {
      const token = await getAuthIdToken();
      const res = await fetch(`/api/admin/products/${encodeURIComponent(productId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setNotice(`Updated product ${productId}.`);
        fetchOverview();
      }
    } catch {
      setError('Failed to update product.');
    }
  };

  const handleModerateReview = async (reviewId: string, approved: boolean) => {
    setNotice('');
    try {
      const token = await getAuthIdToken();
      const res = await fetch(`/api/admin/reviews/${encodeURIComponent(reviewId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approved }),
      });
      if (res.ok) {
        setNotice(`Review ${approved ? 'approved and published' : 'hidden from storefront'}.`);
        fetchOverview();
      }
    } catch {
      setError('Failed to update review status.');
    }
  };

  const registrations = overview?.workshopRegistrations || overview?.registrations || [];
  const subscribers = overview?.newsletterSubscribers || [];
  const reviewsList = overview?.reviews || [];
  const leadsList = overview?.leads || [];
  const outboxList = overview?.outbox || [];
  const cartRecoveryList = overview?.cartRecovery || [];
  const unsyncedLeads = leadsList.filter((l: any) => !l.sheetSynced);
  const metrics = overview?.metrics || {};

  const handleConnectGoogleSheets = async () => {
    setError('');
    setNotice('');
    setSheetsBusy(true);
    try {
      const res = await connectGoogleSheets();
      if (!res.success || !res.accessToken) {
        setError(res.error || 'Could not connect Google Sheets.');
      } else {
        setSheetsToken(res.accessToken);
        setSheetsEmail(res.email || 'Connected Google Account');
        setNotice('Google Sheets connected for this session. Select or create a sheet below.');
      }
    } finally {
      setSheetsBusy(false);
    }
  };

  const handleCreateGoogleSheet = async () => {
    if (!sheetsToken) {
      setError('Sign in with Google first to connect Google Sheets.');
      return;
    }
    setError('');
    setNotice('');
    setSheetsBusy(true);
    try {
      const created = await createLeadsSpreadsheet(sheetsToken);
      setSheetIdInput(created.spreadsheetId);
      setNotice(`Created Google Sheet (${created.spreadsheetId}). Ready to sync leads.`);
    } catch (err: any) {
      setError(err?.message || 'Unable to create Google Sheet.');
      setSheetsToken(getCachedSheetsAccessToken());
    } finally {
      setSheetsBusy(false);
    }
  };

  const handleSyncLeadsToSheet = async () => {
    setConfirmSyncPrompt(false);
    if (!sheetsToken) {
      setError('Connect Google Sheets first.');
      return;
    }
    const cleanSheetId = extractSpreadsheetIdFromInput(sheetIdInput);
    if (!cleanSheetId) {
      setError('Enter a Google Sheet URL/ID or click "Create New Sheet".');
      return;
    }
    setSavedSpreadsheetId(cleanSheetId);
    setSheetIdInput(cleanSheetId);

    const targets = unsyncedLeads.length > 0 ? unsyncedLeads : leadsList;
    if (targets.length === 0) {
      setNotice('No inquiry leads available to sync yet.');
      return;
    }

    setError('');
    setNotice('');
    setSheetsBusy(true);
    try {
      const rows = targets.map((l: any) => formatLeadSheetRow(l));
      const appendRes = await appendLeadRowsToSheet(sheetsToken, cleanSheetId, rows);

      const authToken = await getAuthIdToken();
      if (authToken) {
        await fetch('/api/admin/leads/mark-synced', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ leadIds: targets.map((l: any) => l.leadId) }),
        });
      }

      setNotice(`Synced ${appendRes.updatedRows} inquiry row(s) to Google Sheet.`);
      fetchOverview();
    } catch (err: any) {
      setError(err?.message || 'Failed to sync leads to Google Sheet.');
      setSheetsToken(getCachedSheetsAccessToken());
    } finally {
      setSheetsBusy(false);
    }
  };

  const handleExportOrdersCsv = () => {
    const ordersList = overview?.orders || [];
    if (ordersList.length === 0) return;
    const csvContent = buildOrdersCsv(ordersList);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const dateStamp = new Date().toISOString().slice(0, 10);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `shivamrit-orders-${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setNotice(`Exported ${ordersList.length} orders to CSV.`);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setCreatingProduct(true);
    try {
      const token = await getAuthIdToken();
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newProdName.trim(),
          category: newProdCategory,
          price: Number(newProdPrice),
          inventory: Number(newProdInventory),
          active: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Could not create product.');
      } else {
        setNotice(`Created product "${data.product.name}" (₹${data.product.price}).`);
        setNewProdName('');
        setShowAddProductForm(false);
        fetchOverview();
      }
    } catch {
      setError('Failed to create product.');
    } finally {
      setCreatingProduct(false);
    }
  };

  const handleUpdateLeadStatus = async (
    leadId: string,
    status: 'new' | 'contacted' | 'converted'
  ) => {
    setError('');
    setNotice('');
    try {
      const token = await getAuthIdToken();
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(leadId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setNotice(`Lead ${leadId} marked as ${status}.`);
        fetchOverview();
      }
    } catch {
      setError('Failed to update lead status.');
    }
  };

  const handleDownloadBackup = async () => {
    setError('');
    setNotice('');
    setDownloadingBackup(true);
    try {
      const token = await getAuthIdToken();
      const res = await fetch('/api/admin/backup', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError('Could not generate store backup.');
        return;
      }
      const snapshot = await res.json();
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
        type: 'application/json;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `shivamrit-store-backup-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setNotice('Full store database backup (.json) downloaded.');
    } catch {
      setError('Failed to export store backup.');
    } finally {
      setDownloadingBackup(false);
    }
  };

  const handleMarkOutboxDispatched = async (messageId: string) => {
    setError('');
    setNotice('');
    try {
      const token = await getAuthIdToken();
      const res = await fetch(`/api/admin/outbox/${encodeURIComponent(messageId)}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotice(`Marked ${messageId} as dispatched.`);
        fetchOverview();
      } else {
        setError('Could not update outbox message.');
      }
    } catch {
      setError('Failed to update outbox message.');
    }
  };

  const handleDismissCartRecovery = async (recoveryId: string) => {
    setError('');
    setNotice('');
    try {
      const token = await getAuthIdToken();
      const res = await fetch(`/api/admin/cart-recovery/${encodeURIComponent(recoveryId)}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotice(`Dismissed cart recovery ${recoveryId}.`);
        fetchOverview();
      } else {
        setError('Could not dismiss cart recovery entry.');
      }
    } catch {
      setError('Failed to update cart recovery status.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-console-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 text-slate-900 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#18283e] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="size-5 text-[#f3d37a]" />
            <div>
              <h2 id="admin-console-title" className="font-serif text-lg font-bold">
                ShivAmrit Isolated Admin Console
              </h2>
              <p className="text-[11px] text-white/70">
                RBAC-verified management for orders, stock, pricing, reviews, bookings &amp; subscribers
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchOverview}
              aria-label="Refresh admin data"
              className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition"
            >
              <RefreshCw className="size-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close admin console"
              className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="border-b border-slate-200 px-6 py-2.5 flex gap-2 overflow-x-auto bg-slate-50 text-xs">
          {[
            { id: 'orders', label: 'Orders', icon: Package },
            { id: 'inventory', label: 'Catalog & Stock', icon: IndianRupee },
            { id: 'bookings', label: 'Consultations & Workshops', icon: Calendar },
            { id: 'leads', label: `Inquiries & Sheets (${leadsList.length})`, icon: FileSpreadsheet },
            {
              id: 'outbox',
              label: `Outbox & Recovery (${metrics.queuedOutboxCount || 0})`,
              icon: Send,
            },
            { id: 'reviews', label: `Reviews (${reviewsList.length})`, icon: MessageSquare },
            { id: 'subscribers', label: `Newsletter (${subscribers.length})`, icon: Mail },
            { id: 'analytics', label: 'Analytics & Backups', icon: BarChart3 },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id as any)}
                className={`px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition ${
                  tab === item.id
                    ? 'bg-[#18283e] text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Icon className="size-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {notice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              <span>Loading isolated store records...</span>
            </div>
          ) : overview ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">Total Orders</span>
                  <strong className="text-base text-[#18283e]">{overview.orders?.length || 0}</strong>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <span className="text-emerald-800 block">Paid Revenue</span>
                  <strong className="text-base text-emerald-900">
                    ₹{Number(metrics.paidRevenue || 0).toLocaleString('en-IN')}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                  <span className="text-amber-800 block">COD Pending</span>
                  <strong className="text-base text-amber-900">
                    ₹{Number(metrics.codPendingTotal || 0).toLocaleString('en-IN')}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">Low Stock SKUs</span>
                  <strong className="text-base text-[#18283e]">{metrics.lowStockCount || 0}</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">Bookings + WS</span>
                  <strong className="text-base text-[#18283e]">
                    {(overview.bookings?.length || 0) + registrations.length}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">Subscribers</span>
                  <strong className="text-base text-[#18283e]">{subscribers.length}</strong>
                </div>
              </div>

              {tab === 'orders' && (
                <div className="space-y-2.5 text-xs">
                  {overview.orders?.length === 0 ? (
                    <p className="text-slate-500 py-6 text-center">No orders recorded yet.</p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-2 pb-1">
                        <span className="text-slate-500 font-medium">
                          Showing {overview.orders.length} store order{overview.orders.length === 1 ? '' : 's'}
                        </span>
                        <button
                          type="button"
                          onClick={handleExportOrdersCsv}
                          className="px-3 py-1.5 rounded-lg bg-[#18283e] hover:bg-[#121e30] text-white font-bold inline-flex items-center gap-1.5 cursor-pointer transition"
                        >
                          <FileDown className="size-3.5 text-[#f3d37a]" />
                          <span>Export CSV</span>
                        </button>
                      </div>
                      {overview.orders.map((ord: any) => (
                      <div
                        key={ord.orderId}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="font-mono font-bold text-[#18283e]">
                              {ord.orderId}
                            </span>
                            <span className="ml-2 text-slate-600">
                              · {ord.customerName} ({ord.customerPhone})
                            </span>
                          </div>
                          <span className="font-bold text-emerald-700">
                            ₹{Number(ord.grandTotal || 0).toLocaleString('en-IN')} ({ord.paymentMethod} · {ord.paymentStatus})
                          </span>
                        </div>
                        {ord.customerNote && (
                          <p className="text-[11px] bg-rose-50 text-rose-800 px-2.5 py-1 rounded-lg border border-rose-200">
                            {ord.customerNote}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <select
                            defaultValue={ord.fulfillmentStatus}
                            aria-label={`Status for ${ord.orderId}`}
                            onChange={(e) =>
                              handleUpdateOrder(
                                ord.orderId,
                                e.target.value,
                                ord.trackingNumber || ''
                              )
                            }
                            className="px-2.5 py-1 border border-slate-200 rounded-lg bg-slate-50"
                          >
                            <option value="pending_payment">pending_payment</option>
                            <option value="processing">processing</option>
                            <option value="packed">packed</option>
                            <option value="shipped">shipped</option>
                            <option value="delivered">delivered</option>
                            <option value="cancelled">cancelled</option>
                            <option value="returned">returned</option>
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateOrder(
                                ord.orderId,
                                'shipped',
                                ord.trackingNumber || `SHAWB${Math.floor(100000 + Math.random() * 900000)}`
                              )
                            }
                            className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg font-semibold hover:bg-amber-200 cursor-pointer"
                          >
                            Mark Shipped + Generate AWB
                          </button>
                        </div>
                      </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {tab === 'inventory' && (
                <div className="space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                    <span className="text-slate-500 font-medium">
                      Managing {(overview.products || []).length} authoritative catalog SKUs
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddProductForm((v) => !v)}
                      className="px-3 py-1.5 rounded-lg bg-[#18283e] hover:bg-[#121e30] text-white font-bold inline-flex items-center gap-1.5 cursor-pointer transition"
                    >
                      <PlusCircle className="size-3.5 text-[#f3d37a]" />
                      <span>{showAddProductForm ? 'Cancel New Product' : '+ Add New Product'}</span>
                    </button>
                  </div>

                  {showAddProductForm && (
                    <form
                      onSubmit={handleCreateProduct}
                      className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 grid sm:grid-cols-2 lg:grid-cols-5 gap-2.5 items-end"
                    >
                      <div className="lg:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Product Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={newProdName}
                          onChange={(e) => setNewProdName(e.target.value)}
                          placeholder="e.g. Consecrated Green Jade Bracelet"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Category *
                        </label>
                        <select
                          value={newProdCategory}
                          onChange={(e) => setNewProdCategory(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        >
                          <option value="Single Crystal Bracelets">Single Crystal Bracelets (₹599)</option>
                          <option value="Combination Bracelets">Combination Bracelets (₹799)</option>
                          <option value="Botanicals">Bath Salts &amp; Botanicals (₹200)</option>
                          <option value="Crystals">Crystals &amp; Pyramids</option>
                          <option value="Sacred Artifacts">Sacred Artifacts</option>
                          <option value="Pendants">Pendants</option>
                          <option value="Gift Sets">Gift Sets</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Price ₹ *
                          </label>
                          <input
                            type="number"
                            min={1}
                            required
                            value={newProdPrice}
                            onChange={(e) => setNewProdPrice(e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Stock *
                          </label>
                          <input
                            type="number"
                            min={0}
                            required
                            value={newProdInventory}
                            onChange={(e) => setNewProdInventory(e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={creatingProduct}
                        className="px-3 py-1.5 rounded-lg bg-[#e07038] hover:bg-[#c95e28] text-white font-bold cursor-pointer disabled:opacity-60"
                      >
                        {creatingProduct ? 'Saving...' : 'Publish SKU'}
                      </button>
                    </form>
                  )}

                  {(overview.products || []).map((p: any) => (
                    <div
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 bg-white"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {p.name}{' '}
                          {!p.active && (
                            <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded">
                              Inactive
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {p.category} · ₹{p.price} · Stock: <strong>{p.inventory}</strong>
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          aria-label={`Price for ${p.name}`}
                          value={priceDrafts[p.id] ?? String(p.price)}
                          onChange={(e) =>
                            setPriceDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))
                          }
                          className="w-20 px-2 py-1 border border-slate-200 rounded text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const nextPrice = Number(priceDrafts[p.id]);
                            if (Number.isFinite(nextPrice) && nextPrice >= 1) {
                              handleUpdateProduct(p.id, { price: nextPrice });
                            }
                          }}
                          className="px-2.5 py-1 bg-[#18283e] text-white rounded font-semibold hover:bg-[#121e30] cursor-pointer"
                        >
                          Save ₹
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateProduct(p.id, { inventory: Math.max(0, p.inventory - 1) })}
                          className="px-2 py-1 border border-slate-200 rounded hover:bg-slate-100 cursor-pointer"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateProduct(p.id, { inventory: p.inventory + 5 })}
                          className="px-2 py-1 border border-slate-200 rounded hover:bg-slate-100 cursor-pointer"
                        >
                          +5
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateProduct(p.id, { active: !p.active })}
                          className="px-2 py-1 border border-slate-200 rounded hover:bg-slate-100 cursor-pointer"
                        >
                          {p.active ? 'Hide' : 'Enable'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'bookings' && (
                <div className="space-y-4 text-xs">
                  <div>
                    <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                      <Calendar className="size-3.5" /> Consultation Bookings
                    </h3>
                    {(overview.bookings || []).length === 0 ? (
                      <p className="text-slate-500">No consultation bookings yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {overview.bookings.map((b: any) => (
                          <div
                            key={b.bookingId}
                            className="p-3 rounded-xl border border-slate-200 bg-white flex justify-between"
                          >
                            <div>
                              <p className="font-semibold">{b.serviceName}</p>
                              <p className="text-slate-500">
                                {b.customerName} ({b.customerPhone}) · {b.preferredDate} at {b.preferredSlot}
                              </p>
                            </div>
                            <span className="font-mono font-bold text-[#18283e]">
                              {b.bookingId}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                      <Users className="size-3.5" /> Workshop Registrations
                    </h3>
                    {registrations.length === 0 ? (
                      <p className="text-slate-500">No workshop registrations yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {registrations.map((r: any) => (
                          <div
                            key={r.registrationId}
                            className="p-3 rounded-xl border border-slate-200 bg-white flex justify-between"
                          >
                            <div>
                              <p className="font-semibold">{r.workshopTitle}</p>
                              <p className="text-slate-500">
                                {r.participantName} ({r.participantPhone}) · {r.seats} seats (₹{r.amount})
                              </p>
                            </div>
                            <span className="font-mono font-bold text-[#18283e]">
                              {r.registrationId}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {tab === 'leads' && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-[#18283e] flex items-center gap-1.5 text-sm">
                          <FileSpreadsheet className="size-4 text-emerald-700" />
                          <span>Google Sheets Inquiry Sync</span>
                        </h3>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Connect Google Sheets to create a spreadsheet and append hero consultation &amp; workshop inquiries ({unsyncedLeads.length} pending sync).
                        </p>
                      </div>
                      {!sheetsToken ? (
                        <button
                          type="button"
                          onClick={handleConnectGoogleSheets}
                          disabled={sheetsBusy}
                          className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold text-xs inline-flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-60"
                        >
                          <svg className="size-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z" />
                            <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z" />
                            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z" />
                          </svg>
                          <span>Sign in with Google</span>
                        </button>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-semibold text-[11px]">
                          Connected: {sheetsEmail || 'Google Account'}
                        </span>
                      )}
                    </div>

                    {sheetsToken && (
                      <div className="space-y-2.5 pt-2 border-t border-emerald-200">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={sheetIdInput}
                            onChange={(e) => setSheetIdInput(e.target.value)}
                            onBlur={() => setSavedSpreadsheetId(extractSpreadsheetIdFromInput(sheetIdInput))}
                            placeholder="Paste Google Sheet URL or Spreadsheet ID"
                            aria-label="Google Spreadsheet ID or URL"
                            className="flex-1 min-w-[220px] px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                          />
                          <button
                            type="button"
                            onClick={handleCreateGoogleSheet}
                            disabled={sheetsBusy}
                            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                          >
                            <PlusCircle className="size-3.5 text-emerald-700" />
                            <span>Create New Sheet</span>
                          </button>
                          {extractSpreadsheetIdFromInput(sheetIdInput) && (
                            <a
                              href={`https://docs.google.com/spreadsheets/d/${encodeURIComponent(
                                extractSpreadsheetIdFromInput(sheetIdInput)
                              )}/edit`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-[#18283e] rounded-lg font-semibold inline-flex items-center gap-1"
                            >
                              <span>Open Sheet</span>
                              <ExternalLink className="size-3" />
                            </a>
                          )}
                        </div>

                        {confirmSyncPrompt ? (
                          <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-amber-950 font-semibold">
                              Confirm appending {unsyncedLeads.length > 0 ? unsyncedLeads.length : leadsList.length} inquiry row(s) to Google Sheet?
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleSyncLeadsToSheet}
                                disabled={sheetsBusy}
                                className="px-3 py-1.5 rounded-lg bg-[#18283e] hover:bg-[#121e30] text-white font-bold cursor-pointer"
                              >
                                {sheetsBusy ? 'Writing...' : 'Confirm & Write Rows'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmSyncPrompt(false)}
                                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmSyncPrompt(true)}
                            disabled={sheetsBusy || leadsList.length === 0}
                            className="px-3.5 py-2 rounded-lg bg-[#18283e] hover:bg-[#121e30] disabled:opacity-50 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <FileSpreadsheet className="size-3.5 text-[#f3d37a]" />
                            <span>
                              Sync {unsyncedLeads.length > 0 ? `${unsyncedLeads.length} Pending` : `All ${leadsList.length}`} Lead(s) to Google Sheet
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {leadsList.length === 0 ? (
                    <p className="text-slate-500 py-6 text-center">No hero inquiry leads submitted yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {leadsList.map((lead: any) => (
                        <div
                          key={lead.leadId}
                          className="p-3.5 rounded-xl border border-slate-200 bg-white flex flex-wrap items-start justify-between gap-3"
                        >
                          <div className="space-y-1 flex-1 min-w-[220px]">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-bold text-[#18283e]">{lead.leadId}</span>
                              <span className="font-semibold text-slate-900">{lead.name}</span>
                              <span className="text-slate-500">· {lead.phone}</span>
                              {lead.email && <span className="text-slate-500">· {lead.email}</span>}
                            </div>
                            <p className="font-semibold text-[#e07038]">{lead.interest}</p>
                            {lead.message && <p className="text-slate-600">{lead.message}</p>}
                            <p className="text-[10px] text-slate-400">
                              {lead.createdAt} · Slide: {lead.sourceSlide || 'hero'}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-1.5">
                              <select
                                value={lead.status || 'new'}
                                aria-label={`Status for lead ${lead.leadId}`}
                                onChange={(e) =>
                                  handleUpdateLeadStatus(
                                    lead.leadId,
                                    e.target.value as 'new' | 'contacted' | 'converted'
                                  )
                                }
                                className="px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-[10px] font-semibold"
                              >
                                <option value="new">New</option>
                                <option value="contacted">Contacted</option>
                                <option value="converted">Converted</option>
                              </select>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  lead.sheetSynced
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {lead.sheetSynced ? 'Synced to Sheet' : 'Pending Sheet Sync'}
                              </span>
                            </div>
                            <a
                              href={buildWhatsAppInquiryUrl({
                                leadId: lead.leadId,
                                name: lead.name,
                                phone: lead.phone,
                                email: lead.email,
                                interest: lead.interest,
                                message: lead.message,
                              })}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-[#15803d] hover:bg-[#166534] text-white font-semibold inline-flex items-center gap-1"
                            >
                              <span>WhatsApp</span>
                              <ExternalLink className="size-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === 'outbox' && (
                <div className="space-y-5 text-xs">
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-[#18283e] flex items-center gap-1.5 text-sm">
                          <Send className="size-4 text-[#e07038]" />
                          <span>Notification Outbox Queue ({outboxList.length})</span>
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Ready-to-send confirmation templates automatically queued for every order, consultation booking, and workshop seat.
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-bold text-[11px]">
                        {metrics.queuedOutboxCount || 0} Queued Template(s)
                      </span>
                    </div>

                    {outboxList.length === 0 ? (
                      <p className="text-slate-500 py-4 text-center bg-slate-50 rounded-xl border border-slate-200">
                        Confirmation templates populate automatically as orders, bookings, or workshops are created.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {outboxList.map((msg: any) => {
                          const mailtoUrl = msg.recipientEmail
                            ? `mailto:${encodeURIComponent(msg.recipientEmail)}?subject=${encodeURIComponent(
                                msg.subject
                              )}&body=${encodeURIComponent(msg.body)}`
                            : '';
                          return (
                            <div
                              key={msg.messageId}
                              className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono font-bold text-[#18283e]">{msg.messageId}</span>
                                  <span className="font-semibold text-slate-900">{msg.recipientName}</span>
                                  {msg.recipientEmail && (
                                    <span className="text-slate-500">· {msg.recipientEmail}</span>
                                  )}
                                  {msg.recipientPhone && (
                                    <span className="text-slate-500">· {msg.recipientPhone}</span>
                                  )}
                                </div>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    msg.status === 'dispatched'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-900'
                                  }`}
                                >
                                  {msg.status === 'dispatched' ? 'Marked Dispatched' : 'Queued Template'}
                                </span>
                              </div>
                              <p className="font-semibold text-slate-800">{msg.subject}</p>
                              <pre className="whitespace-pre-wrap font-sans text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 max-h-32 overflow-y-auto">
                                {msg.body}
                              </pre>
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard?.writeText(`${msg.subject}\n\n${msg.body}`);
                                    setNotice(`Copied template ${msg.messageId} to clipboard.`);
                                  }}
                                  className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Copy className="size-3" />
                                  <span>Copy Message</span>
                                </button>
                                {mailtoUrl && (
                                  <a
                                    href={mailtoUrl}
                                    className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-[#18283e] font-semibold inline-flex items-center gap-1"
                                  >
                                    <Mail className="size-3" />
                                    <span>Compose Email</span>
                                  </a>
                                )}
                                {msg.status !== 'dispatched' && (
                                  <button
                                    type="button"
                                    onClick={() => handleMarkOutboxDispatched(msg.messageId)}
                                    className="px-2.5 py-1 rounded-lg bg-[#18283e] hover:bg-[#121e30] text-white font-bold cursor-pointer"
                                  >
                                    Mark Dispatched
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2.5 pt-3 border-t border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-[#18283e] flex items-center gap-1.5 text-sm">
                          <ShoppingBag className="size-4 text-[#e07038]" />
                          <span>Consent-Aware Cart Recovery ({cartRecoveryList.length})</span>
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Only shoppers who explicitly ticked opt-in consent appear here. Reminders automatically switch to suppressed once that customer places an order.
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-bold text-[11px]">
                        {metrics.activeCartRecoveriesCount || 0} Active Reminder(s)
                      </span>
                    </div>

                    {cartRecoveryList.length === 0 ? (
                      <p className="text-slate-500 py-4 text-center bg-slate-50 rounded-xl border border-slate-200">
                        No opt-in abandoned cart reminders recorded yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {cartRecoveryList.map((rec: any) => {
                          const phoneDigits = String(rec.customerPhone || '').replace(/\D/g, '').slice(-10);
                          const itemText = (rec.items || [])
                            .map((i: any) => `${i.name} × ${i.qty}`)
                            .join(', ');
                          const waText = `Namaste ${rec.customerName}, your sacred cart at ShivAmrit Healers (${itemText} · ₹${Number(
                            rec.estimatedSubtotal || 0
                          ).toLocaleString('en-IN')}) is waiting whenever you are ready. Reply here if you need crystal guidance.`;
                          const waUrl =
                            phoneDigits.length >= 10
                              ? `https://wa.me/91${phoneDigits}?text=${encodeURIComponent(waText)}`
                              : '';

                          return (
                            <div
                              key={rec.recoveryId}
                              className="p-3.5 rounded-xl border border-slate-200 bg-white flex flex-wrap items-start justify-between gap-3"
                            >
                              <div className="space-y-1 flex-1 min-w-[220px]">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono font-bold text-[#18283e]">
                                    {rec.recoveryId}
                                  </span>
                                  <span className="font-semibold text-slate-900">
                                    {rec.customerName}
                                  </span>
                                  {rec.customerPhone && (
                                    <span className="text-slate-500">· {rec.customerPhone}</span>
                                  )}
                                  {rec.customerEmail && (
                                    <span className="text-slate-500">· {rec.customerEmail}</span>
                                  )}
                                </div>
                                <p className="text-slate-700 font-medium">
                                  {itemText} · Est. ₹{Number(rec.estimatedSubtotal || 0).toLocaleString('en-IN')}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    rec.status === 'active'
                                      ? 'bg-amber-100 text-amber-900'
                                      : rec.status === 'suppressed_ordered'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {rec.status === 'suppressed_ordered'
                                    ? 'Suppressed (Ordered)'
                                    : rec.status === 'dismissed'
                                    ? 'Dismissed'
                                    : 'Active Opt-In'}
                                </span>
                                {rec.status === 'active' && waUrl && (
                                  <a
                                    href={waUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2.5 py-1 rounded-lg bg-[#15803d] hover:bg-[#166534] text-white font-semibold inline-flex items-center gap-1"
                                  >
                                    <span>Send Reminder</span>
                                    <ExternalLink className="size-3" />
                                  </a>
                                )}
                                {rec.status === 'active' && (
                                  <button
                                    type="button"
                                    onClick={() => handleDismissCartRecovery(rec.recoveryId)}
                                    className="px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer"
                                  >
                                    Dismiss
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {tab === 'reviews' && (
                <div className="space-y-2.5 text-xs">
                  {reviewsList.length === 0 ? (
                    <p className="text-slate-500 py-6 text-center">No customer reviews submitted yet.</p>
                  ) : (
                    reviewsList.map((rev: any) => (
                      <div
                        key={rev.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white flex flex-wrap items-start justify-between gap-3"
                      >
                        <div className="space-y-1 flex-1 min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#18283e]">{rev.authorName}</span>
                            <span className="text-amber-500 font-bold">{rev.rating}★</span>
                            <span className="text-[10px] font-mono text-slate-500">{rev.productId}</span>
                            {rev.verifiedPurchase && (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
                                Verified Buyer
                              </span>
                            )}
                          </div>
                          <p className="text-slate-600">{rev.comment}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleModerateReview(rev.id, !rev.approved)}
                          className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                            rev.approved
                              ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                              : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                          }`}
                        >
                          {rev.approved ? 'Published (Hide)' : 'Pending (Approve)'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === 'subscribers' && (
                <div className="space-y-2 text-xs">
                  {subscribers.length === 0 ? (
                    <p className="text-slate-500">No subscribers yet.</p>
                  ) : (
                    subscribers.map((sub: any) => (
                      <div
                        key={sub.email}
                        className="p-3 rounded-xl border border-slate-200 bg-white flex justify-between"
                      >
                        <span className="font-semibold">{sub.email}</span>
                        <span className="text-slate-500">
                          {sub.source} · {(sub.createdAt || sub.subscribedAt || '').slice(0, 10)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === 'analytics' && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl border border-slate-200 bg-[#fbf9f5] flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-[#18283e] flex items-center gap-1.5 text-sm">
                        <DatabaseBackup className="size-4 text-[#e07038]" />
                        <span>Store Snapshot Backup &amp; Audit Trail</span>
                      </h3>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Export a complete JSON snapshot of catalog inventory, orders, consultations, workshop seats, subscribers &amp; hero inquiry leads.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadBackup}
                      disabled={downloadingBackup}
                      className="px-3.5 py-2 rounded-lg bg-[#18283e] hover:bg-[#121e30] text-white font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      <FileDown className="size-3.5 text-[#f3d37a]" />
                      <span>{downloadingBackup ? 'Exporting...' : 'Download JSON Backup'}</span>
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                      <span className="text-slate-500 block">Consultation Fee Value</span>
                      <strong className="text-lg text-[#18283e]">
                        ₹{Number(overview.analytics?.consultationRevenue || 0).toLocaleString('en-IN')}
                      </strong>
                    </div>
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                      <span className="text-slate-500 block">Workshop Seat Value</span>
                      <strong className="text-lg text-[#18283e]">
                        ₹{Number(overview.analytics?.workshopRevenue || 0).toLocaleString('en-IN')}
                      </strong>
                    </div>
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                      <span className="text-slate-500 block">Hero Lead Conversion Rate</span>
                      <strong className="text-lg text-emerald-800">
                        {overview.analytics?.leadConversion?.conversionRatePercent || 0}%
                      </strong>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {overview.analytics?.leadConversion?.convertedCount || 0} converted / {overview.analytics?.leadConversion?.total || 0} leads
                      </span>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                      <h4 className="font-bold text-[#18283e]">Category Sales Breakdown</h4>
                      {(overview.analytics?.categoryRevenue || []).length === 0 ? (
                        <p className="text-slate-500">Sales breakdown populates once orders are placed.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {overview.analytics.categoryRevenue.map((row: any) => (
                            <div key={row.category} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                              <span className="font-medium text-slate-700">{row.category} ({row.units} qty)</span>
                              <strong className="text-[#18283e]">₹{Number(row.revenue).toLocaleString('en-IN')}</strong>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                      <h4 className="font-bold text-[#18283e]">Top-Performing SKUs</h4>
                      {(overview.analytics?.topProducts || []).length === 0 ? (
                        <p className="text-slate-500">Top SKU rankings populate once orders are placed.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {overview.analytics.topProducts.map((item: any) => (
                            <div key={item.productId} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                              <span className="font-medium text-slate-700 truncate pr-2">{item.name} ({item.units})</span>
                              <strong className="text-[#18283e] shrink-0">₹{Number(item.revenue).toLocaleString('en-IN')}</strong>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                    <h4 className="font-bold text-[#18283e]">Recent Admin Audit Logs</h4>
                    {(overview.auditLogs || []).length === 0 ? (
                      <p className="text-slate-500">No admin actions recorded yet.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {overview.auditLogs.slice(0, 15).map((log: any) => (
                          <div key={log.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5 border-b border-slate-100 last:border-0 text-[11px]">
                            <div>
                              <span className="font-mono font-bold text-[#18283e]">{log.action}</span>
                              <span className="text-slate-500 ml-2">target: {log.targetId}</span>
                            </div>
                            <span className="text-slate-400">
                              {log.actorEmail} · {String(log.createdAt || '').slice(0, 19).replace('T', ' ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
