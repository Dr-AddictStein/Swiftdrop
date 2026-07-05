import { relations } from 'drizzle-orm';
import {
  boolean,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { NotificationType } from '../common/enums/notification-type.enum';
import { ParcelStatus } from '../common/enums/parcel-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

export const userRoleEnum = pgEnum('user_role', [
  UserRole.SUPER_ADMIN,
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

export const notificationTypeEnum = pgEnum('notification_type', [
  NotificationType.AGENT_LEFT_COMPANY,
  NotificationType.AGENT_JOINED_COMPANY,
  NotificationType.AGENT_INCIDENT_REPORTED,
  NotificationType.PARCEL_REASSIGNED,
  NotificationType.PARCEL_NEEDS_MANUAL_ASSIGNMENT,
]);

export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  joinCode: varchar('join_code', { length: 20 }).notNull().unique(),
  ownerId: uuid('owner_id'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull(),
  companyId: uuid('company_id').references(() => companies.id),
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
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id),
  senderName: varchar('sender_name', { length: 255 }).notNull(),
  senderAddress: text('sender_address').notNull(),
  recipientName: varchar('recipient_name', { length: 255 }).notNull(),
  recipientAddress: text('recipient_address').notNull(),
  assignedAgentId: uuid('assigned_agent_id').references(() => users.id),
  status: parcelStatusEnum('status').notNull().default(ParcelStatus.REGISTERED),
  retryQueued: boolean('retry_queued').notNull().default(false),
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

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id),
  recipientId: uuid('recipient_id')
    .notNull()
    .references(() => users.id),
  type: notificationTypeEnum('type').notNull(),
  message: text('message').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const companiesRelations = relations(companies, ({ one, many }) => ({
  owner: one(users, {
    fields: [companies.ownerId],
    references: [users.id],
  }),
  members: many(users),
  parcels: many(parcels),
  notifications: many(notifications),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  assignedParcels: many(parcels),
  deliveryEvents: many(deliveryEvents),
  notifications: many(notifications),
}));

export const parcelsRelations = relations(parcels, ({ one, many }) => ({
  company: one(companies, {
    fields: [parcels.companyId],
    references: [companies.id],
  }),
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

export const notificationsRelations = relations(notifications, ({ one }) => ({
  company: one(companies, {
    fields: [notifications.companyId],
    references: [companies.id],
  }),
  recipient: one(users, {
    fields: [notifications.recipientId],
    references: [users.id],
  }),
}));
