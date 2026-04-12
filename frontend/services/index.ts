// Barrel export for all services
import { AccountsService } from './accounts';
import { AuthService } from './auth';
import { InventoryService } from './inventory';
import { PrintService } from './printing';
import { ProductsService } from './products';
import { SalesService } from './sales';
import { SetupService } from './setup';

// Create singleton instances
export const authService = new AuthService();
export const accountsService = new AccountsService();
export const inventoryService = new InventoryService();
export const printService = new PrintService();
export const productsService = new ProductsService();
export const salesService = new SalesService();
export const setupService = new SetupService();

// Export classes for testing/type purposes
export { AccountsService, AuthService, InventoryService, PrintService, ProductsService, SalesService, SetupService };

// Export types
    export type { AccountsService as IAccountsService, AuthService as IAuthService, InventoryService as IInventoryService, PrintService as IPrintService, ProductsService as IProductsService, SalesService as ISalesService, SetupService as ISetupService };

