import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from "cookie-parser";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'debug', 'verbose', 'log']
  });
  app.use(cookieParser());
  await app.listen(process.env.PORT ?? 7000);
}
bootstrap();
