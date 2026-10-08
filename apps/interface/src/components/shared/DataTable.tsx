"use client";

import { Table, TableProps, TablePaginationConfig } from "antd";
import EmptyState from "./EmptyState";

const pagination: TablePaginationConfig = {
  pageSize: 6,
  showSizeChanger: false,
};

export default function DataTable<T extends object>({ size = "middle", ...props }: TableProps<T>) {
  return (
    <Table<T>
      size={size}
      pagination={pagination}
      scroll={{ x: "max-content" }}
      sticky={{ offsetHeader: 0 }}
      locale={{ emptyText: <EmptyState /> }}
      {...props}
    />
  );
}
