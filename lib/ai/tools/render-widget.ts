import { tool } from "ai";
import { z } from "zod";

export const renderWidget = () =>
  tool({
    description:
      "Render rich interactive Generative UI widgets directly in the conversation flow (interactive bar charts, KPI stat cards, ROI/productivity calculators, comparison matrices).",
    inputSchema: z.object({
      type: z
        .enum(["chart", "calculator", "kpi_grid", "comparison"])
        .describe(
          "Widget type: 'chart' for animated charts, 'calculator' for interactive sliders, 'kpi_grid' for metrics, 'comparison' for feature tables"
        ),
      title: z.string().describe("Descriptive title of the interactive widget"),
      subtitle: z.string().optional().describe("Subtitle or context note"),
      data: z
        .record(z.string(), z.unknown())
        .describe(
          "Structured parameters, data points, or metric values for the widget"
        ),
    }),
    execute: async ({ type, title, subtitle, data }) => {
      return {
        status: "success",
        type,
        title,
        subtitle: subtitle || "",
        data,
        timestamp: Date.now(),
      };
    },
  });
