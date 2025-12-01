import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from "cookie-parser";
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';

// import {}from "@nestjs/swagger"

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'debug', 'verbose', 'log']
  });

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:9000',
    credentials: true,
  })

  const config = new DocumentBuilder()
    .setTitle('Chat Backend API')
    .setDescription("API for chat application backend")
    .setVersion('1.0')
    .addCookieAuth('jwt')
    .build()

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);


  fs.writeFileSync('./swagger.json', JSON.stringify(document, null, 2))

  app.use('/api-json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(document);
  })

  app.use(cookieParser());
  await app.listen(process.env.PORT ?? 7000);
}
bootstrap();
