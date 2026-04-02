export type UserRole = 'owner' | 'staff';

export type User = {
  id: number;
  name: string;
  role: UserRole;
};

export type Ingredient = {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  low_stock_threshold: number;
  supplier_id: number | null;
};

export type Supplier = {
  id: number;
  name: string;
  phone: string | null;
  notes: string | null;
};

export type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
};

export type SaleItemInput = {
  productId: number;
  quantity: number;
  unitPrice: number;
};

export type Sale = {
  id: number;
  created_at: number;
  staff_name: string;
  total: number;
};

export type Expense = {
  id: number;
  date: number;
  category: string;
  amount: number;
  description: string | null;
};

export type Employee = {
  id: number;
  name: string;
  salary_type: 'hourly' | 'monthly';
  rate: number;
};

export type PayrollEntry = {
  id: number;
  employee_id: number;
  period_start: number;
  period_end: number;
  amount: number;
};
