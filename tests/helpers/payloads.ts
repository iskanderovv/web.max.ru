export const incomingTextNotification = {
  receiptId: 1234567,
  body: {
    typeWebhook: 'incomingMessageReceived',
    instanceData: {
      idInstance: 410000001,
      wid: '79876543210@c.us',
      typeInstance: 'telegram',
    },
    timestamp: 1763115112,
    idMessage: '126543123451133331119',
    senderData: {
      chatId: '10000000',
      chatName: 'Vasilisa',
      sender: '10000000',
      senderName: 'Vasilisa Premudraya',
      senderContactName: 'Vasilisa Premudraya',
      senderPhoneNumber: 79876543210,
    },
    messageData: {
      typeMessage: 'textMessage',
      textMessageData: {
        textMessage: 'Hello from Green-API!',
      },
    },
  },
}

export const stateChangeNotification = {
  receiptId: 1234568,
  body: {
    typeWebhook: 'stateInstanceChanged',
    instanceData: {
      idInstance: 410000001,
      wid: '79876543210@c.us',
      typeInstance: 'telegram',
    },
    timestamp: 1763115200,
    stateInstance: 'authorized',
  },
}
