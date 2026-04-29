-- =============================================================================
-- Migration 0028: extender 3 hypertables QoE com colunas que a Ookla
-- adicionou ao parquet ao longo do tempo e que não existiam no schema
-- legado (criado via estudo/import.sh).
--
-- Adiciona ~94 colunas (5G NR, multi-PLMN, metadados de carrier/device,
-- etc.) em file_transfer / video / web_browsing. Após aplicar, basta
-- forçar reload (UPDATE ookla_catalog SET status='catalogued' ...) que
-- copy_loader (com ON CONFLICT DO UPDATE) preenche os campos novos.
--
-- Tipos derivados do schema parquet real. Listas (parquet list<>)
-- viram TEXT (serializadas como JSON pelo copy_loader).
-- =============================================================================

-- file_transfer: 28 colunas adicionadas
ALTER TABLE file_transfer ADD COLUMN IF NOT EXISTS val_signal_ss_snr_dbm integer;  -- int32
ALTER TABLE file_transfer ADD COLUMN IF NOT EXISTS attr_wifi_channel_width_id integer;  -- int32
ALTER TABLE file_transfer ADD COLUMN IF NOT EXISTS attr_cell_technology_standard_name text;  -- string
ALTER TABLE file_transfer ADD COLUMN IF NOT EXISTS is_device_rooted boolean;  -- bool
ALTER TABLE file_transfer ADD COLUMN IF NOT EXISTS is_carrier_resolved_from_ip_address boolean;  -- bool
ALTER TABLE file_transfer ADD COLUMN IF NOT EXISTS attr_network_operator_common_name text;  -- string
ALTER TABLE file_transfer ADD COLUMN IF NOT EXISTS attr_network_isp_common_name text;  -- string
ALTER TABLE file_transfer ADD COLUMN IF NOT EXISTS attr_connection_type integer;  -- int32
ALTER TABLE file_transfer ADD COLUMN IF NOT EXISTS attr_server_ipv6_address text;  -- string
ALTER TABLE file_transfer ADD COLUMN IF NOT EXISTS val_signal_asu integer;  -- int32
ALTER TABLE file_transfer ADD COLUMN IF NOT EXISTS is_dc_nr_restricted boolean;  -- bool
ALTER TABLE file_transfer ADD COLUMN IF NOT EXISTS id_cell_nr bigint;  -- int64
ALTER TABLE file_transfer ADD COLUMN IF NOT EXISTS is_cell_network_registered boolean;  -- bool
ALTER TABLE file_transfer ADD COLUMN IF NOT EXISTS val_signal_ecno integer;  -- int32
ALTER TABLE file_transfer ADD COLUMN IF NOT EXISTS val_signal_rssi_dbm integer;  -- int32
ALTER TABLE file_transfer ADD COLUMN IF NOT EXISTS attr_signal_rscp integer;  -- int32
ALTER TABLE file_transfer ADD COLUMN IF NOT EXISTS val_network_bsic_code integer;  -- int32
ALTER TABLE file_transfer ADD COLUMN IF NOT EXISTS attr_radio_access_technology_type_name text;  -- string
ALTER TABLE file_transfer ADD COLUMN IF NOT EXISTS is_network_international_roaming boolean;  -- bool
ALTER TABLE file_transfer ADD COLUMN IF NOT EXISTS id_device_vops_support integer;  -- int32
ALTER TABLE file_transfer ADD COLUMN IF NOT EXISTS attr_network_wcdma_additional_plmns text;  -- list<element: string>
ALTER TABLE file_transfer ADD COLUMN IF NOT EXISTS attr_network_lte_additional_plmns text;  -- list<element: string>
ALTER TABLE file_transfer ADD COLUMN IF NOT EXISTS attr_network_nr_additional_plmns text;  -- list<element: string>
ALTER TABLE file_transfer ADD COLUMN IF NOT EXISTS attr_cell_nr_arfcn integer;  -- int32
ALTER TABLE file_transfer ADD COLUMN IF NOT EXISTS attr_cell_nr_pci integer;  -- int32
ALTER TABLE file_transfer ADD COLUMN IF NOT EXISTS attr_sim_type_allocation_code text;  -- string
ALTER TABLE file_transfer ADD COLUMN IF NOT EXISTS attr_cell_secondary_arfcn integer;  -- int32
ALTER TABLE file_transfer ADD COLUMN IF NOT EXISTS id_connection_net_speed integer;  -- int32

-- video: 34 colunas adicionadas
ALTER TABLE video ADD COLUMN IF NOT EXISTS is_in_stream_failure boolean;  -- bool
ALTER TABLE video ADD COLUMN IF NOT EXISTS attr_video_serving_info text;  -- string
ALTER TABLE video ADD COLUMN IF NOT EXISTS is_cell_network_registered boolean;  -- bool
ALTER TABLE video ADD COLUMN IF NOT EXISTS val_signal_ecno integer;  -- int32
ALTER TABLE video ADD COLUMN IF NOT EXISTS val_signal_rssi_dbm integer;  -- int32
ALTER TABLE video ADD COLUMN IF NOT EXISTS attr_signal_rscp integer;  -- int32
ALTER TABLE video ADD COLUMN IF NOT EXISTS val_network_bsic_code integer;  -- int32
ALTER TABLE video ADD COLUMN IF NOT EXISTS val_signal_bit_error_rate_ratio integer;  -- int32
ALTER TABLE video ADD COLUMN IF NOT EXISTS val_signal_asu integer;  -- int32
ALTER TABLE video ADD COLUMN IF NOT EXISTS attr_device_model text;  -- string
ALTER TABLE video ADD COLUMN IF NOT EXISTS is_device_rooted boolean;  -- bool
ALTER TABLE video ADD COLUMN IF NOT EXISTS is_carrier_resolved_from_ip_address boolean;  -- bool
ALTER TABLE video ADD COLUMN IF NOT EXISTS attr_network_operator_common_name text;  -- string
ALTER TABLE video ADD COLUMN IF NOT EXISTS attr_network_isp_common_name text;  -- string
ALTER TABLE video ADD COLUMN IF NOT EXISTS attr_connection_standard_name text;  -- string
ALTER TABLE video ADD COLUMN IF NOT EXISTS attr_connection_family_name text;  -- string
ALTER TABLE video ADD COLUMN IF NOT EXISTS attr_connection_family_name_first_hop text;  -- string
ALTER TABLE video ADD COLUMN IF NOT EXISTS attr_connection_generation_name text;  -- string
ALTER TABLE video ADD COLUMN IF NOT EXISTS is_network_international_roaming boolean;  -- bool
ALTER TABLE video ADD COLUMN IF NOT EXISTS attr_network_ipv4_address text;  -- string
ALTER TABLE video ADD COLUMN IF NOT EXISTS attr_radio_access_technology_type_name text;  -- string
ALTER TABLE video ADD COLUMN IF NOT EXISTS is_app_on_screen boolean;  -- bool
ALTER TABLE video ADD COLUMN IF NOT EXISTS attr_display_resolution_label text;  -- string
ALTER TABLE video ADD COLUMN IF NOT EXISTS attr_server_ipv6_address text;  -- string
ALTER TABLE video ADD COLUMN IF NOT EXISTS id_device_vops_support integer;  -- int32
ALTER TABLE video ADD COLUMN IF NOT EXISTS attr_network_wcdma_additional_plmns text;  -- list<element: string>
ALTER TABLE video ADD COLUMN IF NOT EXISTS attr_network_lte_additional_plmns text;  -- list<element: string>
ALTER TABLE video ADD COLUMN IF NOT EXISTS attr_network_nr_additional_plmns text;  -- list<element: string>
ALTER TABLE video ADD COLUMN IF NOT EXISTS is_score_included boolean;  -- bool
ALTER TABLE video ADD COLUMN IF NOT EXISTS attr_cell_nr_arfcn integer;  -- int32
ALTER TABLE video ADD COLUMN IF NOT EXISTS attr_cell_nr_pci integer;  -- int32
ALTER TABLE video ADD COLUMN IF NOT EXISTS attr_sim_type_allocation_code text;  -- string
ALTER TABLE video ADD COLUMN IF NOT EXISTS attr_cell_secondary_arfcn integer;  -- int32
ALTER TABLE video ADD COLUMN IF NOT EXISTS id_connection_net_speed integer;  -- int32

-- web_browsing: 32 colunas adicionadas
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS attr_network_operator_common_name text;  -- string
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS is_cell_network_registered boolean;  -- bool
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS val_signal_ecno integer;  -- int32
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS val_signal_rssi_dbm integer;  -- int32
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS attr_signal_rscp integer;  -- int32
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS val_network_bsic_code integer;  -- int32
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS val_signal_asu integer;  -- int32
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS attr_cell_arfcn integer;  -- int32
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS attr_device_model text;  -- string
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS is_device_rooted boolean;  -- bool
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS is_carrier_resolved_from_ip_address boolean;  -- bool
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS attr_network_isp_common_name text;  -- string
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS attr_connection_standard_name text;  -- string
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS attr_connection_family_name text;  -- string
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS attr_connection_family_name_first_hop text;  -- string
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS attr_connection_generation_name text;  -- string
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS is_network_international_roaming boolean;  -- bool
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS attr_server_ipv4_address text;  -- string
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS attr_server_ipv6_address text;  -- string
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS attr_radio_access_technology_type_name text;  -- string
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS id_device_vops_support integer;  -- int32
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS attr_network_wcdma_additional_plmns text;  -- list<element: string>
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS attr_network_lte_additional_plmns text;  -- list<element: string>
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS attr_network_nr_additional_plmns text;  -- list<element: string>
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS is_score_included boolean;  -- bool
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS attr_cell_nr_arfcn integer;  -- int32
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS attr_cell_nr_pci integer;  -- int32
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS attr_sim_type_allocation_code text;  -- string
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS attr_cell_secondary_arfcn integer;  -- int32
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS id_connection_net_speed integer;  -- int32
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS val_bytes_received integer;  -- int32
ALTER TABLE web_browsing ADD COLUMN IF NOT EXISTS val_bytes_sent integer;  -- int32
