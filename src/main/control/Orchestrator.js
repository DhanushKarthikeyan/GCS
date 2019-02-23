import { ipcRenderer } from 'electron';

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
    *   @this {Orchestrator}
    */
  constructor() {
    this.scheduledMissions = [];
    this.currentMission = 0;
    this.nextMissionRequiredData = null;
    this.knownVehicles = [];
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
    *   Getter for the knownVehicles member variable.
    *   @this {Orchestrator}
    *   @returns {list} knownVehicles: The list of known Vehicles.
    */
  getKnownVehicles() {
    return this.knownVehicles;
  }

  /**
    *   Adds a vehicle to the known vehicle list.
    *   @this {Orchestrator}
    *   @param {Vehicle} vehicle:   The vehicle to add to the list
    */
  addVehicle(vehicle) {
    this.knownVehicles.push(vehicle);
  }

  /**
    *   Marks a vehicle not active and unavailable for tasking.
    *   @this {Orchestrator}
    *   @param {Vehicle} vehicle:   The vehicle to deactivate
    */
  deactivateVehicle(vehicle) {
    vehicle.setActive(false);
    vehicle.setAvailable(false);
  }

  /**
    *   Adds a mission to be executed.
    *   @TODO: Do ordering on the missions (e.g., quickSearch should be executed before detailedSearch)
    *   @this {Orchestrator}
    *   @param {Mission} mission: The mission to be added.
    */
  addMission(mission) {
    if (mission instanceof Mission) {
      this.scheduledMissions.push(mission);
    } else {
      Orchestrator.log('In Class `Orchestrator`, method `addMission`: Received an object constructed with: ', mission.constructor.name, ' ; expected object of type `Mission` or subclass');
    }
  }

  /**
    *   Checks a Mission, then starts it.
    *   @this {Orchestrator}
    *   @param {JSON} requiredData: The data required by the current Mission (the Mission that is to be started).
    */
  startMission(requiredData) {
    const missionOK = this.scheduledMissions[this.currentMission].check(this.knownVehicles, requiredData);
    if (missionOK) {
      this.scheduledMissions[this.currentMission].start();
    } else {
      Orchestrator.log(this.currentMissionName(), ' mission could not be started due to a failure in the internal checks!');
    }
  }

  /**
    *   Ends a Mission
    *   @this {Orchestrator}
    *   @param {JSON} nextRequired: The data required by the next Mission (the next Mission that is to be started).
    */
  endMission(nextRequired) {
    this.nextMissionRequiredData = nextRequired;
    this.currentMission++;
  }

  /**
    *   Getter for the name of the current Mission
    *   @this {Orchestrator}
    *   @returns {string} currentMissionName: the name of the current Mission
    */
  currentMissionName() {
    return this.scheduledMissions[this.currentMission].getName();
  }

  /**
   *    Returns a Vehicle object based on its ID
   *    @param {int} vID: vehicle ID
   *    @returns {Vehicle} v: non-null on success; null on failure
   */
  static getVehicleByID(vID) {
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
        this.nextMissionRequiredData.poi.push(new Point(message.lat, message.lon));
        break;
      case 'COMPLETE' || 'complete':
        srcVehicle.setAvailable(true);
        this.scheduledMissions[this.currentMission].vehicleUpdate();
        break;
      default:
        Orchestrator.log('Unhandled (bad?) message received from vehicle: ', message.srcVehicleID, '; with contents of :', message);
        this.sendMessage(message.srcVehicleID, { type: 'badMessage', error: 'Bad message type' });
    }
  }
}
