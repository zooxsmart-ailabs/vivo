/**
 * Composable for tRPC WebSocket subscription management.
 *
 * WebSocket connections are managed by tRPC's wsLink (configured in
 * plugins/trpc.client.ts). This composable wraps tRPC subscriptions
 * with Vue reactivity and automatic cleanup on unmount.
 *
 * Usage (when subscriptions are defined in the API router):
 *
 *   const { data, unsubscribe } = useSubscription(() =>
 *     trpc.someEvent.subscribe(undefined, {
 *       onData(value) { ... },
 *     })
 *   );
 */
export function useSubscription(
  factory: () => { unsubscribe: () => void }
): { unsubscribe: () => void } {
  const subscription = factory();

  onUnmounted(() => {
    subscription.unsubscribe();
  });

  return subscription;
}
