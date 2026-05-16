# Plan: Order Detail / Payment / Receipt Side Panel

Reemplazar los tres modales actuales en `sales.tsx` (`detailModal`, `receiptModal`, `paymentModal`) con un único componente `OrderPanel` que desliza desde la derecha, igual que `RestockPanel`. El panel tiene 3 vistas internas con transición horizontal entre ellas.

---

## Archivos

| Acción | Archivo |
|---|---|
| CREAR | `frontend/components/order-panel.tsx` |
| ELIMINAR | `frontend/components/payment-modal.tsx` |
| MODIFICAR | `frontend/app/(tabs)/sales.tsx` |

---

## Fase 1 — Crear `order-panel.tsx`

### Shell del panel (mismo patrón que `RestockPanel`)
- Props: `visible`, `sale`, `onClose`, `onExited`, `business`
- Animación: spring de entrada, timing de salida, backdrop semi-transparente
- Ancho: `Math.min(Math.floor(screenWidth * 0.42), 520)` — más ancho que 1/3 para que el layout de pagos por ítems no se rompa
- Al abrir: resetea a `activeView = 'detail'`, carga ítems y precios
- Estado interno: `activeView: 'detail' | 'payment' | 'receipt'` + `receiptFromPayment: boolean`
- Transición interna: `viewSlideAnim` horizontal al navegar entre vistas

### Vista 1 — Detalles

**Header (fijo):**
- Izquierda: `#XXXXXX` + badge de estado (colores de `getStatusTone`)
- Derecha: botón ✕ que llama a `onClose`

**Body (scrollable):**
- Meta: mesa · mesera · hora formateada
- Lista de ítems: `{product_name}  x{qty}  |  $XX.XX` por fila
- Desglose de precios: subtotal, descuentos por ítem, descuento global, recargos, total
- Spinner de carga mientras `loading === true`

**Footer (fijo):**
- Total en grande: `$XX.XX`
- Botón de acción primaria dinámica según el estado:
  - `draft` → "Enviar a cocina"
  - `in-progress` → "Marcar listo"
  - `ready` → "Recibir pago" (solo si no está pagado)
- Botón "Pagar" → `navigateTo('payment')` (visible cuando la orden no está pagada)
- Botón ⋮ → abre un menú flotante con opciones:
  - "Cancelar Orden" → llama a `cancelOrder(sale.id)` + cierra panel
  - "Ver Recibo" → `setReceiptFromPayment(false)` + `navigateTo('receipt')`

### Vista 2 — Pago

**Header (fijo):**
- Izquierda: `< Volver` → `navigateTo('detail')`
- Título: `"Pago - {table_name}"`

**Body (scrollable):**
- Tabs de modo: `[ Completa ] | [ Por Items ] | [ Partes ]`
  - Estado `mode: 'full' | 'by-items' | 'equal'`, se resetea al entrar a la vista
- Contenido dinámico según `mode`:
  - `full` → `<FullPaymentTab sale={sale} business={business} onPaymentComplete={handlePaymentComplete} />`
  - `by-items` → `<ByItemsTab sale={sale} business={business} onPaymentComplete={handlePaymentComplete} />`
  - `equal` → `<EqualSplitTab sale={sale} business={business} onPaymentComplete={handlePaymentComplete} />`

`handlePaymentComplete`:
1. Carga datos del recibo (`loadReceiptData`)
2. `setReceiptFromPayment(true)`
3. `navigateTo('receipt')`

### Vista 3 — Recibo

**Header (fijo):**
- Izquierda: `< Volver` si `!receiptFromPayment` → `navigateTo('detail')` | `< Cerrar` si `receiptFromPayment` → `onClose()`
- Título: `"Recibo #XXXXXX"`

**Body (scrollable):**
- Fondo del panel: gris claro (`#EAEAEA` o equivalent del tema)
- Tarjeta "papel": fondo blanco, `elevation: 4` / `boxShadow` suave, esquinas superiores redondeadas
- Borde inferior aserrado: row de pequeños triángulos SVG/View (o `borderStyle: 'dashed'` como fallback)
- Tabs de variante de recibo (si hay múltiples pagos parciales): `Completo | Parcial 1 | Parcial 2 ...`
- Contenido: `<ReceiptPreview receipt={receiptData} />` (componente existente, ya usa fuente monoespaciada en el formatter)
- Mensaje de error si carga falla

**Footer (fijo):**
- Botón `[ Imprimir ]` (primario, deshabilitado si `receiptLoading || !receiptData`)
- Mensaje de estado de impresión

---

## Fase 2 — Migrar `payment-modal.tsx`

### Componentes a mover a `order-panel.tsx`
Todos los siguientes son actualmente privados en `payment-modal.tsx`:

- `PendingItemRow`
- `SelectedItemRow`
- `PaidPaymentCard`
- `ModeTab`
- `FullPaymentTab`
- `ByItemsTab`
- `EqualSplitTab`
- Estilos: `byItemsStyles`, `equalStyles`, `modeStyles`

### Cambios en los tabs
Agregar prop `onPaymentComplete?: () => void` a `FullPaymentTab`, `ByItemsTab`, `EqualSplitTab`.

Llamar `onPaymentComplete?.()` en cada tab en el punto donde el pago se confirma con éxito:
- `FullPaymentTab`: después de `markOrderPaid` exitoso
- `ByItemsTab`: cuando `board?.pending.length === 0` después del último pago parcial
- `EqualSplitTab`: después de `finalizeEqualSplit` exitoso

### Exportar tipo
Re-exportar `PaymentModalBusiness` desde `order-panel.tsx` para que `sales.tsx` lo importe del nuevo lugar.

### Eliminar
Borrar `frontend/components/payment-modal.tsx` por completo.

---

## Fase 3 — Actualizar `sales.tsx`

### Estado a eliminar (≈15 variables)
```typescript
// Eliminar:
const [receiptPreviewVisible, setReceiptPreviewVisible] = useState(false);
const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
const [receiptVariants, setReceiptVariants] = useState<ReceiptVariant[]>([]);
const [selectedReceiptVariantId, setSelectedReceiptVariantId] = useState<string>('full');
const [receiptMessage, setReceiptMessage] = useState<string | null>(null);
const [receiptLoading, setReceiptLoading] = useState(false);
const [printingBusy, setPrintingBusy] = useState(false);
const [paymentModalVisible, setPaymentModalVisible] = useState(false);
const [paymentModalSale, setPaymentModalSale] = useState<Sale | null>(null);
const [detailSale, setDetailSale] = useState<Sale | null>(null);
const [detailItems, setDetailItems] = useState<SaleItemDetail[]>([]);
const [detailPricing, setDetailPricing] = useState<SalePricingSummary | null>(null);
const [detailLoading, setDetailLoading] = useState(false);
```

### Estado a agregar
```typescript
const [orderPanelSale, setOrderPanelSale] = useState<Sale | null>(null);
const [orderPanelMounted, setOrderPanelMounted] = useState(false);
```

El bool `orderPanelVisible` se deriva: `orderPanelSale !== null && orderPanelMounted`.
Mejor: usar dos booleans separados como los demás paneles en el repo.

```typescript
const [orderPanelVisible, setOrderPanelVisible] = useState(false);
const [orderPanelMounted, setOrderPanelMounted] = useState(false);
```

### Funciones a eliminar
- `openDetail`
- `closeDetail`
- `loadReceiptData`
- `openReceiptPreview`
- `openPaymentFlow`
- `handlePrintReceipt`
- `handleSelectReceiptVariant`

### Funciones a agregar
```typescript
const openOrderPanel = (sale: Sale) => {
  setOrderPanelSale(sale);
  setOrderPanelMounted(true);
  setOrderPanelVisible(true);
};

const closeOrderPanel = () => {
  setOrderPanelVisible(false);
};
```

### JSX a eliminar
- Variable `detailModal` (inline JSX con `<Modal>`)
- Variable `receiptModal` (inline JSX con `<Modal>`)
- Variable `paymentModal` (JSX de `<PaymentModal>`)
- Todas las referencias a estas variables en el `return`

### JSX a agregar
```tsx
{orderPanelMounted && (
  <OrderPanel
    visible={orderPanelVisible}
    sale={orderPanelSale}
    onClose={closeOrderPanel}
    onExited={() => {
      setOrderPanelMounted(false);
      setOrderPanelSale(null);
    }}
    business={{
      name: businessName,
      address: businessAddress,
      phone: businessPhone,
      nit: businessNit,
      logoUri: businessLogoUri,
      footerMessage: receiptFooterMessage,
      taxRate,
      paperWidth: printerPaperWidth,
      printerDeviceName,
      printerDeviceAddress,
    }}
  />
)}
```

### Simplificar `getActions`
- Eliminar el parámetro `context: 'card' | 'detail'` y toda la lógica de `includeDetailActions`
- El panel maneja internamente Cancelar / Ver Recibo / acción de estado
- Las tarjetas solo muestran acciones de acceso rápido (sin cancelar ni ver recibo en la tarjeta)

### Imports a actualizar
- Eliminar: `PaymentModal`, `ReceiptPreview`, `ReceiptVariant`, `SaleItemDetail`, `SalePricingSummary`, `ReceiptData`, `buildPartialReceiptData`, `buildReceiptData`, `isSinglePaymentForWholeSale`
- Agregar: `OrderPanel` (y `PaymentModalBusiness` si se necesita en sales.tsx)

---

## Detalles técnicos de animación interna (vistas)

```typescript
// En order-panel.tsx
const viewOffset = useRef(new Animated.Value(0)).current;

const navigateTo = (nextView: PanelView, direction: 'forward' | 'back' = 'forward') => {
  const outValue = direction === 'forward' ? -panelWidth : panelWidth;
  const inValue = direction === 'forward' ? panelWidth : -panelWidth;

  // Slide out current view
  Animated.timing(viewOffset, {
    toValue: outValue,
    duration: 200,
    useNativeDriver: true,
  }).start(() => {
    setActiveView(nextView);
    viewOffset.setValue(inValue);
    // Slide in new view
    Animated.spring(viewOffset, {
      toValue: 0,
      tension: 80,
      friction: 12,
      useNativeDriver: true,
    }).start();
  });
};
```

Uso:
- Detail → Payment: `navigateTo('payment', 'forward')`
- Payment → Detail: `navigateTo('detail', 'back')`
- Detail → Receipt: `navigateTo('receipt', 'forward')`
- Receipt → Detail: `navigateTo('detail', 'back')`
- Payment → Receipt: `navigateTo('receipt', 'forward')`

---

## Estilo de la tarjeta "papel" del recibo

```typescript
// Contenedor externo del body en Vista 3
receiptPaperContainer: {
  backgroundColor: '#E8E8E8',  // gris claro
  padding: 16,
  flex: 1,
},

// Tarjeta "papel"
receiptPaper: {
  backgroundColor: '#FFFFFF',
  borderRadius: 4,        // solo esquinas superiores
  ...(Platform.OS === 'web'
    ? { boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }
    : { elevation: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8 }),
  overflow: 'hidden',
},

// Borde aserrado inferior — implementar con una fila de triángulos o CSS clip-path en web
receiptPaperTear: {
  // Web: CSS background con repeating-linear-gradient para zigzag
  // Native: fila de <View> con borderTopWidth + borderTopColor transparent
}
```

---

## Verificación checklist

- [ ] Abrir tarjeta → panel desliza desde la derecha con backdrop
- [ ] Panel muestra estado, ítems y precios correctos del pedido
- [ ] Botón "Pagar" → anima a Vista 2 (desliza a la izquierda)
- [ ] `< Volver` desde pago → regresa a detalles (desliza a la derecha)
- [ ] Pago completo (tab Completa) → auto-transición a Vista 3
- [ ] Pago completo (tab Por Items) → auto-transición a Vista 3
- [ ] Pago completo (tab Partes) → auto-transición a Vista 3
- [ ] "Ver Recibo" desde ⋮ → abre Vista 3 con `< Volver`
- [ ] `< Cerrar` en Vista 3 (desde pago) cierra el panel completo
- [ ] Botón Imprimir funciona desde Vista 3
- [ ] Cancelar Orden desde ⋮ funciona y cierra el panel
- [ ] Clic en backdrop cierra el panel con animación de salida
- [ ] No quedan referencias a `PaymentModal` o `payment-modal.tsx` en el proyecto
