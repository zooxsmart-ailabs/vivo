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

    // TODO: Implement JWT verification with jose or jsonwebtoken
    // For now, stores the raw token on the request
    request.user = { token };
    return true;
  }
}
