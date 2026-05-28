import { AccountsSqliteService } from './accounts';
import { InventorySqliteService } from './inventory';
import { PaymentMethodsSqliteService } from './payment-methods';
import { ProductsSqliteService } from './products';
import { SalesSqliteService } from './sales';
import { SetupSqliteService } from './setup';
import { UsersSqliteService } from './users';

export const salesService = new SalesSqliteService();
export const productsService = new ProductsSqliteService();
export const inventoryService = new InventorySqliteService();
export const accountsService = new AccountsSqliteService();
export const setupService = new SetupSqliteService();
export const usersService = new UsersSqliteService();
export const paymentMethodsService = new PaymentMethodsSqliteService();
