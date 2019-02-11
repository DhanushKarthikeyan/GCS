import { ipcRenderer } from 'electron';

/*
================================================================================
MESSAGE BASIC FIELDS
================================================================================
{
  vehicleID: {string} (The Vehicle ID from where the message was sent; for the GCS, this will be "GCS")
  id: {int} (currentUnixTime is starting counter (this way old messages cannot be re-used);
                    this will be sent to Vehicles using `messageInit` message type)
  type: {string} (Message Type)

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
   * Creates an instance of a MessageHandler
   * @TODO: complete method
   */
  constructor() {
    /* List of JSON obj., ea. repr. 1 msg. */
    this.messageOutbox = [];
    /* List of JSON obj., ea. {ID: , type: } */
    this.messagesSent = [];
    /* List of JSON obj., ea. {ID: , type: } */
    this.messagesReceived = [];
    this.messageSeed = Math.floor(Date.now() / 1000);
  }

  rmSentMessage(mID) {
    /* remove a message with messageID `mID` from the messageOutbox queue */
    this.messageOutbox = this.messageOutbox.filter( (obj) => {obj.id != mID} );
  }

  /**
   * Logic for sending message
   */
  sendMessageTo( vehicle, message ) {
    requiredFields = ['id', 'type', 'vehicleID'];
    // TODO:
    // Get message
    // Ensure message format
    switch (message.type) {
        case 'ACK':
            rmSentMessage(message.ackID);
            break;
        /**
         * @TODO: Finish moving stuff over from Orchestrator.js
         */
        default:
            break;
    }
    // Select vehicle
    // Send message
    /**
     * Use the EventsHandler classes and methods to send and wait for this stuff
     */
    asyncSendMessage(vehicle, message);
    // Loop until receive ACK
    // Ensure ACK message ID is same as the one sent
    // Add messageID to usedIDs
    messagesSent.push(message.id);
    // If same, exit
    // If different, raise warning, drop message, keep waiting (?)
    // Retry until timeout; if no reponse, assume dead or jammed
  }

  receiveMessage(message) {
    // TODO: Move `handleReceivedMessage` from `Orchestrator.js` here
    // Recieve message
    // Check if messageID is already received in `messagesReceived`
    // If so, drop the message and stop processing
    if( messagesReceived.includes(message.id) || messages. ) {
        return;
    }
    // Otherwise:
    // 0. record messageID in messagesReceived
    messagesReceived.push(message.id);
    // 1. Create appropriate ACK message
    // 2. Send ACK message
    // 3. Handle the message received
  }

  messageRecipients(message) {
    // Determine who should receive the message based on type, contents, etc.
  }
}
