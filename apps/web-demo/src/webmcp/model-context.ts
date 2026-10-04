/** The page's WebMCP entry point, or undefined in browsers without WebMCP (feature detection). */
export function getModelContext(): WebMCP.ModelContext | undefined {
  return document.modelContext;
}
