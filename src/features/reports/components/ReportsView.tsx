import { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { Award, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useAppStore } from '../../../shared/lib/store';
import { useProducts, useSales } from '../../../shared/hooks/useInventory';

export function ReportsView() {
  const { currentShop } = useAppStore();
  
  const { data: products = [], isLoading: isLoadingProducts } = useProducts(currentShop?.id);
  const { data: sales = [], isLoading: isLoadingSales } = useSales(currentShop?.id);

  // 1. Calculate General Financial Performance
  const financials = useMemo(() => {
    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
    const totalProfit = sales.reduce((sum, s) => sum + Number(s.profit), 0);
    const totalCost = totalRevenue - totalProfit;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin
    };
  }, [sales]);

  // 2. Category Distribution Data for Pie Chart
  const categoryData = useMemo(() => {
    const categories: Record<string, { name: string; value: number }> = {
      Vegetables: { name: 'Vegetables', value: 0 },
      Fruits: { name: 'Fruits', value: 0 },
      Other: { name: 'Other', value: 0 }
    };

    sales.forEach(sale => {
      const category = sale.voisel_products?.category || 'Other';
      if (categories[category]) {
        categories[category].value += Number(sale.total_amount);
      }
    });

    // Filter out zero categories
    return Object.values(categories).filter(c => c.value > 0);
  }, [sales]);

  // Colors for Category Pie Chart
  const COLORS = ['#3A7D44', '#D97706', '#6F756F'];

  // 3. Product Performance Analysis
  const performance = useMemo(() => {
    const productStats: Record<string, { name: string; quantity: number; revenue: number; profit: number }> = {};
    
    // Seed initial products to catch zero sellers
    products.forEach(p => {
      productStats[p.id] = {
        name: p.name,
        quantity: 0,
        revenue: 0,
        profit: 0
      };
    });

    sales.forEach(sale => {
      if (productStats[sale.product_id]) {
        productStats[sale.product_id].quantity += Number(sale.quantity_sold);
        productStats[sale.product_id].revenue += Number(sale.total_amount);
        productStats[sale.product_id].profit += Number(sale.profit);
      }
    });

    const list = Object.values(productStats);

    const topSelling = [...list].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
    const lowestSelling = [...list].sort((a, b) => a.quantity - b.quantity).slice(0, 5);
    const highestProfit = [...list].sort((a, b) => b.profit - a.profit).slice(0, 5);

    return {
      topSelling,
      lowestSelling,
      highestProfit
    };
  }, [products, sales]);

  // 4. Bar Chart comparison: Cost vs Revenue for top items
  const costRevenueData = useMemo(() => {
    return performance.topSelling.map(item => ({
      name: item.name,
      Revenue: item.revenue,
      Cost: item.revenue - item.profit,
      Profit: item.profit
    }));
  }, [performance]);

  // 5. Inventory Stock Analysis
  const stockSummary = useMemo(() => {
    const totalItems = products.length;
    const totalQty = products.reduce((sum, p) => sum + Number(p.quantity), 0);
    const stockValue = products.reduce((sum, p) => sum + (Number(p.quantity) * Number(p.purchase_price)), 0);
    const lowStockCount = products.filter(p => Number(p.quantity) <= Number(p.low_stock_threshold)).length;
    const outOfStockCount = products.filter(p => Number(p.quantity) === 0).length;

    return {
      totalItems,
      totalQty,
      stockValue,
      lowStockCount,
      outOfStockCount
    };
  }, [products]);

  const isLoading = isLoadingProducts || isLoadingSales;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 rounded-full border-4 border-brand-primary/10 border-t-brand-primary animate-spin" />
        <p className="text-sm font-semibold text-brand-mutedText">Generating Business Reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-brand-dark tracking-tight">Business Reports</h2>
        <p className="text-sm text-brand-mutedText font-medium mt-1">
          {currentShop ? `Inventory health & financial audits for ${currentShop.name}` : 'Select a shop branch'}
        </p>
      </div>

      {/* FINANCIAL OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card p-5 border-brand-cream/60">
          <p className="text-[10px] text-brand-mutedText font-bold uppercase tracking-wider">Total Revenue</p>
          <h3 className="text-2xl font-extrabold text-brand-darkText mt-1">₹{financials.totalRevenue.toLocaleString()}</h3>
        </div>
        <div className="glass-card p-5 border-brand-cream/60">
          <p className="text-[10px] text-brand-mutedText font-bold uppercase tracking-wider">Total Cost of Goods</p>
          <h3 className="text-2xl font-bold text-brand-mutedText mt-1">₹{financials.totalCost.toLocaleString()}</h3>
        </div>
        <div className="glass-card p-5 border-brand-cream/60 border-brand-primary/20 bg-brand-primary/5">
          <p className="text-[10px] text-brand-primary font-bold uppercase tracking-wider">Net Profit</p>
          <h3 className="text-2xl font-extrabold text-brand-primary mt-1">₹{financials.totalProfit.toLocaleString()}</h3>
        </div>
        <div className="glass-card p-5 border-brand-cream/60">
          <p className="text-[10px] text-brand-mutedText font-bold uppercase tracking-wider">Average Profit Margin</p>
          <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">{financials.profitMargin.toFixed(1)}%</h3>
        </div>
      </div>

      {/* CHARTS GRAPH GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Cost vs Revenue Bar Chart */}
        <div className="glass-card p-6 flex flex-col">
          <h4 className="text-base font-bold text-brand-dark mb-4">Cost vs Revenue (Top Selling)</h4>
          <div className="h-[280px] w-full mt-2">
            {costRevenueData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-brand-mutedText font-medium bg-brand-cream/10 rounded-xl">
                Log sales to populate comparison chart.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costRevenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#6F756F" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                  <YAxis stroke="#6F756F" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #F7F2E8', fontFamily: 'Outfit' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'Outfit', fontWeight: 'bold' }} />
                  <Bar dataKey="Cost" fill="#6F756F" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Revenue" fill="#3A7D44" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Sales Distribution Pie Chart */}
        <div className="glass-card p-6 flex flex-col">
          <h4 className="text-base font-bold text-brand-dark mb-4">Sales by Category</h4>
          <div className="h-[280px] w-full flex items-center justify-center">
            {categoryData.length === 0 ? (
              <div className="flex items-center justify-center w-full h-full text-xs text-brand-mutedText font-medium bg-brand-cream/10 rounded-xl">
                Log sales to populate category distribution.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${value}`} />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'Outfit', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* DETAILED TABLES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Top Performers */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-brand-primary">
            <Award size={18} />
            <h4 className="text-sm font-bold uppercase tracking-wider">Top Profit Margins</h4>
          </div>
          <div className="divide-y divide-brand-cream/40 text-xs">
            {performance.highestProfit.filter(p => p.profit > 0).slice(0, 5).map((p, idx) => (
              <div key={p.name} className="py-2.5 flex justify-between items-center font-semibold">
                <span className="text-brand-darkText">{idx + 1}. {p.name}</span>
                <span className="text-brand-primary font-bold">₹{p.profit.toFixed(2)} profit</span>
              </div>
            ))}
            {performance.highestProfit.filter(p => p.profit > 0).length === 0 && (
              <p className="py-4 text-center text-brand-mutedText font-medium">No sales transactions logged.</p>
            )}
          </div>
        </div>

        {/* Slow Moving Inventory */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-brand-mutedText">
            <AlertTriangle size={18} />
            <h4 className="text-sm font-bold uppercase tracking-wider">Lowest-Selling Products</h4>
          </div>
          <div className="divide-y divide-brand-cream/40 text-xs">
            {performance.lowestSelling.slice(0, 5).map((p, idx) => (
              <div key={p.name} className="py-2.5 flex justify-between items-center font-semibold">
                <span className="text-brand-darkText">{idx + 1}. {p.name}</span>
                <span className="text-brand-mutedText">{p.quantity} units sold</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stock status audit */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-brand-warning">
            <ShieldAlert size={18} />
            <h4 className="text-sm font-bold uppercase tracking-wider">Inventory Audit</h4>
          </div>
          <div className="space-y-3.5 text-xs font-semibold text-brand-darkText pt-2">
            <div className="flex justify-between items-center">
              <span className="text-brand-mutedText">Total Catalog Items:</span>
              <span>{stockSummary.totalItems} products</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-brand-mutedText">Total Stock Weight/Count:</span>
              <span>{stockSummary.totalQty} units</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-brand-mutedText">Asset Stock Cost Value:</span>
              <span className="font-bold text-brand-primary">₹{stockSummary.stockValue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-brand-warning">
              <span>Low-Stock Alerts:</span>
              <span>{stockSummary.lowStockCount} items</span>
            </div>
            <div className="flex justify-between items-center text-brand-error">
              <span>Out-of-Stock Alerts:</span>
              <span>{stockSummary.outOfStockCount} items</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
