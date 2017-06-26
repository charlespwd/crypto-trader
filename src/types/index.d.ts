declare namespace R {
  interface Static {
    startsWith(a: string, b: string): boolean;
    startsWith(a: string): (b: string) => boolean;
  }
}
