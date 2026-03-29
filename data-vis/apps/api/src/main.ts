import "./telemetry/tracing";

import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { WebSocketServer } from "ws";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { appRouter } from "./trpc/trpc.router";
import { TrpcService } from "./trpc/trpc.service";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const trpcService = app.get(TrpcService);

  const corsOrigins = config.get<string>("app.corsOrigins") as unknown;
  const port = config.get<number>("app.port", 3001);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: corsOrigins as string[],
    credentials: true,
  });

  // Global pipes
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // tRPC HTTP handler
  app.use(
    "/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext: ({ req, res }) => trpcService.createContext({ req, res }),
    })
  );

  await app.listen(port, "0.0.0.0");

  // WebSocket server for tRPC subscriptions
  const httpServer = app.getHttpServer();
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (req: any, socket: any, head: any) => {
    if (!req.url?.startsWith("/trpc-ws")) {
      socket.destroy();
      return;
    }

    // Origin validation
    const origin = req.headers.origin;
    const allowed = corsOrigins as string[];
    if (origin && Array.isArray(allowed) && !allowed.includes(origin)) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  applyWSSHandler({
    wss,
    router: appRouter,
    createContext: ({ req }) => trpcService.createWsContext({ req }),
  });

  logger.log(`API running on http://0.0.0.0:${port}`);
  logger.log(`tRPC HTTP  -> http://0.0.0.0:${port}/trpc`);
  logger.log(`tRPC WS    -> ws://0.0.0.0:${port}/trpc-ws`);
  logger.log(`Health     -> http://0.0.0.0:${port}/health`);
}

bootstrap();
