import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { loadServerConfig } from './config/server-config.js';

const serverConfig = loadServerConfig(process.env);
const app = await NestFactory.create(AppModule);
app.enableCors({ origin: serverConfig.corsOrigin });
app.enableShutdownHooks();
await app.listen(serverConfig.port);
console.info(`GraphQL API ready at http://localhost:${serverConfig.port}/graphql`);
