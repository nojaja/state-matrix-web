import { OpfsStorage, VirtualFS } from 'browser-git-ops'
import { VirtualFsManager } from './virtualFsManager'

// Export a single shared VirtualFsManager instance used across the app/stores
export const virtualFsManager = new VirtualFsManager(OpfsStorage as any, VirtualFS as any)

export default virtualFsManager
