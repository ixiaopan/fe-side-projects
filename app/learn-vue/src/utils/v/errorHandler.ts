export function callWithErrorHandling(fn) {
  let res
  try {
    res = fn()
  } catch (e) {
    handleError(e)
  }
  return res
}
function handleError(e) {
  console.error('handle error', e)
}
function isPromise(v) {
  return typeof v.then == 'function'
}
export function callWithErrorHandlingAsync(fn) {
  const res = callWithErrorHandling(fn)
  if (isPromise(res)) {
    res.catch(handleError)
  }
  return res
}
