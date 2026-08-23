import { WebContainer } from '@webcontainer/api';

let webcontainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

export const WebContainerState = {
  isBooted: false,
  isInstalling: false,
  isDevServerRunning: false,
  devServerUrl: null as string | null,
};

export async function getWebContainerInstance(): Promise<WebContainer> {
  if (webcontainerInstance) {
    return webcontainerInstance;
  }

  if (bootPromise) {
    return bootPromise;
  }

  bootPromise = WebContainer.boot().then((instance) => {
    webcontainerInstance = instance;
    WebContainerState.isBooted = true;
    return instance;
  });

  return bootPromise;
}
