import * as path from 'path';
import * as fs from 'fs';
import validator from '../tools/validator';
import logger from './Logger';

const defaultOptions: JsonOuput = {
  totalResults: 0
}

export default interface JsonOuput {
  totalResults: number;
}

export function loadOutput(): number {
  const fileLocation = getOutputPath();

  //try to read the file and if it doesnt exist create it using the default options
  try {
    const rawOutput = fs.readFileSync(fileLocation, 'utf8');

    try {
      const output: JsonOuput = JSON.parse(rawOutput);

      const errors = validator(output, 'output');

      if (errors) {
        throw new Error('Invalid output: ' + errors.join(', '));
      }

      return output.totalResults;
    } catch (err) {
      throw new Error('Invalid output');
    }
  } catch (err) {
    logger.info('Output file not found, creating it')

    fs.writeFileSync(fileLocation, JSON.stringify(defaultOptions, null, 4));

    return defaultOptions.totalResults;
  }
}

export function getOutputPath(): string {
  // Use process.cwd() to get the project root directory instead of __dirname
  // This ensures we always write to the root of the project
  return path.join(process.cwd(), 'output.json');
}

export function saveOutput(output: JsonOuput): void {
  const fileLocation = getOutputPath();

  fs.writeFileSync(fileLocation, JSON.stringify(output, null, 4));
}
