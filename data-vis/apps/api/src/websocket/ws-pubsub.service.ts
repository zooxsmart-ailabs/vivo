import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { RedisService } from "../redis/redis.service";

@Injectable()
export class WsPubSubService implements OnModuleDestroy {
  private readonly logger = new Logger(WsPubSubService.name);
  private readonly handlers = new Map<string, Set<(data: string) => void>>();

  constructor(private readonly redis: RedisService) {
    this.redis.subscriber.on("message", (channel, message) => {
      const channelHandlers = this.handlers.get(channel);
      if (channelHandlers) {
        channelHandlers.forEach((handler) => handler(message));
      }
    });
  }

  async publish(channel: string, data: unknown): Promise<void> {
    await this.redis.client.publish(channel, JSON.stringify(data));
    this.logger.debug(`Published to ${channel}`);
  }

  async subscribe(
    channel: string,
    handler: (data: string) => void
  ): Promise<void> {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
      await this.redis.subscriber.subscribe(channel);
      this.logger.debug(`Subscribed to ${channel}`);
    }
    this.handlers.get(channel)!.add(handler);
  }

  async unsubscribe(
    channel: string,
    handler: (data: string) => void
  ): Promise<void> {
    const channelHandlers = this.handlers.get(channel);
    if (channelHandlers) {
      channelHandlers.delete(handler);
      if (channelHandlers.size === 0) {
        this.handlers.delete(channel);
        await this.redis.subscriber.unsubscribe(channel);
        this.logger.debug(`Unsubscribed from ${channel}`);
      }
    }
  }

  async onModuleDestroy() {
    this.handlers.clear();
  }
}
