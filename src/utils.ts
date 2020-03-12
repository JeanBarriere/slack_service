
export function getEnvOrError(envVar: string): string {
  if (!process.env[envVar]) {
      throw new Error(`Environment variable '` + envVar + `' must be set.`);
  }
  return process.env[envVar] || '';
}
