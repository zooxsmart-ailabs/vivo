import {
  pgTable,
  text,
  integer,
  smallint,
  bigint,
  doublePrecision,
  boolean,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const networkPerformanceFixed = pgTable(
  "networkPerformanceFixed",
  {
    idResult: bigint("idResult", { mode: "number" }).notNull(),
    guidResult: text("guidResult"),
    idPlatform: smallint("idPlatform"),
    tsResult: timestamp("tsResult", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    tsResultReceived: timestamp("tsResultReceived", {
      withTimezone: true,
      mode: "string",
    }),
    attrLocationTimezone: text("attrLocationTimezone"),
    idDevice: bigint("idDevice", { mode: "number" }),

    // Device
    attrDeviceModel: text("attrDeviceModel"),
    attrDeviceManufacturer: text("attrDeviceManufacturer"),
    attrDeviceManufacturerRaw: text("attrDeviceManufacturerRaw"),
    attrDeviceBrandRaw: text("attrDeviceBrandRaw"),
    attrDeviceChipset: text("attrDeviceChipset"),
    attrDeviceChipsetManufacturer: text("attrDeviceChipsetManufacturer"),
    attrDeviceOsVersion: text("attrDeviceOsVersion"),
    attrDeviceRadio: text("attrDeviceRadio"),
    attrDeviceRamMb: integer("attrDeviceRamMb"),
    attrDeviceStorageMb: integer("attrDeviceStorageMb"),
    attrDeviceSoftwareVersion: text("attrDeviceSoftwareVersion"),
    attrDeviceSystemMemoryMb: integer("attrDeviceSystemMemoryMb"),
    attrDeviceProcessorCount: smallint("attrDeviceProcessorCount"),
    attrDeviceProcessorType: text("attrDeviceProcessorType"),
    attrDeviceProcessorFrequency: smallint("attrDeviceProcessorFrequency"),

    // Provider / SIM
    attrProviderName: text("attrProviderName"),
    attrProviderNameCommon: text("attrProviderNameCommon"),
    attrSimOperatorCommonName: text("attrSimOperatorCommonName"),
    attrSimOperatorNameRaw: text("attrSimOperatorNameRaw"),
    attrSimOperatorMcc: integer("attrSimOperatorMcc"),
    attrSimOperatorMnc: integer("attrSimOperatorMnc"),
    attrNetworkOperatorMcc: integer("attrNetworkOperatorMcc"),
    attrNetworkOperatorMnc: integer("attrNetworkOperatorMnc"),

    // Connection
    idConnectionType: smallint("idConnectionType"),
    attrConnectionTypeString: text("attrConnectionTypeString"),
    attrConnectionLinkSpeed: integer("attrConnectionLinkSpeed"),
    idConnectionNetSpeed: smallint("idConnectionNetSpeed"),

    // Test
    attrTestMethod: text("attrTestMethod"),
    attrTestIpVersion: smallint("attrTestIpVersion"),
    attrResultTestSource: text("attrResultTestSource"),
    attrBrowserAgent: text("attrBrowserAgent"),

    // Location
    attrLocationLatitude: doublePrecision("attrLocationLatitude"),
    attrLocationLongitude: doublePrecision("attrLocationLongitude"),
    attrLocationAltitude: integer("attrLocationAltitude"),
    attrLocationAccuracyM: integer("attrLocationAccuracyM"),
    attrLocationAgeMs: bigint("attrLocationAgeMs", { mode: "number" }),
    idLocationType: smallint("idLocationType"),
    // geom added via timescale-setup.sql (PostGIS)

    // Place
    attrPlaceName: text("attrPlaceName"),
    attrPlaceLocalityType: text("attrPlaceLocalityType"),
    attrPlaceCountry: text("attrPlaceCountry"),
    attrPlaceCountryCode: text("attrPlaceCountryCode"),
    attrPlaceRegion: text("attrPlaceRegion"),
    attrPlaceSubregion: text("attrPlaceSubregion"),
    attrPlaceSubsubregion: text("attrPlaceSubsubregion"),
    attrPlacePostalCode: text("attrPlacePostalCode"),

    // WiFi
    attrWifiMacManufacturer: text("attrWifiMacManufacturer"),
    attrWifiFrequencyMhz: integer("attrWifiFrequencyMhz"),
    attrWifiChannelWidthMhz: smallint("attrWifiChannelWidthMhz"),
    isWifi5ghz: boolean("isWifi5ghz"),
    isWifi6ghz: boolean("isWifi6ghz"),
    isWifi24ghzBandSupported: boolean("isWifi24ghzBandSupported"),
    isWifi5ghzSupported: boolean("isWifi5ghzSupported"),
    isWifi6ghzBandSupported: boolean("isWifi6ghzBandSupported"),
    isWifi60ghzBandSupported: boolean("isWifi60ghzBandSupported"),
    attrWifiBaseStationId: text("attrWifiBaseStationId"),
    attrWifiRssiDbm: integer("attrWifiRssiDbm"),
    attrWifiRxLinkSpeedMbps: integer("attrWifiRxLinkSpeedMbps"),
    attrWifiTxLinkSpeedMbps: integer("attrWifiTxLinkSpeedMbps"),
    attrWifiMaxSupportedRxLinkSpeedMbps: integer(
      "attrWifiMaxSupportedRxLinkSpeedMbps"
    ),
    attrWifiMaxSupportedTxLinkSpeedMbps: integer(
      "attrWifiMaxSupportedTxLinkSpeedMbps"
    ),
    attrWifiStandard: text("attrWifiStandard"),
    idWifiStandard: smallint("idWifiStandard"),

    // Speed Results
    valDownloadMbps: doublePrecision("valDownloadMbps"),
    valUploadMbps: doublePrecision("valUploadMbps"),
    numTestDownloadThreads: smallint("numTestDownloadThreads"),
    numTestUploadThreads: smallint("numTestUploadThreads"),

    // Latency
    valLatencyMinMs: integer("valLatencyMinMs"),
    valLatencyIqmMs: doublePrecision("valLatencyIqmMs"),
    valLatencyMaxMs: integer("valLatencyMaxMs"),
    valMultiserverLatencyMs: doublePrecision("valMultiserverLatencyMs"),
    valDownloadLatencyMinMs: doublePrecision("valDownloadLatencyMinMs"),
    valDownloadLatencyIqmMs: doublePrecision("valDownloadLatencyIqmMs"),
    valDownloadLatencyMaxMs: doublePrecision("valDownloadLatencyMaxMs"),
    valUploadLatencyMinMs: doublePrecision("valUploadLatencyMinMs"),
    valUploadLatencyIqmMs: doublePrecision("valUploadLatencyIqmMs"),
    valUploadLatencyMaxMs: doublePrecision("valUploadLatencyMaxMs"),
    valJitterMs: integer("valJitterMs"),
    valMultiserverJitterMs: doublePrecision("valMultiserverJitterMs"),

    // Packet Loss
    numPacketLossSent: integer("numPacketLossSent"),
    numPacketLossReceived: integer("numPacketLossReceived"),
    metricPacketLossPercent: doublePrecision("metricPacketLossPercent"),

    // Traceroute
    numTracerouteHops: smallint("numTracerouteHops"),
    attrTraceroute0IpAddress: text("attrTraceroute0IpAddress"),
    valTraceroute0LatencyMs: integer("valTraceroute0LatencyMs"),
    attrTraceroute0PingMtu: integer("attrTraceroute0PingMtu"),
    attrTraceroute1IpAddress: text("attrTraceroute1IpAddress"),
    valTraceroute1LatencyMs: integer("valTraceroute1LatencyMs"),
    attrTraceroute1PingMtu: integer("attrTraceroute1PingMtu"),

    // Network
    attrNetworkIpv4Address: text("attrNetworkIpv4Address"),
    attrNetworkIpv6Address: text("attrNetworkIpv6Address"),
    attrNetworkAsn: bigint("attrNetworkAsn", { mode: "number" }),
    isNetworkVpn: boolean("isNetworkVpn"),

    // App
    attrAppVersion: text("attrAppVersion"),

    // Server
    attrServerName: text("attrServerName"),
    attrServerSponsorName: text("attrServerSponsorName"),
    attrServerLatitude: doublePrecision("attrServerLatitude"),
    attrServerLongitude: doublePrecision("attrServerLongitude"),
    attrServerDistanceKm: integer("attrServerDistanceKm"),
    attrServerCountryCode: text("attrServerCountryCode"),
    isServerAutoSelected: boolean("isServerAutoSelected"),
    isServerOnNetwork: boolean("isServerOnNetwork"),
    attrServerAsn: bigint("attrServerAsn", { mode: "number" }),
    numServerDownload: smallint("numServerDownload"),

    // Signal / Cell
    attrSignalCellType: smallint("attrSignalCellType"),
    attrCellFrequencyChannel: integer("attrCellFrequencyChannel"),
    attrCellFrequencyChannelType: text("attrCellFrequencyChannelType"),
    attrCellLac: integer("attrCellLac"),
    attrCellNrPci: smallint("attrCellNrPci"),

    // Portal
    isPortalIncluded: boolean("isPortalIncluded"),
    attrPortalCategories: text("attrPortalCategories"),

    // ASU
    valAsuLevel: integer("valAsuLevel"),
    valNrAsuLevel: integer("valNrAsuLevel"),

    // Permissions
    isAppPermissionPhoneState: boolean("isAppPermissionPhoneState"),
    isAppPermissionFineLocation: boolean("isAppPermissionFineLocation"),
    isAppPermissionCoarseLocation: boolean("isAppPermissionCoarseLocation"),
    isAppPermissionBackgroundLocation: boolean(
      "isAppPermissionBackgroundLocation"
    ),
    isAppPermissionWifiState: boolean("isAppPermissionWifiState"),

    // Metadata
    ingestedAt: timestamp("ingestedAt", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [primaryKey({ columns: [t.idResult, t.tsResult] })]
);
