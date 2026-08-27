import { useState, useMemo } from 'react';
import { Search, Calendar, DollarSign, ArrowUpRight, TrendingUp } from 'lucide-react';
import { useAppStore } from '../../../shared/lib/store';
import { useSales } from '../../../shared/hooks/useInventory';

export function SalesHistoryView() {
  const { currentShop } = useAppStore();
  const { data: sales = [], isLoading } = useSales(currentShop?.id);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected date filter (defaults to today in local YYYY-MM-DD format)
  const [targetDateStr, setTargetDateStr] = useState(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  });

  // Filtered sales list
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const saleDate = s.created_at.split('T')[0];
      const matchesDate = saleDate === targetDateStr;
      
      const prodName = s.voisel_products?.name || '';
      const matchesSearch = prodName.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesDate && matchesSearch;
    });
  }, [sales, targetDateStr, searchQuery]);

  // Daily statistics for the filtered date
  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, s) => sum + Number(s.total_amount), 0);
    const totalProfit = filteredSales.reduce((sum, s) => sum + Number(s.profit), 0);
    const totalItemsCount = filteredSales.reduce((sum, s) => sum + Number(s.quantity_sold), 0);
    return { totalRevenue, totalProfit, totalItemsCount };
  }, [filteredSales]);

  // Format selected date for subtitle display (e.g. "August 24, 2026")
  const formattedSelectedDate = useMemo(() => {
    const dateObj = new Date(targetDateStr + 'T00:00:00');
    return dateObj.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }, [targetDateStr]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 rounded-full border-4 border-brand-primary/10 border-t-brand-primary animate-spin" />
        <p className="text-sm font-semibold text-brand-mutedText">Loading Transaction History...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      
      {/* 1. DATE SELECTOR HEADER */}
      <div className="glass-card p-4 border-brand-cream/60 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-brand-dark tracking-tight">Sales Records</h2>
          <p className="text-[11px] text-brand-primary font-bold mt-0.5">
            Showing sales for {formattedSelectedDate}
          </p>
        </div>

        {/* CLICKABLE CALENDAR ICON WITH HIDDEN INPUT OVERLAY */}
        <div className="relative p-2.5 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 rounded-xl transition-all duration-200 cursor-pointer shrink-0">
          <Calendar size={18} />
          <input
            type="date"
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            value={targetDateStr}
            onChange={(e) => {
              if (e.target.value) {
                setTargetDateStr(e.target.value);
              }
            }}
          />
        </div>
      </div>

      {/* 2. THREE SUMMARY CARDS ON THE SAME HORIZONTAL LINE */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Card 1: Revenue */}
        <div className="glass-card p-3 border-brand-cream/60 flex flex-col justify-between min-w-0 bg-brand-primary/5">
          <div className="flex items-center gap-1.5">
            <div className="p-1 bg-brand-primary/10 rounded-lg text-brand-primary shrink-0">
              <TrendingUp size={12} />
            </div>
            <span className="text-[8px] text-brand-mutedText font-extrabold uppercase tracking-wide truncate">Revenue</span>
          </div>
          <div className="mt-2.5">
            <h4 className="text-sm font-extrabold text-brand-darkText leading-none truncate">₹{stats.totalRevenue.toLocaleString()}</h4>
          </div>
        </div>

        {/* Card 2: Profit */}
        <div className="glass-card p-3 border-brand-cream/60 flex flex-col justify-between min-w-0 bg-emerald-500/5">
          <div className="flex items-center gap-1.5">
            <div className="p-1 bg-emerald-500/10 rounded-lg text-emerald-600 shrink-0">
              <DollarSign size={12} />
            </div>
            <span className="text-[8px] text-brand-mutedText font-extrabold uppercase tracking-wide truncate">Net Profit</span>
          </div>
          <div className="mt-2.5">
            <h4 className="text-sm font-extrabold text-emerald-700 leading-none truncate">₹{stats.totalProfit.toLocaleString()}</h4>
          </div>
        </div>

        {/* Card 3: Items Sold */}
        <div className="glass-card p-3 border-brand-cream/60 flex flex-col justify-between min-w-0 bg-blue-500/5">
          <div className="flex items-center gap-1.5">
            <div className="p-1 bg-blue-500/10 rounded-lg text-blue-600 shrink-0">
              <Calendar size={12} />
            </div>
            <span className="text-[8px] text-brand-mutedText font-extrabold uppercase tracking-wide truncate">Volume</span>
          </div>
          <div className="mt-2.5">
            <h4 className="text-sm font-extrabold text-brand-darkText leading-none truncate">{stats.totalItemsCount} units</h4>
          </div>
        </div>
      </div>

      {/* SEARCH/FILTER */}
      <div className="glass-card p-3.5 border-brand-cream/60">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-mutedText/50">
            <Search size={16} />
          </span>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 bg-brand-cream/15 hover:bg-brand-cream/25 focus:bg-white border border-brand-cream rounded-xl text-brand-darkText placeholder-brand-mutedText/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all duration-200 text-sm font-medium"
            placeholder="Search matching transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 3. ROW AND COLUMN DETAILED TRANSACTIONS LIST */}
      {filteredSales.length === 0 ? (
        <div className="glass-card p-12 text-center border-dashed border-2 border-brand-cream max-w-md mx-auto">
          <p className="text-4xl mb-3">🧾</p>
          <h4 className="text-sm font-bold text-brand-dark">No records found</h4>
          <p className="text-[11px] text-brand-mutedText mt-1">
            There are no sales logs recorded for {formattedSelectedDate}.
          </p>
        </div>
      ) : (
        <div className="glass-card border-brand-cream/60 overflow-hidden shadow-sm">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-brand-cream/40 border-b border-brand-cream/60 text-[10px] font-extrabold text-brand-mutedText uppercase tracking-wider">
                  <th className="px-4 py-3">Item Name</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Unit Price</th>
                  <th className="px-4 py-3 text-right">Total Amount</th>
                  <th className="px-4 py-3 text-right text-emerald-600">Net Profit</th>
                  <th className="px-4 py-3 text-center">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-cream/40 text-xs font-semibold">
                {filteredSales.map((sale) => {
                  const date = new Date(sale.created_at);
                  const formattedTime = date.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr key={sale.id} className="hover:bg-brand-cream/15 transition-colors">
                      <td className="px-4 py-3 font-bold text-brand-darkText">
                        {sale.voisel_products?.name || 'Unknown Product'}
                      </td>
                      <td className="px-4 py-3 text-right text-brand-darkText">
                        {Number(sale.quantity_sold)} {sale.voisel_products?.unit || 'kg'}
                      </td>
                      <td className="px-4 py-3 text-right text-brand-mutedText">
                        ₹{Number(sale.selling_price)}
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-brand-darkText">
                        ₹{Number(sale.total_amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600">
                        <span className="inline-flex items-center gap-0.5 justify-end w-full">
                          ₹{Number(sale.profit).toFixed(2)}
                          <ArrowUpRight size={10} className="text-emerald-500" />
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-[10px] text-brand-mutedText font-semibold">
                        {formattedTime}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
