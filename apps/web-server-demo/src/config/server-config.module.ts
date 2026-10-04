import { Global, Module } from '@nestjs/common';

import { SERVER_CONFIG, loadServerConfig } from './server-config.js';

@Global()
@Module({
  providers: [{ provide: SERVER_CONFIG, useFactory: () => loadServerConfig(process.env) }],
  exports: [SERVER_CONFIG],
})
export class ServerConfigModule {}
