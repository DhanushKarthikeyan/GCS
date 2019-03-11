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
});
