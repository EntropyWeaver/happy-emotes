import { t } from './i18n.js';
import { validateSnapshot } from './notebook.js';

export const SHARE_PREFIX = '#experiment=';
export const MAX_SHARE_TOKEN_LENGTH = 8192;
const invalidLink = () => new Error(t("The link is incomplete or contains invalid data.", "El enlace está incompleto o contiene datos no válidos."));

export function encodeExperiment(snapshot) {
  const json = JSON.stringify({ v: 1, experiment: validateSnapshot(snapshot) });
  const bytes = new TextEncoder().encode(json);
  const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
  const payload = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
  const token = `v1.${payload}`;
  if (token.length > MAX_SHARE_TOKEN_LENGTH) throw new Error(t("The experiment is too large for this link format.", "El experimento es demasiado grande para este formato de enlace."));
  return token;
}

export function decodeExperimentHash(hash) {
  if (!hash.startsWith(SHARE_PREFIX) && hash !== '#experiment') return null;
  const token = hash.slice(SHARE_PREFIX.length);
  if (!token || token.length > MAX_SHARE_TOKEN_LENGTH) throw invalidLink();
  const match = /^(v\d+)\.([A-Za-z0-9_-]+)$/u.exec(token);
  if (!match) throw invalidLink();
  if (match[1] !== 'v1') throw new Error(t("This link uses an unsupported experiment version.", "Este enlace utiliza una versión de experimento no compatible."));
  const payload = match[2];
  if (payload.length % 4 === 1) throw invalidLink();
  let data;
  try {
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - payload.length % 4) % 4);
    const bytes = Uint8Array.from(atob(padded), char => char.charCodeAt(0));
    data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch { throw invalidLink(); }
  if (data?.v !== 1) throw invalidLink();
  return validateSnapshot(data.experiment);
}

export function createExperimentURL(baseURL, snapshot) {
  const url = new URL(baseURL);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(t("Open the lab over HTTP or HTTPS to share experiments.", "Abre el laboratorio mediante HTTP o HTTPS para compartir experimentos."));
  url.search = '';
  url.hash = SHARE_PREFIX + encodeExperiment(snapshot);
  return url.href;
}
