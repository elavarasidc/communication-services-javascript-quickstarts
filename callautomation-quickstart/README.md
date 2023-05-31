---
page_type: sample
languages:
- typescript
products:
- azure
- azure-communication-services
---

# Call Automation Bugbash
This guide walks through simple call automation scenarios and endpoints.

## Prerequisites
- An Azure account with an active subscription. [Create an account for free](https://azure.microsoft.com/free/?WT.mc_id=A261C142F).
- An active Communication Services resource. [Create a Communication Services resource](https://docs.microsoft.com/azure/communication-services/quickstarts/create-communication-resource).
- NodeJS. 
- VScode. [Download VScode](https://code.visualstudio.com/).
- ngrok
## Setup empty project
1. Create a folder for our project and in it run
    - `npm init -y`
    - `npm install express`
    - `npm install -g typescript`
    - `npm install --save-dev @types/express`
    - `tsc --init`
    - `npm install @azure/communication-call-automation@1.0.0-alpha.20230526.4`
    - `npm install @azure/communication-common`

2. update the package.json scripts section to the following

```
  "scripts": {
    "build": "tsc",
    "prestart": "npm run build",
    "start": "node .",
    "test": "echo \"Error: no test specified\" && exit 1"
  }

```

2. create the initial index.ts file

```typescript
import { CallAutomationClient, CallInvite, CallLocator, FileSource, PlayOptions, StartRecordingOptions } from "@azure/communication-call-automation";
import { CommunicationUserIdentifier } from "@azure/communication-common";
import express from "express";

process.on('uncaughtException', function (err) {
    console.error(err);
    console.log("Node NOT Exiting...");
});

const app = express();
const port = 5000; // default port to listen

// get route
app.get( "/test", ( req, res ) => {
    console.log( "test endpoint" );
    res.sendStatus(200);
} );

// get route
app.post( "/test", ( req, res ) => {
    console.log( "test post endpoint" );
    res.sendStatus(200);

} );

// start the Express server
app.listen( port, () => {
    console.log( `server started at http://localhost:${ port }` );
} );

```

## NOTE after every code change make sure you end the server and restart it. 

## Setup variables and imports that will be reused later on in this sample in the index.ts file
Add the following snippet. This will be used to recieve incoming events and the conenction string will link this with the acs resource we created.

```typescript
const app = express();
const port = 5000; // default port to listen
app.use(express.json());
const ngrokEndpoint = "<ngrokEndpoint>";
const cstring = "<communcationString>";
const client = new CallAutomationClient(cstring);
let callConnectionId = "";
let recordingId = "";
let contentLocation = "";
let deleteLocation = "";
```

## Test endpoint to make sure we are okay

1. Start ngrok on port 5000. From where ngrok is dowloaded, using the terminal run `./ngrok http 5000`
2. update the ngrok endpoints. example `https://9253-2001-569-5146-9600-755d-996a-d84c-8dbf.ngrok.io`
3. update the cstring with your connection string from your acs resrouce.
3. from the terminal run `npm run start` in our project folder"
4. from cmd run "curl http://localhost:5000/test" and ensure you can see test endpoint being written to the console.  


## Create a call to an ACS user 
1. insert the following code snippets above `// start the Express server`
```typescript
app.get( "/startcall", async ( req, res ) => {
    console.log( "startcall endpoint" );
    const { acstarget } = req.query;
    let targetUser:CommunicationUserIdentifier = {communicationUserId:acstarget?.toString()||""};
    let callInvite:CallInvite = {targetParticipant:targetUser};
    let call = await client.createCall(callInvite, ngrokEndpoint+"/test")
    callConnectionId=call.callConnectionProperties.callConnectionId||""
    res.sendStatus(200);
} );
```
2. login with an acs user on this site https://acs-sample-app.azurewebsites.net/ with the connection string of the resource we are testing. 
3. To test this, run the following form a cmd prompt `curl http://localhost:5000/startcall?acstarget=<inserttargetusername>` using the acs user you created
4. On the ACS Test App, you should see the incoming call. 
5. you can hang up the call now. You can keep this tab and user open for upcoming steps.


## Playback media to a specific user 
1. insert the following code snippets above `// start the Express server`,rerun the server, and end existing calls. 
```typescript
app.get( "/playmedia", ( req, res ) => {
    console.log( "playmedia endpoint" );
    const { acstarget } = req.query;
    let targetUser:CommunicationUserIdentifier = {communicationUserId:acstarget?.toString()||""};
    const callConnection = client.getCallConnection(callConnectionId);
    const callMedia = callConnection.getCallMedia();
    const filesource:FileSource = {url:"https://acstestapp1.azurewebsites.net/audio/bot-hold-music-1.wav", kind:"fileSource"}
    let playOptions:PlayOptions = {loop:true};
    callMedia.play([filesource],[targetUser],playOptions);
    res.sendStatus(200);
} );
```
2. redo the previous step, while the call is still active, call this endpoint with `curl http://localhost:5000/playmedia?acstarget=<inserttargetusername>`
you should notice audio will start to play from the call.


## Cancel media playback
1. insert the following code snippets above `// start the Express server`,rerun the server, and end existing calls. 
```typescript
app.get( "/stopmedia", ( req, res ) => {
    console.log( "stopmedia endpoint" );
    const callConnection = client.getCallConnection(callConnectionId);
    const callMedia = callConnection.getCallMedia();
    callMedia.cancelAllOperations();
    res.sendStatus(200);
} );
```
2. while the previous call is still active and playing media, call this endpoint with `curl http://localhost:5000/stopmedia`
you should notice audio will stop playing in the call.


## Create a group call to 2 ACS users 
1. insert the following code snippets above `// start the Express server`,rerun the server, and end existing calls. 
```typescript
app.get( "/startgroupcall", async ( req, res ) => {
    console.log( "startgroupcall endpoint" );
    const { acstargets } = req.query;
    const targets = acstargets?.toString().split(',');
    
    let targetUser:CommunicationUserIdentifier = {communicationUserId:(targets?.at(0)||"")};
    let targetUser2:CommunicationUserIdentifier = {communicationUserId:(targets?.at(1)||"")};

    let call = await client.createGroupCall([targetUser,targetUser2], ngrokEndpoint+"/test")
    callConnectionId=call.callConnectionProperties.callConnectionId||""
    res.sendStatus(200);
} );
```
2. login with an acs user on this site https://acs-sample-app.azurewebsites.net/ with the connection string of the resource we are testing. open a second tab and log in with another user
3. To test this, run the following form a cmd prompt `curl http://localhost:5000/startgroupcall?acstargets=<inserttargetusername>,<inserttargetusername>` using the acs users you created
4. On the ACS Test App, you should see the incoming call on both tabs. 


## Playback media to all users
1. insert the following code snippets above `// start the Express server`,rerun the server, and end existing calls. 
```typescript
app.get( "/playmediatoall", ( req, res ) => {
    console.log( "playmediatoall endpoint" );
    const callConnection = client.getCallConnection(callConnectionId);
    const callMedia = callConnection.getCallMedia();
    const filesource:FileSource = {url:"https://acstestapp1.azurewebsites.net/audio/bot-hold-music-1.wav", kind:"fileSource"}
    let playOptions:PlayOptions = {loop:true};
    callMedia.playToAll([filesource],playOptions);
    res.sendStatus(200);
} );
```
2. To test this, run the following form a cmd prompt `curl http://localhost:5000/playmediatoall`


## Start recording
1. insert the following code snippets above `// start the Express server`,rerun the server, and end existing calls. 
```typescript
app.get( "/startrecording", async ( req, res ) => {
    console.log( "startrecording endpoint" );
    const callRecording = client.getCallRecording();
    const callConnection = client.getCallConnection(callConnectionId);

    const callConnectionProperties = await callConnection.getCallConnectionProperties()
    const serverCallId = callConnectionProperties.serverCallId||""

    const callLocator:CallLocator = {id:serverCallId,kind:"serverCallLocator"}
    let recordingOptions:StartRecordingOptions = {callLocator};
    let recording = callRecording.start(recordingOptions);
    recordingId = (await recording).recordingId;
    res.sendStatus(200);
} );
```
2. To test this, after you have started a call, run the following form a cmd prompt `curl http://localhost:5000/startrecording`


## handle file status updated event (get notified when call recording file is ready for download)
1. insert the following code snippets above `// start the Express server`,rerun the server, and end existing calls. 
```typescript
app.post( "/filestatus", async ( req, res ) => {
    console.log( "filestatus endpoint" );
    const event = req.body[0];
    const eventData = event.data;
  
    if (event.eventType === "Microsoft.EventGrid.SubscriptionValidationEvent") {
      console.log("Received SubscriptionValidation event");
      res.status(200).send({ "ValidationResponse": eventData.validationCode });
    }
    
    if(eventData && event.eventType == "Microsoft.Communication.RecordingFileStatusUpdated") {
        deleteLocation = eventData.recordingStorageInfo.recordingChunks[0].deleteLocation
        contentLocation = eventData.recordingStorageInfo.recordingChunks[0].contentLocation
        console.log("Delete Location: " + deleteLocation);
        console.log("Content Location: " + contentLocation);
        res.sendStatus(200);
    }
});
```
2. First we need to register an event handler with our acs resource. 
    - go to your acs resource in portal https://portal.azure.com/signin/index/
    - click on events from the left side bar
    - click + event subscription to create a new subscription
    - enter name "filestatus"
    - select recording file status updated as the event to filter
    - add a system topic name, testevent for example
    - under endpoint, select webhook and enter the ngrokurl/filestatus as the endpoint. 
    - make sure when we register this, our app is running as the subscription validation handshake is required. 

3. Now that we have completed the setup, we can stop a recording, or end a call and we will get this filestatus updated event. 

4. after we get this, we are setting the content location and delete location for testing with out other endpoints. 




## Download recording
1. insert the following code snippets above `// start the Express server`,rerun the server, and end existing calls. 
```typescript
app.get( "/download", async ( req, res ) => {
    console.log( "download endpoint" );
    const callRecording = client.getCallRecording();
    callRecording.downloadToPath(contentLocation,"testfile.wav")
    res.sendStatus(200);
} );
```
1. the previous endpoint has been setup so after we get the filestatus updated event, we update the content location. 
2. to download the file, you only need to call `curl http://localhost:5000/download`


## Delete recording
1. insert the following code snippets above `app.Run()`
```typescript
app.get( "/delete", async ( req, res ) => {
    console.log( "delete endpoint" );
    const callRecording = client.getCallRecording();
    callRecording.delete(deleteLocation)
    res.sendStatus(200);
} );
```
2. the previous endpoint has been setup so after we get the filestatus updated event, we update the delete location. 
3. to download the file, you only need to call `curl http://localhost:5000/delete`


## Additional things to test
- TODO