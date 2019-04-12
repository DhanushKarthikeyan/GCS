import { ipcRenderer } from 'electron';

/**
 * Sends a completeJob notification 5 seconds after the startJob notification is received.
 */
export default function completeJob(): void {
  // Sends completeJob notification after receiving startJob notification.
  ipcRenderer.on('startJob', (): void => {
    setTimeout((): void => {
      ipcRenderer.send('post', 'completeJob');
    }, 5000);
  });
}