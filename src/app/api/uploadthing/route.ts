import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";
 
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
  // В v7+ токен берется автоматически из process.env.UPLOADTHING_TOKEN
});