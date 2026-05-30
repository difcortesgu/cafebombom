// Barrel export for all services
import { AccountsService } from './accounts';
import { AuthService } from './auth';
import { InventoryService } from './inventory';
import { PaymentMethodsService } from './payment-methods';
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
export const paymentMethodsService = new PaymentMethodsService();
