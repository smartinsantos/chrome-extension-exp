import 'reflect-metadata';

import { writeFileSync } from 'node:fs';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { printAppSchema } from './graphql-schema/print-app-schema.js';

// Builds the app on a throwaway database (no server is started) and writes the schema it serves.
// The web demo generates its typed GraphQL client from this file.
process.env['DATABASE_PATH'] = ':memory:';
const app = await NestFactory.create(AppModule, { logger: ['error'] });
await app.init();
const schemaPath = new URL('../schema.gql', import.meta.url);
writeFileSync(schemaPath, printAppSchema(app));
await app.close();
console.info(`Wrote ${schemaPath.pathname}`);
