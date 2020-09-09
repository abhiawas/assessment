'use strict';

//import ask-sdk-core
const Alexa = require('ask-sdk-core');
const request   =  require("request");
const rp = require('request-promise');
const fs = require('fs');
const faker = require('faker');
//skill name
const appName = 'LightSpeed Assessment';

//code for the handlers
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        //welcome message
        let speechText = 'Welcome to your LightSpeed Ecommerce store. You can get information about your products or you can add a new product';
        //welcome screen message
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

//implement custom handlers
const GetProductsHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
    && handlerInput.requestEnvelope.request.intent.name === 'GetProducts'
  },
   async handle(handlerInput) {
    const response = await httpGet();
    
    console.log(response);

    return handlerInput.responseBuilder
            .speak("There are total " + response.count + " products in your LightSpeed ecommerce store")
            .reprompt("how can I help you ?")
            .getResponse();
  },
};


const PostProductsHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
    && handlerInput.requestEnvelope.request.intent.name === 'PostProducts'
  },
   async handle(handlerInput) {
    let intent = handlerInput.requestEnvelope.request.intent;
    let title =  intent.slots.title.value;
    const response = await postData(title);

    console.log(response);

    return handlerInput.responseBuilder
            .speak("Okay. Product "+response.product.title+ " has been added to your ecommerce store Successfully!!" )
            .reprompt("How can I help you?")
            .getResponse();
  },
};

//end Custom handlers

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        //help text for your skill
        let speechText = 'You can either add a product or get details about products';

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard(appName, speechText)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
                || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        let speechText = 'Goodbye';
        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard(appName, speechText)
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        //any cleanup logic goes here
        return handlerInput.responseBuilder.getResponse();
    }
};

//Lambda handler function
//Remember to add custom request handlers here
exports.handler = Alexa.SkillBuilders.custom()
     .addRequestHandlers(LaunchRequestHandler,
                         GetProductsHandler,
                         PostProductsHandler,
                         HelpIntentHandler,
                         CancelAndStopIntentHandler,
                         SessionEndedRequestHandler).lambda();
                         
function httpGet() {
  return new Promise(((resolve, reject) => {
        var username = "13c212b6353a776a5a43d0ace5b0b7a6"; 
        var password = "c7c95ff577dcd5f209ca29925cd23048";
        var authenticationHeader = "Basic " + new Buffer(username + ":" + password).toString("base64");
        request(   
                {
                url : "https://api.shoplightspeed.com/en/products/count.json",
                headers : { "Authorization" : authenticationHeader }  
                },function (error, response, body) {
                    console.log(body); 
                resolve(JSON.parse(body))
         }) 
  }))
}


function postData(title){
    return new Promise(((resolve, reject) => {
        var username = "13c212b6353a776a5a43d0ace5b0b7a6"; 
        var password = "c7c95ff577dcd5f209ca29925cd23048";
        var authenticationHeader = "Basic " + new Buffer(username + ":" + password).toString("base64");
        var options = {
            method: 'POST',
            uri: "https://api.shoplightspeed.com/en/products.json",
            headers : { "Authorization" : authenticationHeader },
            body: {
                "product": { 
                    "title":title,
                    "description":faker.commerce.productDescription(),
                    "content":faker.commerce.productDescription()
                }
                },
            json: true 
        };
        rp(options)
            .then(function(parsedBody) {
                console.log(parsedBody)
                resolve(parsedBody)
            })
            .catch(function (err) {
                console.log(err) 
                reject(err)
            });
    }))
}
