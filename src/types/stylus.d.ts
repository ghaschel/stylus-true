declare module "stylus" {
  interface StylusRuntimeNode {
    [key: string]: any;
  }

  interface StylusRuntimeRenderer {
    render(): string;
    deps?(): string[];
    define(name: string, fn: (...args: StylusRuntimeNode[]) => any): void;
  }

  interface StylusRuntimeFactory {
    (contents: string, options?: Record<string, any>): StylusRuntimeRenderer;
    nodes: {
      Boolean: new (value: boolean) => StylusRuntimeNode;
      Unit: new (value: number, type?: string) => StylusRuntimeNode;
    };
    utils: {
      unwrap(node: any): any;
      coerce(value: any): any;
      coerceArray(value: any[]): any;
    };
  }

  const stylus: StylusRuntimeFactory;
  export = stylus;
}
