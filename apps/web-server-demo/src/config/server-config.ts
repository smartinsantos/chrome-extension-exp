export interface ServerConfig {
  port: number;
  /** SQLite file path, or `:memory:` for a throwaway database. */
  databasePath: string;
  /** The web demo's origin, the only browser origin allowed to call the API. */
  corsOrigin: string;
}

export const SERVER_CONFIG = Symbol('SERVER_CONFIG');

const DEFAULT_SERVER_CONFIG: ServerConfig = {
  port: 4000,
  databasePath: 'data/dev.sqlite',
  corsOrigin: 'http://localhost:5173',
};

export function loadServerConfig(environment: NodeJS.ProcessEnv): ServerConfig {
  return {
    port: parsePort(environment['PORT']),
    databasePath: environment['DATABASE_PATH'] ?? DEFAULT_SERVER_CONFIG.databasePath,
    corsOrigin: environment['CORS_ORIGIN'] ?? DEFAULT_SERVER_CONFIG.corsOrigin,
  };
}

function parsePort(rawPort: string | undefined): number {
  if (rawPort === undefined) return DEFAULT_SERVER_CONFIG.port;
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`PORT must be a whole number between 1 and 65535, but got "${rawPort}".`);
  }
  return port;
}
