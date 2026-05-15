// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chart.bar.fill': 'bar-chart',
  'cart.fill': 'shopping-cart',
  'shippingbox.fill': 'inventory-2',
  'takeoutbag.and.cup.and.straw.fill': 'local-cafe',
  'dollarsign.circle.fill': 'attach-money',
  'gearshape.fill': 'settings',
  'gearshape.2.fill': 'tune',
  'table.furniture.fill': 'table-restaurant',
  'person.fill': 'person',
  'person.2.fill': 'group',
  'lock.fill': 'lock',
  'exclamationmark.triangle.fill': 'warning',
  'arrow.clockwise.circle.fill': 'autorenew',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'trash.fill': 'delete',
  'checkmark.circle.fill': 'check-circle',
  'arrow.down.circle.fill': 'arrow-downward',
  'banknote.fill': 'payments',
  'creditcard.fill': 'credit-card',
  'building.columns.fill': 'account-balance',
  'receipt.fill': 'receipt-long',
  'tag.fill': 'sell',
} as IconMapping;
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = 'regular',
}: {
  name: SymbolViewProps['name'];
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
