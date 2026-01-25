import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import type { CartItemInput, CartOrderDetails, CartQuote, CartState, DeliveryLocationInput } from '@/types/cartPhase4';
import { cartService } from '@/services/cartService';
import { cartCheckoutService } from '@/services/cartCheckoutService';

interface CartContextType {
  state: CartState;
  quote: CartQuote | null;
  isQuoting: boolean;
  quoteError: string | null;
  addItem: (item: CartItemInput) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  setCreditsToApply: (amount: number) => void;
  setDeliveryLocation: (location?: DeliveryLocationInput) => void;
  setOrderDetails: (itemId: string, details: CartOrderDetails) => void;
  refreshQuote: () => Promise<void>;
  clearCart: () => void;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<CartState>(cartService.getState());
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const itemCount = useMemo(() => state.items.length, [state.items]);

  const addItem = (item: CartItemInput) => {
    setState(cartService.addItem(item));
  };

  const removeItem = (itemId: string) => {
    setState(cartService.removeItem(itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    setState(cartService.updateItemQuantity(itemId, quantity));
  };

  const setCreditsToApply = (amount: number) => {
    setState(cartService.updateCreditsToApply(amount));
  };

  const setDeliveryLocation = (location?: DeliveryLocationInput) => {
    const normalizeAddress = (value: unknown) => {
      const s = typeof value === 'string' ? value.trim() : '';
      return s ? s : undefined;
    };

    const current = state.deliveryLocation;
    const next = location;

    const sameLat = current?.latitude === next?.latitude;
    const sameLng = current?.longitude === next?.longitude;
    const sameAddr = normalizeAddress(current?.address) === normalizeAddress(next?.address);

    // Avoid redundant state updates: prevents quote loops when callers repeatedly
    // set the same coordinates (e.g., Checkout syncing selected address coords).
    if (sameLat && sameLng && sameAddr) return;

    setState(cartService.setDeliveryLocation(location));
  };

  const setOrderDetails = (itemId: string, details: CartOrderDetails) => {
    setState(cartService.setOrderDetails(itemId, details));
  };

  const clearCart = () => {
    setState(cartService.clearCart());
    setQuote(null);
    setQuoteError(null);
  };

  const refreshQuote = async () => {
    if (!state.items.length) {
      setQuote(null);
      setQuoteError(null);
      return;
    }

    setIsQuoting(true);
    setQuoteError(null);
    try {
      const data = await cartCheckoutService.quoteCart(state);
      setQuote(data);
    } catch (err) {
      setQuote(null);
      setQuoteError(err instanceof Error ? err.message : 'Failed to quote cart');
    } finally {
      setIsQuoting(false);
    }
  };

  useEffect(() => {
    // Keep totals server-truth. Quote whenever cart inputs change.
    void refreshQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.items, state.creditsToApply, state.deliveryLocation?.latitude, state.deliveryLocation?.longitude]);

  return (
    <CartContext.Provider value={{
      state,
      quote,
      isQuoting,
      quoteError,
      addItem,
      removeItem,
      updateQuantity,
      setCreditsToApply,
      setDeliveryLocation,
      setOrderDetails,
      refreshQuote,
      clearCart,
      itemCount,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
