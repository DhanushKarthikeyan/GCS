import { ipcRenderer } from 'electron';
import { Mission } from './Mission';
import { Vehicle } from './Vehicle';
import { MessageHandler } from './MessageHandler';
import { ISRMission } from './Missions/ISRMission';
import { UpdateHandler } from './DataStructures/UpdateHandler';

export default class Orchestrator {
  static log(failureMessage) {
    const ipcMessage = {
      type: 'failure',
      message: failureMessage,
    };
    console.log('FAILURE: (in Class `Orchestrator`) ', failureMessage);
    ipcRenderer.send('post', 'updateMessages', ipcMessage);
  }

  /**
    *   Creates an instance of an Orchestrator
    *   @constructor
    *   @param {MessageHandler} messageHandler : For message processing
    *   @this {Orchestrator}
    */
  constructor(messageHandler) {
    this.scheduledMissions = [];
    // Store the statuses of each mission; object are in the same order as the scheduledMissions
    this.scheduledMissionsStatus = [];
    this.currentMission = 0;
    this.nextMissionRequiredData = null;
    this.knownVehicles = [];
    if ((messageHandler === null) ||
      (messageHandler === undefined) ||
      !(messageHandler instanceof MessageHandler)) {
      this.messageHandler = MessageHandler(this);
    } else {
      this.messageHandler = messageHandler;
    }

    // boolean indicator for whether a mission is actively running
    this.isRunning = false;

    // get the constructors of each mission and put them in order(?)
    this.missionObjects = [ISRMission.constructor];

    this.vehicleStatusUpdater = UpdateHandler();
  }

  /**
    *   Getter for the scheduledMissions member variable.
    *   @this {Orchestrator}
    *   @returns {list} scheduledMissions: The list of scheduled Missions
    */
  getScheduledMissions() {
    return this.scheduledMissions;
  }

  /**
   *  Getter for the knownVehicles member variable.
   *  @this {Orchestrator}
   *  @returns {list} knownVehicles: The list of known Vehicles.
   */
  getKnownVehicles() {
    return this.knownVehicles;
  }

  /**
   * Add task to check the last time a given vehicle has checked in
   * @param {Vehicle} vehicle The Vehicle to check.
   */
  pingAgain_f(vehicle) {
    if ((((vehicle !== undefined) && (vehicle !== null)) && !(vehicle instanceof Vehicle)) || (!vehicle.isActive)) {
      Orchestrator.log(`Refusing to re-schedule task to check on vehicle with ID: ${vehicle.vehicleId}; is invalid not active`);
    } else {
      const delta = Date.now() - vehicle.lastConnTime;
      if ((delta >= 0) && (delta <= vehicle.vehicleTimeoutLength)) {
        // Vehicle has connected w/in the last 30 seconds, schedule to ping again at expiring time
        this.vehicleStatusUpdater.addHandler(vehicle.vehicleId, () => this.pingAgain_f(vehicle), () => this.pingAgain_f(vehicle), delta);
      } else {
        // Vehicle has NOT sent ANY message (or none were received), mark vehicle as deactivated
        this.deactivateVehicle(vehicle);
      }
    }
  }

  /**
   * Adds a vehicle to the known vehicle list.
   * @TODO Add isActive polling (i.e., task to check if the Vehicle is disconnected/lost comms/etc.)
   * @this {Orchestrator}
   * @param {Vehicle} vehicle:   The vehicle to add to the list
   */
  addVehicle(vehicle) {
    this.vehicleStatusUpdater.addHandler(vehicle.vehicleId, () => this.pingAgain_f(vehicle), () => this.pingAgain_f(vehicle), 1000);
    this.knownVehicles.push(vehicle);
  }

  /**
   *    Marks a vehicle not active and unavailable for tasking.
   *    @this {Orchestrator}
   *    @param {Vehicle} vehicle:   The vehicle to deactivate
   */
  deactivateVehicle(vehicle) {
    // Keep vehicle as a known vehicle, but mark it as inactive so that
    // if it comes back online it can be disabled
    vehicle.setActive(false);
    vehicle.setAvailable(false);
  }

  /*
  FLOW:
  1. User selects the missions to create.
  2. The mission is constructed (but not initialized with any data)
  3. The user input data from the mission setup is used to set up the mission
  4. When the user clicks 'next', the mission is initialized (sets up listening for status)
  5. When user has gone through all the screens, display a 'overview' of the mission selected and their status
  5a. Prevent user from going forward (completing setup) until all missions have been accepted & READY.
  */

  /**
   * Creates a new mission of the speficied type.
   * For now, we assume the ordering of the missions is correct. (handled by UI driver)
   *
   * @param  {string} missionName name of the mission to create, e.g. 'ISRMission'
   * @returns  {integer} the mission number for later identification. Starts at 0.
   */
  createMission(missionName) {
    if (this.isRunning) {
      Orchestrator.log('Cannot create new mission when mission is actively running');
      return -1;
    }

    const missionConstructor = this.missionObjects[missionName];
    if (missionConstructor === undefined) {
      Orchestrator.log('In Class `Orchestrator`, method `createMission`: Received request to construct mission object for: ', missionName, ' ; but class is not defined');
    } else {
      const newMission = new missionConstructor(this.endMission, this.knownVehicles, Orchestrator);
      this.scheduledMissions.push(newMission);
      return this.scheduledMissions.length - 1;
    }
    return -1;
  }

  /**
   * Attempt to apply the current mission settings.
   * If successful, it will return true, otherwise it returns a string with
   * more infomation on the failure.
   *
   * @param {integer} missionNumber the number of the mission
   * @param {Object} missionSettings the options/settings for the current mission
   * @param {Object} missionVehicles the mapping of vehicles to mission/job strings
   *
   * @returns {boolean|string} true   if the mission is valid and ready;
   *                           String message indicating what went wrong otherwise
   */
  applyMissionSetup(missionNumber, missionSettings, missionVehicles) {
    if (this.isRunning) {
      Orchestrator.log('Cannot apply mission setup when mission is actively running');
      return 'Internal Error: Mission setting applied when mission already running';
    }

    const missionObj = this.scheduledMissions[missionNumber];
    if (missionObj === undefined) {
      Orchestrator.log('In Class `Orchestrator`, method `applyMissionSetup`: Invalid mission number: ', missionNumber);
      return 'Internal Error: Invalid mission number';
    } else {
      try {
        missionObj.setMissionInfo(missionSettings);
        missionObj.setVehicleMapping(missionVehicles);
      } catch (err) {
        Orchestrator.log('In Class `Orchestrator`, method `applyMissionSetup`: ', err.message, err);
      }
      return missionObj.missionSetupComplete();
    }
  }

  /**
    *   Adds a mission to be executed.
    *   Initializes the mission and sets up a listener for every time the status
    *   is updated so that if it enters an invalid state, it can be handled early.
    *
    *   @TODO: Do ordering on the missions (e.g., quickSearch should be executed before detailedSearch)
    *   @this {Orchestrator}
    *   @param {Object} mission The mission to be added and all the data
    *   @param {Function} success the callback that is called when the mission status becomes READY
    *   @param {Function} failure the callback that is called when the mission status enters a non-READY state
    */
  addMission(mission, success, failure) {
    if (this.isRunning) {
      Orchestrator.log('Cannot add mission when a mission is actively running');
      return;
    }

    if (mission instanceof Mission) {
      // Get the index of the mission
      const missionIndex = this.scheduledMissions.push(mission) - 1;
      this.scheduledMissionsStatus.push(mission.status);
      mission.listenForStatusUpdates(status => {
        if (status === 'READY') {
          success();
          this.scheduledMissionsStatus[missionIndex] = status;
        } else {
          failure();
          this.scheduledMissionsStatus[missionIndex] = status;
        }
        // continue listening to status updates
        return false;
      });
    } else {
      Orchestrator.log('In Class `Orchestrator`, method `addMission`: Received an object constructed with: ', mission.constructor.name, ' ; expected object of type `Mission` or subclass');
    }
  }

  /**
    *   Gets the status for all the scheduled missions
    *
    *   @returns {boolean} true if all the scheduled missions are ready
    */
  getScheduledMissionsStatues() {
    let allAreReady = true;
    for (const status of this.scheduledMissionsStatus) {
      allAreReady = allAreReady && status === 'READY';
    }
    return allAreReady;
  }

  /**
    *   Checks a Mission, then starts it.
    *   @this {Orchestrator}
    *   @param {JSON} requiredData: The data required by the current Mission (the Mission that is to be started).
    */
  startMission(requiredData) {
    // Assume that the mission is still okay if the status of the mission is READY
    if (this.scheduledMissions[this.currentMission].status === 'READY') {
      this.isRunning = true;
      this.messageHandler.setActiveMission(this.scheduledMissions[this.currentMission]);
      this.scheduledMissions[this.currentMission].missionStart(requiredData);
    } else {
      // Not running anymore because a mission wasnt READY to start
      this.isRunning = false;
      this.messageHandler.setActiveMission(null);
      // either attempt recovery, or just do a reset?
      Orchestrator.log(this.currentMissionName(), ' mission could not be started due because it is not in a READY state!');
    }
  }

  /**
    *   Handles when a Mission ends; forwarding the data to the next mission
    *   scheduled to start (if present)
    *   @this {Orchestrator}
    *   @param {Object} nextRequired: The data required by the next Mission (the next Mission that is to be started).
    */
  endMission(nextRequired) {
    this.nextMissionRequiredData = nextRequired;
    this.currentMission++;
    if (this.scheduledMissions.length < this.currentMission) {
      this.startMission(nextRequired);
    } else {
      // End of missions -- reset
      this.reset();
    }
  }

  /**
    * Reset the Orchestrator to initial state so that missions can be
    * added again.
    */
  reset() {
    this.isRunning = false;
    this.currentMission = 0;
    this.scheduledMissions = [];
    this.scheduledMissionsStatus = [];
    this.nextMissionRequiredData = null;
    this.messageHandler.setActiveMission(null);
  }

  /**
    *   Getter for the name of the current Mission
    *   @this {Orchestrator}
    *   @returns {string} currentMissionName: the name of the current Mission
    */
  currentMissionName() {
    return this.scheduledMissions[this.currentMission].name;
  }

  /**
   *    Returns a Vehicle object based on its ID
   *    @param {int} vID: vehicle ID
   *    @returns {Vehicle} v: non-null on success; null on failure
   */
  getVehicleByID(vID) {
    for (const v of this.knownVehicles) {
      if (v.id === vID) {
        return v;
      }
    }
    return null;
  }

  // //////////////////////////////////////////////////////////////////////////////
  // MOVE THE FOLLOWING TO MESSAGEHANDLER
  // //////////////////////////////////////////////////////////////////////////////

  /**
    *   Sends/Schedules to send a message to a Vehicle.
    *   @this {Orchestrator}
    *   @param {string} vehicleID: the unique ID (UID) for the vehicle to send the `message` to.
    *   @param {JSON} message: the message to send to the vehicle with UID `vehicleID`
    */
  sendMessage(vehicleID, message) {
    this.getVehicleByID(vehicleID).sendMessage(message);
  }

  /**
    *   Processes a given message from a vehicle
    *   @TODO: Add support for messages from other vehicles (only VTOL currently)
    *   @this {Orchestrator}
    *   @param {JSON} message: The message that was received from the vehicle
    */
  handleReceivedMessage(message) {
    const srcVehicle = this.getVehicleByID(message.srcVehicleID);
    const ackMessage = { type: 'ack', received: message.type };
    this.sendMessage(message.srcVehicleID, ackMessage);
    switch (message.type) {
      case 'UPDATE' || 'update':
        if (!srcVehicle.isActive()) {
          this.sendMessage(message.srcVehicleID, { type: 'STOP' });
        }
        break;
      case 'ACK' || 'ack':
        srcVehicle.acknowledged(message.type);
        break;
      case 'CONNECT' || 'connect':
        this.addVehicle(new Vehicle(message.srcVehicleID, message.vehicleType, message.jobsAvailable));
        break;
      case 'POI' || 'poi':
        this.nextMissionRequiredData.poi.push({ lat: message.lat, lon: message.lon });
        break;
      case 'COMPLETE' || 'complete':
        srcVehicle.setAvailable(true);
        this.scheduledMissions[this.currentMission].vehicleUpdate();
        break;
      default:
        Orchestrator.log(`Unhandled (bad?) message received from vehicle: ${message.srcVehicleID}  with contents of : ${message}`);
        this.sendMessage(message.srcVehicleID, { type: 'badMessage', error: 'Bad message type' });
    }
  }
}
