# Diavgeia_Notifier

## Description
Are you tired of checking everyday if there is a new decision published on Diavgeia about you or your organization?
Diavgeia_Notifier is a Node.js application that will notify you when a new decision is published on [Diavgeia](https://diavgeia.gov.gr/) depending on your options. Currently, it supports notifications via Discord.

## Options Schema
```
{
    "advancedSearch": {
        "organizationLatinName": "",
        "organizationId": "",
        "query": ""
    },
    "discord": {
        "webHookUrl": ""
    }
}
```

## Usage
By default the schema will look like this. You should change the values to your liking and rename the file from `options.json.template` to `options.json`(Keep in mind that you will need to edit it to get it started). Docker usage by default mounts an options.json file to the directory. If you dont edit the file and rename it one will be created for you.

```
{
    "advancedSearch": {
        "organizationLatinName": "",
        "organizationId": "",
        "query": ""
    },
    "discord": {
        "webHookUrl": ""
    }
}
```

## Installation

1. Clone the repository.

## Execution

### PM2
1. Install the dependencies by running the following command: `npm install`
2. Please install [PM2](https://pm2.keymetrics.io/) globally as it is used to run the application in the background.
3. Run the application with the following command: `npm run start`
4. Live logs can be seen with the following command: `pm2 logs diavgeia_notifier`
5. If you want to stop the application run the following command: `pm2 kill`

### Docker 
1. Run the follow command: `docker compose up -d --build`
2. Live logs can be seen with the following command using the container's id or name: `docker logs -f diavgeia_notifier`
3. If you want to stop the container run the following command using the container's id or name: `docker stop diavgeia_notifier`