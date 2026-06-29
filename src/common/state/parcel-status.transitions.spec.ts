import { ParcelStatus } from '../enums/parcel-status.enum';
import {
  assertValidStatusTransition,
  isValidStatusTransition,
  PARCEL_STATUS_TRANSITIONS,
} from './parcel-status.transitions';

describe('Parcel status transitions', () => {
  it('defines the expected transition map', () => {
    expect(PARCEL_STATUS_TRANSITIONS[ParcelStatus.REGISTERED]).toEqual([
      ParcelStatus.PICKED_UP,
    ]);
    expect(PARCEL_STATUS_TRANSITIONS[ParcelStatus.PICKED_UP]).toEqual([
      ParcelStatus.OUT_FOR_DELIVERY,
    ]);
    expect(PARCEL_STATUS_TRANSITIONS[ParcelStatus.OUT_FOR_DELIVERY]).toEqual([
      ParcelStatus.DELIVERED,
      ParcelStatus.FAILED_ATTEMPT,
    ]);
    expect(PARCEL_STATUS_TRANSITIONS[ParcelStatus.FAILED_ATTEMPT]).toEqual([
      ParcelStatus.OUT_FOR_DELIVERY,
    ]);
    expect(PARCEL_STATUS_TRANSITIONS[ParcelStatus.DELIVERED]).toEqual([]);
  });

  it('allows the happy-path delivery flow', () => {
    expect(
      isValidStatusTransition(
        ParcelStatus.REGISTERED,
        ParcelStatus.PICKED_UP,
      ),
    ).toBe(true);
    expect(
      isValidStatusTransition(
        ParcelStatus.PICKED_UP,
        ParcelStatus.OUT_FOR_DELIVERY,
      ),
    ).toBe(true);
    expect(
      isValidStatusTransition(
        ParcelStatus.OUT_FOR_DELIVERY,
        ParcelStatus.DELIVERED,
      ),
    ).toBe(true);
  });

  it('allows failed delivery retries', () => {
    expect(
      isValidStatusTransition(
        ParcelStatus.OUT_FOR_DELIVERY,
        ParcelStatus.FAILED_ATTEMPT,
      ),
    ).toBe(true);
    expect(
      isValidStatusTransition(
        ParcelStatus.FAILED_ATTEMPT,
        ParcelStatus.OUT_FOR_DELIVERY,
      ),
    ).toBe(true);
    expect(
      isValidStatusTransition(
        ParcelStatus.OUT_FOR_DELIVERY,
        ParcelStatus.DELIVERED,
      ),
    ).toBe(true);
  });

  it('rejects invalid transitions', () => {
    expect(() =>
      assertValidStatusTransition(
        ParcelStatus.REGISTERED,
        ParcelStatus.DELIVERED,
      ),
    ).toThrow("Invalid parcel status transition from 'REGISTERED' to 'DELIVERED'");

    expect(() =>
      assertValidStatusTransition(
        ParcelStatus.DELIVERED,
        ParcelStatus.PICKED_UP,
      ),
    ).toThrow("Invalid parcel status transition from 'DELIVERED' to 'PICKED_UP'");

    expect(() =>
      assertValidStatusTransition(
        ParcelStatus.FAILED_ATTEMPT,
        ParcelStatus.REGISTERED,
      ),
    ).toThrow(
      "Invalid parcel status transition from 'FAILED_ATTEMPT' to 'REGISTERED'",
    );
  });

  it('rejects transitions from terminal DELIVERED status', () => {
    expect(
      isValidStatusTransition(ParcelStatus.DELIVERED, ParcelStatus.PICKED_UP),
    ).toBe(false);
    expect(
      isValidStatusTransition(
        ParcelStatus.DELIVERED,
        ParcelStatus.OUT_FOR_DELIVERY,
      ),
    ).toBe(false);
  });
});
