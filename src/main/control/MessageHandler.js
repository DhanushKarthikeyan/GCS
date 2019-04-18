import { ipcRenderer } from 'electron';

import Orchestrator from './Orchestrator';
import UpdateHandler from './DataStructures/UpdateHandler';

/*
================================================================================
MESSAGE BASIC FIELDS (work to remove, consult wiki)
================================================================================
{
  id: {int} (currentUnixTime is starting counter (this way old messages cannot be re-used);
                    this will be sent to Vehicles using `messageInit` message type)
  sid: {string} (The SOURCE ID from where the message was sent; for the GCS, this will be "GCS")
  tid: {int} (Target ID for vehicle message is intended for; this is for blimp)
  type: {string} (Message Type)
  time: {long int} Time (in epoch seconds) a unique ID for each message
  <other fields here>
}
*/

export default class MessageHandler {
  static reportFailure(failureMessage) {
    const ipcMessage = {
      type: 'failure',
      message: failureMessage,
    };
    console.log('FAILURE: (in Class `MessageHandler`) ', failureMessage);
    ipcRenderer.send('post', 'updateMessages', ipcMessage);
  }

  /**
   * Get the instance of the singleton Message Handler.
   *
   * @returns {MessageHandler} the singleton instance
   */
  static getInstance() {
    if (MessageHandler.instance === undefined) {
      MessageHandler.singletonUnlock = true;
      MessageHandler.instance = new MessageHandler();
      MessageHandler.singletonUnlock = false;
    }
    return MessageHandler.instance;
  }

  /**
   * Creates an instance of a MessageHandler
   * @constructor
   * @param { Orchestrator } orchestrator : the Orchestrator object
   * @this { MessageHandler }
   */
  constructor() {
    if (MessageHandler.singletonUnlock !== true) {
      throw new Error('MessageHandler must be acquired with the getInstance() method!');
    }


    /* List of JSON obj., ea. repr. 1 msg. */
    this.messageOutbox = [];
    /* List of JSON obj., ea. {ID: , type: } */
    this.messagesSent = [];
    /* List of JSON obj., ea. {ID: , type: } */
    this.messagesReceived = [];
    this.messageIDSeed = this.now();
    // this.messageIDSeed = Date.now();

    this.updateHandler = new UpdateHandler();
  }

  /**
   * @returns { int } now: the current Unix time in seconds
   */
  now() {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * @description remove a message with messageID `mID` from the messageOutbox queue
   * @param {int} mID : ID of message to remove
   * @param {Array} box : message "box" (queue) to remove message from
   *
   * @returns {Array} box : the `box` provided in the function arguments that has message identified by `mID` remove
   */
  rmMsg(mID, box) {
    box = box.filter(obj => !(obj.id === mID));
    return box;
  }

  /**
   * @description Returns the next (valid) message ID
   * @this {MessageHandler}
   * @returns {long} msgID: time in milliseconds since Unix epoch
   */
  nextMsgID() {
    return this.now();
  }

  /**
   * @description Logic for sending message
   *
   * The provided message object should contain the type and the other custom fields.
   * The control fields (id/time/sid/tid) are auto populated by the MessageHandler
   *
   * @param {Vehicle} vehicle: vehicle to target
   * @param {JSON} message: message to send (must be properly formatted)
   * @param {string} source: Source ID of the vehicle
   * @this {MessageHandler} MessageHandler : instance of the MessageHandler
   */
  sendMessageTo(vehicle, message, source) {
    // let requiresAck = true;
    /**
     * Get message,
     * Ensure message format
     */
    if(!isValidFormat(message)) {
      msg = fmtMsg(msg, vehicle, source);
      if(!isValidFormat(message)) {
        return; // abort; bad format!
      }
    }
    switch (message.type) {
      case 'ACK':
        this.messageOutbox = this.rmMsg(message.ackID, this.messageOutbox);
        break;
        /**
         * @TODO: Finish moving stuff over from Orchestrator.js
         */
      default:
        // Error: message type not recognized!
        break;
    }
    // Send message to all needed recipients
    for (const v of this.messageRecipients(message)) {
      this.asyncSendMessage(v, message);
    }
    // Loop until receive ACK
    // Ensure ACK message ID is same as the one sent
    // Add messageID to usedIDs
    this.messagesSent.push(message.id);
    // If sent/ACK'd mID's same, exit
    // If sent/ACK'd mID's diff, raise warning, drop message, keep waiting (?)
    // Retry until timeout; if no reponse, assume dead or jammed
  }

  /**
  * @description  Checks a message (`msg`) to see if it has a valid format (i.e., if all
  *               required fields have been set)
  * @param {JSON} msg: the message to check
  * @returns {boolean} rv: true or false on success, ON ERROR RETURNS null !!!
  */
  isValidFormat(msg) {
    let rv = false;
    if (!msg.vwnProperty('type')) {
      return null;
    }
    // Check message format type
    const reqdFields = ['id', 'type', 'tid', 'sid'];
    switch (msg.type.toUpperCase()) {
      case 'UPDATE':
        break;
      case 'ACK':
        reqdFields.push('ackID');
        // @TODO: determine if `ackType` is actually needed
        reqdFields.push('ackType');
        break;
      case 'CONNECT':
        reqdFields.push('jobsAvailable');
        break;
      case 'POI':
        reqdFields.push('lat');
        reqdFields.push('lon');
        break;
      case 'COMPLETE':
        // @TODO: determine if `missionData` is actually required;
        // `missionData` is the field containing the data returned to the GCS to forward to the next Mission
        reqdFields.push('missionData');
        break;
      case 'badMessage':
        MessageHandler.log(`Got 'badMessage' from ${msg.srcVehicleID} complaining about message w/ msg.id=${msg.id}`);
        break;
      default:
        break;
    }

    const missing = [];
    for (const field of reqdFields) {
      if (!msg.hasOwnProperty(field)) {
        missing.push(field);
      }
    }
    rv = !(missing.length > 0);
    if (!rv) {
      if (msg.hasOwnProperty('vehicleID')) {
        this.sendMessageTo(msg.vehicleID, {
          id: this.nextMsgID(),
          type: 'badMessage',
          error: `Missing fields: ${missing.join(', ')}`,
        });
      } else {
        return null;
      }
    }
    return rv;
  }

  /**
   * Return a properly formatteded message (populates basic fields)
   * @param {JSON} msg
   */
  fmtMsg(msg, tgt, sid) {
    if(isValidFormat(msg)) {
      return msg;
    }
    const basicFields = ['id', 'tid', 'sid', 'time', 'type'];
    for (const field of basicFields) {
      /* only add fiedld if not already there */
      if (!msg.hasOwnProperty(field)) {
        switch (field) {
          case 'type':
            // Cowardly refuse to send a message without a type
            return null;
            // break;
          case 'id':
            msg.id = this.nextMsgID();
            break;
          case 'tid':
            msg.tid = tgt.id;
            break;
          case 'sid':
            msg.sid = sid;
            break;
          case 'time':
            msg.time = this.now();
            break;
          default:
            break;
        }
      }
    }
    return msg;
  }
  /**
   * Acknowledge a given message.
   * @param {JSON} msg
   */
  ack(msg) {
    // 1. Create appropriate ACK message
    const ackMsg = {
      id: this.nextMsgID(),
      tid: msg.sid,
      sid: 'GCS',
      type: 'ACK',
      ackID: msg.id,
    };
    // 2. Send ACK message
    this.asyncSendMessage(msg.sid, ackMsg);
  }

  /**
   * @description What to do when receiving messages
   * @param {JSON} msg : the message received from the world
   */
  receiveMessage(msg) {
    /** @TODO Move `handleReceivedMessage` from `Orchestrator.js` here */
    // Recieve message
    // Check if messageID is already received in `messagesReceived`
    // If so, drop the message and stop processing
    // Otherwise:
    // 0. record messageID in messagesReceived
    const orchestrator = Orchestrator.getInstance();

    this.messagesReceived.push(msg.id);
    this.ack(msg);
    // 3. Handle the message received
    const v = orchestrator.getVehicleByID(msg.sid);
    v.lastConnTime = Date.now();
    clearTimeout(v.timeout);
    v.timeout = setTimeout(orchestrator.deactivateVehicle(v), v.vehicleTimeoutLength);
    switch (msg.type.toUpperCase()) {
      /* Base messages */
      case 'CONNECT':
        break;
      case 'UPDATE':
        break;
      case 'BADMESSAGE':
        break;
      /* ISR */
      case 'POI':
        break;
      /**
       * @TODO Get message types for other missions
       */
      default:
        break;
    }
  }

  messageRecipients(msg) {
    const recipients = [];
    // Determine who should receive the message based on type, contents, etc.
    switch (msg.type.toUpperCase()) {
      /* Base messages */
      case 'CONNECT':
        /**
         * @TODO messageHandler only (modify orchestrator directly)
         */
        recipients.push(this.orchestrator);
        break;
      case 'UPDATE':
        recipients.push(this.orchestrator.getVehicleByID(msg.sid));
        break;
      case 'BADMESSAGE':
        break;
      /* ISR */
      case 'POI':
        /**
         * @TODO Mission only (no orchestrator)
         */
        break;
      /**
       * @TODO Get message types for other missions
       */
      default:
        break;
    }
    // recipients.push('GCS');
    return recipients;
  }

  /**
   * Schedules* a message to be sent using events in UpdateHandlers
   * @param {JSON} msg : The message that is to be sent
   */
  asyncSendMessage(msg) {
    const eventString = `${msg.tid}-${msg.mID}-${msg.type}`;
    const orchestrator = Orchestrator.getInstance();

    /* not sure if this will work */
    this.updateHandler.addHandler(eventString,
      () => this.rmMsg(msg.id, this.messageOutbox), /* remove message on sending */
      // TODO : currently times out, should re-send message instead?
      () => orchestrator.deactivateVehicle(         /* on timeout deactivate vehicle */
        orchestrator.getVehicleByID(msg.tid)),
      3000);
  }

  /**
    * Sets the function that takes any incoming messages that need to be handled
    * This is usually a function inside the Orchestrator
    *
    * @param {Function} callback the function to call back
    */
  setMessageHandler(callback) {
    // set the active mission
  }
}
