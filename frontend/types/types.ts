export type UserRole = 'owner' | 'staff';
export type Unit = string;
export type DiscountType = 'percentage' | 'fixed';
export type DiscountScope = 'product' | 'global';
export type TableType = 'dine-in' | 'to-go' | 'delivery';
export type PaymentMethod = 'cash' | 'card' | 'transfer';
export type OrderStatus = 'draft' | 'in-progress' | 'ready' | 'completed' | 'cancelled';


export type User = {
  id: string;
  name: string;
  role: UserRole;
};

export type Ingredient = {
  id: string;
  name: string;
  unit: Unit;
  quantity: number;
  low_stock_threshold: number;
  supplier_id: string | null;
};

export type IngredientUnit = {
  id: string;
  name: string;
};

export type Supplier = {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  imageUri: string | null;
  additionalIngredients: ProductAdditionalIngredientOption[];
};

export type ProductAdditionalIngredientOption = {
  ingredientId: string;
  ingredientName: string;
  quantityUsed: number;
  additionalPrice: number;
};

export type SaleItemAdditionalIngredientInput = {
  ingredientId: string;
  quantity: number;
};

export type Discount = {
  id: string;
  name: string;
  scope: DiscountScope;
  productId: string | null;
  type: DiscountType;
  value: number;
  startsAt: number;
  endsAt: number | null;
  isActive: boolean;
};

export type SaleItemInput = {
  productId: string;
  quantity: number;
  unitPrice: number;
  observation?: string | null;
  removedIngredientIds?: string[];
  additionalIngredients?: SaleItemAdditionalIngredientInput[];
};

export type Sale = {
  id: string;
  created_at: number;
  staff_name: string;
  total: number;
  table_name: string;
  payment_method: PaymentMethod | null;
  status: OrderStatus;
  ready_at?: number | null;
  paid_at?: number | null;
  cancelled_at?: number | null;
};

export type RestaurantTable = {
  id: string;
  name: string;
  table_type: TableType;
  created_at: number;
};

export type Expense = {
  id: string;
  date: number;
  category: string;
  amount: number;
  description: string | null;
};

export type Employee = {
  id: string;
  name: string;
  salary_type: 'hourly' | 'monthly';
  rate: number;
};

export type PayrollEntry = {
  id: string;
  employee_id: string;
  period_start: number;
  period_end: number;
  amount: number;
};
