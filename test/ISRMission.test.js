/*
 * Set up the Spectron testing environment for unit tests
 */

const chai = require('chai');

const mocha = require('mocha');
const describe = mocha.describe;
const it = mocha.it;
const beforeEach = mocha.beforeEach;

import ISRMission from '../src/main/control/Missions/ISRMission';
import Vehicle from '../src/main/control/Vehicle';
import Task from '../src/main/control/Task';

/*
 * Mission & Mission Subclass tests
 * Insert code specific to creating new Mission Subclasses & to test
 * the functions
 */


/*
 * Define a dummy completionCallback function that is run automatically
 * after the mission is determined to be completed.
 */
let completionCallbackCalled = false;
function dummyCompletionCallback() {
  completionCallbackCalled = true;
}

/*
 * Define a dummy logger object so that no logging output is created
 */
const dummyLogger = {
  logError: () => {},
  logInfo: () => {},
};

describe('ISRMission', () => {
  describe('+ getVehicleMapping()', () => {
    const vh1 = new Vehicle(1, ['ISR_Plane'], 'WAITING');
    const vh2 = new Vehicle(2, ['VTOL', 'Quick_Search'], 'WAITING');
    const vh3 = new Vehicle(3, ['ISR_Plane', 'Payload_drop'], 'WAITING');
    const vh4 = new Vehicle(4, ['ISR_Plane'], 'WAITING');

    it('should return a valid mapping (with simple maps)', () => {
      const vehicleList = [vh1, vh2];
      const mission = new ISRMission(dummyCompletionCallback, vehicleList, dummyLogger);
      const mapping = mission.getVehicleMapping();

      chai.expect(mapping).to.deep.equal(new Map([[vh1, 'ISR_Plane']]));
    });

    it('should return a valid mapping (with more complex maps)', () => {
      const vehicleList = [vh1, vh2, vh3, vh4];
      const mission = new ISRMission(dummyCompletionCallback, vehicleList, dummyLogger);
      const mapping = mission.getVehicleMapping();

      chai.expect(mapping).to.deep.equal(new Map([[vh1, 'ISR_Plane'], [vh4, 'ISR_Plane']]));
    });

    it('should return a valid mapping when no maps can be made (empty map)', () => {
      const vehicleList = [vh2, vh3];
      const mission = new ISRMission(dummyCompletionCallback, vehicleList, dummyLogger);
      const mapping = mission.getVehicleMapping();

      chai.expect(mapping).to.deep.equal(new Map());
    });
  });


  describe('+ setVehicleMapping()', () => {
    const vh1 = new Vehicle(1, ['ISR_Plane'], 'WAITING');
    const vh2 = new Vehicle(2, ['VTOL', 'Quick_Search'], 'WAITING');
    const vh3 = new Vehicle(3, ['ISR_Plane', 'Payload_drop'], 'WAITING');
    const vh4 = new Vehicle(4, ['ISR_Plane'], 'WAITING');
    const vehicleList = [vh1, vh2, vh3, vh4];

    let mission;

    beforeEach(() => {
      mission = new ISRMission(dummyCompletionCallback, vehicleList, dummyLogger);
    });

    it('should accept a valid mapping (with simple maps)', () => {
      const mapping = new Map([[vh1, 'ISR_Plane']]);

      mission.setVehicleMapping(mapping);
      chai.expect(mission.activeVehicleMapping).to.deep.equal(mapping);
    });

    it('should accept a valid mapping (with complex maps)', () => {
      const mapping = new Map([[vh1, 'ISR_Plane'], [vh3, 'ISR_Plane'], [vh4, 'ISR_Plane']]);

      mission.setVehicleMapping(mapping);
      chai.expect(mission.activeVehicleMapping).to.deep.equal(mapping);
    });

    it('should reject invalid mappings (with simple maps)', () => {
      const mapping = new Map([[vh2, 'Quick_Search']]);

      mission.setVehicleMapping(mapping);
      chai.expect(mission.activeVehicleMapping).to.deep.equal(new Map());
    });

    it('should reject invalid mappings (with complex maps)', () => {
      const mapping = new Map([[vh2, 'Quick_Search'], [vh3, 'ISR_Plane']]);

      mission.setVehicleMapping(mapping);

      chai.expect(mission.activeVehicleMapping).to.deep.equal(new Map());
    });

    it('should reject invalid mappings with invalid vehicles', () => {
      const vh5 = new Vehicle(5, ['ISR_Plane'], 'UNASSIGNED');
      const mapping = new Map([[vh1, 'ISR_Plane'], [vh5, 'ISR_Plane']]);

      mission.setVehicleMapping(mapping);
      chai.expect(mission.activeVehicleMapping).to.deep.equal(new Map());
    });

    it('should reject any mapping when mission is not in WAITING state', () => {
      const mapping = new Map([[vh1, 'ISR_Plane']]);
      mission.missionStatus = 'READY';

      chai.expect(() => mission.setVehicleMapping(mapping)).to.throw();
    });
  });


  describe('+ setMissionInfo()', () => {
    const vehicleList = [];
    let mission;

    beforeEach(() => {
      mission = new ISRMission(dummyCompletionCallback, vehicleList, dummyLogger);
    });

    it('should accept mission specific information when all entries are valid', () => {
      const missionSetup = { plane_end_action: 'land', plane_start_action: 'takeoff' };

      mission.setMissionInfo(missionSetup);

      chai.expect(mission.missionSetup).to.deep.equal(missionSetup);
    });

    it('should accept mission specific information even with extreneous data entries', () => {
      const missionSetup = { plane_end_action: 'land', repeat_information: 'UNASSIGNED' };

      mission.setMissionInfo(missionSetup);

      chai.expect(mission.missionSetup).to.deep.equal({ plane_end_action: 'land' });
    });

    it('should accept mission specific information even when given only invalid entries', () => {
      const missionSetup = { invalid_entry: true, repeat_information: true };

      mission.setMissionInfo(missionSetup);

      chai.expect(mission.missionSetup).to.deep.equal({ });
    });

    it('should reject mission setup information when Mission is not in WAITING state', () => {
      const missionSetup = { invalid_entry: true, repeat_information: true };
      mission.missionStatus = 'READY';

      chai.expect(() => mission.setMissionInfo(missionSetup)).to.throw();
    });
  });


  describe('+ missionSetupComplete()', () => {
    const vh1 = new Vehicle(1, ['ISR_Plane'], 'WAITING');
    const vh2 = new Vehicle(2, ['VTOL', 'Quick_Search'], 'WAITING');
    const vh3 = new Vehicle(3, ['ISR_Plane', 'Payload_drop'], 'WAITING');
    const vh4 = new Vehicle(4, ['ISR_Plane'], 'WAITING');
    const vehicleList = [vh1, vh2, vh3, vh4];
    let mission;

    beforeEach(() => {
      mission = new ISRMission(dummyCompletionCallback, vehicleList, dummyLogger);
    });

    it('should accept a valid mission setup (simple)', () => {
      const missionSetup = { plane_end_action: 'land', plane_start_action: 'takeoff' };
      const mapping = new Map([[vh1, 'ISR_Plane']]);

      mission.setVehicleMapping(mapping);
      mission.setMissionInfo(missionSetup);

      chai.expect(mission.missionSetupComplete()).to.equal(true);
    });


    it('should accept a valid mission setup (more complex)', () => {
      const missionSetup = { plane_end_action: 'land', plane_start_action: 'takeoff' };
      const mapping = new Map([[vh1, 'ISR_Plane'], [vh4, 'ISR_Plane'], [vh3, 'ISR_Plane']]);

      mission.setVehicleMapping(mapping);
      mission.setMissionInfo(missionSetup);

      chai.expect(mission.missionSetupComplete()).to.equal(true);
    });

    it('should reject an invalid mission setup when mission setup is not complete', () => {
      const missionSetup = { plane_end_action: 'land' };
      const mapping = new Map([[vh1, 'ISR_Plane']]);

      mission.setVehicleMapping(mapping);
      mission.setMissionInfo(missionSetup);

      chai.expect(mission.missionSetupComplete()).to.be.a('string').that.includes('mission parameter property is not set');
    });

    it('should reject an invalid mission setup when vehicles assignments are missing', () => {
      const missionSetup = { plane_end_action: 'land', plane_start_action: 'takeoff' };

      mission.setMissionInfo(missionSetup);

      chai.expect(mission.missionSetupComplete()).to.be.a('string').that.includes('No vehicle assigned for job type');
    });

    it('should reject an invalid mission setup when nothing is set', () => {
      chai.expect(mission.missionSetupComplete()).to.be.a('string');
    });
  });


  describe('+ missionInit()', () => {
    let vh1;
    let vh2;
    let vh3;
    let vh4;
    let mission;
    let vehicleList;

    beforeEach(() => {
      vh1 = new Vehicle(1, ['ISR_Plane'], 'WAITING');
      vh2 = new Vehicle(2, ['VTOL', 'Quick_Search'], 'WAITING');
      vh3 = new Vehicle(3, ['ISR_Plane', 'Payload_drop'], 'WAITING');
      vh4 = new Vehicle(4, ['ISR_Plane'], 'WAITING');
      vehicleList = [vh1, vh2, vh3, vh4];
      mission = new ISRMission(dummyCompletionCallback, vehicleList, dummyLogger);
    });

    it('should initialize a valid mission setup', () => {
      const missionSetup = { plane_end_action: 'land', plane_start_action: 'takeoff' };
      const mapping = new Map([[vh1, 'ISR_Plane']]);

      mission.setVehicleMapping(mapping);
      mission.setMissionInfo(missionSetup);

      chai.expect(mission.missionStatus).to.equal('WAITING');
      mission.missionInit();
      chai.expect(mission.missionStatus).to.equal('INITIALIZING');

      // Trigger a vehicle update to emulate an incoming message with the updated status
      vh1.vehicleUpdate({ status: 'READY' });

      chai.expect(mission.missionStatus).to.equal('READY');
    });

    it('should reject a mission setup when the setup is incomplete', () => {
      const missionSetup = { plane_end_action: 'land' };
      const mapping = new Map([[vh1, 'ISR_Plane']]);

      mission.setVehicleMapping(mapping);
      mission.setMissionInfo(missionSetup);
      chai.expect(() => mission.missionInit()).to.throw();
    });

    it('should reject a mission setup when the vehicle mapping is incomplete', () => {
      const missionSetup = { plane_end_action: 'land', plane_start_action: 'takeoff' };
      const mapping = new Map();

      mission.setVehicleMapping(mapping);
      mission.setMissionInfo(missionSetup);
      chai.expect(() => mission.missionInit()).to.throw();
    });

    it('should reject a mission setup when the vehicle is not available (not in master vehicle list)', () => {
      const missionSetup = { plane_end_action: 'land', plane_start_action: 'takeoff' };
      vh1.assignJob('ISR_Plane');
      const mapping = new Map([[vh1, 'ISR_Plane'], [vh4, 'ISR_Plane']]);

      mission.setVehicleMapping(mapping);
      mission.setMissionInfo(missionSetup);
      chai.expect(() => mission.missionInit()).to.throw();
    });

    it('should reject a mission setup when Mission is not in WAITING state', () => {
      const missionSetup = { plane_end_action: 'land', plane_start_action: 'takeoff' };
      const mapping = new Map([[vh1, 'ISR_Plane']]);

      mission.setVehicleMapping(mapping);
      mission.setMissionInfo(missionSetup);

      mission.missionInit();
      chai.expect(() => mission.missionInit()).to.throw();
    });

    it('should return to WAITING state if a setup or vehicle state changes while in the READY state', () => {
      const missionSetup = { plane_end_action: 'land', plane_start_action: 'takeoff' };
      const mapping = new Map([[vh1, 'ISR_Plane']]);

      mission.setVehicleMapping(mapping);
      mission.setMissionInfo(missionSetup);

      chai.expect(mission.missionStatus).to.equal('WAITING');
      mission.missionInit();
      chai.expect(mission.missionStatus).to.equal('INITIALIZING');

      // Trigger a vehicle update to emulate an incoming message with the updated status
      vh1.vehicleUpdate({ status: 'READY' });

      chai.expect(mission.missionStatus).to.equal('READY');

      // Trigger a change in a vehicle status
      vh1.vehicleUpdate({ status: 'ERROR', errorMessage: 'An unknown error has occurred' });

      chai.expect(mission.missionStatus).to.equal('WAITING');
    });
  });


  describe('+ missionStart()', () => {
    let vh1;
    let vh2;
    let vh3;
    let vh4;
    let mission;
    let vehicleList;

    beforeEach(() => {
      vh1 = new Vehicle(1, ['ISR_Plane'], 'WAITING');
      vh2 = new Vehicle(2, ['VTOL', 'Quick_Search'], 'WAITING');
      vh3 = new Vehicle(3, ['ISR_Plane', 'Payload_drop'], 'WAITING');
      vh4 = new Vehicle(4, ['ISR_Plane'], 'WAITING');
      vehicleList = [vh1, vh2, vh3, vh4];
      mission = new ISRMission(dummyCompletionCallback, vehicleList, dummyLogger);
    });

    it('should start a mission that has been initialized', () => {
      const missionSetup = { plane_end_action: 'land', plane_start_action: 'takeoff' };
      const mapping = new Map([[vh1, 'ISR_Plane']]);

      mission.setVehicleMapping(mapping);
      mission.setMissionInfo(missionSetup);
      mission.missionInit();

      vh1.vehicleUpdate({ status: 'READY' });
      const missionData = { lat: 10.000, lng: 10.000 };

      mission.missionStart(missionData);
      chai.expect(mission.missionStatus).to.equal('RUNNING');
      chai.expect(mission.waitingTasks.countItemsForKey('ISR_Plane')).to.equal(0);
      chai.expect(mission.activeTasks).to.deep.equal(new Map([[vh1, new Task(missionData.lat, missionData.lng)]]));
      chai.expect(vh1.status).to.equal('READY');
      chai.expect(vh1.assignedJob).to.equal('ISR_Plane');
      chai.expect(vh1.assignedTask).to.deep.equal(new Task(missionData.lat, missionData.lng));
    });

    it('should reject (throw exception) a mission that has not been initialize even if all required information is present', () => {
      const missionSetup = { plane_end_action: 'land', plane_start_action: 'takeoff' };
      const mapping = new Map([[vh1, 'ISR_Plane']]);

      mission.setVehicleMapping(mapping);
      mission.setMissionInfo(missionSetup);

      const missionData = { lat: 10.000, lng: 10.000 };

      chai.expect(() => mission.missionStart(missionData)).to.throw();
    });

    it('should reject (throw exception) a mission that has not been initialized and not all information is present', () => {
      const missionSetup = { plane_end_action: 'land', plane_start_action: 'takeoff' };

      mission.setMissionInfo(missionSetup);

      const missionData = { lat: 10.000, lng: 10.000 };
      chai.expect(() => mission.missionStart(missionData)).to.throw();
    });

    it('should reject a mission if the input data is insufficient', () => {
      const missionSetup = { plane_end_action: 'land', plane_start_action: 'takeoff' };
      const mapping = new Map([[vh1, 'ISR_Plane']]);

      mission.setVehicleMapping(mapping);
      mission.setMissionInfo(missionSetup);
      mission.missionInit();

      const missionData = { lat: 10.000 };

      chai.expect(() => mission.missionStart(missionData)).to.throw();
    });

    it('should reject a mission that has not finished initializing', () => {
      const missionSetup = { plane_end_action: 'land', plane_start_action: 'takeoff' };
      const mapping = new Map([[vh1, 'ISR_Plane']]);

      mission.setVehicleMapping(mapping);
      mission.setMissionInfo(missionSetup);
      mission.missionInit();

      const missionData = { lat: 10.000, lng: 10.000 };

      chai.expect(() => mission.missionStart(missionData)).to.throw();
    });
  });


  describe('+ missionUpdate()', () => {
    let vh1;
    let vh2;
    let vh3;
    let vh4;
    let mission;
    let vehicleList;

    beforeEach(() => {
      vh1 = new Vehicle(1, ['ISR_Plane'], 'WAITING');
      vh2 = new Vehicle(2, ['VTOL', 'Quick_Search'], 'WAITING');
      vh3 = new Vehicle(3, ['ISR_Plane', 'Payload_drop'], 'WAITING');
      vh4 = new Vehicle(4, ['ISR_Plane'], 'WAITING');
      vehicleList = [vh1, vh2, vh3, vh4];
      mission = new ISRMission(dummyCompletionCallback, vehicleList, dummyLogger);
    });

    it('should keep track of all POI messages that arrive', () => {
      const mesg1 = { type: 'POI', lat: 1.00, lng: 2.00 };
      const mesg2 = { type: 'POI', lat: 3.00, lng: 4.00 };
      const mesg3 = { type: 'POI', lat: 5.00, lng: 6.00 };

      chai.expect(mission.missionDataResults).to.not.have.property('POI');
      mission.missionUpdate(mesg1, vh1);
      chai.expect(mission.missionDataResults).to.have.deep.property('POI', [{ lat: 1.00, lng: 2.00 }]);
      mission.missionUpdate(mesg2, vh1);
      chai.expect(mission.missionDataResults).to.have.deep.property('POI', [{ lat: 1.00, lng: 2.00 }, { lat: 3.00, lng: 4.00 }]);
      mission.missionUpdate(mesg3, vh1);
      chai.expect(mission.missionDataResults).to.have.deep.property('POI', [{ lat: 1.00, lng: 2.00 }, { lat: 3.00, lng: 4.00 }, { lat: 5.00, lng: 6.00 }]);
    });

    it('should reassign tasks when a complete message arrives and call the completion callback when all tasks have been consumed', () => {
      // start the mission
      const missionSetup = { plane_end_action: 'land', plane_start_action: 'takeoff' };
      const mapping = new Map([[vh1, 'ISR_Plane']]);

      mission.setVehicleMapping(mapping);
      mission.setMissionInfo(missionSetup);

      mission.missionInit();
      vh1.vehicleUpdate({ status: 'READY' });
      const missionData = { lat: 10.000, lng: 10.000 };

      mission.missionStart(missionData);

      // Add new tasks
      mission.waitingTasks.push('ISR_Plane', new Task(-150, -150));
      mission.waitingTasks.push('ISR_Plane', new Task(-100, -100));

      // Send the complete message
      const mesg1 = { type: 'complete' };

      mission.missionUpdate(mesg1, vh1);
      chai.expect(mission.activeTasks.get(vh1)).to.deep.equal(new Task(-150, -150));

      mission.missionUpdate(mesg1, vh1);
      chai.expect(mission.activeTasks.get(vh1)).to.deep.equal(new Task(-100, -100));

      completionCallbackCalled = false;
      mission.missionUpdate(mesg1, vh1);
      chai.expect(completionCallbackCalled).to.equal(true);
    });

    it('should reassign tasks when a vehicle becomes unavailable', () => {
      // start the mission
      const missionSetup = { plane_end_action: 'land', plane_start_action: 'takeoff' };
      const mapping = new Map([[vh1, 'ISR_Plane'], [vh4, 'ISR_Plane']]);

      mission.setVehicleMapping(mapping);
      mission.setMissionInfo(missionSetup);

      mission.missionInit();
      vh1.vehicleUpdate({ status: 'READY' });
      vh4.vehicleUpdate({ status: 'READY' });
      const missionData = { lat: 10.000, lng: 10.000 };

      // Force the additiion of new tasks
      mission.waitingTasks.push('ISR_Plane', new Task(-150, -150));
      mission.waitingTasks.push('ISR_Plane', new Task(-100, -100));
      mission.waitingTasks.push('ISR_Plane', new Task(-50, -50));

      mission.missionStart(missionData);

      chai.expect(mission.activeTasks.get(vh1)).to.deep.equal(new Task(-150, -150));
      chai.expect(mission.activeTasks.get(vh4)).to.deep.equal(new Task(-100, -100));

      // Send the complete message
      const mesg1 = { type: 'complete' };

      // Send V1 first complete message
      mission.missionUpdate(mesg1, vh1);
      chai.expect(mission.activeTasks.get(vh1)).to.deep.equal(new Task(-50, -50));

      // Send V4 the Error message (should cause reallocation of tasks)
      vh4.vehicleUpdate({ status: 'ERROR', errorMessage: 'An unexpected error occurred' });
      chai.expect(mission.activeTasks.get(vh4)).to.equal(undefined);

      // Send V1 the second complete message
      mission.missionUpdate(mesg1, vh1);
      chai.expect(mission.activeTasks.get(vh1)).to.deep.equal(new Task(10, 10));

      // Send V1 the third complete message
      mission.missionUpdate(mesg1, vh1);
      chai.expect(mission.activeTasks.get(vh1)).to.deep.equal(new Task(-100, -100));

      // Send V1 the fourth complete message
      // Since no tasks are remaining to complete, should call the completion callback
      completionCallbackCalled = false;
      mission.missionUpdate(mesg1, vh1);
      chai.expect(completionCallbackCalled).to.equal(true);
    });
  });

  describe('+ missionNewTask()', () => {
    let vh1;
    let vh2;
    let vh3;
    let vh4;
    let mission;
    let vehicleList;

    beforeEach(() => {
      vh1 = new Vehicle(1, ['ISR_Plane'], 'WAITING');
      vh2 = new Vehicle(2, ['VTOL', 'Quick_Search'], 'WAITING');
      vh3 = new Vehicle(3, ['ISR_Plane', 'Payload_drop'], 'WAITING');
      vh4 = new Vehicle(4, ['ISR_Plane'], 'WAITING');
      vehicleList = [vh1, vh2, vh3, vh4];
      mission = new ISRMission(dummyCompletionCallback, vehicleList, dummyLogger);
    });

    it('should add new tasks to a running mission', () => {
      // start the mission
      const missionSetup = { plane_end_action: 'land', plane_start_action: 'takeoff' };
      const mapping = new Map([[vh1, 'ISR_Plane']]);

      mission.setVehicleMapping(mapping);
      mission.setMissionInfo(missionSetup);

      mission.missionInit();
      vh1.vehicleUpdate({ status: 'READY' });
      const missionData = { lat: 10.000, lng: 10.000 };

      mission.missionStart(missionData);

      // Add a new task to a running mission
      mission.missionNewTask('ISR_Plane', new Task(12, 34));
      chai.expect(mission.waitingTasks.countItemsForKey('ISR_Plane')).to.equal(1);

      // Send V1 a complete message & make sure vehicle is assigned to newly added task
      const mesg1 = { type: 'complete' };
      mission.missionUpdate(mesg1, vh1);
      chai.expect(mission.activeTasks.get(vh1)).to.deep.equal(new Task(12, 34));
    });

    it('should cause an immediate reassignment of tasks if possible', () => {
      // start the mission
      const missionSetup = { plane_end_action: 'land', plane_start_action: 'takeoff' };
      const mapping = new Map([[vh1, 'ISR_Plane'], [vh4, 'ISR_Plane']]);

      mission.setVehicleMapping(mapping);
      mission.setMissionInfo(missionSetup);

      mission.missionInit();
      vh1.vehicleUpdate({ status: 'READY' });
      vh4.vehicleUpdate({ status: 'READY' });
      const missionData = { lat: 10.000, lng: 10.000 };

      mission.missionStart(missionData);

      // vh4 should be waiting for a task
      chai.expect(mission.waitingVehicles.countItemsForKey('ISR_Plane')).to.equal(1);

      // Add a new task to a running mission
      mission.missionNewTask('ISR_Plane', new Task(12, 34));

      chai.expect(mission.activeTasks.get(vh1)).to.deep.equal(new Task(10, 10));
      chai.expect(mission.activeTasks.get(vh4)).to.deep.equal(new Task(12, 34));
      chai.expect(mission.waitingTasks.countItemsForKey('ISR_Plane')).to.equal(0);
      chai.expect(mission.waitingVehicles.countItemsForKey('ISR_Plane')).to.equal(0);
    });

    it('should reject adding a task to a mission not in RUNNING or PAUSED state', () => {
      // start the mission
      const missionSetup = { plane_end_action: 'land', plane_start_action: 'takeoff' };
      const mapping = new Map([[vh1, 'ISR_Plane'], [vh4, 'ISR_Plane']]);

      mission.setVehicleMapping(mapping);
      mission.setMissionInfo(missionSetup);

      // Cannot add task while still in WAITING
      chai.expect(() => mission.missionNewTask('ISR_Plane', new Task(12, 34))).to.throw();

      mission.missionInit();

      // Cannot add task while still in INITIALIZING
      chai.expect(() => mission.missionNewTask('ISR_Plane', new Task(12, 34))).to.throw();

      vh1.vehicleUpdate({ status: 'READY' });
      vh4.vehicleUpdate({ status: 'READY' });
      const missionData = { lat: 10.000, lng: 10.000 };

      // Cannot add task while still in READY
      chai.expect(() => mission.missionNewTask('ISR_Plane', new Task(12, 34))).to.throw();

      mission.missionStart(missionData);
    });
  });

  describe('+ getTerminatedData()', () => {
    let vh1;
    let vh2;
    let vh3;
    let vh4;
    let mission;
    let vehicleList;

    beforeEach(() => {
      vh1 = new Vehicle(1, ['ISR_Plane'], 'WAITING');
      vh2 = new Vehicle(2, ['VTOL', 'Quick_Search'], 'WAITING');
      vh3 = new Vehicle(3, ['ISR_Plane', 'Payload_drop'], 'WAITING');
      vh4 = new Vehicle(4, ['ISR_Plane'], 'WAITING');
      vehicleList = [vh1, vh2, vh3, vh4];
      mission = new ISRMission(dummyCompletionCallback, vehicleList, dummyLogger);
    });

    it('should calculate the center point of all the POIs and find the radius required to encompass all the POIs', () => {
      // start the mission
      const missionSetup = { plane_end_action: 'land', plane_start_action: 'takeoff' };
      const mapping = new Map([[vh1, 'ISR_Plane']]);

      mission.setVehicleMapping(mapping);
      mission.setMissionInfo(missionSetup);

      mission.missionInit();
      vh1.vehicleUpdate({ status: 'READY' });
      const missionData = { lat: 10.000, lng: 10.000 };

      mission.missionStart(missionData);

      // Send several POIs to the mission
      const poiMessage1 = { type: 'POI', sid: 1, lat: 52.112507, lng: -8.95761 };
      const poiMessage2 = { type: 'POI', sid: 1, lat: 52.219071, lng: -8.65764 };
      const poiMessage3 = { type: 'POI', sid: 1, lat: 52.35235, lng: -8.95573 };
      const poiMessage4 = { type: 'POI', sid: 1, lat: 52.01221, lng: -8.54834 };
      mission.missionUpdate(poiMessage1);
      mission.missionUpdate(poiMessage2);
      mission.missionUpdate(poiMessage3);
      mission.missionUpdate(poiMessage4);

      const returnValue = mission.getTerminatedData();

      chai.expect(returnValue.lat).to.be.closeTo(52.1740345, 0.0001);
      chai.expect(returnValue.lng).to.be.closeTo(-8.77983, 0.0001);
      chai.expect(returnValue.radius).to.be.closeTo(23960, 10);

      // Add a new task to a running mission
      mission.missionNewTask('ISR_Plane', new Task(12, 34));
      chai.expect(mission.waitingTasks.countItemsForKey('ISR_Plane')).to.equal(1);

      // Send V1 a complete message & make sure vehicle is assigned to newly added task
      const mesg1 = { type: 'complete' };
      mission.missionUpdate(mesg1, vh1);
      chai.expect(mission.activeTasks.get(vh1)).to.deep.equal(new Task(12, 34));
    });
  });
});
