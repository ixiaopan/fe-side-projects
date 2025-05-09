export enum Method_TYPE  {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
}

export type IAPI = {
  method: Method_TYPE,
  url: string,
  desc: string,

  mocked?: boolean

  headers?: string // 头部
  body?: string // 入参

  json: string, // 出参
}
