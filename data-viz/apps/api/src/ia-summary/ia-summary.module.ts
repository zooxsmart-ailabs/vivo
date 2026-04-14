import { Module } from "@nestjs/common";
import { IaSummaryService } from "./ia-summary.service";

@Module({
  providers: [IaSummaryService],
  exports: [IaSummaryService],
})
export class IaSummaryModule {}
