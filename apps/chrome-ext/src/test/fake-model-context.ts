interface FakeToolOptions {
  annotations?: WebMCP.ToolAnnotations;
  inputSchema?: object | string;
  execute?: (input: unknown, signal: AbortSignal) => unknown;
}

/**
 * A small stand-in for Chrome's `document.modelContext`, following the WebMCP spec: tools are
 * registered, listed and executed, results come back JSON-serialized, and registering or
 * removing a tool fires `toolchange`.
 */
export class FakeModelContext extends EventTarget {
  /** Mimics Chrome before 155, which only accepted arguments as a JSON string. */
  acceptsOnlyStringArguments = false;
  private readonly tools = new Map<string, WebMCP.RegisteredTool & FakeToolOptions>();

  constructor(private readonly ownerWindow: Window = window) {
    super();
  }

  addTool(name: string, options: FakeToolOptions = {}): void {
    const { inputSchema = { type: 'object', properties: {} }, ...behavior } = options;
    this.tools.set(name, {
      name,
      title: '',
      description: `Tool ${name}`,
      // Real pages sometimes hand back the schema as JSON text, though the spec says object.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      inputSchema: inputSchema as object,
      window: this.ownerWindow,
      origin: 'http://localhost:5173',
      ...behavior,
    });
    this.dispatchEvent(new Event('toolchange'));
  }

  removeTool(name: string): void {
    this.tools.delete(name);
    this.dispatchEvent(new Event('toolchange'));
  }

  getTools(): Promise<WebMCP.RegisteredTool[]> {
    return Promise.resolve([...this.tools.values()]);
  }

  async executeTool(
    tool: WebMCP.RegisteredTool,
    inputObject?: object,
    options?: WebMCP.ModelContextExecuteToolOptions,
  ): Promise<string> {
    const registeredTool = this.tools.get(tool.name);
    if (registeredTool === undefined) throw new DOMException('Tool not found', 'NotFoundError');
    if (this.acceptsOnlyStringArguments && typeof inputObject !== 'string') {
      throw new Error('Failed to parse input arguments');
    }
    if (!this.acceptsOnlyStringArguments && typeof inputObject === 'string') {
      throw new Error('Failed to parse input arguments');
    }
    const input: unknown = typeof inputObject === 'string' ? JSON.parse(inputObject) : inputObject;
    const result = await registeredTool.execute?.(
      input,
      options?.signal ?? new AbortController().signal,
    );
    return JSON.stringify(result ?? null);
  }

  asModelContext(): WebMCP.ModelContext {
    return this as unknown as WebMCP.ModelContext;
  }
}
