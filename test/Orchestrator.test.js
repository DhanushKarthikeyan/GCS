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

function createNewOrchestrator() {
  Orchestrator.instance = undefined;
  return Orchestrator.getInstance();
}

// Override log
// TODO: because static, change to before/after reverts to original
let logged_message;
Orchestrator.log = str => { logged_message = str; };

describe('Orchestrator', () => {
  describe('+ createMission()', () => {
    let orchestrator;

    it('should create a single new mission object', () => {
      orchestrator = createNewOrchestrator();

      const mission = orchestrator.createMission('ISRMission');
      chai.expect(orchestrator.scheduledMissions.length).to.equal(0);
      chai.expect(mission).to.be.an.instanceof(ISRMission);
      chai.expect(mission.status).to.be.equal('WAITING');
    });

    it('should return null and log an error if an invalid request is made', () => {
      orchestrator = createNewOrchestrator();

      const mission = orchestrator.createMission('FAKE_MISSION');
      chai.expect(mission).to.be.null;
      chai.expect(logged_message).to.have.string('Received request to construct mission object');
      chai.expect(logged_message).to.have.string('FAKE_MISSION');
      chai.expect(logged_message).to.have.string('class is not defined');
    });
  });

  describe('+ addMissions()', () => {
    let orchestrator;

    it('should create a single new mission object', () => {
      orchestrator = createNewOrchestrator();
    });
  });

  describe('+ allMissionsAreReady', () => {
    let orchestrator;


    it('should indicate if all the missions are ready to start', () => {
      orchestrator = createNewOrchestrator();

      let mission1, mission2;

      // create the missions
      mission1 = new ISRMission();
      mission2 = new ISRMission();


      // add the missions
      orchestrator.addMissions([mission1, mission2]);

      chai.expect(orchestrator.allMissionsAreReady()).to.be.false;

      // get the missions to be ready

      chai.expect(orchestrator.allMissionsAreReady()).to.be.true;
    });
  });

  describe('+ processMessage', () => {
    let orchestrator;

    beforeEach(() => {
      orchestrator = createNewOrchestrator();
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
      orchestrator = createNewOrchestrator();

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

      chai.assert(orchestrator.allMissionsAreReady() === true, 'Orchestrator missions not ready or fully initialized for the test!');
    });

    it('should start the mission with the given data', () => {
      chai.assert(orchestrator.allMissionsAreReady() === true, 'Mission initialization unexpectedly failed!!');

      let startData = { lat: 90.4, lng: -12.5 };

      orchestrator.startMission(startData);

      // verify that the mission1 is running
      chai.expect(orchestrator.isRunning).to.be.true;
      chai.expect(orchestrator.currentMission).to.be.equal(mission1);

      // Send messages to the orchestrator to update the running mission
      let incomingMessage = { type: 'UPDATE', sid: 100, lat: 80, lng: -10.5, status: 'running' };
      orchestrator.processMessage(incomingMessage);
    });
  });
});
