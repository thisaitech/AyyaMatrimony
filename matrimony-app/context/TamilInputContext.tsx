import { createContext, useContext, type ReactNode } from 'react';
import type { TextInputProps } from 'react-native';
import { getTamilTextInputProps } from '@/constants/tamilTextInput';

const TamilInputContext = createContext(false);

export function TamilInputProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  return <TamilInputContext.Provider value={enabled}>{children}</TamilInputContext.Provider>;
}

export function useTamilTextInputProps(): TextInputProps {
  const enabled = useContext(TamilInputContext);
  return enabled ? getTamilTextInputProps() : {};
}
