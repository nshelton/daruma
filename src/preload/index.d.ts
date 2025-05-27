import { ElectronAPI } from '@electron-toolkit/preload'

export interface API {
  getEnvVar(key: string): string | undefined
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
    process: {
      env: {
        NODE_ENV: string
        [key: string]: string | undefined
      }
    }
  }
}
