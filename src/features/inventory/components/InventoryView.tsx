import { useState, useMemo } from 'react';
import { Search, Plus } from 'lucide-react';
import { useAppStore } from '../../../shared/lib/store';
import { useProducts, useDeleteProduct } from '../../../shared/hooks/useInventory';
import type { Product } from '../../../shared/services/inventoryService';
import { ProductCard } from './ProductCard';
import { AddProductModal } from './AddProductModal';
import { EditProductModal } from './EditProductModal';
import { SellModal } from './SellModal';

export function InventoryView() {
  const { currentShop } = useAppStore();
  const { data: products = [], isLoading } = useProducts(currentShop?.id);
  const deleteProductMutation = useDeleteProduct();

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');

  // Modals visibility states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Filtered Products Calculation
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      return prod.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [products, searchQuery]);

  const handleOpenSell = (product: Product) => {
    setSelectedProduct(product);
    setIsSellModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!currentShop?.id) return;
    const confirmed = window.confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteProductMutation.mutateAsync({
        id: product.id,
        shopId: currentShop.id
      });
    } catch (err) {
      console.error(err);
      alert('Failed to delete product.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 rounded-full border-4 border-brand-primary/10 border-t-brand-primary animate-spin" />
        <p className="text-sm font-semibold text-brand-mutedText">Loading Shop Inventory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* 1. STANDALONE FULL WIDTH SEARCH BAR */}
      <div className="relative w-full shadow-premium rounded-2xl bg-white border border-brand-cream/60 p-4">
        <div className="relative w-full">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-mutedText/50">
            <Search size={18} />
          </span>
          <input
            type="text"
            className="w-full pl-11 pr-4 py-3 bg-brand-cream/15 hover:bg-brand-cream/25 focus:bg-white border border-brand-cream rounded-xl text-brand-darkText placeholder-brand-mutedText/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary transition-all duration-200 text-sm font-medium"
            placeholder="Search products by name (e.g. Tomato, Apple)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 2. PRODUCT LISTING GRID */}
      {filteredProducts.length === 0 ? (
        <div className="glass-card p-12 text-center border-dashed border-2 border-brand-cream max-w-md mx-auto mt-8">
          <p className="text-4xl mb-3">🥦</p>
          <h4 className="text-base font-bold text-brand-dark">No products found</h4>
          <p className="text-xs text-brand-mutedText mt-1.5">
            Adjust your search filter or click the Plus (+) button below to add stock/items.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSell={handleOpenSell}
              onEdit={handleOpenEdit}
              onDelete={handleDeleteProduct}
            />
          ))}
        </div>
      )}

      {/* 3. FIXED FLOATING ACTION BUTTON (FAB) */}
      <button
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-24 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-brand-primary hover:bg-brand-dark text-white rounded-full flex items-center justify-center shadow-premium transition-all duration-200 active:scale-95 z-40 cursor-pointer"
        title="Add Item / Stock"
      >
        <Plus size={24} />
      </button>

      {/* POPUP MODALS BLOCK */}
      <AddProductModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />
      
      {selectedProduct && isEditModalOpen && (
        <EditProductModal 
          isOpen={isEditModalOpen} 
          onClose={() => { setIsEditModalOpen(false); setSelectedProduct(null); }} 
          product={selectedProduct} 
        />
      )}

      {selectedProduct && isSellModalOpen && (
        <SellModal 
          isOpen={isSellModalOpen} 
          onClose={() => { setIsSellModalOpen(false); setSelectedProduct(null); }} 
          product={selectedProduct} 
        />
      )}

    </div>
  );
}
