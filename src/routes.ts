import { Dataset, createPlaywrightRouter } from 'crawlee';

export const router = createPlaywrightRouter();

router.addDefaultHandler(async ({ request, page, enqueueLinks, crawler , log }) => {
    const title = await page.title();
    const requestUrl = request.loadedUrl;
    log.info(`Starting Crawling on : ${title}`, { url: requestUrl });
    const paginationContainer = await page.locator('.product-listing').locator('>div').nth(1);
    const paginationInfo = await paginationContainer.locator('>span').first().innerText();
    const totalPages = await paginationInfo.split('of').length > 1 ? Number(paginationInfo.split('of')[1].trim()) : 1;
    log.info(`Total Pages: ${totalPages}`);
    if (totalPages > 1 && requestUrl) {        
        for (let i = 2; i <= totalPages; i++) {
            const urlObj = new URL(requestUrl);
            urlObj.searchParams.set('page_no', i.toString());
            const url = urlObj.toString(); 
            crawler.requestQueue?.addRequest({
                url: urlObj.toString(),
                label: "productList"
            });
        }
    }            
    await enqueueLinks({
        selector: '.productWrapper a',
        label: "productPage"
    })
});

router.addHandler('productList', async ({ request, page, enqueueLinks, log }) => {
    const title = await page.title();
    const requestUrl = request.loadedUrl;    
    log.info(`Starting Scraping Product List Page: ${title}`, { url: requestUrl });
    await enqueueLinks({
        selector: '.productWrapper a',
        label: "productPage"
    })
});

router.addHandler('productPage', async ({ request, page, log }) => {
    const title = await page.title();
    const requestUrl = request.loadedUrl;
    log.info("Starting Scraping Product Page: " + title, { url: requestUrl })

    const categoryBreadCrumb = await page.locator("a:text('Home') + span").locator('..').locator('..').locator('a');
    const categoryBreadCrumbCount = await categoryBreadCrumb.count();
    const subCategory = categoryBreadCrumbCount > 1 ? await categoryBreadCrumb.nth(categoryBreadCrumbCount-1).innerText() : '';
    const category = categoryBreadCrumbCount > 2 ? await categoryBreadCrumb.nth(categoryBreadCrumbCount-2).innerText() : '';

    // Get Product Name and Price
    const productContainer = await page.locator('h1').locator('..');
    const productName = await page.locator('h1').innerText();

    let productMRPPrice = '';
    let productSalesPrice = '';
    let productDiscount = '';
    const productPriceContainer = await productContainer.locator("span:text('MRP:')").locator('..').locator('>span');
    const productPriceElmCount = await productPriceContainer.count();
    if (productPriceElmCount == 3) {
        productMRPPrice = await productPriceContainer.nth(0).innerText();
        productMRPPrice = productMRPPrice.split('MRP:₹').length > 1 ? productMRPPrice.split('MRP:₹')[1] : '';
        productSalesPrice = await productPriceContainer.nth(1).innerText();
        productSalesPrice = productSalesPrice.split('₹').length > 1 ? productSalesPrice.split('₹')[1] : '';
        productDiscount = await productPriceContainer.nth(2).innerText();
    } else if (productPriceElmCount == 2){
        productMRPPrice = await productPriceContainer.nth(1).innerText();
        productMRPPrice = productMRPPrice.split('₹').length > 1 ? productMRPPrice.split('₹')[1] : '';
    }
    log.info(`Product Name: ${productName} Price: ${productMRPPrice}`, { url: requestUrl });

    // Get Images
    const productImageContainer = await page.locator('.slide-view-container img');
    const imageCount = await productImageContainer.count();
    const productImages = [];
    for (let i = 0; i < imageCount; i++) {
        const image = await productImageContainer.nth(i);
        const imageUrl = await image.getAttribute('src');
        productImages.push(imageUrl);
    }


    // Get Description
    if ((await page.$("h3:text('Description')")) !== null) {
        const descriptionTab = await page.locator("h3:text('Description')");
        await descriptionTab.click();
    }
    const descriptionTabContainer = await page.locator('#content-details')
    let productDescription = await descriptionTabContainer.locator('p').first().innerText(); 
    let productExpireDate = '';
    if (await descriptionTabContainer.locator(":text('Expiry Date:') ").isVisible()) {
        productExpireDate = await descriptionTabContainer.locator(":text('Expiry Date:') ")
        .filter({
            hasText: 'Expiry Date:'
        }).first().innerText();
        productExpireDate = productExpireDate.split('Expiry Date: ').length > 1 ? productExpireDate.split('Expiry Date:')[1] : '';
    }
    let productOrigin = await descriptionTabContainer.locator(":text('Country of Origin:')  + p").innerText();
    let productManufacture = await descriptionTabContainer.locator(":text('Manufacturer:')  + p").innerText();    


    // Get ingredients
    let productIngredients = '';
    if ((await page.$("h3:text('Ingredients')")) !== null) {
        const ingredientsTab = await page.locator("h3:text('Ingredients')");
        await ingredientsTab.click();
        const ingredientsTabContainer = await page.locator('#content-details')
        productIngredients = await ingredientsTabContainer.innerText();
        productIngredients = productIngredients.trim();
    }

    // How to use
    let productHowToUse = '';
    if ((await page.$("h3:text('How To Use')")) !== null) {
        const howToUseTab = await page.locator("h3:text('How To Use')");
        await howToUseTab.click();
        const howToUseTabContainer = await page.locator('#content-details')
        productHowToUse = await howToUseTabContainer.innerText();
        productHowToUse = productHowToUse.trim();
    }

    // // Ratings & Reviews
    await page.keyboard.press('End');
    await page.waitForTimeout(2000);

    // // Get Ratings
    const ratingContainer = await page.locator("strong:text('Overall Rating')").locator('..').locator('..');
    let rating = await ratingContainer.locator('strong').first().innerText();
    rating = rating.trim();

    let verifiedRatings = await page.locator("strong:text('Overall Rating') + span").innerText();
    verifiedRatings = verifiedRatings.split('verified ratings').length > 1 ? verifiedRatings.split('verified ratings')[0] : '';
    verifiedRatings = verifiedRatings.trim();

    // // Get Reviews
    const reviews = await page.locator("div:text('Most Useful Review')").locator('..').locator('>div');
    const reviewCount = await reviews.count();
    
    log.info("Review Count: " + reviewCount)
    const reviewData = [];
    for (let i = 0; i < reviewCount - 1; i++) {
        // Skip the first review as it is the header
        if (i == 0) {
            continue;
        }
        const review = await reviews.nth(i);
        const reviewSection = await review.locator('>div').nth(1);
        const reviewSectionDiv = await reviewSection.locator('>div');
        const reviewSectionSection = await reviewSection.locator('>section');

        const rating = await reviewSectionDiv.first().locator('span').innerText();

        let reviewTitle = await reviewSectionSection.first().locator('div').innerText();
        reviewTitle = reviewTitle.trim();
        let reviewComment = await reviewSectionSection.first().locator('p').innerText();
        reviewComment = reviewComment.trim();

        let helpFulCount = '';
        if (await reviewSection.locator("section:text('people found this helpful')").isVisible()) {
            helpFulCount = await reviewSection.locator("section:text('people found this helpful') strong").innerText();
            helpFulCount = helpFulCount.trim();    
        }

        reviewData.push({
            rating: rating,
            title: reviewTitle,
            comment: reviewComment,
            votes: helpFulCount
        });
    }

    const dataset = await Dataset.open('nykaa');
    await dataset.pushData({
        url: request.loadedUrl,
        category: category,
        subCategory: subCategory,
        name: productName,
        price: productMRPPrice,
        salePrice: productSalesPrice,
        discount: productDiscount,
        images: productImages,
        description: productDescription,
        expireAt: productExpireDate,
        origin: productOrigin,
        manufacturedBy: productManufacture,
        ingredients: productIngredients,
        howToUse: productHowToUse,
        rating: rating,
        numberOfRatings: verifiedRatings,
        reviews: reviewData
    });

    log.info("Ending Scraping Product Page: " + title, { url: requestUrl })

});
