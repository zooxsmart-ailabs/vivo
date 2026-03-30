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

export const webBrowsing = pgTable("web_browsing", {
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

  // Web Browsing Metrics
  valWebPageLoadTime: integer("val_web_page_load_time"),
  valWebPageFirstByteTime: integer("val_web_page_first_byte_time"),
  isWebPageFailsToLoad: boolean("is_web_page_fails_to_load"),
  attrWebPageUrl: varchar("attr_web_page_url", { length: 100 }),

  // Cell Bands (inline, before device)
  attrCellBands: text("attr_cell_bands"),

  // Device Info
  attrDeviceModelRaw: varchar("attr_device_model_raw", { length: 255 }),
  attrDeviceBrandRaw: varchar("attr_device_brand_raw", { length: 255 }),
  attrDeviceOsVersion: varchar("attr_device_os_version", { length: 20 }),
  idDeviceSimSlot: smallint("id_device_sim_slot"),
  numDeviceSimSlots: smallint("num_device_sim_slots"),
  attrDeviceBatteryState: varchar("attr_device_battery_state", { length: 1 }),
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
  attrNetworkOperatorName: varchar("attr_network_operator_name", {
    length: 100,
  }),

  // Roaming & VPN & Access Tech
  isNetworkRoaming: boolean("is_network_roaming"),
  attrAccessTechEnd: varchar("attr_access_tech_end", { length: 14 }),
  numAccessTechNumChanges: smallint("num_access_tech_num_changes"),
  attrAccessTechStart: varchar("attr_access_tech_start", { length: 14 }),
  isNetworkVpn: boolean("is_network_vpn"),

  // Location
  attrLocationLatitude: doublePrecision("attr_location_latitude"),
  attrLocationLongitude: doublePrecision("attr_location_longitude"),
  attrLocationAccuracyM: real("attr_location_accuracy_m"),
  attrLocationAgeMs: integer("attr_location_age_ms"),
  attrLocationAltitudeM: doublePrecision("attr_location_altitude_m"),
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
  attrLocationVerticalAccuracyM: doublePrecision(
    "attr_location_vertical_accuracy_m"
  ),
  idLocationType: smallint("id_location_type"),

  // IP / Server
  attrPrivateIpAddress: text("attr_private_ip_address"),
  attrNetworkIpv4Address: text("attr_network_ipv4_address"),
  attrNetworkIpv6Address: text("attr_network_ipv6_address"),
  attrDataSourceVersion: varchar("attr_data_source_version", { length: 20 }),

  // Signal (LTE)
  valSignalCqi: integer("val_signal_cqi"),
  valSignalRsrpDbm: integer("val_signal_rsrp_dbm"),
  valSignalRsrqDb: integer("val_signal_rsrq_db"),
  valSignalRsrpDbm2: integer("val_signal_rsrp_dbm2"),
  valSignalRssnrDb: integer("val_signal_rssnr_db"),
  valSignalTimingAdvanceTs: integer("val_signal_timing_advance_ts"),

  // Signal (5G NR - CSI)
  valSignalCsiSnrDb: integer("val_signal_csi_snr_db"),
  valSignalCsiRsrqDb: integer("val_signal_csi_rsrq_db"),
  valSignalCsiRsrpDbm: integer("val_signal_csi_rsrp_dbm"),

  // Signal (5G NR - SS)
  valSignalSsSnrDbm: integer("val_signal_ss_snr_dbm"),
  valSignalSsRsrpDbm: integer("val_signal_ss_rsrp_dbm"),
  valSignalSsRsrqDb: integer("val_signal_ss_rsrq_db"),

  // Cell Info
  attrCellBandwidthsKhz: varchar("attr_cell_bandwidths_khz", { length: 100 }),
  idCellPrimary: bigint("id_cell_primary", { mode: "number" }),
  attrCellPci: integer("attr_cell_pci"),
  attrCellLac: bigint("attr_cell_lac", { mode: "number" }),
  attrCellTac: bigint("attr_cell_tac", { mode: "number" }),
  isDcNrRestricted: boolean("is_dc_nr_restricted"),
  isEnDcAvailable: boolean("is_en_dc_available"),
  isCellNrAvailable: boolean("is_cell_nr_available"),
  attrCellNrFrequencyRange: real("attr_cell_nr_frequency_range"),

  // Cell Frequency
  attrCellFrequencyChannel: bigint("attr_cell_frequency_channel", {
    mode: "number",
  }),
  attrCellFrequencyChannelType: varchar("attr_cell_frequency_channel_type", {
    length: 10,
  }),
  attrCellTechnologyStandardName: varchar(
    "attr_cell_technology_standard_name",
    { length: 50 }
  ),

  // WiFi
  attrWifiFrequencyMhz: integer("attr_wifi_frequency_mhz"),
  attrWifiChannelWidthId: smallint("attr_wifi_channel_width_id"),
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
