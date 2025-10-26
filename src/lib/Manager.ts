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
        logger.info('🔄 Manager started searching');

        const { organizationLatinName, organizationId, query } = this.options.advancedSearch;

        let params: string[] = [];

        if (organizationLatinName) params.push(`organizationLatinName:"${organizationLatinName}"`);
        if (organizationId && !isNaN(parseInt(organizationId))) params.push(`organizationId:${organizationId}`);
        if (query) params.push(`q:["${query}"]`);

        if (!params.length) {
            logger.info('❌ Manager failed to start searching because all the params are empty');
            return;
        }

        const baseQuery = params.join(' AND ');
        const now = new Date();
        const threeYearsAgo = new Date();
        threeYearsAgo.setFullYear(now.getFullYear() - 3);

        const dayChunks = this.createDateChunks(threeYearsAgo, now, 180); // 180-day chunks
        let totalResults = 0;

        for (const chunk of dayChunks) {
            const startStr = `DT(${chunk.start.toISOString().split('.')[0]})`;
            const endStr = `DT(${chunk.end.toISOString().split('.')[0]})`;

            const urlParams = `${baseQuery} AND issueDate:[${startStr} TO ${endStr}]`;
            const encodedParams = encodeURI(`q=(${urlParams})`);

            const url = this.config.getApiUrlWithParams('search/advanced', encodedParams);
            const chunkResults = await this.runHttpsRequest(url);

            if (chunkResults > 0) totalResults += chunkResults;
        }

        logger.info(`✅ Total results across 3 years: ${totalResults}`);

        if (this.totalResults < totalResults) {
            let message = `Found ${totalResults - this.totalResults} new results for "${query}"`;
            if (organizationLatinName) message += ` in ${organizationLatinName}`;

            logger.info('📩 ' + message);

            if (this.notifications) this.notifications.sendDiscord(message);

            this.totalResults = totalResults;
            saveOutput({ totalResults: this.totalResults });
        }
    }

    private createDateChunks(start: Date, end: Date, daysPerChunk: number): { start: Date; end: Date }[] {
        const chunks: { start: Date; end: Date }[] = [];
        let currentStart = new Date(start);

        while (currentStart < end) {
            const currentEnd = new Date(currentStart);
            currentEnd.setDate(currentEnd.getDate() + daysPerChunk - 1); // exactly 180 days max
            if (currentEnd > end) currentEnd.setTime(end.getTime());
            chunks.push({ start: new Date(currentStart), end: currentEnd });
            currentStart = new Date(currentEnd);
            currentStart.setDate(currentStart.getDate() + 1); // start next chunk
        }

        return chunks;
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