import { useNetInfo } from '@react-native-community/netinfo';

/** True unless NetInfo positively reports no connection (unknown counts as online). */
export function useOnline(): boolean {
  const net = useNetInfo();
  if (net.isConnected === false) return false;
  if (net.isInternetReachable === false) return false;
  return true;
}
