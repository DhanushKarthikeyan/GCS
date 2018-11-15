export default class Orchestrator {
  constructor() {
    this.scheduledMissions = [];
    this.currentMission = null;
    this.nextMission = null;
    this.passToNext = null;

    this.knownVehicles = [];
  }

  getScheduledMissions() {
    return this.scheduledMissions;
  }

  getKnownVehicles() {
    return this.knownVehicles;
  }

  addVehicle(vehicle) {
    this.knownVehicles.push(vehicle);
  }

  addMission(mission) {
    if (mission instanceof Mission) {
      this.scheduledMissions.push(mission);
    } else {
      console.warn('In Class `Orchestrator`, method `addMission`: Received an object constructed with', mission.constructor.name);
    }
  }
}
