import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { ConfigType } from "@nestjs/config";
import redisConfig from "../common/config/redis.config";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  public readonly client: Redis;
  public readonly subscriber: Redis;

  constructor(
    @Inject(redisConfig.KEY)
    private readonly config: ConfigType<typeof redisConfig>
  ) {
    const options = {
      host: this.config.host,
      port: this.config.port,
      password: this.config.password || undefined,
      retryStrategy: (times: number) => Math.min(times * 200, 5000),
    };

    this.client = new Redis(options);
    this.subscriber = new Redis(options);

    this.client.on("error", (err) =>
      this.logger.error("Redis client error", err.message)
    );
    this.subscriber.on("error", (err) =>
      this.logger.error("Redis subscriber error", err.message)
    );
    this.client.on("connect", () => this.logger.log("Redis client connected"));
  }

  async onModuleDestroy() {
    await Promise.all([this.client.quit(), this.subscriber.quit()]);
  }
}
