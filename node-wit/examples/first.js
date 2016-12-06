'use strict';


const bodyParser = require('body-parser');
const crypto = require('crypto');
const express = require('express');
const fetch = require('node-fetch');
const request = require('request');

let Wit = null;
let log = null;
try {
    // if running from repo
    Wit = require('../').Wit;
    log = require('../').log;
} catch (e) {
    Wit = require('node-wit').Wit;
    log = require('node-wit').log;
}

// Webserver parameter
const PORT = process.env.PORT || 8445;

// Wit.ai parameters
const WIT_TOKEN = 'X5OVWERDJJNQC3TT5FKPXEXSESS3OKRX';//process.env.WIT_TOKEN;

// This will contain all user sessions.
// Each session has an entry:
// sessionId -> {msisdn: appsUserId, context: sessionState}
const sessions = {};

const findOrCreateSession = (msisdn) => {
    let sessionId;
    // Let's see if we already have a session for the user fbid
    Object.keys(sessions).forEach(k => {
        if (sessions[k].msisdn === msisdn) {
        // Yep, got it!
        sessionId = k;
    }
});
    if (!sessionId) {
        // No session found for MSISDN X, let's create a new one
        sessionId = new Date().toISOString();
        sessions[sessionId] = {msisdn: msisdn, context: {}, currResponse:{}};
    }
    return sessionId;
};

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

// Our bot actions
const actions = {
    send(request, response) {
        const {sessionId, context, entities} = request;
        const {text, quickreplies} = response;
        // Our bot has something to say!
        // Let's retrieve the Facebook user whose session belongs to
        var str = JSON.parse(JSON.stringify(response));
        var quickrply = (str.quickreplies != undefined) ? str.quickreplies : '';
        const recipientId = sessions[request.sessionId].msisdn;
        if (recipientId) {
            //console.log('> Agent: ', str.text +  quickrply);
            sessions[request.sessionId].currResponse = {
                text: str.text,
                options: quickrply
            };
            // Yay, we found our recipient!
            // Let's forward our bot response to her.
            // We return a promise to let our bot know when we're done sending
        //     return pushMessage(recipientId, text)
        //             .then(() => null)
        // .catch((err) => {
        //         console.error(
        //         'Oops! An error occurred while forwarding the response to',
        //         recipientId,
        //         ':',
        //         err.stack || err
        //     );
        // });
        } else {
            console.error('Oops! Couldn\'t find user for session:', sessionId);
            // Giving the wheel back to our bot
            return Promise.resolve();
        }
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

// Setting up our bot
const wit = new Wit({
    accessToken: WIT_TOKEN,
    actions,
    logger: new log.Logger(log.INFO)
});

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(({method, url}, rsp, next) => {
    rsp.on('finish', () => {
    console.log(`${rsp.statusCode} ${method} ${url}`);
});
next();
});
//Get current response from wit.ai
app.get('/getResponse/:msisdn', (req, res) => {
    const sender = req.params.msisdn;  //get it from request
    var sessionId= findOrCreateSession(sender);
    console.log("response...", sessions[sessionId].currResponse);
    res.send(JSON.stringify(sessions[sessionId].currResponse));
});
// Send message to wit.ai
app.post('/sendMessage/:msisdn', (req, res) => {
    // Let's forward the message to the Wit.ai Bot Engine
    // This will run all actions until our bot has nothing left to do
    const sender = req.params.msisdn;  //get it from request
    var sessionId= findOrCreateSession(sender);
    var text = req.body.message; //get it from request
    console.log("request...", text);
    wit.runActions(
        sessionId, // the user's current session
        text, // the user's message
        sessions[sessionId].context // the user's current session state
    ).then((context) => {
        // Our bot did everything it has to do.
        // Now it's waiting for further messages to proceed.
        console.log('Waiting for next user messages');

    // Based on the session state, you might want to reset the session.
    // This depends heavily on the business logic of your bot.
    // Example:
    // if (context['done']) {
    //   delete sessions[sessionId];
    // }

    // Updating the user's current session state
    sessions[sessionId].context = context;
    })
    .catch((err) => {
        console.error('Oops! Got an error from Wit: ', err.stack || err);
    });

    res.sendStatus(200);
});

app.listen(PORT);
console.log('chat controller started[' + PORT + ']...');
