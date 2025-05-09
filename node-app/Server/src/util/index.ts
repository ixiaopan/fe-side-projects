const crypto = require('crypto')

export function pick(obj: any, fields: string[], alias?: any) {
  if (!obj) return null

  return fields.reduce((memo: any, f: string) => {
    const k = (alias && alias[f]) || f

    memo[k] = obj[f]

    return memo
  }, {})
}
export function omit(obj: any, fields: string[]) {
  if (!obj) return null

  return Object.keys(obj).reduce((memo: any, f: string) => {
    if (!fields.includes(f)) {
      memo[f] = obj[f]
    }
    return memo
  }, {})
}

export function noop() {}

export function parseJSON(o: string) {
  try {
    return JSON.parse(o)
  } catch (e) {
    console.error(e)
  }
}

export const isMock = process.env.NODE_ENV == 'mock'

export function parse2JSON(value: string, defaultValue: any) {
  let result = defaultValue
  try {
    result = JSON.parse(value)
  } catch (e) {
    result = defaultValue
  }
  return result
}

export function md5(str) {
  const hash = crypto.createHash('md5')
  hash.update(str)
  return hash.digest('hex')
}
