declare module "lodash.find" {
  function find<T extends object>(
    collection: T[] | undefined,
    predicate: Partial<T>
  ): T | undefined;

  export = find;
}

declare module "lodash.foreach" {
  function forEach<T>(
    collection: T[] | undefined,
    iteratee: (item: T, index: number) => void
  ): void;

  export = forEach;
}

declare module "lodash.last" {
  function last<T>(collection: T[] | undefined): T | undefined;

  export = last;
}
