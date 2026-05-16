import { useLocalSearchParams, useRouter } from 'expo-router';

import { SaleFormPanel } from '@/components/sale-form-panel';

export default function SaleFormScreen() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const router = useRouter();
  const editingOrderId = typeof orderId === 'string' && orderId.length > 0 ? orderId : null;
  return <SaleFormPanel orderId={editingOrderId} onComplete={() => router.back()} />;
}
