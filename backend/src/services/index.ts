import { AccountsSqliteService } from '@/services/accounts';
import { InventorySqliteService } from '@/services/inventory';
import { PaymentMethodsSqliteService } from '@/services/payment-methods';
import { ProductsSqliteService } from '@/services/products';
import { SalesSqliteService } from '@/services/sales';
import { SetupSqliteService } from '@/services/setup';
import { UsersSqliteService } from '@/services/users';

export const salesService = new SalesSqliteService();
export const productsService = new ProductsSqliteService();
export const inventoryService = new InventorySqliteService();
export const accountsService = new AccountsSqliteService();
export const setupService = new SetupSqliteService();
export const usersService = new UsersSqliteService();
export const paymentMethodsService = new PaymentMethodsSqliteService();
