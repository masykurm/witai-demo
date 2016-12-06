'use strict';

let Wit = null;
let interactive = null;
try {
  // if running from repo
  Wit = require('../').Wit;
  interactive = require('../').interactive;
} catch (e) {
  Wit = require('node-wit').Wit;
  interactive = require('node-wit').interactive;
}

const accessToken = (() => {
  if (process.argv.length !== 3) {
    console.log('usage: node examples/quickstart.js <wit-access-token>');
    process.exit(1);
  }
  return process.argv[2];
})();

// Quickstart example
// See https://wit.ai/ar7hur/quickstart

const firstEntityValue = (entities, entity) => {
  const val = entities && entities[entity] &&
    Array.isArray(entities[entity]) &&
    entities[entity].length > 0 &&
    entities[entity][0].value
  ;
  if (!val) {
    return null;
  }
  return typeof val === 'object' ? val.value : val;
};


const actions = {

  send(request, response) {
    const {sessionId, context, entities} = request;
    const {text, quickreplies} = response;
      var str = JSON.parse(JSON.stringify(response));
      var quickrply = '';
      if (str.quickreplies != undefined) quickrply = '\r\n' +str.quickreplies;
     console.log('> Agent: ', str.text +  quickrply);
  },
     getContactBasicInfo({context, entities}){
        var usim4G = false;
        var device4G = false;
        var interactionReason = firstEntityValue(entities, 'tsel_interaction_reason');
        if(interactionReason){
            context.contactName = 'Budiono';
            context.simNoDeviceNo = false;
            context.simNoDeviceYes = false;
            context.simYesDeviceNo = false;
            context.simYesDeviceYes = false;
            if(usim4G && device4G){
                context.simYesDeviceYes = true;
            } else if (!usim4G && device4G){
                context.simNoDeviceYes = true;
            } else if (usim4G && !device4G){
                context.simYesDeviceNo = true;
            } else if (!usim4G && !device4G){
                context.simNoDeviceNo = true;
            }
        } else {
            context.missingInteractionReason = true;
        }
        return context;
    },
    getContactLocation({context, entities}){
        var location ='Surabaya';
        context.contactName='Budiono';
        context.location='Surabaya';
        return context;
    },
    getSmartphoneCorner({context, entities}){
        var location = firstEntityValue(entities,'location');
        console.log("contact location: ", location);
        var detected= true;
        if(!location){
            location = context.location;
            if(location) {
                detected = true;
            }
            else {
                detected = false;
            }
        } else {
            context.location = location;
        }

        if(detected){
            if( location =='Surabaya') {
                context.cornerLocation = 'GT WTC 1 SURABAYA - WTC Galeria Lt 1 No 702, Jl pemuda No 27-31 ( 031-5483210 )';
            }
            if( location =='Jakarta') {
                context.cornerLocation = 'Global Mall Citraland Lt.1 - Mall Ciputra Lt.1 unit 12, Jln. Letjen S. Parman, Grogol, Jakarta Barat';
            }
        } else {
            context.cornerLocation = 'not detected';
        }
        return context;
    },
    endInteraction({context, entities}){
        //delete context.location;
        //delete context.contactName ;
        delete context.simNoDeviceNo;
        delete context.simNoDeviceYes;
        delete context.simYesDeviceNo;
        delete context.simYesDeviceYes
        delete context.missingInteractionReason;
    }
};
const uuid = require('uuid');
//const {DEFAULT_MAX_STEPS} = require('node-wit').config;
const client = new Wit({accessToken, actions});
let context = typeof initContext === 'object' ? initContext : {};
const sessionId = uuid.v1();

const steps = 5;//maxSteps ? maxSteps : DEFAULT_MAX_STEPS;
const response='';
var m = client.runActions(sessionId, 'mo upgrade 4G', context, steps)
     .then((ctx) => {
         context = ctx;
         console.log("ctx", ctx);
// //prompt();
});
//interactive(client);
