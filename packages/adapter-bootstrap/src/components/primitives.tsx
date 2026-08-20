// src/components/primitives.tsx
import type { ComponentProps, ReactNode } from "react";
import BTable from "react-bootstrap/Table";

export interface TableProps extends ComponentProps<typeof BTable> {
  children?: ReactNode;
}

export function Table({
  children,
  className = "",
  ...rest
}: Readonly<TableProps>) {
  return (
    <BTable
      striped
      bordered
      hover
      responsive
      className={`align-middle mb-0 ${className}`.trim()}
      {...rest}
    >
      {children}
    </BTable>
  );
}
