import type { PaymentMethodConfig } from '@/types/payment-methods';
import { apiClient } from './api-client';

export class PaymentMethodsService {
    async getAll(): Promise<PaymentMethodConfig[]> {
        try {
            const response = await apiClient.get<PaymentMethodConfig[]>('/payment-methods/all');
            return response || [];
        } catch (error) {
            console.error('Failed to fetch payment methods:', error);
            return [];
        }
    }

    async getActive(): Promise<PaymentMethodConfig[]> {
        try {
            const response = await apiClient.get<PaymentMethodConfig[]>('/payment-methods/active');
            return response || [];
        } catch (error) {
            console.error('Failed to fetch active payment methods:', error);
            return [];
        }
    }

    async getById(id: string): Promise<PaymentMethodConfig | null> {
        try {
            const response = await apiClient.get<PaymentMethodConfig>(`/payment-methods/${id}`);
            return response || null;
        } catch (error) {
            console.error('Failed to fetch payment method:', error);
            return null;
        }
    }

    async create(name: string, icon: string = 'wallet'): Promise<string | null> {
        try {
            const response = await apiClient.post<{ id: string }>('/payment-methods', { name, icon });
            return response.id || null;
        } catch (error) {
            console.error('Failed to create payment method:', error);
            return null;
        }
    }

    async update(id: string, name: string, isActive: boolean, icon?: string): Promise<boolean> {
        try {
            await apiClient.put(`/payment-methods/${id}`, { name, isActive, ...(icon && { icon }) });
            return true;
        } catch (error) {
            console.error('Failed to update payment method:', error);
            return false;
        }
    }

    async delete(id: string): Promise<boolean> {
        try {
            await apiClient.delete(`/payment-methods/${id}`);
            return true;
        } catch (error) {
            console.error('Failed to delete payment method:', error);
            return false;
        }
    }
}

export const paymentMethodsService = new PaymentMethodsService();
