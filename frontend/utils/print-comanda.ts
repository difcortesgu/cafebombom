import type { PaymentModalBusiness } from '@/components/order-panel/types';
import { printService, salesService } from '@/services';
import { useProductsStore } from '@/stores/products';
import type { SaleItemDetail, SalePricingSummary } from '@/types/sales';
import type { Sale } from '@/types/types';
import { buildReceiptData } from '@/utils/receipt';
import { buildFallbackPricingSummary } from '@/utils/sale-pricing';

type PrintComandaOptions = {
  /** Pre-loaded sale items, to avoid an extra fetch when already available. */
  items?: SaleItemDetail[];
  /** Pre-loaded pricing summary; falls back to a computed summary when absent. */
  pricing?: SalePricingSummary | null;
};

/**
 * Builds the kitchen comanda for a sale and sends it to the printer.
 * Errors are swallowed so a failed print never interrupts the kitchen flow;
 * the visible "Imprimir comanda" button lets staff retry.
 */
export async function printSaleComanda(
  sale: Sale,
  business: PaymentModalBusiness,
  options: PrintComandaOptions = {},
): Promise<void> {
  try {
    // Ingredient names (for "Sin: ...") are resolved from the products store at
    // print time, so make sure recipe data is loaded before building the comanda.
    const productsState = useProductsStore.getState();
    if (productsState.productIngredients.length === 0) {
      await productsState.hydrate();
    }

    const items = options.items && options.items.length > 0
      ? options.items
      : await salesService.getSaleItems(sale.id);
    const pricing = options.pricing ?? buildFallbackPricingSummary(sale, items);

    const receipt = buildReceiptData({
      sale,
      items,
      pricing,
      business: {
        name: business.name,
        address: business.address,
        phone: business.phone,
        nit: business.nit,
        logoUri: business.logoUri,
        logoRasterUrl: business.logoRasterUrl ?? null,
        footerMessage: business.footerMessage,
      },
      taxConfig: {
        label: 'IVA',
        rate: business.taxRate,
        inclusive: true,
      },
      paperWidth: business.paperWidth,
    });

    await printService.printComanda(receipt, {
      name: business.printerDeviceName ?? undefined,
      address: business.printerDeviceAddress ?? undefined,
    });
  } catch {
    // Silently ignore comanda print errors to not interrupt the kitchen flow.
  }
}
