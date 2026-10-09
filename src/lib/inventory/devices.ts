export type Device = {
    atg_id: string | null
    device_name: string,
    immybot_id: number | null,
    immybot_last_seen: string | null,
    ninja_id: number | null,
    ninja_last_seen: string | null,
    cw_config_id: number | null,
    cw_last_updated: string | null,
    operating_system: string | null,
    org_name: string | null,
    rewst_org_id: string,
    public_ip: string | null
}

export type DeviceEntry = Device & {
    object_id: string
}

export const CW_SITE = "https://na.myconnectwise.net";
export const CW_COMPANY = "atgfw";

export function cwConfigUrl(configId: number): string {
    return `${CW_SITE}/v4_6_release/services/system_io/router/openrecord.rails?recordType=ConfigFv&recid=${configId}&companyName=${CW_COMPANY}`;
}

export function cwCompanyUrl(companyId: number): string {
    return `${CW_SITE}/v4_6_release/services/system_io/router/openrecord.rails?recordType=CompanyFv&recid=${companyId}&companyName=${CW_COMPANY}`;
}

/** Number of source systems (ImmyBot, Ninja, ConnectWise) a device record is present in. */
export function sourceCount(d: Device): number {
    return [d.immybot_id, d.ninja_id, d.cw_config_id].filter(id => id != null).length;
}

export function sourceLabel(d: Device): string {
    if (d.immybot_id != null) return "ImmyBot";
    if (d.ninja_id != null) return "Ninja";
    if (d.cw_config_id != null) return "ConnectWise";
    return "Unknown";
}
