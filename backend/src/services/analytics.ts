import type {
  DashboardPaymentBreakdown,
  DashboardSalesSummary,
  DashboardStatusCounts,
  DashboardTopProduct,
  DashboardTrendBucket,
  DashboardTrendPoint,
} from '@/types/sales';
import type { OrderStatus, PaymentMethod } from '@/types/types';

type DashboardSaleRecord = {
  id: string;
  created_at: number;
  total: number;
  payment_method: PaymentMethod | null;
  status: OrderStatus;
};

type DashboardSaleItemRecord = {
  sale_id: string;
  product_name: string;
  quantity: number;
  line_subtotal: number;
  discount_amount: number;
};

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'transfer'];

export const RECOGNIZED_REVENUE_STATUSES: OrderStatus[] = ['completed'];

function createStatusCounts(): DashboardStatusCounts {
  return {
    draft: 0,
    'in-progress': 0,
    ready: 0,
    completed: 0,
    cancelled: 0,
  };
}

function getBucketStartUnix(timestamp: number, bucket: DashboardTrendBucket) {
  const date = new Date(timestamp * 1000);
  if (bucket === 'hour') {
    date.setMinutes(0, 0, 0);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return Math.floor(date.getTime() / 1000);
}

function getBucketStepSeconds(bucket: DashboardTrendBucket) {
  return bucket === 'hour' ? 60 * 60 : 24 * 60 * 60;
}

function buildTrendBuckets(startUnix: number, endUnix: number, bucket: DashboardTrendBucket) {
  const buckets: DashboardTrendPoint[] = [];
  const bucketStart = getBucketStartUnix(startUnix, bucket);
  const step = getBucketStepSeconds(bucket);

  for (let cursor = bucketStart; cursor < endUnix; cursor += step) {
    buckets.push({
      bucket_start: cursor,
      total: 0,
      sale_count: 0,
    });
  }

  if (buckets.length === 0) {
    buckets.push({
      bucket_start: bucketStart,
      total: 0,
      sale_count: 0,
    });
  }

  return buckets;
}

export function buildDashboardSalesSummary({
  sales,
  saleItems,
  startUnix,
  endUnix,
  bucket,
}: {
  sales: DashboardSaleRecord[];
  saleItems: DashboardSaleItemRecord[];
  startUnix: number;
  endUnix: number;
  bucket: DashboardTrendBucket;
}): DashboardSalesSummary {
  const statusCounts = createStatusCounts();
  const trend = buildTrendBuckets(startUnix, endUnix, bucket);
  const trendIndexByBucketStart = new Map<number, number>(trend.map((item, index) => [item.bucket_start, index]));
  const paymentMap = new Map<PaymentMethod, DashboardPaymentBreakdown>(
    PAYMENT_METHODS.map((method) => [method, { method, total: 0, count: 0 }]),
  );
  const productMap = new Map<string, DashboardTopProduct>();
  const realizedSaleIds = new Set<string>();

  let revenue = 0;
  let salesCount = 0;

  for (const sale of sales) {
    statusCounts[sale.status] += 1;

    if (!RECOGNIZED_REVENUE_STATUSES.includes(sale.status)) {
      continue;
    }

    revenue += Number(sale.total);
    salesCount += 1;
    realizedSaleIds.add(sale.id);

    if (sale.payment_method) {
      const payment = paymentMap.get(sale.payment_method);
      if (payment) {
        payment.total += Number(sale.total);
        payment.count += 1;
      }
    }

    const bucketStart = getBucketStartUnix(sale.created_at, bucket);
    const trendIndex = trendIndexByBucketStart.get(bucketStart);
    if (trendIndex != null) {
      trend[trendIndex] = {
        bucket_start: bucketStart,
        total: trend[trendIndex].total + Number(sale.total),
        sale_count: trend[trendIndex].sale_count + 1,
      };
    }
  }

  for (const item of saleItems) {
    if (!realizedSaleIds.has(item.sale_id)) {
      continue;
    }

    const revenueContribution = Math.max(0, Number(item.line_subtotal) - Number(item.discount_amount));
    const existing = productMap.get(item.product_name);

    if (existing) {
      existing.quantity += item.quantity;
      existing.revenue += revenueContribution;
      continue;
    }

    productMap.set(item.product_name, {
      name: item.product_name,
      quantity: item.quantity,
      revenue: revenueContribution,
    });
  }

  return {
    revenue,
    salesCount,
    averageOrderValue: salesCount > 0 ? revenue / salesCount : 0,
    statusCounts,
    paymentBreakdown: PAYMENT_METHODS.map((method) => paymentMap.get(method) ?? { method, total: 0, count: 0 }),
    topProducts: [...productMap.values()]
      .sort((left, right) => right.quantity - left.quantity || right.revenue - left.revenue)
      .slice(0, 5),
    trend,
  };
}
