import { ArgumentsHost, HttpStatus, NotFoundException } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';
import { InvalidStatusTransitionException } from '../exceptions/invalid-status-transition.exception';
import { DatabaseError } from 'pg';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: { status: jest.Mock; send: jest.Mock };
  let mockRequest: { url: string; method: string };

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    mockRequest = { url: '/parcels/1/status', method: 'PATCH' };
  });

  const createHost = (): ArgumentsHost =>
    ({
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    }) as ArgumentsHost;

  it('formats HttpException responses with timestamp and path', () => {
    filter.catch(new NotFoundException('Parcel not found'), createHost());

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.send).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Parcel not found',
        error: 'Not Found',
        path: '/parcels/1/status',
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      }),
    );
  });

  it('formats invalid status transition errors', () => {
    filter.catch(
      new InvalidStatusTransitionException('REGISTERED', 'DELIVERED'),
      createHost(),
    );

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.send).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message:
          "Invalid parcel status transition from 'REGISTERED' to 'DELIVERED'",
        error: 'Invalid Status Transition',
      }),
    );
  });

  it('maps unique constraint violations to 409 Conflict', () => {
    const dbError = new DatabaseError(
      'duplicate key value violates unique constraint',
      0,
      'error',
    );
    dbError.code = '23505';

    filter.catch(dbError, createHost());

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockResponse.send).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
      }),
    );
  });

  it('maps unknown errors to 500 Internal Server Error', () => {
    filter.catch(new Error('unexpected'), createHost());

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.send).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        error: 'Internal Server Error',
      }),
    );
  });
});
