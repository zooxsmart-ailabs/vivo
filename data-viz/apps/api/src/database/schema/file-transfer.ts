import {
  pgTable,
  varchar,
  text,
  integer,
  smallint,
  bigint,
  doublePrecision,
  real,
  boolean,
  timestamp,
  date,
} from "drizzle-orm/pg-core";
import { inet, inetArray } from "./_custom-types";

export const fileTransfer = pgTable("file_transfer", {
  // Timestamps & Identifiers
  tsResult: timestamp("ts_result", {
    withTimezone: true,
    mode: "string",
  }).notNull(),
  tsResultReceived: timestamp("ts_result_received", {
    withTimezone: true,
    mode: "string",
  }),
  idPlatform: varchar("id_platform", { length: 7 }),
  idDevice: varchar("id_device", { length: 35 }),
  guidResult: text("guid_result"),
  attrLocationTimezone: varchar("attr_location_timezone", { length: 50 }),

  // Test Results (Upload)
  hasUlTestStatus: boolean("has_ul_test_status"),
  valUlThroughput: doublePrecision("val_ul_throughput"),
  valUlFileSize: integer("val_ul_file_size"),

  // Test Results (Download)
  hasDlTestStatus: boolean("has_dl_test_status"),
  valDlThroughput: doublePrecision("val_dl_throughput"),
  valDlFileSize: integer("val_dl_file_size"),

  // Latency
  hasLatencyTestStatus: boolean("has_latency_test_status"),
  valLatencyAvg: integer("val_latency_avg"),

  // Device Info
  attrDeviceModelRaw: varchar("attr_device_model_raw", { length: 255 }),
  attrDeviceModel: varchar("attr_device_model", { length: 255 }),
  attrDeviceBrandRaw: varchar("attr_device_brand_raw", { length: 255 }),
  attrDeviceOsVersion: varchar("attr_device_os_version", { length: 20 }),
  idDeviceSimSlot: smallint("id_device_sim_slot"),
  numDeviceSimSlots: smallint("num_device_sim_slots"),
  attrDeviceBatteryState: varchar("attr_device_battery_state", { length: 2 }),
  valDeviceBatteryTemperature: real("val_device_battery_temperature"),
  valDeviceCpuUsage: real("val_device_cpu_usage"),
  valDeviceRam: bigint("val_device_ram", { mode: "number" }),
  valDeviceFreeRam: bigint("val_device_free_ram", { mode: "number" }),
  valDeviceMaximumStorage: bigint("val_device_maximum_storage", {
    mode: "number",
  }),
  valDeviceFreeStorage: bigint("val_device_free_storage", { mode: "number" }),
  isDevice5gCapable: boolean("is_device_5g_capable"),

  // SIM Operator
  attrSimOperatorCommonName: varchar("attr_sim_operator_common_name", {
    length: 255,
  }),
  attrSimOperatorMcc: smallint("attr_sim_operator_mcc"),
  attrSimOperatorMnc: smallint("attr_sim_operator_mnc"),
  attrNetworkOperatorMcc: smallint("attr_network_operator_mcc"),
  attrNetworkOperatorMnc: smallint("attr_network_operator_mnc"),
  attrSimOperatorNameRaw: varchar("attr_sim_operator_name_raw", {
    length: 255,
  }),

  // Alternate SIM
  attrAltsimOperatorMcc: varchar("attr_altsim_operator_mcc", { length: 3 }),
  attrAltsimOperatorMnc: varchar("attr_altsim_operator_mnc", { length: 3 }),
  attrAltsimOperatorNameRaw: varchar("attr_altsim_operator_name_raw", {
    length: 255,
  }),

  // Network
  attrNetworkOperatorNameRaw: varchar("attr_network_operator_name_raw", {
    length: 255,
  }),
  attrNetworkIspName: varchar("attr_network_isp_name", { length: 255 }),
  attrNetworkAsn: bigint("attr_network_asn", { mode: "number" }),
  attrConnectionTechName: varchar("attr_connection_tech_name", { length: 255 }),
  attrConnectionStandardName: varchar("attr_connection_standard_name", {
    length: 255,
  }),
  attrConnectionFamilyName: varchar("attr_connection_family_name", {
    length: 255,
  }),
  attrConnectionFamilyNameFirstHop: varchar(
    "attr_connection_family_name_first_hop",
    { length: 255 }
  ),
  attrConnectionGenerationName: varchar("attr_connection_generation_name", {
    length: 255,
  }),
  attrConnectionDownstreamBandwidthKbps: integer(
    "attr_connection_downstream_bandwidth_kbps"
  ),
  attrConnectionUpstreamBandwidthKbps: integer(
    "attr_connection_upstream_bandwidth_kbps"
  ),
  attrVopsSupport: smallint("attr_vops_support"),
  isConnectionCarrierAggregation: boolean("is_connection_carrier_aggregation"),
  attrConnectionNrState: varchar("attr_connection_nr_state", { length: 1 }),
  idConnectionNetworkOverrideType: real("id_connection_network_override_type"),

  // Access Technology
  attrNetworkOperatorName: varchar("attr_network_operator_name", {
    length: 255,
  }),
  attrDlAccessTechEnd: varchar("attr_dl_access_tech_end", { length: 14 }),
  valDlAccessTechNumChanges: smallint("val_dl_access_tech_num_changes"),
  attrDlAccessTechStart: varchar("attr_dl_access_tech_start", { length: 14 }),
  valDlFirstByteTime: integer("val_dl_first_byte_time"),
  attrUlAccessTechEnd: varchar("attr_ul_access_tech_end", { length: 14 }),
  valUlAccessTechNumChanges: smallint("val_ul_access_tech_num_changes"),
  attrUlAccessTechStart: varchar("attr_ul_access_tech_start", { length: 14 }),
  valUlFirstByteTime: integer("val_ul_first_byte_time"),

  // DNS / TCP / TLS
  valDnsLookupTime: integer("val_dns_lookup_time"),
  valTcpConnectTime: integer("val_tcp_connect_time"),
  valTlsSetupTime: integer("val_tls_setup_time"),
  attrEndpointType: varchar("attr_endpoint_type", { length: 10 }),

  // Roaming & VPN
  isNetworkRoaming: boolean("is_network_roaming"),
  isNetworkVpn: boolean("is_network_vpn"),

  // Location
  attrLocationLatitude: doublePrecision("attr_location_latitude"),
  attrLocationLongitude: doublePrecision("attr_location_longitude"),
  attrLocationAccuracyM: real("attr_location_accuracy_m"),
  attrLocationAgeMs: integer("attr_location_age_ms"),
  attrLocationSpeedMps: doublePrecision("attr_location_speed_mps"),
  attrLocationSpeedAccuracyMps: doublePrecision(
    "attr_location_speed_accuracy_mps"
  ),
  attrPlaceFormattedAddress: varchar("attr_place_formatted_address", {
    length: 100,
  }),
  attrPlaceName: varchar("attr_place_name", { length: 100 }),
  attrPlaceLocalityType: varchar("attr_place_locality_type", { length: 100 }),
  attrPlaceCountry: varchar("attr_place_country", { length: 100 }),
  attrPlaceCountryCode: varchar("attr_place_country_code", { length: 2 }),
  attrPlaceRegion: varchar("attr_place_region", { length: 100 }),
  attrPlaceSubregion: varchar("attr_place_subregion", { length: 100 }),
  attrPlaceSubsubregion: varchar("attr_place_subsubregion", { length: 100 }),
  attrPlacePostalCode: varchar("attr_place_postal_code", { length: 100 }),
  attrGeohash6: varchar("attr_geohash6", { length: 6 }),
  attrGeohash7: varchar("attr_geohash7", { length: 7 }),
  attrGeohash8: varchar("attr_geohash8", { length: 8 }),
  attrLocationAltitudeM: doublePrecision("attr_location_altitude_m"),
  attrLocationVerticalAccuracyM: doublePrecision(
    "attr_location_vertical_accuracy_m"
  ),
  idLocationType: smallint("id_location_type"),

  // Bytes
  valBytesReceived: bigint("val_bytes_received", { mode: "number" }),
  valBytesSent: bigint("val_bytes_sent", { mode: "number" }),

  // IP / Server
  attrPrivateIpAddress: inetArray("attr_private_ip_address"),
  attrNetworkIpv4Address: inet("attr_network_ipv4_address"),
  attrNetworkIpv6Address: inet("attr_network_ipv6_address"),
  attrDataSourceVersion: varchar("attr_data_source_version", { length: 20 }),
  attrServerIpv4Address: inet("attr_server_ipv4_address"),
  attrServerName: varchar("attr_server_name", { length: 100 }),

  // Signal (LTE)
  valSignalCqi: integer("val_signal_cqi"),
  valSignalRsrpDbm: integer("val_signal_rsrp_dbm"),
  valSignalRsrqDb: integer("val_signal_rsrq_db"),
  valSignalRsrpDbm2: integer("val_signal_rsrp_dbm2"),
  valSignalRssnrDb: integer("val_signal_rssnr_db"),
  valSignalTimingAdvanceTs: integer("val_signal_timing_advance_ts"),

  // Signal (5G NR - CSI)
  valSignalCsiSnrDb: integer("val_signal_csi_snr_db"),
  valSignalCsiRsrpDbm: integer("val_signal_csi_rsrp_dbm"),
  valSignalCsiRsrqDb: integer("val_signal_csi_rsrq_db"),

  // Signal (5G NR - SS)
  valSignalSsSnrDb: integer("val_signal_ss_snr_db"),
  valSignalSsRsrpDbm: integer("val_signal_ss_rsrp_dbm"),
  valSignalSsRsrqDb: integer("val_signal_ss_rsrq_db"),

  // Cell Info
  attrCellBandwidthsKhz: varchar("attr_cell_bandwidths_khz", { length: 100 }),
  idCellPrimary: bigint("id_cell_primary", { mode: "number" }),
  attrCellArfcn: bigint("attr_cell_arfcn", { mode: "number" }),
  attrCellPci: integer("attr_cell_pci"),
  attrCellLac: bigint("attr_cell_lac", { mode: "number" }),
  attrCellTac: bigint("attr_cell_tac", { mode: "number" }),
  isCellNrAvailable: boolean("is_cell_nr_available"),
  attrCellNrFrequencyRange: integer("attr_cell_nr_frequency_range"),
  idCellLteEnodeb: bigint("id_cell_lte_enodeb", { mode: "number" }),
  attrCellBands: text("attr_cell_bands"),

  // Cell Frequency
  attrCellFrequencyChannel: bigint("attr_cell_frequency_channel", {
    mode: "number",
  }),
  attrCellFrequencyChannelType: varchar("attr_cell_frequency_channel_type", {
    length: 10,
  }),

  // WiFi
  attrWifiFrequencyMhz: integer("attr_wifi_frequency_mhz"),
  attrWifiChannelWidthMhz: smallint("attr_wifi_channel_width_mhz"),
  attrWifiStandard: varchar("attr_wifi_standard", { length: 25 }),
  idWifiStandard: smallint("id_wifi_standard"),
  attrWifiRssiDbm: integer("attr_wifi_rssi_dbm"),
  attrWifiMaxSupportedRxLinkSpeedMbps: integer(
    "attr_wifi_max_supported_rx_link_speed_mbps"
  ),
  attrWifiMaxSupportedTxLinkSpeedMbps: integer(
    "attr_wifi_max_supported_tx_link_speed_mbps"
  ),
  attrWifiRxLinkSpeedMbps: integer("attr_wifi_rx_link_speed_mbps"),
  attrWifiTxLinkSpeedMbps: integer("attr_wifi_tx_link_speed_mbps"),
  isWifiConnected: boolean("is_wifi_connected"),

  // Indoor
  idLocationBuilding: varchar("id_location_building", { length: 255 }),
  valIndoorConfidenceLevel: real("val_indoor_confidence_level"),

  // Partição / Snapshot
  dtFoto: date("dt_foto"),
});
