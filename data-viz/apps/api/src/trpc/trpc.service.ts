import { Inject, Injectable } from "@nestjs/common";
import { DRIZZLE, DrizzleDB } from "../database/drizzle.provider";
import { RedisService } from "../redis/redis.service";
import { IaSummaryService } from "../ia-summary/ia-summary.service"; // classe concreta para injeção
import type { TrpcContext } from "./trpc.context";

@Injectable()
export class TrpcService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly redis: RedisService,
    private readonly iaSummary: IaSummaryService,
  ) {}

  createContext({ req }: { req: any; res?: any }): TrpcContext {
    return {
      db: this.db,
      redis: this.redis.client,
      user: req?.user,
      iaSummary: this.iaSummary,
    };
  }

  createWsContext({ req }: { req: any }): TrpcContext {
    return {
      db: this.db,
      redis: this.redis.client,
      user: req?.user,
      iaSummary: this.iaSummary,
    };
  }
}
