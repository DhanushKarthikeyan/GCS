/*
 * Write all ipcRenderer post functions here to ensure that all developers know the type
 * of what are included into these messages. When writing the function, write where
 * these notifications are received. Write the functions in ALPHABETICAL ORDER (of notification).
 * A simple note on which file (assume going from src directory) will help developers out a lot.
 * Do not forget to include the function in the default export!
 *
 * When writing the receiving side of ipcRenderer, the function called by the callback
 * function must be the EXACT SAME NAME as the notification message and have parameters with
 * SAME EXACT NAMES as the parameters of the ipc function below.
 *
 * Look at all code for examples. Do not forget that the first parameter of the callback function
 * of the receiving side of ipcRenderer will have an Event object passed to it. Name this object "_"
 * unless you plan on using the object, then name it "event".
 */

import { BrowserWindow, ipcRenderer } from 'electron';

import {
  JSONMessage,
  Message,
  MissionDescription,
  MissionParameters,
} from '../types/messages';
import {
  FileLoadOptions,
  FileSaveOptions,
  LatLngZoom,
  LogMessage,
  VehicleObject,
} from '../types/types';

/**
 * Post "centerMapToVehicle" notification.
 *
 * Files that take this notification:
 * - renderer/mainWindow/map/MapContainer
 */
function postCenterMapToVehicle(vehicle: VehicleObject): void {
  ipcRenderer.send('post', 'centerMapToVehicle', vehicle);
}

/**
 * Post "competeMission" notification.
 *
 * Files that take this notification:
 * - common/Orchestrator
 */
function postCompleteMission(missionName: string, completionParameters: MissionParameters): void {
  ipcRenderer.send('post', 'completeMission', missionName, completionParameters);
}

/**
 * Post "confirmCompleteMission" notification.
 *
 * Files that take this notification:
 */
function postConfirmCompleteMission(): void {
  ipcRenderer.send('post', 'confirmCompleteMission');
}

/**
 * Post "connectToVehicle" notification.
 *
 * Files that take this notification:
 * - common/Orchestrator
 */
function postConnectToVehicle(jsonMessage: JSONMessage): void {
  ipcRenderer.send('post', 'connectToVehicle', jsonMessage);
}

/**
 * Post "disconnectFromVehicle" notification.
 *
 * Files that take this notification:
 * - common/Orchestrator
 */
function postDisconnectFromVehicle(vehicleId: number): void {
  ipcRenderer.send('post', 'disconnectFromVehicle', vehicleId);
}

/**
 * Post "finishMissions" notification. This is different from the "completeMission"
 * notification in that this is sent once all missions to run are completed.
 *
 * Files that take this notification:
 */
function postFinishMissions(completionParameters: MissionParameters): void {
  ipcRenderer.send('post', 'finishMissions', completionParameters);
}

/**
 * Post "handleAcknowledgementMessage" notification.
 *
 * Files that take this notification:
 * - common/Orchestrator
 */
function postHandleAcknowledgementMessage(jsonMessage: JSONMessage): void {
  ipcRenderer.send('post', 'handleAcknowledgementMessage', jsonMessage);
}

/**
 * Post "handleBadMessage" notification.
 *
 * Files that take this notification:
 * - common/Orchestrator
 */
function postHandleBadMessage(jsonMessage: JSONMessage): void {
  ipcRenderer.send('post', 'handleBadMessage', jsonMessage);
}

/**
 * Post "handleCompleteMessage" notification.
 *
 * Files that take this notification:
 * - common/Orchestrator
 */
function postHandleCompleteMessage(jsonMessage: JSONMessage): void {
  ipcRenderer.send('post', 'handleCompleteMessage', jsonMessage);
}

/**
 * Post "handlePOIMessage" notification.
 *
 * Files that take this notification:
 * - common/Orchestrator
 */
function postHandlePOIMessage(jsonMessage: JSONMessage): void {
  ipcRenderer.send('post', 'handlePOIMessage', jsonMessage);
}

/**
 * Post "handleUpdateMessage" notification.
 *
 * Files that take this notification:
 * - common/Orchestrator
 */
function postHandleUpdateMessage(jsonMessage: JSONMessage): void {
  ipcRenderer.send('post', 'handleUpdateMessage', jsonMessage);
}

/**
 * Post "hideMissionWindow" notification.
 *
 * Files that take this notification:
 * - main/index
 */
function postHideMissionWindow(): void {
  ipcRenderer.send('post', 'hideMissionWindow');
}

/**
 * Post "loadConfig" notification.
 *
 * Files that take this notification:
 * - renderer/mainWindow/map/MapContainer
 */
function postLoadConfig(
  loadOptions: FileLoadOptions,
  mainWindow?: BrowserWindow | null,
  missionWindow?: BrowserWindow | null,
): void {
  if (mainWindow !== undefined) {
    if (mainWindow) mainWindow.webContents.send('post', 'loadConfig', loadOptions);
    if (missionWindow) missionWindow.webContents.send('post', 'loadConfig', loadOptions);
  } else {
    ipcRenderer.send('post', 'loadConfig', loadOptions);
  }
}

/**
 * Post "logMessages" notification. Please never end the messages to log with a period.
 *
 * Files that take this notification:
 * - renderer/mainWindow/log/LogContainer
 */
function postLogMessages(...messages: LogMessage[]): void {
  ipcRenderer.send('post', 'logMessages', ...messages);
}

/**
 * Post "receiveMessage" notification.
 *
 * Files that take this notification:
 * - common/MessageHandler
 */
function postReceiveMessage(text: string): void {
  ipcRenderer.send('post', 'receiveMessage', text);
}

/**
 * Post "saveConfig" notification.
 *
 * Files that take this notification:
 * - renderer/mainWindow/map/MapContainer
 */
function postSaveConfig(
  saveOptions: FileSaveOptions,
  mainWindow?: BrowserWindow | null,
  missionWindow?: BrowserWindow | null,
): void {
  if (mainWindow !== undefined) {
    if (mainWindow) mainWindow.webContents.send('post', 'saveConfig', saveOptions);
    if (missionWindow) missionWindow.webContents.send('post', 'saveConfig', saveOptions);
  } else {
    ipcRenderer.send('post', 'saveConfig', saveOptions);
  }
}

/**
 * Post "sendMessage" notification.
 *
 * Files that take this notification:
 * - common/MessageHandler
 */
function postSendMessage(vehicleId: number, message: Message): void {
  ipcRenderer.send('post', 'sendMessage', vehicleId, message);
}

/**
 * Post "setMapToUserLocation" notification.
 *
 * Files that take this notification:
 * - renderer/mainWindow/map/MapContainer
 */
function postSetMapToUserLocation(
  mainWindow?: BrowserWindow | null,
  missionWindow?: BrowserWindow | null,
): void {
  if (mainWindow !== undefined) {
    if (mainWindow) mainWindow.webContents.send('setMapToUserLocation');
    if (missionWindow) missionWindow.webContents.send('setMapToUserLocation');
  } else {
    ipcRenderer.send('post', 'setMapToUserLocation');
  }
}

/**
 * Post "showMissionWindow" notification.
 *
 * Files that take this notification:
 * - main/index
 */
function postShowMissionWindow(): void {
  ipcRenderer.send('post', 'showMissionWindow');
}

/**
 * Post "startMissions" notification.
 *
 * Files that take this notification:
 * - common/Orchestrator
 */
function postStartMissions(
  missions: MissionDescription[],
): void {
  ipcRenderer.send('post', 'startMissions', missions);
}

/**
 * Post "stopMission" notification.
 *
 * Files that take this notification:
 * - common/Orchestrator
 */
function postStopMission(): void {
  ipcRenderer.send('post', 'stopMission');
}

/**
 * Post "stopSendingMessages" notification.
 *
 * Files that take this notification:
 * - common/MessageHandler
 */
function postStopSendingMessages(): void {
  ipcRenderer.send('post', 'stopSendingMessages');
}

/**
 * Post "toggleTheme" notification.
 *
 * Files that take this notification:
 * - renderer/index
 */
function postToggleTheme(): void {
  ipcRenderer.send('post', 'toggleTheme');
}

/**
 * Post "updateMapLocation" notification.
 *
 * Files that take this notification:
 * - renderer/mainWindow/map/MapContainer
 */
function postUpdateMapLocation(
  location: LatLngZoom,
  mainWindow?: BrowserWindow | null,
  missionWindow?: BrowserWindow | null,
): void {
  if (mainWindow !== undefined) {
    if (mainWindow) mainWindow.webContents.send('updateMapLocation', location);
    if (missionWindow) missionWindow.webContents.send('updateMapLocation', location);
  } else {
    ipcRenderer.send('post', 'updateMapLocation', location);
  }
}

/**
 * Post "updateVehicles" notification.
 *
 * Files that take this notification:
 * - renderer/mainWindow/map/MapContainer
 * - renderer/mainWindow/vehicle/VehicleContainer
 */
function postUpdateVehicles(...vehicles: VehicleObject[]): void {
  ipcRenderer.send('post', 'updateVehicles', ...vehicles);
}

export default {
  postCenterMapToVehicle,
  postCompleteMission,
  postConfirmCompleteMission,
  postConnectToVehicle,
  postDisconnectFromVehicle,
  postFinishMissions,
  postHandleAcknowledgementMessage,
  postHandleBadMessage,
  postHandleCompleteMessage,
  postHandlePOIMessage,
  postHandleUpdateMessage,
  postHideMissionWindow,
  postLoadConfig,
  postLogMessages,
  postReceiveMessage,
  postSaveConfig,
  postSendMessage,
  postSetMapToUserLocation,
  postShowMissionWindow,
  postStartMissions,
  postStopMission,
  postStopSendingMessages,
  postToggleTheme,
  postUpdateMapLocation,
  postUpdateVehicles,
};