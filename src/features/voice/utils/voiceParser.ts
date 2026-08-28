import type { VoiceConfirmation } from '../../../shared/lib/store';

// Helper to normalize Malayalam and Manglish terms to standard numbers
const parseNumber = (text: string): number => {
  const normalized = text.toLowerCase();
  
  // Digit mapping
  const match = normalized.match(/\b\d+(\.\d+)?\b/);
  if (match) return parseFloat(match[0]);
  
  // Word mapping (English, Malayalam, Manglish, Tamil)
  if (normalized.includes('one') || normalized.includes('oru') || normalized.includes('ഒരു') || normalized.includes('onnu') || normalized.includes('onn')) return 1;
  if (normalized.includes('two') || normalized.includes('rand') || normalized.includes('രണ്ട്') || normalized.includes('randu') || normalized.includes('dandi') || normalized.includes('dandu') || normalized.includes('rendu') || normalized.includes('ranti')) return 2;
  if (normalized.includes('three') || normalized.includes('moon') || normalized.includes('മൂന്ന്') || normalized.includes('moonu') || normalized.includes('moonnu')) return 3;
  if (normalized.includes('four') || normalized.includes('naal') || normalized.includes('നാല്') || normalized.includes('naalu') || normalized.includes('nalu') || normalized.includes('nal')) return 4;
  if (normalized.includes('five') || normalized.includes('anch') || normalized.includes('അഞ്ച്') || normalized.includes('anchu') || normalized.includes('anju')) return 5;
  if (normalized.includes('six') || normalized.includes('aar') || normalized.includes('ആറ്') || normalized.includes('aaru') || normalized.includes('aru')) return 6;
  if (normalized.includes('seven') || normalized.includes('ezh') || normalized.includes('ഏഴ്') || normalized.includes('ezhu') || normalized.includes('elu')) return 7;
  if (normalized.includes('eight') || normalized.includes('ett') || normalized.includes('എട്ട്') || normalized.includes('ettu')) return 8;
  if (normalized.includes('nine') || normalized.includes('ombath') || normalized.includes('ഒൻപത്') || normalized.includes('ombathu') || normalized.includes('onpathu') || normalized.includes('onpath')) return 9;
  if (normalized.includes('ten') || normalized.includes('path') || normalized.includes('പത്ത്') || normalized.includes('pathu')) return 10;
  
  return 1; // default to 1 if not specified
};

// List of supported product names in different formats
const PRODUCTS = [
  { id: 'tomato', names: ['tomato', 'tomatoes', 'thakkaali', 'thakkali', 'തക്കാളി', 'thakali'] },
  { id: 'potato', names: ['potato', 'potatoes', 'urulakkizhangu', 'urula', 'ഉരുളക്കിഴങ്ങ്', 'urulakilangu', 'kizhangu', 'kilangu'] },
  { id: 'apple', names: ['apple', 'apples', 'ആപ്പിൾ', 'aappil', 'aapil', 'aapadi', 'appil', 'aapili'] },
  { id: 'banana', names: ['banana', 'bananas', 'ethapazham', 'pazham', 'ഏത്തപ്പഴം', 'പഴം', 'vazhapazham', 'banan'] },
  { id: 'coconut', names: ['coconut', 'coconuts', 'thenga', 'തേങ്ങ', 'thengai'] },
  { id: 'spinach', names: ['spinach', 'cheera', 'ചീര', 'palak'] },
  { id: 'onion', names: ['onion', 'onions', 'savala', 'ullaari', 'ulli', 'ഉള്ളി', 'സവാള', 'chuvannulli', 'cheriyulli'] },
  { id: 'carrot', names: ['carrot', 'carrots', 'കാരറ്റ്', 'karat'] },
  { id: 'blueberry', names: ['blueberry', 'blueberries', 'ബ്ലൂബെറി'] }
];

const parseProduct = (text: string): { id: string; matchedName: string } | null => {
  const normalized = text.toLowerCase();
  for (const prod of PRODUCTS) {
    for (const name of prod.names) {
      if (normalized.includes(name)) {
        return { id: prod.id, matchedName: name };
      }
    }
  }
  return null;
};

// Normalize Malayalam/Manglish units
const parseUnit = (text: string, defaultUnit: string = 'kg'): string => {
  const normalized = text.toLowerCase();
  if (normalized.includes('kilo') || normalized.includes('kg') || normalized.includes('കിലോ') || normalized.includes('കിലോഗ്രാം')) return 'kg';
  if (normalized.includes('gram') || normalized.includes('ഗ്രാം') || normalized.includes('g')) return 'gram';
  if (normalized.includes('piece') || normalized.includes('പീസ്') || normalized.includes('എണ്ണം')) return 'piece';
  if (normalized.includes('bunch') || normalized.includes('കെട്ട്') || normalized.includes('spinach bunch')) return 'bunch';
  if (normalized.includes('litre') || normalized.includes('ലിറ്റർ') || normalized.includes('l')) return 'litre';
  return defaultUnit;
};

const translateToEnglish = (name: string): string => {
  const normalized = name.toLowerCase().trim();
  
  const dict: { [key: string]: string } = {
    // Tomato
    'തക്കാളി': 'Tomato',
    'thakkaali': 'Tomato',
    'thakkali': 'Tomato',
    'thakali': 'Tomato',
    
    // Potato
    'ഉരുളക്കിഴങ്ങ്': 'Potato',
    'urulakkizhangu': 'Potato',
    'urula': 'Potato',
    'urulakilangu': 'Potato',
    'kizhangu': 'Potato',
    'kilangu': 'Potato',
    
    // Apple
    'ആപ്പിൾ': 'Apple',
    'aappil': 'Apple',
    'aapil': 'Apple',
    'aapadi': 'Apple',
    'appil': 'Apple',
    'aapili': 'Apple',
    
    // Banana
    'ഏത്തപ്പഴം': 'Banana',
    'പഴം': 'Banana',
    'ethapazham': 'Banana',
    'pazham': 'Banana',
    'vazhapazham': 'Banana',
    
    // Coconut
    'തേങ്ങ': 'Coconut',
    'thenga': 'Coconut',
    'thengai': 'Coconut',
    
    // Spinach
    'ചീര': 'Spinach',
    'cheera': 'Spinach',
    'palak': 'Spinach',
    
    // Onion
    'ഉള്ളി': 'Onion',
    'സവാള': 'Onion',
    'savala': 'Onion',
    'ullaari': 'Onion',
    'ulli': 'Onion',
    'chuvannulli': 'Onion',
    'cheriyulli': 'Onion',
    
    // Carrot
    'കാരറ്റ്': 'Carrot',
    'karat': 'Carrot',
    
    // Strawberry
    'സ്ട്രോബെറി': 'Strawberry',
    'strawberry': 'Strawberry',

    // Blueberry
    'ബ്ലൂബെറി': 'Blueberry',
    'blueberry': 'Blueberry',
    'blueberries': 'Blueberry',
    
    // Mango
    'മാങ്ങ': 'Mango',
    'manga': 'Mango',
    
    // Orange
    'ഓറഞ്ച്': 'Orange',
    'orange': 'Orange',
    
    // Grapes
    'മുന്തിരി': 'Grapes',
    'munthiri': 'Grapes',
    'grape': 'Grapes',
    
    // Chilli
    'മുളക്': 'Chilli',
    'mulaku': 'Chilli',
    'chilli': 'Chilli',
    
    // Ginger
    'ഇഞ്ചി': 'Ginger',
    'inji': 'Ginger',
    
    // Garlic
    'വെളുത്തുള്ളി': 'Garlic',
    'veluthulli': 'Garlic',
    
    // Lemon
    'നാരങ്ങ': 'Lemon',
    'cherunaranga': 'Lemon',
    'naranga': 'Lemon',
    
    // Papaya
    'കപ്പളങ്ങ': 'Papaya',
    'omakka': 'Papaya',
    
    // Guava
    'പേരയ്ക്ക': 'Guava',
    'perakka': 'Guava'
  };

  if (dict[normalized]) return dict[normalized];

  for (const key of Object.keys(dict)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return dict[key];
    }
  }

  return name.charAt(0).toUpperCase() + name.slice(1);
};

const extractNewProductName = (text: string): string => {
  // Replace symbols like ₹, rs, rupees, etc.
  let cleaned = text.toLowerCase()
    .replace(/[0-9]+/g, '')
    .replace(/[₹$]/g, '')
    .replace(/\b(rs|rupees|roopa|roopaye|roopaykku|രൂപ|രൂപയ്ക്ക്|രൂപയ്ക്ക്ക്)\b/gi, '')
    .replace(/\b(kilo|kg|gram|g|piece|bunch|litre|l|കിലോ|കിലോഗ്രാം|പീസ്|ലിറ്റർ|എണ്ണം|കെട്ട്)\b/gi, '')
    .replace(/\b(add|new|create|register|item|puthiya|selling|price|vila|for|aakku|aakkuka|ആഡ്|ചെയ്യ|ചെയ്യുക|ഐറ്റം|പുതിയ|ചേർക്കുക|ചേർക്കൂ|കൂട്ടുക|വില|വിൽക്കുക|വിറ്റു|വിൽപ്പന|സെയിൽ|ആക്കുക|എണ്ണം)\b/gi, '');
    
  // Clean Malayalam suffixes like 'kku' (ക്ക്), 'in' (ന്റെ), 'il' (ൽ), 'um' (ഉം) at the end of words
  cleaned = cleaned.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
  
  // Split words and filter out empty / short words
  const words = cleaned.split(/\s+/).map(w => {
    let word = w;
    if (word.endsWith('ക്ക്') || word.endsWith('ക്ക')) {
      word = word.slice(0, -2);
    }
    if (word.endsWith('ഇൽ') || word.endsWith('ൽ')) {
      word = word.slice(0, -2);
    }
    if (word.endsWith('ന്റെ')) {
      word = word.slice(0, -3);
    }
    if (word.endsWith('kku') || word.endsWith('inte') || word.endsWith('il')) {
      word = word.slice(0, -3);
    }
    return word.trim();
  }).filter(w => w.length > 1);

  if (words.length > 0) {
    const name = words[0];
    return translateToEnglish(name);
  }
  
  return 'New Item';
};

const replaceWordsWithNumbers = (text: string): string => {
  let result = text.toLowerCase();
  
  const mappings = [
    { words: ['one', 'oru', 'oru', 'ഒരു', 'onnu', 'onn'], digit: '1' },
    { words: ['two', 'rand', 'രണ്ട്', 'randu', 'dandi', 'dandu', 'rendu', 'ranti', 'ടു', 'തു', 'too', 'tu'], digit: '2' },
    { words: ['three', 'moon', 'മൂന്ന്', 'moonu', 'moonnu'], digit: '3' },
    { words: ['four', 'naal', 'നാല്', 'naalu', 'nalu', 'nal'], digit: '4' },
    { words: ['five', 'anch', 'അഞ്ച്', 'anchu', 'anju'], digit: '5' },
    { words: ['six', 'aar', 'ആറ്', 'aaru', 'aru'], digit: '6' },
    { words: ['seven', 'ezh', 'ഏഴ്', 'ezhu', 'elu'], digit: '7' },
    { words: ['eight', 'ett', 'എട്ട്', 'ettu'], digit: '8' },
    { words: ['nine', 'ombath', 'ഒൻപത്', 'ombathu', 'onpathu', 'onpath'], digit: '9' },
    { words: ['ten', 'path', 'പത്ത്', 'pathu'], digit: '10' }
  ];

  for (const map of mappings) {
    for (const word of map.words) {
      const isMalayalam = /[\u0D00-\u0D7F]/.test(word);
      if (isMalayalam) {
        result = result.split(word).join(` ${map.digit} `);
      } else {
        const regex = new RegExp(`\\b${word}\\b`, 'g');
        result = result.replace(regex, ` ${map.digit} `);
      }
    }
  }
  
  return result;
};

export const parseVoiceCommand = (text: string): VoiceConfirmation | null => {
  if (!text || text.trim() === '') return null;
  // Clean zero-width characters and spaces commonly appended by Malayalam input keyboards
  const cleaned = text.replace(/[\u200B-\u200D\uFEFF]/g, '');
  const normalized = replaceWordsWithNumbers(cleaned);
  
  // 1. Check for Query Intents (e.g., "how much apple stock", "today's profit", "today ethra sale aayi")
  const isQuery = 
    normalized.includes('how much') || 
    normalized.includes('ethrayundu') || 
    normalized.includes('ethra') || 
    normalized.includes('എത്ര') || 
    normalized.includes('today') || 
    normalized.includes('innu') || 
    normalized.includes('ഇന്ന്') || 
    normalized.includes('innathe') ||
    normalized.includes('profit') || 
    normalized.includes('sales') ||
    normalized.includes('restock') ||
    normalized.includes('re stock') ||
    normalized.includes('chothikka') ||
    normalized.includes('labham') ||
    normalized.includes('ലാഭം');

  if (isQuery) {
    const product = parseProduct(normalized);
    if (product && (normalized.includes('stock') || normalized.includes('സ്റ്റോക്ക്') || normalized.includes('ബാക്കി'))) {
      return {
        type: 'query',
        productName: product.id.charAt(0).toUpperCase() + product.id.slice(1),
        queryResult: { type: 'product_stock', productId: product.id }
      };
    }
    
    if (normalized.includes('profit') || normalized.includes('ലാഭം') || normalized.includes('labham')) {
      return {
        type: 'query',
        productName: 'Business Report',
        queryResult: { type: 'today_profit' }
      };
    }
    
    if (normalized.includes('sale') || normalized.includes('വിറ്റു') || normalized.includes('vittu') || normalized.includes('veetu') || normalized.includes('വിൽപ്പന')) {
      return {
        type: 'query',
        productName: 'Business Report',
        queryResult: { type: 'today_sales' }
      };
    }

    if (normalized.includes('restock') || normalized.includes('കുറവ്') || normalized.includes('low stock') || normalized.includes('തീരാൻ')) {
      return {
        type: 'query',
        productName: 'Low Stock Report',
        queryResult: { type: 'low_stock' }
      };
    }
    
    return {
      type: 'query',
      productName: 'Business Summary',
      queryResult: { type: 'general_query' }
    };
  }

  // 2. Check for Price Update Intent (e.g., "Apple price 200", "vila 200 aakku")
  const isPriceUpdate = 
    normalized.includes('price') || 
    normalized.includes('vila') || 
    normalized.includes('വില') || 
    normalized.includes('aakku') || 
    normalized.includes('aakkuka') || 
    normalized.includes('ആക്കുക') ||
    normalized.includes('koottu') ||
    normalized.includes('kurakku') ||
    normalized.includes('mattuka');

  if (isPriceUpdate) {
    const product = parseProduct(normalized);
    if (product) {
      // Find the price in the numbers. Look for number after "price", "vila", "rupees", "roopa"
      const numbers = normalized.match(/\b\d+(\.\d+)?\b/g);
      const newPrice = numbers ? parseFloat(numbers[numbers.length - 1]) : 0;
      
      if (newPrice > 0) {
        return {
          type: 'price_update',
          productName: product.id.charAt(0).toUpperCase() + product.id.slice(1),
          productId: product.id,
          newPrice: newPrice
        };
      }
    }
  }

  // 3. Check for Stock Addition Intent (e.g., "Add 20 kilo tomatoes", "20 kilo cherkkuka")
  const isStockAdd = 
    normalized.includes('add') || 
    normalized.includes('ആഡ്') || 
    normalized.includes('bought') || 
    normalized.includes('buy') || 
    normalized.includes('purchase') || 
    normalized.includes('purchased') || 
    normalized.includes('vangi') || 
    normalized.includes('vaangi') || 
    normalized.includes('vaangichu') || 
    normalized.includes('medichu') || 
    normalized.includes('മേടിച്ചു') || 
    normalized.includes('വാങ്ങി') || 
    normalized.includes('വാങ്ങിച്ചു') || 
    normalized.includes('cherkkuka') || 
    normalized.includes('ചേർക്കുക') || 
    normalized.includes('koottuka') || 
    normalized.includes('കൂട്ടുക') ||
    normalized.includes('stock koottu') ||
    normalized.includes('stock add') ||
    normalized.includes('cherkku') ||
    normalized.includes('cherthu') ||
    normalized.includes('ചേർത്തു') ||
    normalized.includes('vechu') ||
    normalized.includes('kayatti') ||
    normalized.includes('inward');

  if (isStockAdd) {
    const product = parseProduct(normalized);
    if (product) {
      const numbers = normalized.match(/\b\d+(\.\d+)?\b/g) || [];
      let quantity = 1;
      let price = 0;

      if (numbers.length === 1) {
        const hasPriceIndicator = 
          cleaned.includes('₹') || 
          cleaned.includes('rs') || 
          cleaned.includes('rupees') || 
          cleaned.includes('roopa') || 
          cleaned.includes('രൂപ') ||
          cleaned.includes('for') ||
          cleaned.includes('വില');
        if (hasPriceIndicator) {
          price = parseFloat(numbers[0]);
          quantity = 1;
        } else {
          quantity = parseFloat(numbers[0]);
          price = 0;
        }
      } else if (numbers.length >= 2) {
        quantity = parseFloat(numbers[0]);
        price = parseFloat(numbers[1]);
      }

      const unit = parseUnit(normalized);

      return {
        type: 'stock_add',
        productName: product.id.charAt(0).toUpperCase() + product.id.slice(1),
        productId: product.id,
        quantity: quantity,
        unit: unit,
        price: price
      };
    }
  }

  // 5. Check for New Product Creation Intent (e.g. "Add new item Strawberry 10 kg for 140", "10 kg strawberry add cheyya item")
  const isCreateIntent = 
    normalized.includes('new item') || 
    normalized.includes('create item') || 
    normalized.includes('register item') ||
    normalized.includes('പുതിയ ഐറ്റം') ||
    normalized.includes('ആഡ് ചെയ്യ ഐറ്റം') ||
    (normalized.includes('item') && (normalized.includes('add') || normalized.includes('cherkku') || normalized.includes('cherkkuka'))) ||
    (normalized.includes('ഐറ്റം') && (normalized.includes('ആഡ്') || normalized.includes('ചേർക്കുക') || normalized.includes('ചേർക്കൂ')));

  if (isCreateIntent) {
    const numbers = normalized.match(/\b\d+(\.\d+)?\b/g) || [];
    let quantity = 1;
    let price = 0;

    if (numbers.length === 1) {
      const hasPriceIndicator = 
        cleaned.includes('₹') || 
        cleaned.includes('rs') || 
        cleaned.includes('rupees') || 
        cleaned.includes('roopa') || 
        cleaned.includes('രൂപ');
      if (hasPriceIndicator) {
        price = parseFloat(numbers[0]);
        quantity = 1;
      } else {
        quantity = parseFloat(numbers[0]);
        price = 0;
      }
    } else if (numbers.length >= 2) {
      quantity = parseFloat(numbers[0]);
      price = parseFloat(numbers[1]);
    }

    const unit = parseUnit(normalized, 'kg');
    const productName = extractNewProductName(normalized);

    return {
      type: 'product_create',
      productName: productName,
      quantity: quantity,
      unit: unit,
      price: price // selling price for new product
    };
  }

  // 4. Fallback to Sales Intent (default behavior if user says e.g. "Apple 2 kilo vittu", "1 kilo banana sold for 120")
  const product = parseProduct(normalized);
  if (product) {
    const numbers = normalized.match(/\b\d+(\.\d+)?\b/g) || [];
    let quantity = 1;
    let price = 0;

    if (numbers.length === 1) {
      const hasPriceIndicator = 
        cleaned.includes('₹') || 
        cleaned.includes('rs') || 
        cleaned.includes('rupees') || 
        cleaned.includes('roopa') || 
        cleaned.includes('രൂപ') ||
        cleaned.includes('for') ||
        cleaned.includes('വില');
      if (hasPriceIndicator) {
        price = parseFloat(numbers[0]);
        quantity = 1;
      } else {
        quantity = parseFloat(numbers[0]);
        price = 0;
      }
    } else if (numbers.length >= 2) {
      quantity = parseFloat(numbers[0]);
      price = parseFloat(numbers[1]);
    }

    const unit = parseUnit(normalized);

    return {
      type: 'sale',
      productName: product.id.charAt(0).toUpperCase() + product.id.slice(1),
      productId: product.id,
      quantity: quantity,
      unit: unit,
      price: price
    };
  }

  return null;
};
