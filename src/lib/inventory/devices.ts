export type Device = {
    atg_id: string | null
    device_name: string,
    immybot_id: number | null,
    immybot_last_seen: string | null,
    ninja_id: number | null,
    ninja_last_seen: string | null,
    operating_system: string | null,
    org_name: string | null,
    rewst_org_id: string,
    public_ip: string | null
}

export type DeviceEntry = Device & {
    object_id: string
}