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
    this.state = { view: 'MAIN_MENU' };

    ipcRenderer.on('R_index_GUI_ChangeViewState', (event, data) => this.setState({ view: data.view }));

    // Bind Methods.
    this.closeMissionSetupView = this.closeMissionSetupView.bind(this);
  }

  mainMenuView() {
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
    this.setState({ view: 'MAIN_MENU' });
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
    if (this.state.view === 'MAIN_MENU') {
      return this.mainMenuView();
    } else if (this.state.view === 'MISSION_SETUP') {
      return this.missionSetupView();
    } else {
      return (
        <div>
          An error occurred; an unknown render index state was entered.
        </div>
      );
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
