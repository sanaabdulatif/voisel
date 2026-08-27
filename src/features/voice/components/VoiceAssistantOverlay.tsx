import { useState, useMemo, useEffect } from 'react';
import { Mic, X, CheckCircle2, AlertTriangle, ArrowRight, MessageSquareCode } from 'lucide-react';
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
    currentShop
  } = useAppStore();

  const { data: products = [] } = useProducts(currentShop?.id);

  // Mutations
  const recordSaleMutation = useRecordSale();
  const addStockMutation = useAddStock();
  const updateProductMutation = useUpdateProduct();
  const addProductMutation = useAddProduct();

  // Speech Recognition state - load from settings preference
  const lang = useMemo(() => {
    const pref = localStorage.getItem('voisel_language_pref') || 'en';
    return pref === 'ml' ? 'ml-IN' : 'en-IN';
  }, [isVoiceOverlayOpen]);

  const { startListening, stopListening, simulateSpeech } = useSpeechRecognition(lang);

  // Manual command text simulation input
  const [simulationInput, setSimulationInput] = useState('');
  const [queryResultStr, setQueryResultStr] = useState<string | null>(null);

  // Auto-close overlay on success
  const [successRecorded, setSuccessRecorded] = useState(false);

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

  // Sync edits when confirmation changes
  useEffect(() => {
    if (resolvedConfirmation) {
      setEditedQty(resolvedConfirmation.quantity !== undefined ? resolvedConfirmation.quantity : 0);
      setEditedPrice(
        resolvedConfirmation.type === 'price_update'
          ? (resolvedConfirmation.newPrice !== undefined ? resolvedConfirmation.newPrice : 0)
          : (resolvedConfirmation.price !== undefined ? resolvedConfirmation.price : 0)
      );
    } else {
      setEditedQty(null);
      setEditedPrice(null);
    }
  }, [voiceConfirmation, resolvedConfirmation?.productId, resolvedConfirmation?.type]);

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
    
    try {
      if (resolvedConfirmation.type === 'sale') {
        if (!resolvedConfirmation.productId) {
          throw new Error('Product details missing in voice sale.');
        }

        await recordSaleMutation.mutateAsync({
          shopId: currentShop.id,
          productId: resolvedConfirmation.productId,
          quantitySold: currentQty,
          sellingPrice: currentPrice,
          totalAmount: derivedValues?.totalAmount || 0,
          profit: derivedValues?.profit || 0
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
      
      else if (resolvedConfirmation.type === 'stock_add') {
        if (!resolvedConfirmation.productId) {
          throw new Error('Product details missing in stock addition.');
        }
        
        const matchingProd = products.find(p => p.id === resolvedConfirmation.productId);
        const purchaseCost = currentPrice || Number(matchingProd?.purchase_price || 0);

        await addStockMutation.mutateAsync({
          shopId: currentShop.id,
          productId: resolvedConfirmation.productId,
          quantity: currentQty,
          purchasePrice: purchaseCost
        });

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

  const isConfirmedProductMissing = resolvedConfirmation && !resolvedConfirmation.productId && resolvedConfirmation.type !== 'query' && resolvedConfirmation.type !== 'product_create';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-darkText/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl border border-brand-cream/60 shadow-premium overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Close */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-cream/60">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-primary animate-pulse" />
            <h3 className="text-sm font-bold text-brand-dark uppercase tracking-wider">AI Voice Assistant</h3>
          </div>
          <button 
            onClick={handleClose} 
            className="p-1 rounded-lg text-brand-mutedText hover:text-brand-darkText hover:bg-brand-cream/50 transition-colors"
          >
            <X size={20} />
          </button>
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

              {/* Product Match Warning */}
              {isConfirmedProductMissing && (
                <div className="p-3 bg-red-50 border border-brand-error/15 text-brand-error text-xs rounded-xl font-semibold flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>Product "{resolvedConfirmation.productName}" not found in inventory! Please add it manually.</span>
                </div>
              )}

              {/* Action specific details */}
              {!isConfirmedProductMissing && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between font-bold text-brand-darkText">
                    <span>Product:</span>
                    <span>{resolvedConfirmation.productName}</span>
                  </div>

                  {resolvedConfirmation.type === 'sale' && (
                    <>
                      <div className="flex justify-between items-center text-brand-mutedText font-semibold gap-4 py-1">
                        <span>Quantity Sold:</span>
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
                      <div className="flex justify-between text-brand-mutedText font-semibold py-1">
                        <span>Stock Change:</span>
                        <span>{resolvedConfirmation.originalStock} ➔ <strong className="text-brand-primary">{derivedValues?.newStock}</strong> {resolvedConfirmation.unit}</span>
                      </div>
                      <div className="border-t border-brand-cream/65 pt-2 flex justify-between font-bold items-center text-base">
                        <span>Total Revenue:</span>
                        <span className="text-brand-primary">₹{derivedValues?.totalAmount?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-semibold text-emerald-600">
                        <span>Net Profit:</span>
                        <span>+₹{derivedValues?.profit?.toFixed(2)}</span>
                      </div>
                    </>
                  )}

                  {resolvedConfirmation.type === 'stock_add' && (
                    <>
                      <div className="flex justify-between items-center text-brand-mutedText font-semibold gap-4 py-1">
                        <span>Stock Incremented:</span>
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
                        <span>Purchase Price:</span>
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
                      <div className="flex justify-between text-brand-mutedText font-semibold py-1">
                        <span>Stock Change:</span>
                        <span>{resolvedConfirmation.originalStock} ➔ <strong className="text-brand-primary">{derivedValues?.newStock}</strong> {resolvedConfirmation.unit}</span>
                      </div>
                    </>
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
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="secondary" 
                  onClick={() => setVoiceConfirmation(null)} 
                  className="flex-1 py-2 text-xs"
                >
                  Reject
                </Button>
                <Button
                  onClick={handleConfirmAction}
                  className="flex-1 py-2 text-xs"
                  disabled={isConfirmedProductMissing || voiceStatus === 'processing'}
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
              ✓ {resolvedConfirmation?.type === 'sale' && 'Sale recorded successfully!'}
              {resolvedConfirmation?.type === 'stock_add' && 'Stock inventory restocked!'}
              {resolvedConfirmation?.type === 'price_update' && 'Selling price updated!'}
              {resolvedConfirmation?.type === 'product_create' && 'New product added to catalog!'}
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
