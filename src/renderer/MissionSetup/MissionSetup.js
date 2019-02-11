import { ipcRenderer } from 'electron';
import React, { Component } from 'react';

import './MissionSetup.css';

export default class MissionSetup extends Component {

  setStartState = (e) => {
    const start_state_index = e.currentTarget.dataset.id;
    this.setState({ startMission: start_state_index });
  }

  setEndState = (e) => {
    const end_state_index = e.currentTarget.dataset.id;
    this.setState({ endMission: end_state_index });
  }

  constructor() {
    super();

    // This serves to keep a backup copy othe initial starting state
    // The current state is used to render and thus has the "active" working set
    // of the state data
    this.initialState = {
      startMission: null,
      endMission: null,
      ready: false,
      availableMissionSetupStates:
      [
        { name: 'ISR', class: 'ISRMissionView' },
        { name: 'VTOL', class: null },
        { name: 'UUV/UGV', class: null },
        { name: 'Payload', class: null },
      ],
    };

    // These are the available states from which the sytem can select from
    // Note that the order matters, as a state later in the array cannot be peformed
    // before the entries earlier in the array.
    this.state = { ...this.initialState };

    // ipcRenderer.on('R_MissionSetup_DATA_MissionSetupStatesSelected');
  }

  render() {
    const { availableMissionSetupStates, ready } = this.state;

    return (
      <div>
        <h1>MissionSetup</h1>
        <div>
          {
            availableMissionSetupStates.map((setupState, index) =>
              <div key={setupState.name}>
                <h3>{setupState.name}</h3>
                <button onClick={this.setStartState} data-id={index}>Select Start</button>
                <button onClick={this.setStartState} data-id={index}>Select End</button>
              </div>
            )
          }
        <button onClick={this.setStartState} enabled={ready}>Next ...</button>
        </div>
      </div>
    );
  }
}
