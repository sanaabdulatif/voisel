import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Sparkles, ShoppingBag } from 'lucide-react';
import { useAppStore } from '../../../shared/lib/store';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { inventoryService } from '../../../shared/services/inventoryService';

const INITIAL_PRODUCTS: any[] = [];

export function ShopSetupView() {
  const navigate = useNavigate();
  const { session, currentShop, setCurrentShop } = useAppStore();
  
  const [shopName, setShopName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (currentShop) {
      navigate('/');
    }
  }, [currentShop, navigate]);

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !session?.user?.id) return;
    
    setIsLoading(true);
    setErrorMsg(null);
    
    try {
      // 1. Create shop branch
      const newShop = await inventoryService.createShop(shopName.trim(), session.user.id);
      
      // 2. Prepopulate products catalog
      const productsList = INITIAL_PRODUCTS.map((prod) => ({
        shop_id: newShop.id,
        name: prod.name,
        category: prod.category,
        unit: prod.unit,
        quantity: prod.quantity,
        purchase_price: prod.purchase_price,
        selling_price: prod.selling_price,
        low_stock_threshold: prod.low_stock_threshold,
        image_url: prod.image_url
      }));
      
      await inventoryService.prepopulateProducts(newShop.id, productsList);

      // 3. Update store and navigate to dashboard
      setCurrentShop(newShop);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to create shop. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-softCream flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-brand-cream/60 shadow-premium p-8">
        
        {/* Onboarding Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-sm mb-3">
            <Store size={28} />
          </div>
          <h2 className="text-2xl font-bold text-brand-dark">Set Up Your Shop</h2>
          <p className="text-sm text-brand-mutedText mt-1">Create your first inventory outlet to get started</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 text-brand-error text-xs font-semibold rounded-xl border border-brand-error/15">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleCreateShop} className="space-y-6">
          <Input
            id="shop-name-input"
            type="text"
            label="Shop/Branch Name"
            placeholder="e.g. Fresh Mart - Main Branch"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            required
          />

          {/* Quick Info Box */}
          <div className="bg-brand-cream/35 p-4 rounded-xl border border-brand-cream space-y-2">
            <div className="flex items-start gap-2.5 text-xs text-brand-darkText">
              <Sparkles className="text-brand-primary shrink-0 mt-0.5" size={14} />
              <span>
                <strong>Quick Setup:</strong> We will initialize a clean, empty inventory database for your shop so you can immediately start adding custom items via voice or manual controls.
              </span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-brand-darkText">
              <ShoppingBag className="text-brand-primary shrink-0 mt-0.5" size={14} />
              <span>
                <strong>Multi-Shop:</strong> You can add more shops or branches later via settings.
              </span>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating Shop...' : 'Create & Onboard Shop'}
          </Button>
        </form>
      </div>
    </div>
  );
}
