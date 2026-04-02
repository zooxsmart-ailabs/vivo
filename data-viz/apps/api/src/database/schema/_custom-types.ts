import { customType } from "drizzle-orm/pg-core";

export const inet = customType<{ data: string }>({
  dataType() {
    return "inet";
  },
});

export const inetArray = customType<{ data: string[] }>({
  dataType() {
    return "inet[]";
  },
});
