import { Pool } from "pg";
import { seedFromCsv, resolveDataPath } from "./utils";

export async function seedQoeSamples(pool: Pool): Promise<void> {
  // File Transfer (100 rows, pipe-delimited)
  // Mismatches:
  //   CSV "attr_wifi_channel_width_id" → SQL "attr_wifi_channel_width_mhz"
  //   CSV "val_signal_ss_snr_dbm"      → SQL "val_signal_ss_snr_db"
  console.log("Seeding file_transfer (sample)...");
  const ftCount = await seedFromCsv(
    pool,
    "file_transfer",
    resolveDataPath("estudo/AMOSTRA_FILE_TRANSFER.csv"),
    {
      delimiter: "|",
      decimalComma: true,
      columnMap: {
        attr_wifi_channel_width_id: "attr_wifi_channel_width_mhz",
        val_signal_ss_snr_dbm: "val_signal_ss_snr_db",
      },
    }
  );
  console.log(`  Inserted ${ftCount} file_transfer rows`);

  // Video (100 rows, pipe-delimited)
  // Mismatches:
  //   CSV "is_in_stream_failure" → SQL "is_video_in_stream_failure"
  //   CSV "val_signal_ss_snr_dbm" → SQL "val_signal_ss_snr_dbm" (matches SQL column name)
  console.log("Seeding video (sample)...");
  const videoCount = await seedFromCsv(
    pool,
    "video",
    resolveDataPath("estudo/AMOSTRA_VIDEO_STREAMING.csv"),
    {
      delimiter: "|",
      decimalComma: true,
      columnMap: {
        is_in_stream_failure: "is_video_in_stream_failure",
      },
    }
  );
  console.log(`  Inserted ${videoCount} video rows`);

  // Web Browsing (100 rows, pipe-delimited)
  // All CSV headers match SQL columns after lowercase — no columnMap needed
  console.log("Seeding web_browsing (sample)...");
  const wbCount = await seedFromCsv(
    pool,
    "web_browsing",
    resolveDataPath("estudo/AMOSTRA_WEB_BROWSING.csv"),
    {
      delimiter: "|",
      decimalComma: true,
    }
  );
  console.log(`  Inserted ${wbCount} web_browsing rows`);
}
