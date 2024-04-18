// For more information, see https://crawlee.dev/
import { PlaywrightCrawler, ProxyConfiguration } from 'crawlee';

import { router } from './routes.js';

const startUrls = ['https://www.nykaa.com/skin/moisturizers/night-cream/c/8395?page_no=1&sort=popularity&eq=desktop'];

const crawler = new PlaywrightCrawler({
    // proxyConfiguration: new ProxyConfiguration({ proxyUrls: ['...'] }),
    requestHandler: router,
    // Comment this option to scrape the full website.
    maxRequestsPerCrawl: 100,
    headless: true,
    maxConcurrency: 1,
    maxRequestsPerMinute: 20,
    sameDomainDelaySecs: 5,
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
        await page.screenshot({ path: `storage/screenshots/${productId}.png` });
    }    
});

await crawler.run(startUrls);
