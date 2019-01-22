/**
 * XBee messaging class to send and receive message
 */

const xbee_api = require('xbee-api');
const C = xbee_api.constants;
const xbeeAPI = new xbee_api.XBeeAPI();

export default class XBee {
  constructor(orch) {
    this.orch = orch;

    this.default_send_frame = {
      type: ,
      command:
    }
  }
}
