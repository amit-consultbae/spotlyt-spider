import { Dataset } from 'crawlee';

const dataset = await Dataset.open('nykaa');

await dataset.exportToCSV('OUTPUT');