// For more information, see https://crawlee.dev/
import { PlaywrightCrawler, ProxyConfiguration } from 'crawlee';

import { router } from './routes.js';

const startUrls = ['https://www.nykaa.com/foxtale-cleanser-moisturizer-sunscreen-dewy-vitamin-c-serum-combo/p/11775078?productId=11775078&pps=19'];

const crawler = new PlaywrightCrawler({
    // proxyConfiguration: new ProxyConfiguration({ proxyUrls: ['...'] }),
    requestHandler: router,
    // Comment this option to scrape the full website.
    maxRequestsPerCrawl: 20,
    headless: true,
    maxConcurrency: 1,
    maxRequestsPerMinute: 10,
    sameDomainDelaySecs: 10,
    errorHandler: async ({ request, page, log }) => {
        // save screenshot
        log.error(`Failed to load ${request.loadedUrl}`);
        // get query params
        if (request.loadedUrl === undefined) {
            return;
        }
        const url = new URL(request.loadedUrl) ;
        const queryParams = url.searchParams;
        // get product id
        const productId = queryParams.get('productId');
        await page.screenshot({ path: `screenshots/${productId}.png` });
    }    
});

await crawler.run(startUrls);
