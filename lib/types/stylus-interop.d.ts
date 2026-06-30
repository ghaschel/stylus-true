export interface StylusNode {
    nodeName?: string;
    type?: string;
    val?: any;
    vals?: Record<string, StylusNode>;
    nodes?: StylusNode[];
    isList?: boolean;
    name?: string;
    isTrue?: boolean;
    string?: string;
    source?: {
        start?: {
            line?: number;
            column?: number;
        };
    };
    toString(): string;
}
export interface StylusRenderer {
    render(): string;
    deps?(): string[];
    define(name: string, fn: (...args: any[]) => any): void;
}
export type StylusPlugin = (style: StylusRenderer) => void;
export interface StylusFactory {
    (contents: string, options?: Record<string, any>): StylusRenderer;
    nodes: {
        Boolean: new (value: boolean) => StylusNode;
        Unit: new (value: number, type?: string) => StylusNode;
    };
    utils: {
        unwrap(node: any): any;
        coerce(value: any): any;
        coerceArray(value: any[]): any;
    };
}
