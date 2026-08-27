import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useRecordSale } from '../../../shared/hooks/useInventory';
import { useAppStore } from '../../../shared/lib/store';
import type { Product } from '../../../shared/services/inventoryService';
import { Modal } from '../../../shared/components/ui/Modal';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';

interface SellModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export function SellModal({ isOpen, onClose, product }: SellModalProps) {
  const { currentShop } = useAppStore();
  const recordSaleMutation = useRecordSale();
  
  const [quantity, setQuantity] = useState(1);
  const [sellingPrice, setSellingPrice] = useState(0);

  // Set default selling price when product changes
  useEffect(() => {
    if (product) {
      setQuantity(1);
      setSellingPrice(Number(product.selling_price));
    }
  }, [product]);

  if (!product) return null;

  const maxQuantity = Number(product.quantity);
  const purchasePrice = Number(product.purchase_price);

  // Live Calculations
  const totalAmount = quantity * sellingPrice;
  const estimatedProfit = quantity * (sellingPrice - purchasePrice);

  const handleConfirmSale = async () => {
    if (!currentShop?.id || !product) return;
    if (quantity <= 0 || quantity > maxQuantity) return;

    try {
      await recordSaleMutation.mutateAsync({
        shopId: currentShop.id,
        productId: product.id,
        quantitySold: quantity,
        sellingPrice: sellingPrice,
        totalAmount: totalAmount,
        profit: estimatedProfit
      });
      
      // Success Confetti!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#3A7D44', '#24552F', '#F7F2E8', '#10B981']
      });

      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Sell ${product.name}`}>
      <div className="space-y-6">
        
        {/* Available Stock Banner */}
        <div className="bg-brand-cream/35 px-4 py-3 rounded-xl border border-brand-cream flex justify-between items-center text-sm font-semibold">
          <span className="text-brand-mutedText">Available Stock:</span>
          <span className="text-brand-darkText">{maxQuantity} {product.unit}</span>
        </div>

        {/* Counter selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-brand-darkText uppercase tracking-wider">Quantity Sold</label>
          <div className="flex items-center justify-between border border-brand-cream bg-white p-3 rounded-xl">
            <button
              onClick={() => setQuantity(prev => Math.max(0.5, prev - 0.5))}
              className="w-10 h-10 bg-brand-cream hover:bg-brand-cream/80 active:scale-95 text-brand-darkText font-bold text-lg rounded-lg transition-all"
              disabled={quantity <= 0.5}
            >
              −
            </button>
            <div className="text-center">
              <span className="text-2xl font-extrabold text-brand-darkText">{quantity.toFixed(2)}</span>
              <span className="text-xs font-bold text-brand-mutedText ml-1.5">{product.unit}</span>
            </div>
            <button
              onClick={() => setQuantity(prev => Math.min(maxQuantity, prev + 0.5))}
              className="w-10 h-10 bg-brand-cream hover:bg-brand-cream/80 active:scale-95 text-brand-darkText font-bold text-lg rounded-lg transition-all"
              disabled={quantity >= maxQuantity}
            >
              +
            </button>
          </div>
          
          {/* Quick numbers selector */}
          <div className="flex gap-2">
            {[1, 2, 5, 10].map(val => (
              <button
                key={val}
                onClick={() => setQuantity(Math.min(maxQuantity, val))}
                className={`flex-1 py-1 rounded-lg text-xs font-bold border transition-colors ${
                  quantity === val 
                    ? 'bg-brand-primary/10 border-brand-primary text-brand-primary' 
                    : 'border-brand-cream text-brand-mutedText hover:bg-brand-cream/50'
                }`}
                disabled={val > maxQuantity}
              >
                {val} {product.unit}
              </button>
            ))}
          </div>
        </div>

        {/* Price Input */}
        <Input
          id="sell-price-override"
          type="number"
          step="any"
          label={`Selling Price (₹ per ${product.unit})`}
          value={sellingPrice}
          onChange={(e) => setSellingPrice(Number(e.target.value))}
        />

        {/* Calculation summary */}
        <div className="bg-brand-cream/20 border border-brand-cream/40 rounded-2xl p-5 space-y-3.5 text-sm">
          <div className="flex justify-between items-center text-brand-mutedText font-semibold">
            <span>Quantity:</span>
            <span className="text-brand-darkText">{quantity.toFixed(2)} {product.unit}</span>
          </div>
          <div className="flex justify-between items-center text-brand-mutedText font-semibold">
            <span>Price:</span>
            <span className="text-brand-darkText">₹{sellingPrice} / {product.unit}</span>
          </div>
          
          <div className="border-t border-brand-cream/65 pt-3 flex justify-between items-center font-bold">
            <span className="text-brand-dark">Total Amount:</span>
            <span className="text-xl text-brand-primary">₹{totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmSale} 
            className="flex-1"
            disabled={quantity <= 0 || quantity > maxQuantity || recordSaleMutation.isPending}
          >
            {recordSaleMutation.isPending ? 'Processing...' : 'Confirm Sale'}
          </Button>
        </div>

      </div>
    </Modal>
  );
}
