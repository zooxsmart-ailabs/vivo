import {
  pgTable,
  text,
  integer,
  smallint,
  bigint,
  doublePrecision,
  real,
  boolean,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const networkPerformanceMobile = pgTable(
  "networkPerformanceMobile",
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
    idDevice: integer("idDevice"),

    // Device
    attrDeviceAndroidFingerprint: text("attrDeviceAndroidFingerprint"),
    attrDeviceModel: text("attrDeviceModel"),
    attrDeviceManufacturer: text("attrDeviceManufacturer"),
    attrDeviceModelRaw: text("attrDeviceModelRaw"),
    attrDeviceManufacturerRaw: text("attrDeviceManufacturerRaw"),
    attrDeviceBrandRaw: text("attrDeviceBrandRaw"),
    attrDeviceChipset: text("attrDeviceChipset"),
    attrDeviceChipsetManufacturer: text("attrDeviceChipsetManufacturer"),
    attrDeviceHardwareName: text("attrDeviceHardwareName"),
    attrDeviceOsVersion: text("attrDeviceOsVersion"),
    attrDeviceBuild: text("attrDeviceBuild"),
    isDeviceRooted: boolean("isDeviceRooted"),
    attrDeviceRadio: text("attrDeviceRadio"),
    attrDeviceRamMb: integer("attrDeviceRamMb"),
    attrDeviceStorageMb: integer("attrDeviceStorageMb"),
    isDeviceWorldPhone: boolean("isDeviceWorldPhone"),
    attrDeviceMultiSimSupport: smallint("attrDeviceMultiSimSupport"),
    numDeviceActiveModems: integer("numDeviceActiveModems"),
    numDeviceSupportedModems: integer("numDeviceSupportedModems"),
    isDeviceConcurrentVoiceDataSupported: boolean(
      "isDeviceConcurrentVoiceDataSupported"
    ),
    isDeviceDataConnectionAllowed: boolean("isDeviceDataConnectionAllowed"),
    isDeviceDataCapable: boolean("isDeviceDataCapable"),
    isDeviceDataRoamingEnabled: boolean("isDeviceDataRoamingEnabled"),
    isDeviceIccCardPresent: boolean("isDeviceIccCardPresent"),
    attrDeviceServiceState: smallint("attrDeviceServiceState"),
    attrDeviceThermalStatus: integer("attrDeviceThermalStatus"),
    valDeviceThermalHeadroom: doublePrecision("valDeviceThermalHeadroom"),
    attrDeviceSoftwareVersion: text("attrDeviceSoftwareVersion"),
    attrDeviceEsimEmbedded: boolean("attrDeviceEsimEmbedded"),

    // Permissions
    isAppPermissionPhoneState: boolean("isAppPermissionPhoneState"),
    isAppPermissionFineLocation: boolean("isAppPermissionFineLocation"),
    isAppPermissionCoarseLocation: boolean("isAppPermissionCoarseLocation"),
    isAppPermissionBackgroundLocation: boolean(
      "isAppPermissionBackgroundLocation"
    ),
    isAppPermissionWifiState: boolean("isAppPermissionWifiState"),

    // SIM Operator
    attrSimOperatorCommonName: text("attrSimOperatorCommonName"),
    attrSimOperatorNameRaw: text("attrSimOperatorNameRaw"),
    attrSimOperatorMcc: integer("attrSimOperatorMcc"),
    attrSimOperatorMnc: integer("attrSimOperatorMnc"),
    attrAltsimOperatorName: text("attrAltsimOperatorName"),
    attrAltsimOperatorMcc: integer("attrAltsimOperatorMcc"),
    attrAltsimOperatorMnc: integer("attrAltsimOperatorMnc"),

    // Network Operator
    attrNetworkOperatorMcc: integer("attrNetworkOperatorMcc"),
    attrNetworkOperatorMnc: integer("attrNetworkOperatorMnc"),
    attrNetworkOperatorCommonName: text("attrNetworkOperatorCommonName"),
    attrIspCommonName: text("attrIspCommonName"),
    attrIspNameRaw: text("attrIspNameRaw"),
    attrSimTypeAllocationCode: text("attrSimTypeAllocationCode"),
    attrSimState: smallint("attrSimState"),

    // Test
    attrTestMethod: text("attrTestMethod"),
    attrTestIpVersion: smallint("attrTestIpVersion"),

    // Connection
    idConnectionTypeStart: smallint("idConnectionTypeStart"),
    idConnectionTypeEnd: smallint("idConnectionTypeEnd"),
    numConnectionsFailed: smallint("numConnectionsFailed"),
    isConnectionCarrierAggregation: text("isConnectionCarrierAggregation"),
    attrConnectionNrState: integer("attrConnectionNrState"),
    attrConnectionApn: text("attrConnectionApn"),
    idConnectionNetSpeed: integer("idConnectionNetSpeed"),
    isConnectionAccessTechnologyNr: boolean("isConnectionAccessTechnologyNr"),
    idConnectionNetworkOverrideType: smallint(
      "idConnectionNetworkOverrideType"
    ),
    attrConnectionDownstreamBandwidthKbps: integer(
      "attrConnectionDownstreamBandwidthKbps"
    ),
    attrConnectionUpstreamBandwidthKbps: integer(
      "attrConnectionUpstreamBandwidthKbps"
    ),
    attrConnectionNat64Prefix: text("attrConnectionNat64Prefix"),
    attrConnectionTypeStartString: text("attrConnectionTypeStartString"),
    attrConnectionTypeEndString: text("attrConnectionTypeEndString"),

    // Location
    attrLocationLatitude: doublePrecision("attrLocationLatitude"),
    attrLocationLongitude: doublePrecision("attrLocationLongitude"),
    attrLocationStartLatitude: doublePrecision("attrLocationStartLatitude"),
    attrLocationStartLongitude: doublePrecision("attrLocationStartLongitude"),
    idLocationStartType: smallint("idLocationStartType"),
    idLocationEndType: smallint("idLocationEndType"),
    attrLocationAccuracyM: integer("attrLocationAccuracyM"),
    attrLocationAgeMs: bigint("attrLocationAgeMs", { mode: "number" }),
    attrLocationAltitudeM: integer("attrLocationAltitudeM"),
    attrLocationVerticalAccuracyM: integer("attrLocationVerticalAccuracyM"),
    attrLocationSpeedMps: doublePrecision("attrLocationSpeedMps"),
    // geom added via timescale-setup.sql (PostGIS)

    // Place
    attrPlaceFormattedAddress: text("attrPlaceFormattedAddress"),
    attrPlaceName: text("attrPlaceName"),
    attrPlaceLocalityType: text("attrPlaceLocalityType"),
    attrPlaceCountry: text("attrPlaceCountry"),
    attrPlaceCountryCode: text("attrPlaceCountryCode"),
    attrPlaceRegion: text("attrPlaceRegion"),
    attrPlaceSubregion: text("attrPlaceSubregion"),
    attrPlaceSubsubregion: text("attrPlaceSubsubregion"),
    attrPlacePostalCode: text("attrPlacePostalCode"),

    // Speed Results
    valDownloadKbps: integer("valDownloadKbps"),
    valUploadKbps: integer("valUploadKbps"),
    valTestDownloadKb: integer("valTestDownloadKb"),
    numTestDownloadThreads: smallint("numTestDownloadThreads"),
    valTestDownloadDurationMs: integer("valTestDownloadDurationMs"),
    valTestUploadKb: integer("valTestUploadKb"),
    numTestUploadThreads: smallint("numTestUploadThreads"),
    valTestUploadDurationMs: integer("valTestUploadDurationMs"),
    isDownloadStopped: boolean("isDownloadStopped"),

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
    valJitterMs: doublePrecision("valJitterMs"),
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
    isNetworkRoaming: boolean("isNetworkRoaming"),
    isNetworkInternationalRoaming: boolean("isNetworkInternationalRoaming"),
    isNetworkVpn: boolean("isNetworkVpn"),
    isDevice5gCapable: boolean("isDevice5gCapable"),

    // App
    attrAppVersion: text("attrAppVersion"),
    attrAppStore: text("attrAppStore"),

    // Server
    attrServerName: text("attrServerName"),
    attrServerSponsorName: text("attrServerSponsorName"),
    attrServerLatitude: doublePrecision("attrServerLatitude"),
    attrServerLongitude: doublePrecision("attrServerLongitude"),
    valServerDistanceKm: integer("valServerDistanceKm"),
    attrServerCountry: text("attrServerCountry"),
    attrServerCountryCode: text("attrServerCountryCode"),
    isServerAutoSelected: boolean("isServerAutoSelected"),
    isServerOnNetwork: boolean("isServerOnNetwork"),
    attrServerAsn: bigint("attrServerAsn", { mode: "number" }),
    numServerDownload: smallint("numServerDownload"),

    // Signal
    valSignalRsrpDbm: bigint("valSignalRsrpDbm", { mode: "number" }),
    valSignalCsiRsrpDbm: smallint("valSignalCsiRsrpDbm"),
    valSignalSsRsrpDbm: smallint("valSignalSsRsrpDbm"),
    valSignalRsrqDb: smallint("valSignalRsrqDb"),
    valSignalCsiRsrqDb: smallint("valSignalCsiRsrqDb"),
    valSignalSsRsrqDb: smallint("valSignalSsRsrqDb"),
    valSignalRssnrDb: smallint("valSignalRssnrDb"),
    valSignalCsiSnrDb: smallint("valSignalCsiSnrDb"),
    valSignalSsSnrDb: smallint("valSignalSsSnrDb"),
    valSignalWcdmaEcnoDb: integer("valSignalWcdmaEcnoDb"),
    valSignalRssiDbm: integer("valSignalRssiDbm"),
    valSignalGsmRssiDbm: integer("valSignalGsmRssiDbm"),
    valSignalTimingAdvanceTs: integer("valSignalTimingAdvanceTs"),
    valSignalCqi: smallint("valSignalCqi"),
    attrSignalCellType: smallint("attrSignalCellType"),

    // Cell
    attrCellNrFrequencyRange: smallint("attrCellNrFrequencyRange"),
    attrCellBandwidthKhz: integer("attrCellBandwidthKhz"),
    attrCellBandwidthsKhz: text("attrCellBandwidthsKhz"),
    idCellPrimary: bigint("idCellPrimary", { mode: "number" }),
    idCellLteEnodeb: bigint("idCellLteEnodeb", { mode: "number" }),
    attrCellPci: integer("attrCellPci"),
    attrCellNrPci: smallint("attrCellNrPci"),
    attrCellTac: integer("attrCellTac"),
    attrCellLac: integer("attrCellLac"),
    attrCellPsc: integer("attrCellPsc"),
    attrCellFrequencyChannel: integer("attrCellFrequencyChannel"),
    attrCellFrequencyChannelType: text("attrCellFrequencyChannelType"),
    attrCellNrArfcn: integer("attrCellNrArfcn"),
    attrCellLteBands: text("attrCellLteBands"),
    attrCellNrBands: text("attrCellNrBands"),
    idCellNr: bigint("idCellNr", { mode: "number" }),
    idCellStart: integer("idCellStart"),
    idCellGsm: bigint("idCellGsm", { mode: "number" }),
    attrNetworkOperatorMccNr: text("attrNetworkOperatorMccNr"),
    attrNetworkOperatorMncNr: text("attrNetworkOperatorMncNr"),

    // Indoor
    idLocationBuilding: text("idLocationBuilding"),
    valIndoorConfidenceLevel: real("valIndoorConfidenceLevel"),

    // Portal
    isPortalIncluded: boolean("isPortalIncluded"),
    attrPortalCategories: text("attrPortalCategories"),

    // ASU
    valAsuLevel: integer("valAsuLevel"),
    valNrAsuLevel: integer("valNrAsuLevel"),

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
