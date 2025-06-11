declare module 'jws' {
  export function sign(options: {
    header: { alg: string };
    payload: string;
    secret: string;
  }): string;

  export function verify(token: string, alg: string, secret: string): boolean;

  export function decode(token: string): {
    header: any;
    payload: string;
    signature: string;
  };
}
