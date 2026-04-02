import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const jwtSecret = this.config.get<string>("app.jwtSecret");
    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not configured");
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException(
        "Missing or invalid authorization header"
      );
    }

    const token = authHeader.slice(7);
    if (!token) {
      throw new UnauthorizedException("Empty token");
    }

    // TODO: Verify token signature using jwtSecret
    request.user = { token };
    return true;
  }
}
