import { useState, useEffect } from 'react';
import { useAddStock } from '../../../shared/hooks/useInventory';
import { useAppStore } from '../../../shared/lib/store';
import type { Product } from '../../../shared/services/inventoryService';
import { Modal } from '../../../shared/components/ui/Modal';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export function AddStockModal({ isOpen, onClose, product }: AddStockModalProps) {
  const { currentShop } = useAppStore();
  const addStockMutation = useAddStock();

  const [quantity, setQuantity] = useState(10);
  const [purchasePrice, setPurchasePrice] = useState(0);

  useEffect(() => {
    if (product) {
      setQuantity(10);
      setPurchasePrice(Number(product.purchase_price));
    }
  }, [product]);

  if (!product) return null;

  const currentStock = Number(product.quantity);
  const newStock = currentStock + quantity;

  const handleConfirm = async () => {
    if (!currentShop?.id || !product) return;
    if (quantity <= 0) return;

    try {
      await addStockMutation.mutateAsync({
        shopId: currentShop.id,
        productId: product.id,
        quantity: quantity,
        purchasePrice: purchasePrice
      });
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Restock ${product.name}`}>
      <div className="space-y-6">
        
        {/* Stock status flow */}
        <div className="bg-brand-cream/35 px-5 py-4 rounded-xl border border-brand-cream flex justify-between items-center text-sm font-semibold">
          <div className="text-center">
            <p className="text-xs text-brand-mutedText font-bold uppercase mb-0.5">Current Stock</p>
            <p className="text-base text-brand-darkText">{currentStock} {product.unit}</p>
          </div>
          
          <div className="text-brand-mutedText text-lg">➔</div>
          
          <div className="text-center">
            <p className="text-xs text-brand-primary font-bold uppercase mb-0.5">New Stock</p>
            <p className="text-base text-brand-primary font-extrabold">{newStock} {product.unit}</p>
          </div>
        </div>

        {/* Quantity Added Input */}
        <Input
          id="stock-qty"
          type="number"
          step="any"
          label={`Quantity to Add (${product.unit})`}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />

        {/* Purchase Price Input */}
        <Input
          id="stock-purchase-price"
          type="number"
          step="any"
          label={`Purchase Cost Price (₹ per ${product.unit})`}
          value={purchasePrice}
          onChange={(e) => setPurchasePrice(Number(e.target.value))}
        />

        {/* Calculation summary */}
        <div className="bg-brand-cream/20 border border-brand-cream/40 rounded-2xl p-5 space-y-2 text-sm font-semibold text-brand-mutedText">
          <div className="flex justify-between items-center">
            <span>Total Batch Cost:</span>
            <span className="text-brand-darkText font-bold">₹{(quantity * purchasePrice).toFixed(2)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            className="flex-1"
            disabled={quantity <= 0 || addStockMutation.isPending}
          >
            {addStockMutation.isPending ? 'Saving...' : 'Confirm Stock'}
          </Button>
        </div>

      </div>
    </Modal>
  );
}
