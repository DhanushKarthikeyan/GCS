import { ipcRenderer } from 'electron';
import fs from 'fs';
import path from 'path';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import LogContainer from './log/Log.js';
import MapContainer from './map/Map.js';
import MissionContainer from './mission/Mission.js';
import VehicleContainer from './vehicle/Vehicle.js';

import MissionSetup from './MissionSetup/MissionSetup';

import './global.css';
import './index.css';

const devMode = true;
const geolocation = true;

class Index extends Component {
  constructor() {
    super();
    this.state = { view: 'MAIN' };

    ipcRenderer.on('R_index_GUI_DisplayMissionSetupView', () => this.setState({ view: 'MISSION_SETUP' }));
    ipcRenderer.on('R_index_GUI_DisplayMainView', () => this.setState({ view: 'MAIN' }));

    // Bind Methods.
    this.closeMissionSetupView = this.closeMissionSetupView.bind(this);
  }

  mainView() {
    return (
      <div className='gridWrapper'>
        <MapContainer />
        <LogContainer />
        <MissionContainer />
        <VehicleContainer />
      </div>
    );
  }

  closeMissionSetupView() {
    this.setState({ view: 'MAIN' });
  }

  missionSetupView() {
    return (
      <div className='missionSetupMainView'>
        <button onClick={this.closeMissionSetupView}>Close</button>
        <MissionSetup />
      </div>
    );
  }

  render() {
    if (this.state.view === 'MAIN') {
      return this.mainView();
    } else if (this.state.view === 'MISSION_SETUP') {
      return this.missionSetupView();
    } else {
      // An invalid state view was encountered, and main view was autoselected
      this.setState({ view: 'MAIN' });
      return this.mainView();
    }
  }
}

/*
 * Renders Index then...
 *
 * If geolocation is true, the program will trigger a geolocation request to set map center to user location
 */
ReactDOM.render(<Index />, document.getElementById('app'), () => {
  if (geolocation) ipcRenderer.send('post', 'setMapToUserLocation');
});
