import { ipcRenderer } from 'electron';
import React, { Component } from 'react';

import './MissionSetup.css';

export default class MissionSetup extends Component {
  constructor() {
    super();

    // These are the available states from which the sytem can select from
    // Note that the order matters, as a state later in the array cannot be peformed
    // before the entries earlier in the array.
    this.state = {
      startMission: null,
      endMission: null,
      availableMissionSetupStates:
      [
        { name: 'ISR', class: 'ISRMissionView' },
        { name: 'VTOL', class: null },
        { name: 'UUV/UGV', class: null },
        { name: 'Payload', class: null },
      ],
    };

    // ipcRenderer.on('R_MissionSetup_DATA_MissionSetupStatesSelected');
  }

  setStartState(startState) {
    //this.setState();
  }

  render() {
    const { availableMissionSetupStates } = this.state;

    return (
      <div>
        <h1>MissionSetup</h1>
        <div>
          {
            availableMissionSetupStates.map(setupState =>
              <div key={setupState.name}>
                <h3>{setupState.name}</h3>
                <button onClick={this.setStartState}>Select Start</button>
                <button onClick={this.setStartState}>Select End</button>
              </div>
            )
          }
        </div>
      </div>
    );
  }
}
