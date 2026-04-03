import type { AccountsService } from '@/services/interfaces/accounts';
import type { AuthService } from '@/services/interfaces/auth';
import type { InventoryService } from '@/services/interfaces/inventory';
import type { ProductsService } from '@/services/interfaces/products';
import type { SalesService } from '@/services/interfaces/sales';
import { AccountsSqliteService } from '@/services/sqlite/accounts';
import { AuthSqliteService } from '@/services/sqlite/auth';
import { InventorySqliteService } from '@/services/sqlite/inventory';
import { ProductsSqliteService } from '@/services/sqlite/products';
import { SalesSqliteService } from '@/services/sqlite/sales';

export const authService: AuthService = new AuthSqliteService();
export const accountsService: AccountsService = new AccountsSqliteService();
export const inventoryService: InventoryService = new InventorySqliteService();
export const productsService: ProductsService = new ProductsSqliteService();
export const salesService: SalesService = new SalesSqliteService();
