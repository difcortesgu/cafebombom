import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ProductForm } from '@/components/catalog/product-form';
import { FormScreen } from '@/components/ui/form-screen';

function normalizeParam(value?: string | string[]) {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default function ProductFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const productId = normalizeParam(params.id);

  // Definimos el modo basado en si existe un ID en la URL de la ruta
  const mode = productId ? { productId } : 'create';

  return (
    <FormScreen contentStyle={styles.screenContent}>
      <ProductForm
        mode={mode}
        onClose={() => router.back()}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
  },
});