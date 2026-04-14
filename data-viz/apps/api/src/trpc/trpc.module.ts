import { Module } from "@nestjs/common";
import { TrpcService } from "./trpc.service";
import { IaSummaryModule } from "../ia-summary/ia-summary.module";

@Module({
  imports: [IaSummaryModule],
  providers: [TrpcService],
  exports: [TrpcService],
})
export class TrpcModule {}
