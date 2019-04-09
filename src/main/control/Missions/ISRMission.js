import Mission from '../Mission';
import Task from '../Task';
import { distance } from '../helpers';

export default class ISRMission extends Mission {
  constructor(completionCallback, vehicleList, logger) {
    super(completionCallback, vehicleList, logger);

    this.missionJobTypes = ['ISR_Plane'];
    this.missionDataInformationRequirements = ['lat', 'lng'];
    this.missionSetupTracker = { plane_start_action: false, plane_end_action: false };

    this.missionDataResults = {};
  }

  generateTasks(missionData) {
    return new Map([
      ['ISR_Plane', [new Task(missionData.lat, missionData.lng)]],
    ]);
  }

  missionUpdate(mesg, sender) {
    // handle 'complete' type messages
    if (super.missionUpdate(mesg, sender)) return;

    // handle custom type messages
    if (mesg.type === 'POI') {
      if (!('POI' in this.missionDataResults)) {
        this.missionDataResults.POI = [];
      }
      this.missionDataResults.POI.push({ lat: mesg.lat, lng: mesg.lng });
    } else {
      throw new Error(`Unknown Mission message type ${mesg.type}. This either should have been handled by the message parser, or was incorrectly marked as a Mission update message by the Orchestrator.`);
    }
  }

  getTerminatedData() {
    // If POIs have been registered, then find data about the POIs
    if ('POI' in this.missionDataResults) {
      // Find center coordinates of all the POIs
      let latSum = 0, lngSum = 0;
      let count = 0;

      for (const poi of this.missionDataResults.POI) {
        latSum += poi.lat;
        lngSum += poi.lng;
        count++;
      }

      const centerAvg = { lat: latSum / count, lng: lngSum / count };

      // find the radius from center to furthest poi (so area encompases all the points)
      let radius = 0;
      for (const poi of this.missionDataResults.POI) {
        radius = Math.max(radius, distance(poi, centerAvg));
      }

      this.missionDataResults.lat = centerAvg.lat;
      this.missionDataResults.lng = centerAvg.lng;
      this.missionDataResults.radius = radius;
    }

    return this.missionDataResults;
  }

  get name() {
    return 'ISRMission';
  }
}
