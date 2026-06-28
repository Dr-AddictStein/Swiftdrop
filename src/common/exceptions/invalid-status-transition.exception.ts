import { BadRequestException } from '@nestjs/common';

export class InvalidStatusTransitionException extends BadRequestException {
  constructor(from: string, to: string) {
    super({
      message: `Invalid parcel status transition from '${from}' to '${to}'`,
      error: 'Invalid Status Transition',
    });
  }
}
