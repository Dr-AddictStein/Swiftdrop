import { relations } from 'drizzle-orm';
import {
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { ParcelStatus } from '../common/enums/parcel-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

export const userRoleEnum = pgEnum('user_role', [
  UserRole.ADMIN,
  UserRole.DELIVERY_AGENT,
]);

export const parcelStatusEnum = pgEnum('parcel_status', [
  ParcelStatus.REGISTERED,
  ParcelStatus.PICKED_UP,
  ParcelStatus.OUT_FOR_DELIVERY,
  ParcelStatus.DELIVERED,
  ParcelStatus.FAILED_ATTEMPT,
]);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull(),
  isAvailable: boolean('is_available').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const parcels = pgTable('parcels', {
  id: uuid('id').defaultRandom().primaryKey(),
  trackingNumber: varchar('tracking_number', { length: 50 }).notNull().unique(),
  senderName: varchar('sender_name', { length: 255 }).notNull(),
  senderAddress: text('sender_address').notNull(),
  recipientName: varchar('recipient_name', { length: 255 }).notNull(),
  recipientAddress: text('recipient_address').notNull(),
  assignedAgentId: uuid('assigned_agent_id').references(() => users.id),
  status: parcelStatusEnum('status')
    .notNull()
    .default(ParcelStatus.REGISTERED),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const deliveryEvents = pgTable('delivery_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  parcelId: uuid('parcel_id')
    .notNull()
    .references(() => parcels.id),
  status: parcelStatusEnum('status').notNull(),
  remarks: text('remarks'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  assignedParcels: many(parcels),
  deliveryEvents: many(deliveryEvents),
}));

export const parcelsRelations = relations(parcels, ({ one, many }) => ({
  assignedAgent: one(users, {
    fields: [parcels.assignedAgentId],
    references: [users.id],
  }),
  deliveryEvents: many(deliveryEvents),
}));

export const deliveryEventsRelations = relations(deliveryEvents, ({ one }) => ({
  parcel: one(parcels, {
    fields: [deliveryEvents.parcelId],
    references: [parcels.id],
  }),
  creator: one(users, {
    fields: [deliveryEvents.createdBy],
    references: [users.id],
  }),
}));
