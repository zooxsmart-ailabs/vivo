import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import databaseConfig from "../common/config/database.config";
import { drizzleProvider } from "./drizzle.provider";

@Global()
@Module({
  imports: [ConfigModule.forFeature(databaseConfig)],
  providers: [drizzleProvider],
  exports: [drizzleProvider],
})
export class DatabaseModule {}
