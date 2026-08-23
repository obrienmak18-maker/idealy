import { defineConfig, type InputTransformerFn } from "orval";
import path from "path";

const root = path.resolve(import.meta.dirname, "..", "..");
const apiClientReactSrc = path.resolve(root, "lib", "api-client-react", "src");
const apiZodSrc = path.resolve(root, "lib", "api-zod", "src");

// Our exports make assumptions about the title of the API being "Api" (i.e. generated output is `api.ts`).
const titleTransformer: InputTransformerFn = (config) => {
  config.info ??= {};
  config.info.title = "Api";

  return config;
};

export default defineConfig({
  "api-client-react": {
    input: {
      override: {
        transformer: titleTransformer,
      },
      target: "./openapi.yaml",
    },
    output: {
      baseUrl: "/api",
      clean: true,
      client: "react-query",
      mode: "split",
      override: {
        fetch: {
          includeHttpResponseReturnType: false,
        },
        mutator: {
          name: "customFetch",
          path: path.resolve(apiClientReactSrc, "custom-fetch.ts"),
        },
      },
      prettier: true,
      target: "generated",
      workspace: apiClientReactSrc,
    },
  },
  zod: {
    input: {
      override: {
        transformer: titleTransformer,
      },
      target: "./openapi.yaml",
    },
    output: {
      clean: true,
      client: "zod",
      mode: "split",
      override: {
        useBigInt: true,
        useDates: true,
        zod: {
          coerce: {
            body: ["bigint", "date"],
            param: ["boolean", "number", "string"],
            query: ["boolean", "number", "string"],
            response: ["bigint", "date"],
          },
        },
      },
      prettier: true,
      schemas: { path: "generated/types", type: "typescript" },
      target: "generated",
      workspace: apiZodSrc,
    },
  },
});
