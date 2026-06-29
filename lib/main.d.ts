import type { StylusFactory, StylusPlugin } from "./types/stylus-interop";
type MaybeArray<T> = T | T[] | null | undefined;
type RunnerDescribe = (name: string, callback: () => void) => void;
type RunnerIt = (name: string, callback: () => void) => void;
interface PluginPathEntry {
    path: string;
    options?: unknown;
}
interface StylOptions {
    data?: string | Buffer;
    file?: string;
    filename?: string;
    includePaths?: MaybeArray<string>;
    paths?: MaybeArray<string>;
    pluginPaths?: MaybeArray<string | PluginPathEntry>;
    use?: MaybeArray<StylusPlugin>;
    [key: string]: unknown;
}
interface RenderCapableStylus {
    render(contents: string, options: StylOptions): string;
    deps?(filename?: string): string[];
}
interface TrueOptions {
    contextLines?: number;
    describe?: RunnerDescribe;
    it?: RunnerIt;
    onDeps?(deps: string[], result: RenderResult): void;
    styl?: StylusFactory | RenderCapableStylus;
}
interface AssertionResult {
    assertionType?: string;
    description: string;
    details?: string;
    expected?: string;
    output?: string;
    passed?: boolean;
    [key: string]: unknown;
}
interface TestResult {
    assertions: AssertionResult[];
    test: string;
}
interface ModuleResult {
    module: string;
    modules?: ModuleResult[];
    tests?: TestResult[];
}
interface RenderResult {
    css: string;
    deps: string[];
    modules: ModuleResult[];
}
declare const api: {
    runStyl: (stylOptions?: StylOptions, trueOptions?: TrueOptions) => RenderResult;
    renderStyl: (stylOptions?: StylOptions, trueOptions?: TrueOptions) => RenderResult;
    formatFailureMessage: (assertion: AssertionResult) => string;
    parse: (rawCss: string, contextLines?: number) => ModuleResult[];
};
export = api;
