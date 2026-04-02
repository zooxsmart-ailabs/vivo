import {
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { HttpExceptionFilter } from "./http-exception.filter";

describe("HttpExceptionFilter", () => {
  let filter: HttpExceptionFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: any;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    jest.spyOn(Logger.prototype, "error").mockImplementation();

    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockResponse = { status: mockStatus };
    mockRequest = { method: "GET", url: "/test" };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns correct status for HttpException", () => {
    const exception = new HttpException("Not Found", HttpStatus.NOT_FOUND);

    filter.catch(exception, mockHost as any);

    expect(mockStatus).toHaveBeenCalledWith(404);
  });

  it("returns 500 for generic Error", () => {
    filter.catch(new Error("unexpected"), mockHost as any);

    expect(mockStatus).toHaveBeenCalledWith(500);
  });

  it("returns 500 for non-Error exception", () => {
    filter.catch("string error", mockHost as any);

    expect(mockStatus).toHaveBeenCalledWith(500);
  });

  it("response body includes statusCode, timestamp, path, and message", () => {
    const exception = new HttpException("Bad Request", HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockHost as any);

    const body = mockJson.mock.calls[0][0];
    expect(body).toMatchObject({
      statusCode: 400,
      path: "/test",
      message: "Bad Request",
    });
    expect(body.timestamp).toBeDefined();
  });

  it("extracts nested message from HttpException object response", () => {
    const exception = new HttpException(
      { message: "Validation failed", statusCode: 422 },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );

    filter.catch(exception, mockHost as any);

    const body = mockJson.mock.calls[0][0];
    expect(body.message).toBe("Validation failed");
  });

  it("logs 5xx errors with stack trace", () => {
    const error = new Error("DB failure");

    filter.catch(error, mockHost as any);

    expect(Logger.prototype.error).toHaveBeenCalledWith(
      "GET /test 500",
      error.stack,
    );
  });

  it("does not log 4xx errors", () => {
    const exception = new HttpException("Not Found", HttpStatus.NOT_FOUND);

    filter.catch(exception, mockHost as any);

    expect(Logger.prototype.error).not.toHaveBeenCalled();
  });
});
