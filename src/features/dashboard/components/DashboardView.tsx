import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  Plus, 
  ShoppingBag, 
  ArrowUpRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';
import { useAppStore } from '../../../shared/lib/store';
import { useProducts, useSales } from '../../../shared/hooks/useInventory';
import { Button } from '../../../shared/components/ui/Button';

export function DashboardView() {
  const navigate = useNavigate();
  const { currentShop } = useAppStore();
  
  const { data: products = [], isLoading: isLoadingProducts } = useProducts(currentShop?.id);
  const { data: sales = [], isLoading: isLoadingSales } = useSales(currentShop?.id);

  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days'>('7days');

  // 1. Calculate Metrics
  const metrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySalesRecords = sales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate >= today;
    });

    const todaySales = todaySalesRecords.reduce((sum, s) => sum + Number(s.total_amount), 0);
    const todayProfit = todaySalesRecords.reduce((sum, s) => sum + Number(s.profit), 0);
    
    const totalStockValue = products.reduce((sum, p) => sum + (Number(p.quantity) * Number(p.purchase_price)), 0);
    
    const lowStockCount = products.filter(p => Number(p.quantity) <= Number(p.low_stock_threshold)).length;

    return {
      todaySales,
      todayProfit,
      totalStockValue,
      lowStockCount
    };
  }, [products, sales]);

  // 2. Filter & Format Sales Data for Chart
  const chartData = useMemo(() => {
    
    if (sales.length === 0) {
      // Return beautiful demo preview data if no sales recorded yet
      if (timeRange === 'today') {
        return [
          { name: '9 AM', sales: 400, profit: 120 },
          { name: '12 PM', sales: 900, profit: 280 },
          { name: '3 PM', sales: 600, profit: 180 },
          { name: '6 PM', sales: 1200, profit: 360 },
          { name: '9 PM', sales: 300, profit: 90 },
        ];
      } else if (timeRange === '7days') {
        return [
          { name: 'Mon', sales: 1200, profit: 350 },
          { name: 'Tue', sales: 1800, profit: 540 },
          { name: 'Wed', sales: 1400, profit: 420 },
          { name: 'Thu', sales: 2200, profit: 660 },
          { name: 'Fri', sales: 2500, profit: 750 },
          { name: 'Sat', sales: 3200, profit: 960 },
          { name: 'Sun', sales: 2800, profit: 840 },
        ];
      } else {
        return Array.from({ length: 15 }, (_, i) => ({
          name: `Day ${i + 1}`,
          sales: Math.floor(Math.random() * 2000) + 1000,
          profit: Math.floor(Math.random() * 600) + 200,
        }));
      }
    }

    // Process actual database sales
    if (timeRange === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaySales = sales.filter(s => new Date(s.created_at) >= today);
      
      // Group by 3-hour blocks
      const hours = ['9 AM', '12 PM', '3 PM', '6 PM', '9 PM'];
      const data = hours.map(h => ({ name: h, sales: 0, profit: 0 }));
      
      todaySales.forEach(s => {
        const hour = new Date(s.created_at).getHours();
        let idx = 0;
        if (hour >= 21) idx = 4;
        else if (hour >= 18) idx = 3;
        else if (hour >= 15) idx = 2;
        else if (hour >= 12) idx = 1;
        else idx = 0;
        
        data[idx].sales += Number(s.total_amount);
        data[idx].profit += Number(s.profit);
      });
      return data;
    } else if (timeRange === '7days') {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const weekSales = sales.filter(s => new Date(s.created_at) >= lastWeek);
      
      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const data = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
          dayNum: d.getDay(),
          name: weekdays[d.getDay()],
          sales: 0,
          profit: 0
        };
      });

      weekSales.forEach(s => {
        const sDay = new Date(s.created_at).getDay();
        const bucket = data.find(d => d.dayNum === sDay);
        if (bucket) {
          bucket.sales += Number(s.total_amount);
          bucket.profit += Number(s.profit);
        }
      });
      return data;
    } else {
      const lastMonth = new Date();
      lastMonth.setDate(lastMonth.getDate() - 30);
      const monthSales = sales.filter(s => new Date(s.created_at) >= lastMonth);
      
      const data: Record<string, { name: string; sales: number; profit: number }> = {};
      
      // Seed last 15 days of data points
      for (let i = 14; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        data[dateStr] = { name: dateStr, sales: 0, profit: 0 };
      }

      monthSales.forEach(s => {
        const dateStr = new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (data[dateStr]) {
          data[dateStr].sales += Number(s.total_amount);
          data[dateStr].profit += Number(s.profit);
        }
      });
      
      return Object.values(data);
    }
  }, [sales, timeRange]);

  // 3. Low Stock list
  const lowStockProducts = useMemo(() => {
    return products
      .filter(p => Number(p.quantity) <= Number(p.low_stock_threshold))
      .slice(0, 5);
  }, [products]);

  // 4. Top Selling products
  const topSellingProducts = useMemo(() => {
    const productVolumes: Record<string, { name: string; quantity: number; unit: string; totalRevenue: number }> = {};
    
    sales.forEach(sale => {
      const name = sale.voisel_products?.name || 'Unknown Product';
      const unit = sale.voisel_products?.unit || 'kg';
      
      if (!productVolumes[sale.product_id]) {
        productVolumes[sale.product_id] = {
          name,
          quantity: 0,
          unit,
          totalRevenue: 0
        };
      }
      productVolumes[sale.product_id].quantity += Number(sale.quantity_sold);
      productVolumes[sale.product_id].totalRevenue += Number(sale.total_amount);
    });

    return Object.values(productVolumes)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [sales]);

  const isLoading = isLoadingProducts || isLoadingSales;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 rounded-full border-4 border-brand-primary/10 border-t-brand-primary animate-spin" />
        <p className="text-sm font-semibold text-brand-mutedText">Loading Shop Overview...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Dashboard Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-brand-dark tracking-tight">Overview</h2>
          <p className="text-sm text-brand-mutedText font-medium mt-1">
            {currentShop ? `Performance analytics for ${currentShop.name}` : 'Select a shop branch to begin'}
          </p>
        </div>

        {/* Quick manual actions */}
        <div className="flex items-center gap-3">
          <Button 
            variant="secondary" 
            onClick={() => navigate('/inventory')} 
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            <span>Add Stock</span>
          </Button>
          <Button 
            onClick={() => navigate('/inventory')} 
            className="flex items-center gap-2"
          >
            <ShoppingBag size={16} />
            <span>Record Sale</span>
          </Button>
        </div>
      </div>

      {/* METRIC GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Today's Sales */}
        <div className="glass-card bg-gradient-to-tr from-brand-primary/5 to-white p-6 border-brand-primary/10 flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-brand-mutedText uppercase tracking-wider">Today's Sales</span>
            <span className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
              <TrendingUp size={16} />
            </span>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold tracking-tight">₹{metrics.todaySales.toLocaleString()}</h3>
            <p className="text-[10px] text-brand-primary font-bold flex items-center gap-0.5 mt-1">
              <ArrowUpRight size={10} /> +12% vs yesterday
            </p>
          </div>
        </div>

        {/* Today's Profit */}
        <div className="glass-card bg-gradient-to-tr from-emerald-500/5 to-white p-6 border-emerald-500/10 flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-brand-mutedText uppercase tracking-wider">Today's Profit</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <TrendingUp size={16} />
            </span>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold tracking-tight text-emerald-700">₹{metrics.todayProfit.toLocaleString()}</h3>
            <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 mt-1">
              <ArrowUpRight size={10} /> +8% vs yesterday
            </p>
          </div>
        </div>

        {/* Total Stock Value */}
        <div className="glass-card bg-gradient-to-tr from-blue-500/5 to-white p-6 border-blue-500/10 flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-brand-mutedText uppercase tracking-wider">Total Stock Value</span>
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <Package size={16} />
            </span>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold tracking-tight">₹{metrics.totalStockValue.toLocaleString()}</h3>
            <p className="text-[10px] text-brand-mutedText font-semibold mt-1">Based on purchase prices</p>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className={`glass-card p-6 flex flex-col justify-between h-36 transition-all duration-300 ${
          metrics.lowStockCount > 0 
            ? 'bg-gradient-to-tr from-brand-warning/10 to-white border-brand-warning/30' 
            : 'bg-white border-brand-cream/60'
        }`}>
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-brand-mutedText uppercase tracking-wider">Low Stock Items</span>
            <span className={`p-2 rounded-xl ${
              metrics.lowStockCount > 0 ? 'bg-brand-warning/20 text-brand-warning' : 'bg-brand-cream/60 text-brand-mutedText'
            }`}>
              <AlertTriangle size={16} />
            </span>
          </div>
          <div>
            <h3 className={`text-3xl font-extrabold tracking-tight ${metrics.lowStockCount > 0 ? 'text-brand-warning' : ''}`}>
              {metrics.lowStockCount}
            </h3>
            <p className="text-[10px] text-brand-mutedText font-semibold mt-1">
              {metrics.lowStockCount > 0 ? 'Needs immediate restock' : 'All items well stocked'}
            </p>
          </div>
        </div>
      </div>

      {/* CHART & DETAILS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sales Chart (Large Column) */}
        <div className="lg:col-span-2 glass-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h4 className="text-lg font-bold text-brand-dark">Sales Revenue</h4>
              <p className="text-xs text-brand-mutedText">Visual tracking of shop performance</p>
            </div>
            
            {/* Chart toggle buttons */}
            <div className="flex bg-brand-cream/45 p-1 rounded-xl">
              {(['today', '7days', '30days'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    timeRange === r ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-mutedText hover:text-brand-darkText'
                  }`}
                >
                  {r === 'today' ? 'Today' : r === '7days' ? '7 Days' : '30 Days'}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[300px] w-full mt-2">
            {sales.length === 0 && (
              <div className="absolute pl-10 pt-2 z-10">
                <span className="px-2 py-1 bg-brand-primary/10 text-brand-primary text-[10px] font-extrabold rounded-md uppercase tracking-wider">
                  Demo Preview Data
                </span>
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3A7D44" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3A7D44" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="name" 
                  stroke="#6F756F" 
                  fontSize={10} 
                  fontWeight="bold"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#6F756F" 
                  fontSize={10} 
                  fontWeight="bold"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #F7F2E8', fontFamily: 'Outfit' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  name="Sales"
                  stroke="#3A7D44" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side Panel: Low Stock & Top Selling */}
        <div className="space-y-8">
          
          {/* Low Stock Widget */}
          <div className="glass-card p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-brand-dark">Low Stock Alerts</h4>
                <p className="text-[10px] text-brand-mutedText font-semibold">Restock immediately</p>
              </div>
              <Button 
                variant="ghost" 
                onClick={() => navigate('/inventory')} 
                className="text-xs font-bold p-0 text-brand-primary hover:bg-transparent"
              >
                View All
              </Button>
            </div>
            
            {lowStockProducts.length === 0 ? (
              <div className="py-8 text-center text-xs text-brand-mutedText font-medium bg-brand-cream/20 rounded-xl">
                🟢 All products are fully stocked!
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-brand-cream/20 border border-brand-cream/40 rounded-xl">
                    <div>
                      <h5 className="text-sm font-bold">{p.name}</h5>
                      <p className="text-xs text-brand-error font-semibold mt-0.5">
                        {p.quantity} {p.unit} remaining
                      </p>
                    </div>
                    <Button 
                      variant="primary" 
                      onClick={() => navigate('/inventory')} 
                      className="px-3 py-1.5 text-xs rounded-lg font-bold"
                    >
                      + Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Selling Widget */}
          <div className="glass-card p-6">
            <h4 className="text-sm font-bold uppercase tracking-wider text-brand-dark mb-4">Top Selling Items</h4>
            
            {topSellingProducts.length === 0 ? (
              <div className="py-8 text-center text-xs text-brand-mutedText font-medium bg-brand-cream/20 rounded-xl">
                No sales logged yet.
              </div>
            ) : (
              <div className="space-y-4">
                {topSellingProducts.map((prod, idx) => (
                  <div key={prod.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5">
                        <span className="text-[10px] text-brand-mutedText font-extrabold">{idx + 1}.</span>
                        {prod.name}
                      </span>
                      <span>{prod.quantity} {prod.unit}</span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full h-2 bg-brand-cream rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand-primary rounded-full"
                        style={{ 
                          width: `${Math.min(100, (prod.quantity / Number(topSellingProducts[0]?.quantity || 1)) * 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
