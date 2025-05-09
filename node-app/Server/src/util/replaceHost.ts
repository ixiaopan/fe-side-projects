import { GITLAB_HOST } from '../config/gitlab.config'

function ensureHostSuffix(host = GITLAB_HOST) {
  return /\/$/.test(host) ? host : host + '/'
}

export function replaceHost(url: string, host = GITLAB_HOST) {
  return url.replace(/^https?:\/\/([\d|\.:]+)\//, () => ensureHostSuffix(host))
}
