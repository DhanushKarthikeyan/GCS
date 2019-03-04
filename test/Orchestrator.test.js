/*
 * Set up the Spectron testing environment for unit tests
 */

const chai = require('chai');

const mocha = require('mocha');
const describe = mocha.describe;
const it = mocha.it;
const beforeEach = mocha.beforeEach;

import Orchestrator from '../src/main/control/Orchestrator';

describe('Orchestrator', () => {
  describe('+ createMission()', () => {
    let orchestrator;

    it('should create new mission objects in order they are defined', () => {
      orchestrator = new Orchestrator();

      orchestrator.createMission('ISRMission');

      chai.expect(orchestrator.scheduledMissions.length).to.equal(1);
    });
  });
});
