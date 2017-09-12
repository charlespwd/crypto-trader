interface Table {
  push(): void;
  [Symbol.toStringTag]: string;
}

interface TableConstructor {
  new (opts: any): Table;
  prototype: Table;
}

declare var Table: TableConstructor;
