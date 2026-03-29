import type { AppRouter } from "@vivo/api/src/trpc/trpc.router";
import type { createTRPCProxyClient } from "@trpc/client";

type TrpcClient = ReturnType<typeof createTRPCProxyClient<AppRouter>>;

export function useTrpc(): TrpcClient {
  const { $trpc } = useNuxtApp();
  return $trpc as TrpcClient;
}
