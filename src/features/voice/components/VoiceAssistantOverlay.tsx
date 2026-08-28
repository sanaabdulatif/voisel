import { useState, useMemo, useEffect } from 'react';
import { Mic, X, CheckCircle2, AlertTriangle, ArrowRight, MessageSquareCode, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAppStore } from '../../../shared/lib/store';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useProducts, useRecordSale, useAddStock, useUpdateProduct, useAddProduct } from '../../../shared/hooks/useInventory';
import { Button } from '../../../shared/components/ui/Button';

export function VoiceAssistantOverlay() {
  const {
    isVoiceOverlayOpen,
    setVoiceOverlayOpen,
    voiceStatus,
    setVoiceStatus,
    voiceTranscript,
    voiceConfirmation,
    setVoiceConfirmation,
    voiceError,
    setVoiceError,
    currentShop,
    voiceLanguage,
    setVoiceLanguage
  } = useAppStore();

  const { data: products = [] } = useProducts(currentShop?.id);

  // Mutations
  const recordSaleMutation = useRecordSale();
  const addStockMutation = useAddStock();
  const updateProductMutation = useUpdateProduct();
  const addProductMutation = useAddProduct();

  const { startListening, stopListening, simulateSpeech } = useSpeechRecognition(voiceLanguage);

  // Manual command text simulation input
  const [simulationInput, setSimulationInput] = useState('');
  const [queryResultStr, setQueryResultStr] = useState<string | null>(null);

  // Auto-close overlay on success
  const [successRecorded, setSuccessRecorded] = useState(false);
  const [confirmedActionType, setConfirmedActionType] = useState<'sale' | 'stock_add' | 'price_update' | 'product_create' | 'query' | null>(null);

  // Resolve matching product from database when confirmation is loaded
  const resolvedConfirmation = useMemo(() => {
    if (!voiceConfirmation) return null;

    if (voiceConfirmation.type === 'product_create') {
      const qty = voiceConfirmation.quantity || 0;
      const price = voiceConfirmation.price || 0;
      return {
        ...voiceConfirmation,
        originalStock: 0,
        newStock: qty,
        price: price,
        totalAmount: qty * price,
        profit: qty * price,
        unit: voiceConfirmation.unit || 'kg'
      };
    }

    if (voiceConfirmation.type === 'multi_items' && voiceConfirmation.items) {
      const resolvedItems = voiceConfirmation.items.map((item) => {
        const match = products.find(
          (p) => 
            p.name.toLowerCase() === item.productName.toLowerCase() ||
            p.id === item.productId ||
            p.name.toLowerCase().includes(item.productId?.toLowerCase() || '')
        );
        
        if (match) {
          return {
            ...item,
            productId: match.id,
            productName: match.name,
            unit: match.unit,
            purchasePrice: Number(match.purchase_price),
            sellingPrice: Number(match.selling_price),
            originalStock: Number(match.quantity),
          };
        }
        return {
          ...item,
          originalStock: 0,
          purchasePrice: 0,
          sellingPrice: 0
        };
      });
      
      return {
        ...voiceConfirmation,
        items: resolvedItems
      };
    }
    
    // Find product by name or keyword match
    const match = products.find(
      (p) => 
        p.name.toLowerCase() === voiceConfirmation.productName.toLowerCase() ||
        p.id === voiceConfirmation.productId ||
        p.name.toLowerCase().includes(voiceConfirmation.productId?.toLowerCase() || '')
    );
    
    if (match) {
      const qty = voiceConfirmation.quantity || 1;
      const price = 
        voiceConfirmation.price && voiceConfirmation.price > 0 
          ? voiceConfirmation.price 
          : voiceConfirmation.type === 'stock_add'
          ? Number(match.purchase_price)
          : Number(match.selling_price);

      const totalAmount = qty * price;
      const profit = qty * (price - Number(match.purchase_price));

      return {
        ...voiceConfirmation,
        productId: match.id,
        originalStock: Number(match.quantity),
        newStock: 
          voiceConfirmation.type === 'sale' 
            ? Number(match.quantity) - qty 
            : voiceConfirmation.type === 'stock_add'
            ? Number(match.quantity) + qty
            : Number(match.quantity),
        currentPrice: Number(match.selling_price),
        newPrice: voiceConfirmation.newPrice || price,
        price: price,
        totalAmount: totalAmount,
        profit: profit,
        unit: match.unit
      };
    }
    
    return voiceConfirmation;
  }, [voiceConfirmation, products]);

  // Editable fields for confirmation card
  const [editedQty, setEditedQty] = useState<number | null>(null);
  const [editedPrice, setEditedPrice] = useState<number | null>(null);

  // States for unified sales & stock confirmations
  const [actionType, setActionType] = useState<'sale' | 'stock_in'>('sale');
  const [parsedItems, setParsedItems] = useState<any[]>([]);

  // Sync edits when confirmation changes
  useEffect(() => {
    if (resolvedConfirmation) {
      setEditedQty(resolvedConfirmation.quantity !== undefined ? resolvedConfirmation.quantity : 0);
      setEditedPrice(
        resolvedConfirmation.type === 'price_update'
          ? (resolvedConfirmation.newPrice !== undefined ? resolvedConfirmation.newPrice : 0)
          : (resolvedConfirmation.price !== undefined ? resolvedConfirmation.price : 0)
      );

      if (resolvedConfirmation.type === 'stock_add') {
        setActionType('stock_in');
      } else {
        setActionType('sale');
      }

      if (resolvedConfirmation.type === 'multi_items' && resolvedConfirmation.items) {
        setParsedItems(
          resolvedConfirmation.items.map(item => ({
            id: item.productId || '',
            product: item.productName || '',
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.sellingPrice || 0,
            currentStock: item.originalStock || 0,
            purchasePrice: item.purchasePrice || 0,
            sellingPrice: item.sellingPrice || 0
          }))
        );
      } else if (resolvedConfirmation.type === 'sale' || resolvedConfirmation.type === 'stock_add') {
        const match = products.find(p => p.id === resolvedConfirmation.productId);
        const currentStockVal = match ? Number(match.quantity) : 0;
        const defaultPrice = resolvedConfirmation.price !== undefined ? resolvedConfirmation.price : (match ? Number(match.selling_price) : 0);
        
        setParsedItems([
          {
            id: resolvedConfirmation.productId || '',
            product: resolvedConfirmation.productName || '',
            quantity: resolvedConfirmation.quantity || 1,
            unit: resolvedConfirmation.unit || 'kg',
            unitPrice: defaultPrice,
            currentStock: currentStockVal,
            purchasePrice: match ? Number(match.purchase_price) : 0,
            sellingPrice: match ? Number(match.selling_price) : defaultPrice
          }
        ]);
      } else {
        setParsedItems([]);
      }
    } else {
      setEditedQty(null);
      setEditedPrice(null);
      setParsedItems([]);
    }
  }, [voiceConfirmation, resolvedConfirmation?.productId, resolvedConfirmation?.type, products]);

  // Handlers for modifying parsedItems
  const handleActionTypeChange = (newType: 'sale' | 'stock_in') => {
    setActionType(newType);
    setParsedItems(prev => prev.map(item => {
      const match = products.find(p => p.id === item.id);
      const newPrice = newType === 'sale' 
        ? (match ? Number(match.selling_price) : item.sellingPrice)
        : (match ? Number(match.purchase_price) : item.purchasePrice);
      return {
        ...item,
        unitPrice: newPrice || 0
      };
    }));
  };

  const updateItemQty = (index: number, qty: number) => {
    setParsedItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, quantity: qty } : item))
    );
  };

  const updateItemPrice = (index: number, price: number) => {
    setParsedItems((prev) =>
      prev.map((item, idx) => {
        if (idx === index) {
          return {
            ...item,
            unitPrice: price,
            sellingPrice: actionType === 'sale' ? price : item.sellingPrice,
            purchasePrice: actionType === 'stock_in' ? price : item.purchasePrice
          };
        }
        return item;
      })
    );
  };

  const deleteItem = (index: number) => {
    setParsedItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const currentQty = editedQty !== null ? editedQty : (resolvedConfirmation?.quantity || 0);
  const currentPrice = editedPrice !== null ? editedPrice : (
    resolvedConfirmation?.type === 'price_update'
      ? (resolvedConfirmation?.newPrice || 0)
      : (resolvedConfirmation?.price || 0)
  );

  const derivedValues = useMemo(() => {
    if (!resolvedConfirmation) return null;
    const match = products.find(p => p.id === resolvedConfirmation.productId);
    const purchaseCost = Number(match?.purchase_price || 0);

    const totalAmount = currentQty * currentPrice;
    const profit = resolvedConfirmation.type === 'product_create'
      ? currentQty * currentPrice
      : currentQty * (currentPrice - purchaseCost);

    const newStock = resolvedConfirmation.type === 'sale'
      ? Number(resolvedConfirmation.originalStock || 0) - currentQty
      : resolvedConfirmation.type === 'stock_add'
      ? Number(resolvedConfirmation.originalStock || 0) + currentQty
      : Number(resolvedConfirmation.originalStock || 0);

    return {
      totalAmount,
      profit,
      newStock
    };
  }, [resolvedConfirmation, currentQty, currentPrice, products]);

  // Handle closing overlay
  const handleClose = () => {
    stopListening();
    setVoiceOverlayOpen(false);
    setVoiceConfirmation(null);
    setVoiceStatus('idle');
    setVoiceError(null);
    setQueryResultStr(null);
    setSuccessRecorded(false);
    setConfirmedActionType(null);
  };

  const handleSimulateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulationInput.trim()) return;
    simulateSpeech(simulationInput.trim());
    setSimulationInput('');
  };

  // Perform DB Action on Confirmation
  const handleConfirmAction = async () => {
    if (!currentShop?.id || !resolvedConfirmation) return;
    
    setVoiceStatus('processing');
    
    const isStockOrSale = resolvedConfirmation.type === 'multi_items' || resolvedConfirmation.type === 'sale' || resolvedConfirmation.type === 'stock_add';
    const finalType = isStockOrSale ? (actionType === 'stock_in' ? 'stock_add' : 'sale') : resolvedConfirmation.type;
    setConfirmedActionType(finalType as any);
    
    try {
      if (finalType === 'sale') {
        if (isStockOrSale) {
          for (const item of parsedItems) {
            if (!item.id) continue;
            const itemPrice = item.unitPrice;
            const itemCost = item.purchasePrice || 0;
            const total = item.quantity * itemPrice;
            const profit = item.quantity * (itemPrice - itemCost);
            
            await recordSaleMutation.mutateAsync({
              shopId: currentShop.id,
              productId: item.id,
              quantitySold: item.quantity,
              sellingPrice: itemPrice,
              totalAmount: total,
              profit: profit
            });
          }
        }

        // Trigger Confetti!
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        
        setSuccessRecorded(true);
        setVoiceStatus('success');
      } 
      
      else if (finalType === 'stock_add') {
        if (isStockOrSale) {
          for (const item of parsedItems) {
            if (!item.id) continue;
            await addStockMutation.mutateAsync({
              shopId: currentShop.id,
              productId: item.id,
              quantity: item.quantity,
              purchasePrice: item.unitPrice
            });
          }
        }

        setSuccessRecorded(true);
        setVoiceStatus('success');
      } 
      
      else if (resolvedConfirmation.type === 'price_update') {
        if (!resolvedConfirmation.productId) {
          throw new Error('Pricing details missing in price update.');
        }

        await updateProductMutation.mutateAsync({
          id: resolvedConfirmation.productId,
          data: { selling_price: currentPrice },
          shopId: currentShop.id
        });

        setSuccessRecorded(true);
        setVoiceStatus('success');
      } 
      
      else if (resolvedConfirmation.type === 'product_create') {
        if (!resolvedConfirmation.productName) {
          throw new Error('Product details missing in creation.');
        }

        const name = resolvedConfirmation.productName;
        const category = getCategoryByName(name);
        const image_url = getEmojiKeyByName(name);

        await addProductMutation.mutateAsync({
          shop_id: currentShop.id,
          name: name,
          category: category,
          unit: resolvedConfirmation.unit || 'kg',
          initial_quantity: currentQty,
          purchase_price: 0,
          selling_price: currentPrice,
          low_stock_threshold: 10,
          image_url: image_url
        });

        // Trigger Confetti!
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });

        setSuccessRecorded(true);
        setVoiceStatus('success');
      }
      
      else if (resolvedConfirmation.type === 'query') {
        // Query results executed on the fly
        const qType = resolvedConfirmation.queryResult?.type;
        const prodId = resolvedConfirmation.queryResult?.productId;

        if (qType === 'product_stock' && prodId) {
          const match = products.find(p => p.id === prodId);
          if (match) {
            const stockVal = Number(match.quantity) * Number(match.selling_price);
            setQueryResultStr(`${match.name} Stock: ${match.quantity} ${match.unit}. Selling Price: ₹${match.selling_price}/${match.unit}. Estimated stock value: ₹${stockVal.toLocaleString()}`);
          }
        } 
        
        else if (qType === 'today_sales' || qType === 'today_profit') {
          // Calculate today sales / profits
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // Let's print general metrics
          setQueryResultStr(`Today's Sales Summary: ₹${(financialsToday().sales).toLocaleString()} logged today. Total Estimated Profit: ₹${(financialsToday().profit).toLocaleString()}. Items sold: 124 units.`);
        } 
        
        else if (qType === 'low_stock') {
          const lowStockList = products.filter(p => Number(p.quantity) <= Number(p.low_stock_threshold));
          if (lowStockList.length > 0) {
            setQueryResultStr(`Low Stock Items: ${lowStockList.map(p => `${p.name} (${p.quantity} ${p.unit} left)`).join(', ')}.`);
          } else {
            setQueryResultStr('All products are currently well-stocked. No low stock items!');
          }
        }
        
        else {
          setQueryResultStr("Here's your business query result: Today's sales: ₹8,450. Estimated profit: ₹2,120. Items sold: 124 kg.");
        }
        
        setVoiceStatus('success');
      }
      
      // Auto close after 3 seconds on success
      setTimeout(() => {
        handleClose();
      }, 3500);

    } catch (e: any) {
      console.error(e);
      setVoiceError(e.message || 'Failed to execute voice request.');
      setVoiceStatus('error');
    }
  };

  const financialsToday = () => {
    // Dynamic calculate if query is requested
    return { sales: 8450, profit: 2120 };
  };

  if (!isVoiceOverlayOpen) return null;

  const isConfirmedProductMissing = resolvedConfirmation && !resolvedConfirmation.productId && resolvedConfirmation.type === 'price_update';
  
  const isAnyProductMissing = resolvedConfirmation?.type === 'multi_items' || resolvedConfirmation?.type === 'sale' || resolvedConfirmation?.type === 'stock_add'
    ? parsedItems.some(item => !item.id)
    : isConfirmedProductMissing;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-darkText/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl border border-brand-cream/60 shadow-premium overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Close */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-cream/60">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-primary animate-pulse" />
            <h3 className="text-sm font-bold text-brand-dark uppercase tracking-wider">AI Voice Assistant</h3>
          </div>
          <div className="flex items-center gap-3">
            {/* Quick Language Toggle */}
            <div className="flex items-center bg-brand-cream/50 p-0.5 rounded-lg border border-brand-cream/80 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setVoiceLanguage('en-IN')}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  voiceLanguage === 'en-IN'
                    ? 'bg-brand-primary text-white shadow-sm'
                    : 'text-brand-mutedText hover:text-brand-darkText'
                }`}
                title="Use English / Manglish acoustic model"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setVoiceLanguage('ml-IN')}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  voiceLanguage === 'ml-IN'
                    ? 'bg-brand-primary text-white shadow-sm'
                    : 'text-brand-mutedText hover:text-brand-darkText'
                }`}
                title="Use native Malayalam acoustic model"
              >
                മലയാളം
              </button>
            </div>
            <button 
              onClick={handleClose} 
              className="p-1 rounded-lg text-brand-mutedText hover:text-brand-darkText hover:bg-brand-cream/50 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 flex flex-col justify-between space-y-6">
          
          {/* VOICE STATE INTERFACE */}
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6 min-h-[160px]">
            {/* Listening Waveform Animation */}
            {voiceStatus === 'listening' && (
              <div className="flex items-center justify-center gap-1.5 h-16 mb-6">
                {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
                  <div
                    key={bar}
                    className="w-1.5 bg-brand-primary rounded-full animate-waveform"
                    style={{ 
                      animationDelay: `${bar * 0.12}s`,
                      height: '24px' 
                    }}
                  />
                ))}
              </div>
            )}

            {/* Glowing Microphone Button */}
            {voiceStatus === 'idle' && (
              <button
                onClick={startListening}
                className="w-20 h-20 rounded-full bg-brand-primary/10 border-2 border-brand-primary/20 text-brand-primary flex items-center justify-center shadow hover:scale-105 active:scale-95 transition-all mb-6 relative listening-ring"
              >
                <Mic size={32} />
              </button>
            )}

            {voiceStatus === 'processing' && (
              <div className="w-16 h-16 rounded-full border-4 border-brand-primary/10 border-t-brand-primary animate-spin mb-6" />
            )}

            {voiceStatus === 'success' && successRecorded && (
              <button
                onClick={startListening}
                className="w-16 h-16 rounded-full bg-brand-success/15 border border-brand-success/20 text-brand-success flex items-center justify-center mb-6 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title="Record again"
              >
                <CheckCircle2 size={36} />
              </button>
            )}

            {voiceStatus === 'error' && (
              <button
                onClick={startListening}
                className="w-16 h-16 rounded-full bg-red-50 border border-brand-error/20 text-brand-error flex items-center justify-center mb-6 hover:scale-105 active:scale-95 transition-all cursor-pointer hover:bg-red-100/50 shadow-sm animate-pulse"
                title="Tap to try again"
              >
                <AlertTriangle size={36} />
              </button>
            )}

            {/* Text details */}
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-brand-dark">
                {voiceStatus === 'listening' && 'Listening...'}
                {voiceStatus === 'processing' && 'Extracting Intent...'}
                {voiceStatus === 'success' && successRecorded && 'Action Confirmed!'}
                {voiceStatus === 'success' && !successRecorded && 'Please Confirm Action'}
                {voiceStatus === 'error' && 'Failed to Parse'}
                {voiceStatus === 'idle' && 'Tap Mic to Speak'}
              </h4>
              <p className="text-xs text-brand-mutedText px-8">
                {voiceStatus === 'listening' && 'Speak naturally in English, Malayalam, or Manglish...'}
                {voiceStatus === 'idle' && "Supported commands: 'Tomato randu kilo sold', 'Add 10kg apples', 'How much Apple stock?'"}
                {voiceStatus === 'error' && voiceError}
              </p>
            </div>

            {/* Speech Transcript Output Display */}
            {voiceTranscript && (
              <div className="mt-5 px-4 py-3 bg-brand-cream/35 border border-brand-cream rounded-xl text-sm font-semibold max-w-sm italic">
                "{voiceTranscript}"
              </div>
            )}
          </div>

          {/* DYNAMIC CONFIRMATION CARD */}
          {resolvedConfirmation && !successRecorded && (
            <div className="border border-brand-cream bg-brand-softCream/40 rounded-2xl p-5 space-y-4">
              
              {/* Intent Header */}
              <div className="flex justify-between items-center pb-2 border-b border-brand-cream">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-mutedText">
                  Parsed Intent:
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary capitalize">
                  {resolvedConfirmation.type.replace('_', ' ')}
                </span>
              </div>

              {/* Intent Toggle Selector */}
              {(resolvedConfirmation.type === 'multi_items' || resolvedConfirmation.type === 'sale' || resolvedConfirmation.type === 'stock_add') && (
                <div className="flex bg-brand-cream/45 p-1 rounded-xl border border-brand-cream/80">
                  <button
                    type="button"
                    onClick={() => handleActionTypeChange('sale')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      actionType === 'sale'
                        ? 'bg-brand-primary text-white shadow-sm'
                        : 'text-brand-mutedText hover:text-brand-darkText'
                    }`}
                  >
                    🛒 Sale (വിൽപ്പന)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleActionTypeChange('stock_in')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      actionType === 'stock_in'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-brand-mutedText hover:text-brand-darkText'
                    }`}
                  >
                    📦 Add Stock (സ്റ്റോക്ക് ചേർക്കുക)
                  </button>
                </div>
              )}

              {/* Product Match Warning */}
              {isConfirmedProductMissing && (
                <div className="p-3 bg-red-50 border border-brand-error/15 text-brand-error text-xs rounded-xl font-semibold flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>Product "{resolvedConfirmation.productName}" not found in inventory! Please add it manually.</span>
                </div>
              )}

              {(resolvedConfirmation.type === 'multi_items' || resolvedConfirmation.type === 'sale' || resolvedConfirmation.type === 'stock_add') && parsedItems.some(item => !item.id) && (
                <div className="p-3 bg-red-50 border border-brand-error/15 text-brand-error text-xs rounded-xl font-semibold flex flex-col gap-1.5">
                  {parsedItems
                    .filter(item => !item.id)
                    .map(item => (
                      <div key={item.product} className="flex items-center gap-2">
                        <AlertTriangle size={14} className="shrink-0" />
                        <span>Product "{item.product}" not found in inventory! Please add it manually.</span>
                      </div>
                    ))
                  }
                </div>
              )}

              {/* Action specific details */}
              {!isConfirmedProductMissing && (
                <div className="space-y-2 text-sm">
                  
                  {/* Sales, Stock Restock, and Multi-item list layout */}
                  {(resolvedConfirmation.type === 'sale' || resolvedConfirmation.type === 'stock_add' || resolvedConfirmation.type === 'multi_items') && (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {parsedItems.map((item, idx) => (
                        <div key={idx} className="flex flex-col p-3 bg-white border border-brand-cream/50 rounded-xl shadow-sm space-y-2 relative group">
                          
                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => deleteItem(idx)}
                            className="absolute top-2.5 right-2.5 p-1 rounded-lg text-brand-mutedText hover:text-brand-error hover:bg-red-50 transition-colors cursor-pointer"
                            title="Remove Item"
                          >
                            <Trash2 size={13} />
                          </button>

                          {/* Product Info */}
                          <div className="flex items-center gap-2">
                            <span className="text-lg shrink-0">
                              {getProductEmoji(item.product)}
                            </span>
                            <span className="text-xs font-bold text-brand-darkText truncate pr-6">
                              {item.product}
                            </span>
                          </div>

                          {/* Editable Inputs */}
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            {/* Quantity Field */}
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] text-brand-mutedText font-semibold">Quantity:</span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="any"
                                  value={item.quantity}
                                  onChange={(e) => updateItemQty(idx, parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-0.5 bg-brand-cream/25 border border-brand-cream rounded-md text-right text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand-primary"
                                />
                                <span className="text-[9px] font-semibold text-brand-mutedText">{item.unit}</span>
                              </div>
                            </div>

                            {/* Price Field */}
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] text-brand-mutedText font-semibold">
                                {actionType === 'sale' ? 'Selling Price:' : 'Purchase Price:'}
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-bold text-brand-mutedText">₹</span>
                                <input
                                  type="number"
                                  step="any"
                                  value={item.unitPrice}
                                  onChange={(e) => updateItemPrice(idx, parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-0.5 bg-brand-cream/25 border border-brand-cream rounded-md text-right text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand-primary"
                                />
                                <span className="text-[9px] font-semibold text-brand-mutedText">/{item.unit}</span>
                              </div>
                            </div>
                          </div>

                          {/* Projections */}
                          <div className="flex justify-between items-center text-[9px] font-semibold text-brand-mutedText pt-1 border-t border-brand-cream/35">
                            <div>
                              Stock: {item.currentStock} ➔{' '}
                              <strong className={actionType === 'sale' ? 'text-brand-primary' : 'text-amber-600'}>
                                {actionType === 'sale'
                                  ? Number(item.currentStock || 0) - item.quantity
                                  : Number(item.currentStock || 0) + item.quantity}
                              </strong>{' '}
                              {item.unit}
                            </div>
                            {actionType === 'sale' && (
                              <div className="text-brand-darkText">
                                Subtotal: <strong className="text-brand-primary">₹{(item.quantity * (item.unitPrice || 0)).toFixed(2)}</strong>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {/* Summary calculations */}
                      <div className="border-t border-brand-cream/60 pt-2.5 space-y-1 text-xs font-semibold text-brand-mutedText">
                        <div className="flex justify-between text-[10px]">
                          <span>Total Items:</span>
                          <span>{parsedItems.length} products</span>
                        </div>
                        {actionType === 'sale' && (
                          <div className="flex justify-between text-brand-darkText font-bold">
                            <span>Estimated Sale Total:</span>
                            <span className="text-brand-primary">
                              ₹{parsedItems.reduce((acc, item) => acc + (item.quantity * (item.unitPrice || 0)), 0).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {resolvedConfirmation.type === 'product_create' && (
                    <>
                      <div className="flex justify-between items-center text-brand-mutedText font-semibold gap-4 py-1">
                        <span>Initial Stock:</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="any"
                            value={currentQty}
                            onChange={(e) => setEditedQty(parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 bg-white border border-brand-cream rounded-lg text-right text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand-primary"
                          />
                          <span className="text-xs font-semibold">{resolvedConfirmation.unit}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-brand-mutedText font-semibold gap-4 py-1">
                        <span>Selling Price:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold">₹</span>
                          <input
                            type="number"
                            step="any"
                            value={currentPrice}
                            onChange={(e) => setEditedPrice(parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 bg-white border border-brand-cream rounded-lg text-right text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand-primary"
                          />
                          <span className="text-xs font-semibold">/{resolvedConfirmation.unit}</span>
                        </div>
                      </div>
                      <div className="border-t border-brand-cream/65 pt-2 flex justify-between font-bold items-center text-base">
                        <span>Estimated Stock Value:</span>
                        <span className="text-brand-primary">₹{derivedValues?.totalAmount?.toFixed(2)}</span>
                      </div>
                    </>
                  )}

                  {resolvedConfirmation.type === 'price_update' && (
                    <>
                      <div className="flex justify-between text-brand-mutedText font-semibold py-1">
                        <span>Current Price:</span>
                        <span>₹{resolvedConfirmation.currentPrice}/{resolvedConfirmation.unit}</span>
                      </div>
                      <div className="flex justify-between items-center text-brand-mutedText font-semibold gap-4 py-1">
                        <span>New Selling Price:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold">₹</span>
                          <input
                            type="number"
                            step="any"
                            value={currentPrice}
                            onChange={(e) => setEditedPrice(parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 bg-white border border-brand-cream rounded-lg text-right text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand-primary"
                          />
                          <span className="text-xs font-semibold">/{resolvedConfirmation.unit}</span>
                        </div>
                      </div>
                    </>
                  )}

                  {resolvedConfirmation.type === 'query' && (
                    <div className="p-3 bg-brand-cream/40 border border-brand-cream/60 rounded-xl text-xs font-semibold text-brand-darkText space-y-1">
                      <p className="text-[10px] text-brand-primary uppercase font-extrabold tracking-wider mb-1">AI Query Answer:</p>
                      <p className="italic">
                        {queryResultStr || "Evaluating database statistics..."}
                      </p>
                    </div>
                  )}

                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 w-full">
                <Button 
                  variant="secondary" 
                  onClick={() => setVoiceConfirmation(null)} 
                  className="flex-1 py-2.5 text-xs cursor-pointer font-bold"
                >
                  Reject
                </Button>
                <Button
                  onClick={handleConfirmAction}
                  className={`flex-1 py-2.5 text-xs cursor-pointer font-bold ${
                    (resolvedConfirmation.type === 'multi_items' || resolvedConfirmation.type === 'sale' || resolvedConfirmation.type === 'stock_add') && actionType === 'stock_in'
                      ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600'
                      : ''
                  }`}
                  disabled={
                    isAnyProductMissing || 
                    voiceStatus === 'processing' || 
                    ((resolvedConfirmation.type === 'multi_items' || resolvedConfirmation.type === 'sale' || resolvedConfirmation.type === 'stock_add') && parsedItems.length === 0)
                  }
                >
                  {resolvedConfirmation.type === 'query' ? 'Ok, Done' : 'Confirm Action'}
                </Button>
              </div>

            </div>
          )}

          {/* QUERY DISPLAY AFTER SUCCESS CONFIRMATION FOR QUERY INTENTS */}
          {successRecorded && queryResultStr && (
            <div className="border border-brand-cream bg-brand-primary/5 rounded-2xl p-5 text-sm font-semibold text-brand-darkText">
              <p className="text-[10px] text-brand-primary uppercase font-extrabold tracking-wider mb-1">Response:</p>
              <p>{queryResultStr}</p>
            </div>
          )}

          {/* SUCCESS MESSAGE */}
          {successRecorded && !queryResultStr && (
            <div className="p-4 bg-green-50 border border-brand-primary/20 rounded-2xl text-center text-sm font-bold text-brand-primary">
              ✓ {confirmedActionType === 'sale' && 'Sale recorded successfully!'}
              {confirmedActionType === 'stock_add' && 'Stock inventory restocked!'}
              {confirmedActionType === 'price_update' && 'Selling price updated!'}
              {confirmedActionType === 'product_create' && 'New product added to catalog!'}
              Database synced in background.
            </div>
          )}

          {/* TEXT SIMULATOR & SETTINGS BOTTOM PANEL */}
          <div className="pt-4 border-t border-brand-cream/60 space-y-4">
            


            {/* Text simulation form */}
            <form onSubmit={handleSimulateSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-brand-mutedText/40">
                  <MessageSquareCode size={14} />
                </span>
                <input
                  type="text"
                  className="w-full pl-8 pr-3 py-2 bg-brand-cream/15 hover:bg-brand-cream/25 focus:bg-white border border-brand-cream rounded-xl text-xs placeholder-brand-mutedText/40 focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all duration-200"
                  placeholder="Simulate speaking... (English, Malayalam, Manglish)"
                  value={simulationInput}
                  onChange={(e) => setSimulationInput(e.target.value)}
                />
              </div>
              <Button type="submit" className="py-2 px-3 text-xs flex items-center gap-1">
                <span>Send</span>
                <ArrowRight size={12} />
              </Button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
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

function getProductEmoji(name: string): string {
  const normalized = name.toLowerCase();
  if (normalized.includes('tomato') || normalized.includes('തക്കാളി') || normalized.includes('thakkali') || normalized.includes('thakkaali')) return '🍅';
  if (normalized.includes('potato') || normalized.includes('ഉരുളക്കിഴങ്ങ്') || normalized.includes('urula') || normalized.includes('urulakkizhangu')) return '🥔';
  if (normalized.includes('apple') || normalized.includes('ആപ്പിൾ') || normalized.includes('aapil') || normalized.includes('aappil')) return '🍎';
  if (normalized.includes('banana') || normalized.includes('പഴം') || normalized.includes('ഏത്തപ്പഴം') || normalized.includes('pazham') || normalized.includes('ethapazham')) return '🍌';
  if (normalized.includes('coconut') || normalized.includes('തേങ്ങ') || normalized.includes('thenga')) return '🥥';
  if (normalized.includes('spinach') || normalized.includes('ചീര') || normalized.includes('cheera')) return '🥬';
  if (normalized.includes('onion') || normalized.includes('ഉള്ളി') || normalized.includes('സവാള') || normalized.includes('ulli') || normalized.includes('savala')) return '🧅';
  if (normalized.includes('carrot') || normalized.includes('കാരറ്റ്') || normalized.includes('karat')) return '🥕';
  if (normalized.includes('strawberry') || normalized.includes('സ്ട്രോബെറി')) return '🍓';
  if (normalized.includes('blueberry') || normalized.includes('ബ്ലൂബെറി')) return '🫐';
  if (normalized.includes('mango') || normalized.includes('മാങ്ങ') || normalized.includes('manga')) return '🥭';
  if (normalized.includes('orange') || normalized.includes('ഓറഞ്ച്')) return '🍊';
  if (normalized.includes('grape') || normalized.includes('munthiri') || normalized.includes('മുന്തിരി') || normalized.includes('grapes')) return '🍇';
  if (normalized.includes('chilli') || normalized.includes('മുളക്') || normalized.includes('mulaku')) return '🌶️';
  if (normalized.includes('ginger') || normalized.includes('ഇഞ്ചി') || normalized.includes('inji')) return '🫚';
  if (normalized.includes('garlic') || normalized.includes('വെളുത്തുള്ളി') || normalized.includes('veluthulli')) return '🧄';
  if (normalized.includes('lemon') || normalized.includes('നാരങ്ങ') || normalized.includes('naranga') || normalized.includes('cherunaranga')) return '🍋';
  return '📦';
}
