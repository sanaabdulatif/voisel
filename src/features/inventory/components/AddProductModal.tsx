import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProducts, useAddProduct, useAddStock } from '../../../shared/hooks/useInventory';
import { useAppStore } from '../../../shared/lib/store';
import { Modal } from '../../../shared/components/ui/Modal';
import { Input } from '../../../shared/components/ui/Input';
import { Select } from '../../../shared/components/ui/Select';
import { Button } from '../../../shared/components/ui/Button';

// Validation schemas
const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  category: z.enum(['Vegetables', 'Fruits', 'Other']).optional(),
  unit: z.string().min(1, 'Unit is required'),
  initial_quantity: z.coerce.number().min(0, 'Quantity must be at least 0').optional(),
  purchase_price: z.coerce.number().min(0, 'Purchase price must be at least 0').optional(),
  selling_price: z.coerce.number().min(0.01, 'Selling price must be greater than 0'),
  low_stock_threshold: z.coerce.number().min(0, 'Threshold must be at least 0').optional(),
  image_url: z.string().optional(),
});

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddProductModal({ isOpen, onClose }: AddProductModalProps) {
  const { currentShop } = useAppStore();
  const { data: products = [] } = useProducts(currentShop?.id);
  const addProductMutation = useAddProduct();
  const addStockMutation = useAddStock();

  const [activeTab, setActiveTab] = useState<'restock' | 'new'>('restock');

  // Restock Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [restockError, setRestockError] = useState<string | null>(null);

  // New Product Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<any>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      unit: 'kg',
      selling_price: 15,
    }
  });

  const onRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRestockError(null);
    if (!selectedProductId) {
      setRestockError('Please select a product to restock.');
      return;
    }
    const qty = parseFloat(stockQty);
    if (isNaN(qty) || qty <= 0) {
      setRestockError('Please enter a valid quantity greater than 0.');
      return;
    }

    if (!currentShop?.id) return;
    try {
      await addStockMutation.mutateAsync({
        productId: selectedProductId,
        quantity: qty,
        purchasePrice: 0,
        shopId: currentShop.id
      });
      setSelectedProductId('');
      setStockQty('');
      onClose();
    } catch (err: any) {
      setRestockError(err.message || 'Failed to add stock.');
    }
  };

  const onNewProdSubmit = async (values: any) => {
    if (!currentShop?.id) return;
    
    // Auto-detect category and emoji
    const name = values.name || '';
    const category = getCategoryByName(name);
    const image_url = getEmojiKeyByName(name);

    try {
      await addProductMutation.mutateAsync({
        shop_id: currentShop.id,
        ...values,
        category,
        image_url,
        purchase_price: 0,
        initial_quantity: 0,
        low_stock_threshold: 5,
      });
      reset();
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Item / Stock">
      <div className="flex bg-brand-cream/45 p-1 rounded-xl mb-4">
        <button
          onClick={() => setActiveTab('restock')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
            activeTab === 'restock' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-mutedText'
          }`}
        >
          Restock Item
        </button>
        <button
          onClick={() => setActiveTab('new')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
            activeTab === 'new' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-mutedText'
          }`}
        >
          Register New Product
        </button>
      </div>

      {activeTab === 'restock' ? (
        <form onSubmit={onRestockSubmit} className="space-y-4">
          {restockError && (
            <div className="p-3 bg-red-50 text-brand-error text-xs font-semibold rounded-xl border border-brand-error/15">
              {restockError}
            </div>
          )}

          <Select
            id="restock-product"
            label="Select Product"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            options={[
              { value: '', label: '-- Select --' },
              ...products.map(p => ({ value: p.id, label: `${p.name} (${p.quantity} ${p.unit} remaining)` }))
            ]}
            required
          />

          <Input
            id="restock-qty"
            type="number"
            step="any"
            label="Quantity to Add"
            placeholder="e.g. 10"
            value={stockQty}
            onChange={(e) => setStockQty(e.target.value)}
            required
          />

          <div className="flex gap-3 pt-4 border-t border-brand-cream/60">
            <Button variant="secondary" type="button" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={addStockMutation.isPending}>
              {addStockMutation.isPending ? 'Saving...' : 'Add Stock'}
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSubmit(onNewProdSubmit)} className="space-y-4">
          <Input
            id="prod-name"
            label="Product Name"
            placeholder="e.g. Fresh Mango"
            error={errors.name?.message?.toString()}
            {...register('name')}
          />

          <Select
            id="prod-unit"
            label="Unit"
            options={[
              { value: 'kg', label: 'kg (Kilogram)' },
              { value: 'gram', label: 'gram' },
              { value: 'piece', label: 'piece' },
              { value: 'bunch', label: 'bunch' },
              { value: 'litre', label: 'litre' }
            ]}
            error={errors.unit?.message?.toString()}
            {...register('unit')}
          />

          <Input
            id="prod-sell"
            type="number"
            step="any"
            label="Selling Price (₹)"
            placeholder="60"
            error={errors.selling_price?.message?.toString()}
            {...register('selling_price')}
          />

          <div className="flex gap-3 pt-4 border-t border-brand-cream/60">
            <Button variant="secondary" type="button" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={addProductMutation.isPending}>
              {addProductMutation.isPending ? 'Saving...' : 'Add Product'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function getEmojiKeyByName(name: string): string {
  const normalized = name.toLowerCase();
  if (normalized.includes('tomato') || normalized.includes('thakkali') || normalized.includes('thakkaali') || normalized.includes('തക്കാളി')) return 'tomato';
  if (normalized.includes('potato') || normalized.includes('urula') || normalized.includes('urulakkizhangu') || normalized.includes('ഉരുളക്കിഴങ്ങ്')) return 'potato';
  if (normalized.includes('apple') || normalized.includes('aapil') || normalized.includes('aappil') || normalized.includes('ആപ്പിൾ')) return 'apple';
  if (normalized.includes('banana') || normalized.includes('pazham') || normalized.includes('ethapazham') || normalized.includes('ഏത്തപ്പഴം') || normalized.includes('പഴം')) return 'banana';
  if (normalized.includes('coconut') || normalized.includes('thenga') || normalized.includes('തേങ്ങ')) return 'coconut';
  if (normalized.includes('spinach') || normalized.includes('palak') || normalized.includes('cheera') || normalized.includes('ചീര')) return 'spinach';
  if (normalized.includes('onion') || normalized.includes('savala') || normalized.includes('ulli') || normalized.includes('ഉള്ളി') || normalized.includes('സവാള')) return 'onion';
  if (normalized.includes('carrot') || normalized.includes('karat') || normalized.includes('കാരറ്റ്')) return 'carrot';
  if (normalized.includes('strawberry') || normalized.includes('സ്ട്രോബെറി')) return 'strawberry';
  if (normalized.includes('mango') || normalized.includes('manga') || normalized.includes('മാങ്ങ')) return 'mango';
  if (normalized.includes('orange') || normalized.includes('ഓറഞ്ച്')) return 'orange';
  if (normalized.includes('grape') || normalized.includes('munthiri') || normalized.includes('മുന്തിരി')) return 'grape';
  if (normalized.includes('chilli') || normalized.includes('chili') || normalized.includes('mulaku') || normalized.includes('മുളക്')) return 'chilli';
  if (normalized.includes('ginger') || normalized.includes('inji') || normalized.includes('ഇഞ്ചി')) return 'ginger';
  if (normalized.includes('garlic') || normalized.includes('veluthulli') || normalized.includes('വെളുത്തുള്ളി')) return 'garlic';
  if (normalized.includes('lemon') || normalized.includes('naranga') || normalized.includes('cherunaranga') || normalized.includes('നാരങ്ങ')) return 'lemon';
  return 'default';
}

function getCategoryByName(name: string): 'Vegetables' | 'Fruits' | 'Other' {
  const normalized = name.toLowerCase();
  const fruits = [
    'apple', 'banana', 'coconut', 'mango', 'orange', 'grape', 'grapes', 'lemon', 'berry', 'strawberry', 'fruits',
    'ആപ്പിൾ', 'പഴം', 'ഏത്തപ്പഴം', 'തേങ്ങ', 'മാങ്ങ', 'ഓറഞ്ച്', 'മുന്തിരി', 'നാരങ്ങ', 'സ്ട്രോബെറി'
  ];
  const vegetables = [
    'tomato', 'potato', 'spinach', 'onion', 'carrot', 'cabbage', 'garlic', 'ginger', 'pepper', 'veg', 'chilli', 'chili', 'palak', 'cheera',
    'തക്കാളി', 'ഉരുളക്കിഴങ്ങ്', 'ചീര', 'ഉള്ളി', 'സവാള', 'കാരറ്റ്', 'മുളക്', 'ഇഞ്ചി', 'വെളുത്തുള്ളി'
  ];
  
  if (fruits.some(f => normalized.includes(f))) return 'Fruits';
  if (vegetables.some(v => normalized.includes(v))) return 'Vegetables';
  return 'Other';
}
