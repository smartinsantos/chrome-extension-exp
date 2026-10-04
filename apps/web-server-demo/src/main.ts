import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { SERVER_CONFIG, type ServerConfig } from './config/server-config.js';

const app = await NestFactory.create(AppModule);
const serverConfig = app.get<ServerConfig>(SERVER_CONFIG);
app.enableCors({ origin: serverConfig.corsOrigin });
app.enableShutdownHooks();
await app.listen(serverConfig.port);
console.info(`GraphQL API ready at http://localhost:${serverConfig.port}/graphql`);
