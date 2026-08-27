import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '../services/inventoryService';
import type { Product } from '../services/inventoryService';

export function useProducts(shopId?: string) {
  return useQuery({
    queryKey: ['products', shopId],
    queryFn: () => (shopId ? inventoryService.getProducts(shopId) : Promise.resolve([])),
    enabled: !!shopId,
  });
}

export function useSales(shopId?: string) {
  return useQuery({
    queryKey: ['sales', shopId],
    queryFn: () => (shopId ? inventoryService.getSales(shopId) : Promise.resolve([])),
    enabled: !!shopId,
  });
}

export function useAddProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inventoryService.addProduct,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', variables.shop_id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', variables.shop_id] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product>; shopId: string }) => 
      inventoryService.updateProduct(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', variables.shopId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', variables.shopId] });
    },
  });
}

export function useAddStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, quantity, purchasePrice }: { productId: string; quantity: number; purchasePrice: number; shopId: string }) => 
      inventoryService.recordStockAddition(productId, quantity, purchasePrice),
    onSuccess: (_, variables) => {
      // Invalidate both products (since quantity updates) and dashboard
      queryClient.invalidateQueries({ queryKey: ['products', variables.shopId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', variables.shopId] });
    },
  });
}

export function useRecordSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ 
      shopId, 
      productId, 
      quantitySold, 
      sellingPrice, 
      totalAmount, 
      profit 
    }: { 
      shopId: string; 
      productId: string; 
      quantitySold: number; 
      sellingPrice: number; 
      totalAmount: number; 
      profit: number; 
    }) => 
      inventoryService.recordSale(shopId, productId, quantitySold, sellingPrice, totalAmount, profit),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', variables.shopId] });
      queryClient.invalidateQueries({ queryKey: ['sales', variables.shopId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', variables.shopId] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; shopId: string }) => 
      inventoryService.deleteProduct(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', variables.shopId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', variables.shopId] });
    },
  });
}
