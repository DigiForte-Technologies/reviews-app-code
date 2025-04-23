// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";  
import serveStatic from "serve-static";   
import shopify from "./shopify.js";   
import productCreator from "./product-creator.js"; 
import PrivacyWebhookHandlers from "./privacy.js";
import uploadReviewsHandler from "./server/api/admin/upload-reviews.js";
import fetchReviewsHandler from "./server/api/admin/reviews.js";
import getReviewsHandler from "./server/api/public/get-reviews.js"; 
import toggleReviewStatus from './server/api/admin/toggle-review-status.js';  
import exportReviewsHandler from './server/api/admin/export-reviews.js';
import bulkUpdateReviews from './server/api/admin/bulk-update-reviews.js';
import downloadReviewTemplate from './server/api/admin/download-review-template.js';
import validateUploadedCSV from './server/api/admin/validate-uploaded-csv.js';
import updateReviewProduct from './server/api/admin/update-review-product.js';
import saveStoreEmail from './server/api/admin/save-store-email.js';
import summaryHandler from './server/api/public/reviews-summary.js';
 
// FIXED: Add verifyProxyRequest ✅
     

   
const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();

// Shopify Authentication and Webhooks
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: PrivacyWebhookHandlers })
);

app.get('/api/admin/export-reviews', exportReviewsHandler);

app.get('/api/admin/download-review-template', downloadReviewTemplate);

app.post('/api/admin/validate-uploaded-csv', validateUploadedCSV);

app.post('/api/admin/save-store-email', saveStoreEmail);


// API authentication
app.use("/api/*", shopify.validateAuthenticatedSession());

// Body parser
app.use(express.json());



// ➡️ Shopify API routes
app.get("/api/products/count", async (_req, res) => {
  const client = new shopify.api.clients.Graphql({
    session: res.locals.shopify.session,
  });

  const countData = await client.request(`
    query shopifyProductCount {
      productsCount {
        count
      }
  `);

  res.status(200).send({ count: countData.data.productsCount.count });
});

app.get("/api/admin/products", async (req, res) => {
  try {
    const client = new shopify.api.clients.Rest({
      session: res.locals.shopify.session,
    });

    const products = await client.get({
      path: 'products',
      query: { limit: 250 },
    });

    res.status(200).json({ products: products.body.products });
  } catch (error) {
    console.error("Failed to fetch products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.post("/api/admin/upload-reviews", uploadReviewsHandler);

app.post('/api/admin/toggle-review-status', toggleReviewStatus);

app.post('/api/admin/bulk-update-reviews', bulkUpdateReviews); 
app.post('/api/admin/update-review-product', updateReviewProduct);
 

 

app.post("/api/products", async (_req, res) => {
  let status = 200;
  let error = null;

  try {
    await productCreator(res.locals.shopify.session);
  } catch (e) {
    console.error(`Failed to create products: ${e.message}`);
    status = 500;
    error = e.message; 
  }    
    
  res.status(status).send({ success: status === 200, error });
}); 
 
app.get("/api/admin/reviews", fetchReviewsHandler);
   
 
app.get("/apps/steenbergecom-reviews/reviews", getReviewsHandler);

app.get("/apps/steenbergecom-reviews/summary", summaryHandler);
app.get("/summary", summaryHandler);

app.get("/getmyreviews", getReviewsHandler); 

// app.get("/getmyreviews", getReviewsHandler);
  
       
// Security headers  
app.use(shopify.cspHeaders());

// Static files
app.use(serveStatic(STATIC_PATH, { index: false }));

// // Handle Shopify app installation check, but skip for proxy routes
// app.use(async (req, res, next) => {
//   if (req.path.startsWith("/hadfhagetmyreviews")) {
//     console.log('🛡️ Skipping ensureInstalledOnShop for proxy route');
//     return next();
//   }

//   return shopify.ensureInstalledOnShop()(req, res, next);
// });

const isBypassPath = (path) =>
  path.startsWith("/@") ||
  path.startsWith("/assets") ||
  path.endsWith(".js") ||
  path.endsWith(".css") ||
  path.endsWith(".map") ||
  path.endsWith(".ico") ||
  path.endsWith(".png") ||
  path.endsWith(".svg") ||
  path.startsWith("/getmyreviews") ||
  path.startsWith("/apps/steenbergecom-reviews");

app.use((req, res, next) => {
  if (isBypassPath(req.path)) {
    return next();
  }

  if (!req.query.shop) {
    console.warn("❌ Missing `shop` param in request:", req.path);
    return res.status(400).send("Missing shop param");
  }

  return shopify.ensureInstalledOnShop()(req, res, next);
});


// Fallback to frontend app
app.use("/*", async (req, res) => {
  const shop = req.query.shop;

  if (!shop) {
    return res.status(400).send("Shop param missing.");
  }

  res
    .status(200)
    .set({
      "Content-Type": "text/html",
      "Content-Security-Policy": `frame-ancestors https://${shop} https://admin.shopify.com;`,
      "X-Frame-Options": "ALLOWALL",
    }) 
    .send(
      readFileSync(join(STATIC_PATH, "index.html"))
        .toString()
        .replace("%VITE_SHOPIFY_API_KEY%", process.env.SHOPIFY_API_KEY || "")
    );
});


// Start Server
app.listen(PORT, () => console.log(`✅ Server is running on port ${PORT}`));
