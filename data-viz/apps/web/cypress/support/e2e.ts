import "./commands";

// Suppress WebSocket connection errors (WS backend not running in E2E)
Cypress.on("window:before:load", (win) => {
  const OrigWS = win.WebSocket;
  win.WebSocket = class extends EventTarget {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;
    readonly CONNECTING = 0;
    readonly OPEN = 1;
    readonly CLOSING = 2;
    readonly CLOSED = 3;
    readyState = 3;
    url = "";
    protocol = "";
    extensions = "";
    bufferedAmount = 0;
    binaryType: BinaryType = "blob";
    onopen: ((ev: Event) => void) | null = null;
    onclose: ((ev: CloseEvent) => void) | null = null;
    onmessage: ((ev: MessageEvent) => void) | null = null;
    onerror: ((ev: Event) => void) | null = null;
    constructor(url: string | URL) {
      super();
      this.url = typeof url === "string" ? url : url.href;
    }
    close() {}
    send() {}
  } as any;
});

// Suppress uncaught exceptions from the app (e.g., failed API calls during load)
Cypress.on("uncaught:exception", () => false);
