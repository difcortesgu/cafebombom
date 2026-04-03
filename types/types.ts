export type UserRole = 'owner' | 'staff';
export type Unit = 'grams' | 'liters' | 'pieces';


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
};

export type SaleItemInput = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

export type Sale = {
  id: string;
  created_at: number;
  staff_name: string;
  total: number;
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
