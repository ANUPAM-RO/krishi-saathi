import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

export type IconName = ComponentProps<typeof Ionicons>['name'];
export type IconColor = ComponentProps<typeof Ionicons>['color'];

export function Icon({ name, size = 24, color }: { name: IconName; size?: number; color?: IconColor }) {
  return <Ionicons name={name} size={size} color={color} />;
}
