import type { DatabaseSync } from 'node:sqlite';

import { Global, Inject, Injectable, Module, type OnModuleDestroy } from '@nestjs/common';

import { CLOCK, type Clock } from '../clock/clock.js';
import { ClockModule } from '../clock/clock.module.js';
import { SERVER_CONFIG, type ServerConfig } from '../config/server-config.js';
import { ServerConfigModule } from '../config/server-config.module.js';
import { DATABASE } from './database.tokens.js';
import { openDatabase } from './open-database.js';
import { loadMigrationsFromDirectory, runMigrations } from './run-migrations.js';
import { seedDemoData } from './seed/seed-demo-data.js';

function createReadyDatabase(serverConfig: ServerConfig, clock: Clock): DatabaseSync {
  const database = openDatabase(serverConfig.databasePath);
  runMigrations(database, loadMigrationsFromDirectory());
  seedDemoData(database, clock);
  return database;
}

@Injectable()
class DatabaseConnectionCloser implements OnModuleDestroy {
  constructor(@Inject(DATABASE) private readonly database: DatabaseSync) {}

  onModuleDestroy(): void {
    if (this.database.isOpen) this.database.close();
  }
}

@Global()
@Module({
  imports: [ServerConfigModule, ClockModule],
  providers: [
    { provide: DATABASE, inject: [SERVER_CONFIG, CLOCK], useFactory: createReadyDatabase },
    DatabaseConnectionCloser,
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}
