import { CorrelationIdMiddleware } from "./correlation-id.middleware";

describe("CorrelationIdMiddleware", () => {
  let middleware: CorrelationIdMiddleware;
  let mockReq: any;
  let mockRes: any;
  let mockNext: vi.Mock;

  beforeEach(() => {
    middleware = new CorrelationIdMiddleware();
    mockReq = { headers: {} };
    mockRes = { setHeader: vi.fn() };
    mockNext = vi.fn();
  });

  it("preserves existing x-request-id from the request", () => {
    mockReq.headers["x-request-id"] = "existing-id-123";

    middleware.use(mockReq, mockRes, mockNext);

    expect(mockReq.headers["x-request-id"]).toBe("existing-id-123");
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      "x-request-id",
      "existing-id-123",
    );
  });

  it("generates a new UUID when x-request-id is not present", () => {
    middleware.use(mockReq, mockRes, mockNext);

    const id = mockReq.headers["x-request-id"];
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith("x-request-id", id);
  });

  it("sets the correlation id on the response header", () => {
    middleware.use(mockReq, mockRes, mockNext);

    expect(mockRes.setHeader).toHaveBeenCalledTimes(1);
    expect(mockRes.setHeader.mock.calls[0][0]).toBe("x-request-id");
  });

  it("calls next() to continue the middleware chain", () => {
    middleware.use(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });
});
