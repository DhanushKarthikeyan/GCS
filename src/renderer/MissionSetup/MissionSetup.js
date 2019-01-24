import { ipcRenderer } from 'electron';
import React, { Component } from 'react';

import './MissionSetup.css';

export default class MissionSetup extends Component {
  constructor() {
    super();

    // Create listener for the
    ipcRenderer.on()
  }

  render() {
    return (
      <div>MissionSetup</div>
    );
  }
}
