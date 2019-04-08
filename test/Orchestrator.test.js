/*
 * Set up the Spectron testing environment for unit tests
 */

/* eslint-disable no-unused-expressions */

const chai = require('chai');

const mocha = require('mocha');
const describe = mocha.describe;
const it = mocha.it;
const beforeEach = mocha.beforeEach;

import Orchestrator from '../src/main/control/Orchestrator';
import ISRMission from '../src/main/control/Missions/ISRMission';
import Vehicle from '../src/main/control/Vehicle';


// Override log
// TODO: because static, change to before/after reverts to original
let logged_message;

const dummyLogger = {
  logError: message => { logged_message = message; },
  logInfo: message => { logged_message = message; },
};

function createNewDummyOrchestrator() {
  Orchestrator.instance = undefined;
  const orchRef = Orchestrator.getInstance();

  // Mute the loggers
  orchRef.logError = dummyLogger.logError;
  orchRef.logInfo = dummyLogger.logInfo;

  return orchRef;
}

describe('Orchestrator', () => {
  describe('+ createMission()', () => {
    let orchestrator;

    it('should create a single new mission object', () => {
      orchestrator = createNewDummyOrchestrator();

      const mission = orchestrator.createMission('ISRMission');
      chai.expect(orchestrator.scheduledMissions.length).to.equal(0);
      chai.expect(mission).to.be.an.instanceof(ISRMission);
      chai.expect(mission.status).to.be.equal('WAITING');
    });

    it('should return null and log an error if an invalid request is made', () => {
      orchestrator = createNewDummyOrchestrator();

      const mission = orchestrator.createMission('FAKE_MISSION');
      chai.expect(mission).to.be.null;
      chai.expect(logged_message).to.have.string('Received request to construct mission object');
      chai.expect(logged_message).to.have.string('FAKE_MISSION');
      chai.expect(logged_message).to.have.string('class is not defined');
    });
  });

  describe('+ addMissions()', () => {
    let orchestrator;

    beforeEach(() => {
      logged_message = '';
    });

    it('should add a single mission to the scheduled missions list in the orchestrator', () => {
      orchestrator = createNewDummyOrchestrator();

      // Create and set up the mission
      const mission = orchestrator.createMission('ISRMission');

      // create the vehicles
      const connectMessage1 = { type: 'CONNECT', sid: 100, jobsAvailable: ['ISR_Plane'] };
      orchestrator.processMessage(connectMessage1);

      const vh1 = orchestrator.getVehicleByID(100);

      // set up the mission
      const missionSetup = { plane_end_action: 'land', plane_start_action: 'takeoff' };
      const mapping = new Map([[vh1, 'ISR_Plane']]);

      mission.setVehicleMapping(mapping);
      mission.setMissionInfo(missionSetup);

      // Check that the mission setup is complete
      chai.expect(mission.missionSetupComplete(), 'The mission setup did not complete successfully!').to.be.true;

      orchestrator.addMissions([mission]);

      chai.expect(orchestrator.scheduledMissions.length).to.equal(1);
      chai.expect(orchestrator.scheduledMissionsStatus.length).to.equal(1);

      for (const curr_mission of orchestrator.scheduledMissions) {
        chai.expect(curr_mission.status).to.be.equal('INITIALIZING');
      }
    });

    it('should add two missions to the scheduled missions list in the orchestrator & should successfully initialize when vehicles are ready', () => {
      orchestrator = createNewDummyOrchestrator();

      // connect the two new vehicles (Connect message)
      const connectMessage1 = { type: 'CONNECT', sid: 100, jobsAvailable: ['ISR_Plane'] };
      orchestrator.processMessage(connectMessage1);
      const connectMessage2 = { type: 'CONNECT', sid: 101, jobsAvailable: ['ISR_Plane'] };
      orchestrator.processMessage(connectMessage2);

      const vehc1 = orchestrator.getVehicleByID(100);
      const vehc2 = orchestrator.getVehicleByID(101);

      // create the two missions (UI Request)
      const mission1 = orchestrator.createMission('ISRMission');
      const mission2 = orchestrator.createMission('ISRMission');

      // Finish setting up the missions
      const missionSetup = { plane_end_action: 'land', plane_start_action: 'takeoff' };
      mission1.setVehicleMapping(new Map([[vehc1, 'ISR_Plane']]));
      mission2.setVehicleMapping(new Map([[vehc2, 'ISR_Plane']]));

      mission1.setMissionInfo(missionSetup);
      mission2.setMissionInfo(missionSetup);

      // Add the set up missions (UI Request)
      orchestrator.addMissions([mission1, mission2]);

      /* TEST */
      chai.expect(orchestrator.scheduledMissions.length).to.equal(2);
      chai.expect(orchestrator.scheduledMissionsStatus.length).to.equal(2);
      for (const curr_mission of orchestrator.scheduledMissions) {
        chai.expect(curr_mission.status).to.be.equal('INITIALIZING');
      }

      // the missions will initialize & wait for the vehicles to accept the job assignment
      const updateMessage1 = { type: 'UPDATE', sid: 100, lat: 45.6, lng: 12.4, status: 'READY' };
      orchestrator.processMessage(updateMessage1);
      const updateMessage2 = { type: 'UPDATE', sid: 101, lat: 45.7, lng: 12.5, status: 'READY' };
      orchestrator.processMessage(updateMessage2);

      /* TEST */
      for (const curr_mission of orchestrator.scheduledMissions) {
        chai.expect(curr_mission.status).to.be.equal('READY');
      }
    });

    it('should reject missions that are not complete', () => {
      orchestrator = createNewDummyOrchestrator();

      // Create and set up the mission
      const mission = orchestrator.createMission('ISRMission');

      // create the vehicles
      const connectMessage1 = { type: 'CONNECT', sid: 100, jobsAvailable: ['ISR_Plane'] };
      orchestrator.processMessage(connectMessage1);

      const vh1 = orchestrator.getVehicleByID(100);

      // set up the mission -- intentionally incomplete in this case
      const missionSetup = { plane_end_action: 'land' };
      const mapping = new Map([[vh1, 'ISR_Plane']]);

      mission.setVehicleMapping(mapping);
      mission.setMissionInfo(missionSetup);

      orchestrator.addMissions([mission]);

      chai.expect(logged_message).to.contain('is expected to be completely set up prior to adding.');

      chai.expect(orchestrator.scheduledMissions.length).to.equal(0);
      chai.expect(orchestrator.scheduledMissionsStatus.length).to.equal(0);
    });

    it('should correctly become unready to start if a mission becomes unready (e.g. vehicle failure prior to start)', () => {
      orchestrator = createNewDummyOrchestrator();

      // Create and set up the mission
      const mission = orchestrator.createMission('ISRMission');

      // create the vehicles
      const connectMessage1 = { type: 'CONNECT', sid: 100, jobsAvailable: ['ISR_Plane'] };
      orchestrator.processMessage(connectMessage1);

      const vh1 = orchestrator.getVehicleByID(100);

      // set up the mission
      const missionSetup = { plane_end_action: 'land', plane_start_action: 'takeoff' };
      const mapping = new Map([[vh1, 'ISR_Plane']]);

      mission.setVehicleMapping(mapping);
      mission.setMissionInfo(missionSetup);

      // Check that the mission setup is complete
      chai.expect(mission.missionSetupComplete(), 'The mission setup did not complete successfully!').to.be.true;

      orchestrator.addMissions([mission]);

      // update the vehicle so that it is ready
      const updateMessage1 = { type: 'UPDATE', sid: 100, lat: 45.6, lng: 12.4, status: 'READY' };
      orchestrator.processMessage(updateMessage1);

      chai.expect(orchestrator.allMissionsAreReady()).to.be.true;

      // update the vehicle to simulate an error state
      const vehicleFailure1 = { type: 'UPDATE', sid: 100, lat: 0, lng: 0, status: 'ERROR' };
      orchestrator.processMessage(vehicleFailure1);

      chai.expect(orchestrator.allMissionsAreReady()).to.be.false;

      // update the vehicle so that it is ready -- the mission should NOT enter the READY state automatically
      orchestrator.processMessage(updateMessage1);

      chai.expect(orchestrator.allMissionsAreReady()).to.be.false;
    });
  });

  describe('+ allMissionsAreReady', () => {
    let orchestrator;

    /*
    this test is long because the setup is required to be done through the normal
    steps of the orchestrator. These are as follows:
      1. vehicles connect
      2. missions are created (but blank) for the UI
      3. Missions are configured with the necessary data (UI)
      4. Missions are added to the orchestrator once complete & are initialized (vehicles allocated)
      5. TEST: Mission is ready ONCE initialization completes (an async event)
    */
    it('should indicate if all the missions are ready to start', () => {
      orchestrator = createNewDummyOrchestrator();

      // connect the two new vehicles (Connect message)
      const connectMessage1 = { type: 'CONNECT', sid: 100, jobsAvailable: ['ISR_Plane'] };
      orchestrator.processMessage(connectMessage1);
      const connectMessage2 = { type: 'CONNECT', sid: 101, jobsAvailable: ['ISR_Plane'] };
      orchestrator.processMessage(connectMessage2);

      // Get the vehicles that were just added.
      const vehc1 = orchestrator.getVehicleByID(100);
      const vehc2 = orchestrator.getVehicleByID(101);

      // create the missions
      const mission1 = orchestrator.createMission('ISRMission');
      const mission2 = orchestrator.createMission('ISRMission');

      // Finish setting up the missions
      const missionSetup = { plane_end_action: 'land', plane_start_action: 'takeoff' };
      mission1.setVehicleMapping(new Map([[vehc1, 'ISR_Plane']]));
      mission2.setVehicleMapping(new Map([[vehc2, 'ISR_Plane']]));

      mission1.setMissionInfo(missionSetup);
      mission2.setMissionInfo(missionSetup);

      // Add the set up missions (UI Request)
      orchestrator.addMissions([mission1, mission2]);

      /* BEGIN TEST */
      chai.expect(orchestrator.allMissionsAreReady()).to.be.false;

      // the missions will initialize & wait for the vehicles to accept the job assignment
      // the mission status should also be updated to READY automatically
      const updateMessage1 = { type: 'UPDATE', sid: 100, lat: 45.6, lng: 12.4, status: 'READY' };
      orchestrator.processMessage(updateMessage1);

      chai.expect(orchestrator.allMissionsAreReady()).to.be.false;

      const updateMessage2 = { type: 'UPDATE', sid: 101, lat: 45.7, lng: 12.5, status: 'READY' };
      orchestrator.processMessage(updateMessage2);

      chai.expect(orchestrator.allMissionsAreReady()).to.be.true;
      /* END TEST */
    });
  });

  describe('+ processMessage', () => {
    let orchestrator;

    beforeEach(() => {
      orchestrator = createNewDummyOrchestrator();
    });

    it('should process incoming "CONNECT" messages', () => {
      let connectMessage = { type: 'CONNECT', sid: 100, jobsAvailable: ['ISR_Plane'] };

      chai.expect(orchestrator.knownVehicles.length).to.be.equal(0);

      // Test inserting new vehicle
      orchestrator.processMessage(connectMessage);

      chai.expect(orchestrator.knownVehicles.length).to.be.equal(1);
      chai.expect(orchestrator.getVehicleByID(100)).to.be.not.null;
      chai.expect(orchestrator.getVehicleByID(100).id).to.be.equal(100);
      chai.expect(orchestrator.getVehicleByID(100).jobs).to.be.deep.equal(['ISR_Plane']);

      connectMessage = { type: 'CONNECT', sid: 101, jobsAvailable: ['Payload_Drop'] };

      orchestrator.processMessage(connectMessage);
      chai.expect(orchestrator.knownVehicles.length).to.be.equal(2);
      chai.expect(orchestrator.getVehicleByID(101)).to.be.not.null;
      chai.expect(orchestrator.getVehicleByID(101).id).to.be.equal(101);
      chai.expect(orchestrator.getVehicleByID(101).jobs).to.be.deep.equal(['Payload_Drop']);
    });

    it('should correctly reject message if active vehicle sends new CONNECT message', () => {
      let connectMessage = { type: 'CONNECT', sid: 100, jobsAvailable: ['ISR_Plane'] };

      chai.expect(orchestrator.knownVehicles.length).to.be.equal(0);

      // Test inserting new vehicle
      orchestrator.processMessage(connectMessage);
      chai.expect(orchestrator.knownVehicles.length).to.be.equal(1);
      chai.expect(orchestrator.getVehicleByID(100)).to.be.not.null;
      chai.expect(orchestrator.getVehicleByID(100).id).to.be.equal(100);
      chai.expect(orchestrator.getVehicleByID(100).jobs).to.be.deep.equal(['ISR_Plane']);

      connectMessage = { type: 'CONNECT', sid: 100, jobsAvailable: ['Payload_Drop'] };

      // Test inserting new vehicle -- should reject & not modify
      orchestrator.processMessage(connectMessage);
      chai.expect(orchestrator.knownVehicles.length).to.be.equal(1);
      chai.expect(orchestrator.getVehicleByID(100)).to.be.not.null;
      chai.expect(orchestrator.getVehicleByID(100).id).to.be.equal(100);
      chai.expect(orchestrator.getVehicleByID(100).jobs).to.be.deep.equal(['ISR_Plane']);
    });

    it('should process incoming "UPDATE" messages', () => {
      // Set up test by inserting the vehicle using the default add process
      const connectMessage = { type: 'CONNECT', sid: 105, jobsAvailable: ['ISR_Plane'] };
      orchestrator.processMessage(connectMessage);
      chai.assert(orchestrator.knownVehicles.length === 1, 'Failed to add a vehicle to orchestrator');

      // Test the update message 1
      const updateMessage1 = { type: 'UPDATE', sid: 105, lat: 45.6, lng: 12.4, status: 'RUNNING' };
      orchestrator.processMessage(updateMessage1);

      const vehc = orchestrator.getVehicleByID(105);
      chai.expect(vehc.lat).to.equal(45.6);
      chai.expect(vehc.lng).to.equal(12.4);
      chai.expect(vehc.status).to.equal('RUNNING');

      // Test the update message 2
      const updateMessage2 = { type: 'UPDATE', sid: 105, lat: 47.5, lng: 13.1, status: 'ERROR', errorMessage: 'Motor failure' };
      orchestrator.processMessage(updateMessage2);

      chai.expect(vehc.lat).to.equal(47.5);
      chai.expect(vehc.lng).to.equal(13.1);
      chai.expect(vehc.status).to.equal('ERROR');
      chai.expect(vehc.errorMessage).to.equal('Motor failure');
    });

    it('should reject invalid "UPDATE" messages when the target is invalid', () => {
      // Set up test by inserting the vehicle using the default add process
      const connectMessage = { type: 'CONNECT', sid: 105, jobsAvailable: ['ISR_Plane'] };
      orchestrator.processMessage(connectMessage);
      chai.assert(orchestrator.knownVehicles.length === 1, 'Failed to add a vehicle to orchestrator');

      const vehc = orchestrator.getVehicleByID(105);
      vehc.isActive = false;

      // Test the update message
      const updateMessage = { type: 'UPDATE', sid: 105, lat: 45.6, lng: 12.4, status: 'RUNNING' };
      orchestrator.processMessage(updateMessage);

      // default values for lat & lng are null for the new vehicles
      chai.expect(vehc.lat).to.be.null;
      chai.expect(vehc.lng).to.be.null;
      chai.expect(vehc.status).to.be.equal('WAITING');
    });

    it('should update the mission when "POI" or "COMPLETE" message is received', () => {


    });
  });

  describe('+ startMission', () => {
    let orchestrator, mission1, mission2, vehc1, vehc2;

    beforeEach(() => {
      logged_message = '';
    });

    it('should start the mission and properly set up to handle mission endings', () => {
      orchestrator = createNewDummyOrchestrator();

      /* ===== PRE TEST SETUP ===== */

      // connect the two new vehicles (Connect message)
      const connectMessage1 = { type: 'CONNECT', sid: 100, jobsAvailable: ['ISR_Plane'] };
      orchestrator.processMessage(connectMessage1);
      const connectMessage2 = { type: 'CONNECT', sid: 101, jobsAvailable: ['ISR_Plane'] };
      orchestrator.processMessage(connectMessage2);

      vehc1 = orchestrator.getVehicleByID(100);
      vehc2 = orchestrator.getVehicleByID(101);

      // create the missions (UI Request)
      mission1 = orchestrator.createMission('ISRMission');
      mission2 = orchestrator.createMission('ISRMission');

      // Finish setting up the missions
      const missionSetup = { plane_end_action: 'land', plane_start_action: 'takeoff' };
      mission1.setVehicleMapping(new Map([[vehc1, 'ISR_Plane']]));
      mission2.setVehicleMapping(new Map([[vehc2, 'ISR_Plane']]));

      mission1.setMissionInfo(missionSetup);
      mission2.setMissionInfo(missionSetup);

      // Add the set up missions (UI Request)
      orchestrator.addMissions([mission1, mission2]);

      // the missions will initialize & wait for the vehicles to accept the job assignment
      const updateMessage1 = { type: 'UPDATE', sid: 100, lat: 45.6, lng: 12.4, status: 'READY' };
      orchestrator.processMessage(updateMessage1);
      const updateMessage2 = { type: 'UPDATE', sid: 101, lat: 45.7, lng: 12.5, status: 'READY' };
      orchestrator.processMessage(updateMessage2);

      chai.assert(orchestrator.allMissionsAreReady() === true, 'Orchestrator missions not ready or fully initialized for the test!');


      /* ===== BEGIN TEST SECTION ===== */

      let startData = { lat: 90.4, lng: -12.5 };

      orchestrator.startMission(startData);

      // verify that the mission1 is running
      chai.expect(orchestrator.isRunning).to.be.true;
      chai.expect(orchestrator.currentMission).to.be.equal(mission1);

      // Send messages to the orchestrator to update the running mission
      const updateMessage3 = { type: 'UPDATE', sid: 100, lat: 80, lng: -10.5, status: 'RUNNING' };
      orchestrator.processMessage(updateMessage3);

      // send the complete message: this should cause the mission to end
      const completeMessage1 = { type: 'COMPLETE', sid: 100 };
      orchestrator.processMessage(completeMessage1);

      chai.expect(orchestrator.isRunning).to.be.true;
      chai.expect(orchestrator.currentMission).to.be.equal(mission2);
    });
  });
});
