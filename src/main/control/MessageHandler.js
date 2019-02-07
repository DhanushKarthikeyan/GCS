import { ipcRenderer } from 'electron';

/*
================================================================================
MESSAGE BASIC FIELDS
================================================================================
{
  vehicleID: {string} (The Vehicle ID from where the message was sent; for the GCS, this will be "GCS")
  messageID: {int} (currentUnixTime is starting counter (this way old messages cannot be re-used);
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
   *  Creates an instance of a MessageHandler
   *  @TODO: complete method
   */
  constructor() {
    // TODO:
    // Lists:
    //    messageQueue
    //    messagesSent
    //    messagesReceived
  }

  /**
   *  Logic for sending message
   */
  sendMessageTo( vehicle, message ) {
    // TODO:
    // Get message
    // Ensure message format
    // Select vehicle
    // Send message
    // Loop until receive ACK
    // Ensure ACK message ID is same as the one sent
    // Add messageID to usedIDs
    // If same, exit
    // If different, raise warning, drop message, keep waiting (?)
    // Retry until timeout; if no reponse, assume dead or jammed
  }

  receiveMessage(message) {
    // TODO: Move `handleReceivedMessage` from `Orchestrator.js` here
    // Recieve message
    // Check if messageID is already received in `messagesReceived`
    // If so, drop the message and stop processing
    // Otherwise:
    // 0. record messageID in messagesReceived
    // 1. Create appropriate ACK message
    // 2. Send ACK message
    // 3. Handle the message received
  }

  messageRecipients(message) {
    // Determine who should receive the message based on type, contents, etc.
  }
}

