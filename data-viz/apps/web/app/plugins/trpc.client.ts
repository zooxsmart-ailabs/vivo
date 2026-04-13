import {
  createTRPCProxyClient,
  httpBatchLink,
  splitLink,
  wsLink,
  createWSClient,
} from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@vivo/zoox-map-api/src/trpc/trpc.router";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();

  const wsUrl = config.public.apiBase
    .replace(/^https:/, "wss:")
    .replace(/^http:/, "ws:");

  const wsClient = createWSClient({
    url: `${wsUrl}/trpc-ws`,
  });

  const client = createTRPCProxyClient<AppRouter>({
    transformer: superjson,
    links: [
      splitLink({
        condition: (op) => op.type === "subscription",
        true: wsLink({ client: wsClient }),
        false: httpBatchLink({
          url: `${config.public.apiBase}/trpc`,
        }),
      }),
    ],
  });

  return { provide: { trpc: client } };
});
