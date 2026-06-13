// Minimal Deno type stubs so VSCode doesn't error on Deno globals
// in Edge Function files. Runtime is Deno — these are only for IDE support.

declare namespace Deno {
  interface ServeOptions {
    port?: number;
    hostname?: string;
    onListen?: (params: { hostname: string; port: number }) => void;
  }
  function serve(handler: (req: Request) => Response | Promise<Response>, options?: ServeOptions): void;
  function test(name: string, fn: () => void | Promise<void>): void;
  const env: {
    get(key: string): string | undefined;
  };
}

declare function assertAlmostEquals(actual: number, expected: number, delta?: number, msg?: string): void;
