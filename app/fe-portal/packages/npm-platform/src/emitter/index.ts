import { EventEmitter } from 'eventemitter3'

const emitter = new EventEmitter()

export const EVENT_EMITTER = {
  UPDATE_PACKAGE_SUCCESS: 'updatePackageSuccess',
}

export default emitter
