import type { AccountsService } from '@/services/interfaces/accounts';
import type { AuthService } from '@/services/interfaces/auth';
import type { InventoryService } from '@/services/interfaces/inventory';
import type { ProductsService } from '@/services/interfaces/products';
import type { SalesService } from '@/services/interfaces/sales';
import { AccountsWebService } from '@/services/web/accounts';
import { AuthWebService } from '@/services/web/auth';
import { InventoryWebService } from '@/services/web/inventory';
import { ProductsWebService } from '@/services/web/products';
import { SalesWebService } from '@/services/web/sales';

export const authService: AuthService = new AuthWebService();
export const accountsService: AccountsService = new AccountsWebService();
export const inventoryService: InventoryService = new InventoryWebService();
export const productsService: ProductsService = new ProductsWebService();
export const salesService: SalesService = new SalesWebService();