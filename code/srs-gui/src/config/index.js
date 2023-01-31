export const MGMT_HOST = 'srs-manage';
export const MGMT_PORT = '8022';
export const SRS_MANAGE_HOST = 'srs-manage';
export const PROMETHEUS_HOST = process.env.PROMETHEUS_HOST;
export const PROMETHEUS_PORT = process.env.PROMETHEUS_PORT;
export const SRS_HOST = '1985';

export const addURLPrefix = (host, url, suffix) => {
    return suffix;
}