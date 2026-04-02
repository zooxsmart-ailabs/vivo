import { Module } from "@nestjs/common";
import { WsPubSubService } from "./ws-pubsub.service";

@Module({
  providers: [WsPubSubService],
  exports: [WsPubSubService],
})
export class WebSocketModule {}
