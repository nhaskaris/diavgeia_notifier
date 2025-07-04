import Configuration from './Configuration';
import logger from './Logger';
import axios from 'axios';
import { AdvancedSearchResults } from '../types/results';
import JsonOptions, { loadOptions } from './Options';
import { loadOutput, saveOutput } from './Output';
import Notifications from './Notifications';

export default class Manager {
    private config: Configuration;

    private options!: JsonOptions;

    private notifications!: Notifications;

    private totalResults: number = 0;

    constructor() {
        this.config = new Configuration();
    }

    public start(): void {
        logger.info('Manager initialized')

        this.options = loadOptions();

        if (this.options.discord.webHookUrl) {
            this.notifications = new Notifications(this.options.discord.webHookUrl);
        }

        //load the total results from the file output.json
        this.totalResults = loadOutput();

        this.startSearch();
        //repeat every 2 hours
        setInterval(this.startSearch.bind(this), 2 * 60 * 60 * 1000);
    }

    private async startSearch(): Promise<void> {
        logger.info('🔄 Manager started searching')

        const organizationLatinName = this.options.advancedSearch.organizationLatinName;

        const organizationId = this.options.advancedSearch.organizationId;

        const query = this.options.advancedSearch.query;

        let params = []

        if (organizationLatinName) {
            params.push(`organizationLatinName:"${organizationLatinName}"`);
        }

        if (organizationId) {
            //check if the organizationId is a number
            if (!isNaN(parseInt(organizationId))) {
                params.push(`organizationId:${organizationId}`);
            }
        }

        if (query) {
            params.push(`q:["${query}"]`);
        }

        params = params.map(param => `${param}`);

        let string = params.join(' AND ');

        string = `q=(${string})`;

        //if all the params are empty then return
        if (!params.length) {
            logger.info('❌ Manager failed to start searching because all the params are empty');

            return;
        }

        let url = this.config.getApiUrlWithParams('search/advanced', string);

        url = encodeURI(url);

        const totalResults = await this.runHttpsRequest(url);

        if (totalResults < 0) {
            logger.error('Manager failed to run HTTPS request');

            return;
        }

        logger.info(`✅ Manager finished searching with ${totalResults} results`);

        if (this.totalResults < totalResults) {
            let message = `Found ${totalResults - this.totalResults} new results with the keyword ${this.options.advancedSearch.query}`;

            if (this.options.advancedSearch.organizationLatinName) {
                message += ` at the organization ${this.options.advancedSearch.organizationLatinName}`;
            }

            logger.info('📩 ' + message)

            if (this.notifications) {
                this.notifications.sendDiscord(message);
            }

            this.totalResults = totalResults;

            //save the total results to the file output.json
            saveOutput({ totalResults: this.totalResults });
        }
    }

    private async runHttpsRequest(url: string): Promise<number> {
        try {
            const response = await axios.get(url);

            if (response.status !== 200) {
                logger.error(`Manager failed to run HTTPS request to ${url} with status code ${response.status}`);
                return -1;
            }

            const results: AdvancedSearchResults = response.data;

            return results.info.total;
        } catch (error) {
            logger.error(`Manager failed to run HTTPS request to ${url}: ${error}`);
            return -1;
        }
    }
}