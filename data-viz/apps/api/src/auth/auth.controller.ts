import {
  Body,
  Controller,
  HttpCode,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

class LoginDto {
  user: string;
  pass: string;
}

@Controller("auth")
export class AuthController {
  constructor(private readonly config: ConfigService) {}

  @Post("login")
  @HttpCode(200)
  login(@Body() body: LoginDto): { ok: boolean } {
    const validUser = this.config.get<string>("app.authUser");
    const validPass = this.config.get<string>("app.authPass");

    if (!validUser || !validPass) {
      throw new Error("AUTH_USER or AUTH_PASS is not configured");
    }

    if (body.user?.trim() !== validUser || body.pass !== validPass) {
      throw new UnauthorizedException("Credenciais inválidas");
    }

    return { ok: true };
  }

  @Post("logout")
  @HttpCode(200)
  logout(): { ok: boolean } {
    return { ok: true };
  }
}
