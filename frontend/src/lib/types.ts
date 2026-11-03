export type Product = {
  id: string;
  product_code: string;
  name: string;
  price: number;
  stock: number;
  created_at: string;
  updated_at: string;
};

export type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
};

export type OrderStatus = 'PENDING' | 'PAID' | 'CANCELLED';

export type OrderSummary = {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  item_count: number;
  customer: { id: string; name: string };
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  product_id: string;
  product_code: string;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

export type OrderDetail = {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  item_count: number;
  customer: { id: string; name: string; email: string | null; phone: string | null };
  items: OrderItem[];
  created_at: string;
  updated_at: string;
};
