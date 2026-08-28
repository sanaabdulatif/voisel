import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUpdateProduct } from '../../../shared/hooks/useInventory';
import { useAppStore } from '../../../shared/lib/store';
import type { Product } from '../../../shared/services/inventoryService';
import { Modal } from '../../../shared/components/ui/Modal';
import { Input } from '../../../shared/components/ui/Input';
import { Select } from '../../../shared/components/ui/Select';
import { Button } from '../../../shared/components/ui/Button';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  category: z.enum(['Vegetables', 'Fruits', 'Other']).optional(),
  unit: z.string().min(1, 'Unit is required'),
  quantity: z.coerce.number().min(0, 'Quantity must be at least 0'),
  purchase_price: z.coerce.number().min(0, 'Purchase price must be at least 0').optional(),
  selling_price: z.coerce.number().min(0.01, 'Selling price must be greater than 0'),
  low_stock_threshold: z.coerce.number().min(0, 'Threshold must be at least 0').optional(),
  image_url: z.string().optional(),
});



interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export function EditProductModal({ isOpen, onClose, product }: EditProductModalProps) {
  const { currentShop } = useAppStore();
  const updateProductMutation = useUpdateProduct();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<any>({
    resolver: zodResolver(productSchema),
  });

  // Reset form with product values when product changes
  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        category: product.category as any,
        unit: product.unit,
        quantity: product.quantity,
        purchase_price: product.purchase_price,
        selling_price: product.selling_price,
        low_stock_threshold: product.low_stock_threshold,
        image_url: product.image_url || 'default'
      });
    }
  }, [product, reset]);

  const onSubmit = async (values: any) => {
    if (!product || !currentShop?.id) return;
    
    // Auto-detect category and emoji
    const name = values.name || '';
    const category = getCategoryByName(name);
    const image_url = getEmojiKeyByName(name);

    try {
      await updateProductMutation.mutateAsync({
        id: product.id,
        data: {
          ...values,
          category,
          image_url,
          purchase_price: 0,
        },
        shopId: currentShop.id
      });
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${product?.name || 'Product'}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          id="edit-name"
          label="Product Name"
          error={errors.name?.message?.toString()}
          {...register('name')}
        />

        <Select
          id="edit-unit"
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

        <div className="grid grid-cols-2 gap-4">
          <Input
            id="edit-quantity"
            type="number"
            step="any"
            label="Quantity"
            error={errors.quantity?.message?.toString()}
            {...register('quantity')}
          />

          <Input
            id="edit-sell"
            type="number"
            step="any"
            label="Selling Price (₹)"
            error={errors.selling_price?.message?.toString()}
            {...register('selling_price')}
          />
        </div>

        <div className="flex gap-3 pt-4 border-t border-brand-cream/60">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={updateProductMutation.isPending}>
            {updateProductMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
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
  if (normalized.includes('blueberry') || normalized.includes('blueberries') || normalized.includes('ബ്ലൂബെറി')) return 'blueberry';
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
    'apple', 'banana', 'coconut', 'mango', 'orange', 'grape', 'grapes', 'lemon', 'berry', 'strawberry', 'blueberry', 'blueberries', 'fruits',
    'ആപ്പിൾ', 'പഴം', 'ഏത്തപ്പഴം', 'തേങ്ങ', 'മാങ്ങ', 'ഓറഞ്ച്', 'മുന്തിരി', 'നാരങ്ങ', 'സ്ട്രോബെറി', 'ബ്ലൂബെറി'
  ];
  const vegetables = [
    'tomato', 'potato', 'spinach', 'onion', 'carrot', 'cabbage', 'garlic', 'ginger', 'pepper', 'veg', 'chilli', 'chili', 'palak', 'cheera',
    'തക്കാളി', 'ഉരുളക്കിഴങ്ങ്', 'ചീര', 'ഉള്ളി', 'സവാള', 'കാരറ്റ്', 'മുളക്', 'ഇഞ്ചി', 'വെളുത്തുള്ളി'
  ];
  
  if (fruits.some(f => normalized.includes(f))) return 'Fruits';
  if (vegetables.some(v => normalized.includes(v))) return 'Vegetables';
  return 'Other';
}
