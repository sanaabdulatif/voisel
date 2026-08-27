import { supabase } from '../lib/supabase';

export interface Product {
  id: string;
  shop_id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  purchase_price: number;
  selling_price: number;
  low_stock_threshold: number;
  image_url: string | null;
  created_at: string;
}

export interface Sale {
  id: string;
  shop_id: string;
  product_id: string;
  quantity_sold: number;
  selling_price: number;
  total_amount: number;
  profit: number;
  created_at: string;
  voisel_products?: {
    name: string;
    unit: string;
    purchase_price: number;
    category: string;
  };
}

export interface VoiselShop {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export const inventoryService = {
  // Shops Management
  async getShops(ownerId: string): Promise<VoiselShop[]> {
    const { data, error } = await supabase
      .from('voisel_shops')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  async createShop(name: string, ownerId: string): Promise<VoiselShop> {
    const { data, error } = await supabase
      .from('voisel_shops')
      .insert({ name, owner_id: ownerId })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateShop(id: string, name: string): Promise<VoiselShop> {
    const { data, error } = await supabase
      .from('voisel_shops')
      .update({ name })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteShop(id: string): Promise<void> {
    // 1. Delete associated sales records
    await supabase.from('voisel_sales').delete().eq('shop_id', id);
    // 2. Delete associated products
    await supabase.from('voisel_products').delete().eq('shop_id', id);
    // 3. Delete the shop itself
    const { error } = await supabase
      .from('voisel_shops')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async prepopulateProducts(shopId: string, productsList: any[]): Promise<Product[]> {
    if (!productsList || productsList.length === 0) return [];

    const { data: createdProducts, error: productsError } = await supabase
      .from('voisel_products')
      .insert(productsList)
      .select();
      
    if (productsError) throw productsError;
    
    if (createdProducts && createdProducts.length > 0) {
      const stockLogs = createdProducts.map((prod) => ({
        product_id: prod.id,
        quantity: prod.quantity,
        purchase_price: prod.purchase_price
      }));
      
      await supabase.from('voisel_stock_records').insert(stockLogs);
    }
    return createdProducts;
  },

  // Products Inventory Management
  async getProducts(shopId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('voisel_products')
      .select('*')
      .eq('shop_id', shopId)
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  async addProduct(productData: Omit<Product, 'id' | 'created_at' | 'quantity'> & { initial_quantity: number }): Promise<Product> {
    const { data: product, error: productError } = await supabase
      .from('voisel_products')
      .insert({
        shop_id: productData.shop_id,
        name: productData.name,
        category: productData.category,
        unit: productData.unit,
        quantity: productData.initial_quantity,
        purchase_price: productData.purchase_price,
        selling_price: productData.selling_price,
        low_stock_threshold: productData.low_stock_threshold,
        image_url: productData.image_url
      })
      .select()
      .single();

    if (productError) throw productError;

    if (productData.initial_quantity > 0) {
      const { error: stockError } = await supabase
        .from('voisel_stock_records')
        .insert({
          product_id: product.id,
          quantity: productData.initial_quantity,
          purchase_price: productData.purchase_price
        });
        
      if (stockError) throw stockError;
    }

    return product;
  },

  async updateProduct(id: string, productData: Partial<Product>): Promise<Product> {
    const { data, error } = await supabase
      .from('voisel_products')
      .update(productData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase
      .from('voisel_products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async recordStockAddition(productId: string, quantity: number, purchasePrice: number): Promise<void> {
    const { error } = await supabase
      .from('voisel_stock_records')
      .insert({
        product_id: productId,
        quantity: quantity,
        purchase_price: purchasePrice
      });

    if (error) throw error;
  },

  async recordSale(
    shopId: string,
    productId: string,
    quantitySold: number,
    sellingPrice: number,
    totalAmount: number,
    profit: number
  ): Promise<Sale> {
    const { data, error } = await supabase
      .from('voisel_sales')
      .insert({
        shop_id: shopId,
        product_id: productId,
        quantity_sold: quantitySold,
        selling_price: sellingPrice,
        total_amount: totalAmount,
        profit: profit
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getSales(shopId: string): Promise<Sale[]> {
    const { data, error } = await supabase
      .from('voisel_sales')
      .select('*, voisel_products(name, unit, purchase_price, category)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as any) || [];
  }
};
