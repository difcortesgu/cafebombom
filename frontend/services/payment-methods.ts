import type { PaymentMethodConfig } from '@/types/payment-methods';
import { apiClient } from './api-client';
import { logger } from './logger';

export class PaymentMethodsService {
    async getAll(): Promise<PaymentMethodConfig[]> {
        try {
            const response = await apiClient.get<PaymentMethodConfig[]>('/payment-methods/all');
            return response || [];
        } catch (error) {
            logger.error('Failed to fetch payment methods:', error);
            return [];
        }
    }

    async getActive(): Promise<PaymentMethodConfig[]> {
        try {
            const response = await apiClient.get<PaymentMethodConfig[]>('/payment-methods/active');
            return response || [];
        } catch (error) {
            logger.error('Failed to fetch active payment methods:', error);
            return [];
        }
    }

    async getById(id: string): Promise<PaymentMethodConfig | null> {
        try {
            const response = await apiClient.get<PaymentMethodConfig>(`/payment-methods/${id}`);
            return response || null;
        } catch (error) {
            logger.error('Failed to fetch payment method:', error);
            return null;
        }
    }

    async create(name: string, icon: string = 'wallet'): Promise<string> {
        const response = await apiClient.post<{ id: string }>('/payment-methods', { name, icon });
        return response.id || '';
    }

    async update(id: string, name: string, isActive: boolean, icon?: string): Promise<void> {
        await apiClient.put(`/payment-methods/${id}`, { name, isActive, ...(icon && { icon }) });
    }

    async delete(id: string): Promise<void> {
        await apiClient.delete(`/payment-methods/${id}`);
    }
}