import { Inject, Injectable } from "@nestjs/common";
import { DRIZZLE, DrizzleDB } from "../database/drizzle.provider";
import { RedisService } from "../redis/redis.service";
import type { TrpcContext } from "./trpc.context";

@Injectable()
export class TrpcService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly redis: RedisService
  ) {}

  createContext({ req }: { req: any; res?: any }): TrpcContext {
    return {
      db: this.db,
      redis: this.redis.client,
      user: req?.user,
    };
  }

  createWsContext({ req }: { req: any }): TrpcContext {
    return {
      db: this.db,
      redis: this.redis.client,
      user: req?.user,
    };
  }
}
