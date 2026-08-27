import { ShoppingBag, Edit3, Trash2 } from 'lucide-react';
import type { Product } from '../../../shared/services/inventoryService';
import { Button } from '../../../shared/components/ui/Button';

interface ProductCardProps {
  product: Product;
  onSell: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

const EMOJI_MAP: Record<string, { emoji: string; bg: string }> = {
  tomato: { emoji: '🍅', bg: 'bg-red-50 text-red-500 border-red-100' },
  potato: { emoji: '🥔', bg: 'bg-amber-100/40 text-amber-800 border-amber-200' },
  apple: { emoji: '🍎', bg: 'bg-rose-50 text-rose-600 border-rose-100' },
  banana: { emoji: '🍌', bg: 'bg-yellow-50 text-yellow-600 border-yellow-100' },
  coconut: { emoji: '🥥', bg: 'bg-orange-50 text-orange-800 border-orange-100' },
  spinach: { emoji: '🥬', bg: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  onion: { emoji: '🧅', bg: 'bg-purple-50 text-purple-600 border-purple-100' },
  carrot: { emoji: '🥕', bg: 'bg-orange-50 text-orange-600 border-orange-150' },
  strawberry: { emoji: '🍓', bg: 'bg-red-50 text-red-500 border-red-100' },
  mango: { emoji: '🥭', bg: 'bg-amber-50 text-amber-500 border-amber-100' },
  orange: { emoji: '🍊', bg: 'bg-orange-50 text-orange-500 border-orange-100' },
  grape: { emoji: '🍇', bg: 'bg-purple-50 text-purple-500 border-purple-100' },
  chilli: { emoji: '🌶️', bg: 'bg-red-50 text-red-500 border-red-100' },
  ginger: { emoji: '🫚', bg: 'bg-yellow-50 text-yellow-800 border-yellow-100' },
  garlic: { emoji: '🧄', bg: 'bg-stone-50 text-stone-500 border-stone-100' },
  lemon: { emoji: '🍋', bg: 'bg-yellow-50 text-yellow-500 border-yellow-100' },
  default: { emoji: '📦', bg: 'bg-brand-cream/40 text-brand-darkText border-brand-cream' }
};

export function ProductCard({ product, onSell, onEdit, onDelete }: ProductCardProps) {
  const quantity = Number(product.quantity);
  const threshold = Number(product.low_stock_threshold);
  const purchasePrice = Number(product.purchase_price);
  const sellingPrice = Number(product.selling_price);
  const profitPerUnit = sellingPrice - purchasePrice;

  // Determine Stock Status
  let statusText = 'In Stock';
  let statusColor = 'bg-brand-success text-white';
  
  if (quantity === 0) {
    statusText = 'Out of Stock';
    statusColor = 'bg-brand-error text-white';
  } else if (quantity <= threshold) {
    statusText = 'Low Stock';
    statusColor = 'bg-brand-warning text-white';
  }

  // Get image mapping with name-based fallback
  const imageKey = product.image_url?.toLowerCase() || '';
  const nameKey = product.name?.toLowerCase() || '';
  
  let asset = EMOJI_MAP.default;
  
  if (EMOJI_MAP[imageKey] && imageKey !== 'default') {
    asset = EMOJI_MAP[imageKey];
  } else {
    // Fallback to searching the name for keywords
    const matchedKey = Object.keys(EMOJI_MAP).find(key => 
      key !== 'default' && (nameKey.includes(key) || key.includes(nameKey))
    );
    if (matchedKey) {
      asset = EMOJI_MAP[matchedKey];
    }
  }

  return (
    <div className="glass-card border border-brand-cream/50 overflow-hidden flex flex-col justify-between hover:shadow-premium transition-all duration-300 group">
      
      {/* Visual Header */}
      <div className="p-5 flex items-start gap-4">
        {/* Visual Product Icon */}
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl border shadow-sm ${asset.bg} shrink-0 group-hover:scale-105 transition-transform duration-300`}>
          {asset.emoji}
        </div>
        
        {/* Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-bold text-base text-brand-dark truncate leading-snug">{product.name}</h4>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onEdit(product)}
                className="p-1 rounded-lg text-brand-mutedText hover:text-brand-primary hover:bg-brand-cream/50 transition-colors"
                title="Edit Product"
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={() => onDelete(product)}
                className="p-1 rounded-lg text-brand-mutedText hover:text-brand-error hover:bg-red-50 transition-colors"
                title="Delete Product"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <p className="text-[10px] text-brand-mutedText font-semibold uppercase tracking-wider mt-0.5">{product.category}</p>
          
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-lg font-extrabold text-brand-darkText">{quantity}</span>
            <span className="text-xs font-semibold text-brand-mutedText">{product.unit}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-auto ${statusColor}`}>
              {statusText}
            </span>
          </div>
        </div>
      </div>

      {/* Price row */}
      <div className="px-5 py-3 bg-brand-cream/25 border-t border-b border-brand-cream/40 flex justify-between items-center text-xs font-semibold text-brand-mutedText">
        <span>Selling Price:</span>
        <span className="text-sm font-extrabold text-brand-primary">₹{sellingPrice} / {product.unit}</span>
      </div>

      {/* Actions */}
      <div className="p-3 bg-white">
        <Button 
          variant="primary"
          onClick={() => onSell(product)}
          className="w-full py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5"
          disabled={quantity === 0}
        >
          <ShoppingBag size={14} />
          <span>{quantity === 0 ? 'Out of Stock' : 'Sell Item'}</span>
        </Button>
      </div>

    </div>
  );
}
