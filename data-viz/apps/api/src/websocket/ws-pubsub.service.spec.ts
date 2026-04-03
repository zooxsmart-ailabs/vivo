import { Logger } from "@nestjs/common";
import { WsPubSubService } from "./ws-pubsub.service";

describe("WsPubSubService", () => {
  let service: WsPubSubService;
  let mockRedis: any;
  let subscriberMessageHandler: (channel: string, message: string) => void;

  beforeEach(() => {
    vi.spyOn(Logger.prototype, "debug").mockImplementation();
    mockRedis = {
      client: { publish: vi.fn().mockResolvedValue(1) },
      subscriber: {
        on: vi.fn((_event: string, handler: any) => {
          subscriberMessageHandler = handler;
        }),
        subscribe: vi.fn().mockResolvedValue(1),
        unsubscribe: vi.fn().mockResolvedValue(1),
      },
    };
    service = new WsPubSubService(mockRedis);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("publish", () => {
    it("publishes JSON-stringified data to the Redis channel", async () => {
      const data = { geohashId: "abc123", score: 8.5 };

      await service.publish("geohash-updates", data);

      expect(mockRedis.client.publish).toHaveBeenCalledWith(
        "geohash-updates",
        JSON.stringify(data),
      );
    });
  });

  describe("subscribe", () => {
    it("subscribes to Redis channel on first handler", async () => {
      const handler = vi.fn();

      await service.subscribe("ch1", handler);

      expect(mockRedis.subscriber.subscribe).toHaveBeenCalledWith("ch1");
    });

    it("does not re-subscribe to Redis for a second handler on same channel", async () => {
      await service.subscribe("ch1", vi.fn());
      await service.subscribe("ch1", vi.fn());

      expect(mockRedis.subscriber.subscribe).toHaveBeenCalledTimes(1);
    });

    it("subscribes to Redis separately for different channels", async () => {
      await service.subscribe("ch1", vi.fn());
      await service.subscribe("ch2", vi.fn());

      expect(mockRedis.subscriber.subscribe).toHaveBeenCalledTimes(2);
    });
  });

  describe("unsubscribe", () => {
    it("unsubscribes from Redis when last handler is removed", async () => {
      const handler = vi.fn();
      await service.subscribe("ch1", handler);

      await service.unsubscribe("ch1", handler);

      expect(mockRedis.subscriber.unsubscribe).toHaveBeenCalledWith("ch1");
    });

    it("does not unsubscribe from Redis when other handlers remain", async () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      await service.subscribe("ch1", h1);
      await service.subscribe("ch1", h2);

      await service.unsubscribe("ch1", h1);

      expect(mockRedis.subscriber.unsubscribe).not.toHaveBeenCalled();
    });

    it("is a no-op for unknown channels", async () => {
      await service.unsubscribe("unknown", vi.fn());

      expect(mockRedis.subscriber.unsubscribe).not.toHaveBeenCalled();
    });
  });

  describe("message forwarding", () => {
    it("forwards Redis messages to registered handlers", async () => {
      const handler = vi.fn();
      await service.subscribe("ch1", handler);

      subscriberMessageHandler("ch1", '{"value":42}');

      expect(handler).toHaveBeenCalledWith('{"value":42}');
    });

    it("does not forward messages to unregistered channels", async () => {
      const handler = vi.fn();
      await service.subscribe("ch1", handler);

      subscriberMessageHandler("ch2", "data");

      expect(handler).not.toHaveBeenCalled();
    });

    it("forwards to all handlers on the same channel", async () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      await service.subscribe("ch1", h1);
      await service.subscribe("ch1", h2);

      subscriberMessageHandler("ch1", "msg");

      expect(h1).toHaveBeenCalledWith("msg");
      expect(h2).toHaveBeenCalledWith("msg");
    });
  });

  describe("onModuleDestroy", () => {
    it("clears all handlers", async () => {
      const handler = vi.fn();
      await service.subscribe("ch1", handler);

      await service.onModuleDestroy();
      subscriberMessageHandler("ch1", "late msg");

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
