export interface ConfigContext {
  env: {
    (key: string, fallback?: string): string;
    int(key: string, fallback: number): number;
    array(key: string): string[];
  };
}
