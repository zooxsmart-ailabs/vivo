import {
  pgTable,
  pgEnum,
  text,
  bigint,
  bigserial,
  smallint,
  date,
  timestamp,
  jsonb,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

export const ooklaFileStatus = pgEnum("ookla_file_status", [
  "catalogued",
  "downloading",
  "downloaded",
  "uploading",
  "uploaded",
  "loading",
  "loaded",
  "failed",
  "skipped",
]);

export const ooklaCatalog = pgTable(
  "ookla_catalog",
  {
    entity: text("entity").notNull(),
    dataDate: date("data_date", { mode: "string" }),
    remotePath: text("remote_path").notNull(),
    fileName: text("file_name").notNull(),
    fileSize: bigint("file_size", { mode: "number" }),
    remoteMtime: timestamp("remote_mtime", {
      withTimezone: true,
      mode: "string",
    }),
    s3Uri: text("s3_uri"),
    status: ooklaFileStatus("status").notNull().default("catalogued"),
    attempts: smallint("attempts").notNull().default(0),
    rowsLoaded: bigint("rows_loaded", { mode: "number" }),
    errorMessage: text("error_message"),
    cataloguedAt: timestamp("catalogued_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    uploadedAt: timestamp("uploaded_at", {
      withTimezone: true,
      mode: "string",
    }),
    loadedAt: timestamp("loaded_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.entity, t.remotePath] }),
    dateEntityIdx: index("idx_ookla_catalog_date_entity").on(
      t.dataDate,
      t.entity
    ),
  })
);

export const ooklaRun = pgTable(
  "ookla_run",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    phase: text("phase").notNull(),
    startedAt: timestamp("started_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", {
      withTimezone: true,
      mode: "string",
    }),
    status: text("status").notNull().default("running"),
    statsJson: jsonb("stats_json"),
  },
  (t) => ({
    startedIdx: index("idx_ookla_run_started").on(t.startedAt),
  })
);
