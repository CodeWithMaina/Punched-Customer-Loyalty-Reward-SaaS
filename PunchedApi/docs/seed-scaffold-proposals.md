# Schema Scaffold Proposals For Missing Salon Modules

These proposals are intentionally separated from the implemented seeding logic.

## 1. Services Domain

Suggested entities:

- ServiceCategory
  - Id, BusinessId, Name, DisplayOrder, IsActive, CreatedAt
  - unique index: `(BusinessId, Name)`
- Service
  - Id, BusinessId, CategoryId, Name, Description, DurationMinutes, BasePrice, TaxRate, IsActive, CreatedAt
  - indexes: `(BusinessId, IsActive)`, `(CategoryId)`
- StaffServiceAssignment
  - Id, StaffUserId, ServiceId, IsPrimary, CreatedAt
  - unique index: `(StaffUserId, ServiceId)`

## 2. Appointments Domain

Suggested entities:

- Appointment
  - Id, BusinessId, CustomerId, StaffUserId, StartAtUtc, EndAtUtc, Status, Notes, CreatedAt
  - indexes: `(BusinessId, StartAtUtc)`, `(StaffUserId, StartAtUtc)`, `(CustomerId, StartAtUtc)`
- AppointmentService
  - Id, AppointmentId, ServiceId, PriceSnapshot, DurationSnapshotMinutes
  - index: `(AppointmentId)`
- AppointmentStatusHistory
  - Id, AppointmentId, FromStatus, ToStatus, ChangedByUserId, ChangedAtUtc
  - indexes: `(AppointmentId, ChangedAtUtc)`

## 3. Payments and Invoices

Suggested entities:

- Invoice
  - Id, BusinessId, AppointmentId, CustomerId, Subtotal, TaxTotal, DiscountTotal, GrandTotal, Status, IssuedAtUtc
  - unique index: `(BusinessId, AppointmentId)`
- Payment
  - Id, InvoiceId, Method, Amount, Status, ExternalRef, PaidAtUtc, CreatedAt
  - indexes: `(InvoiceId)`, `(Status)`, `(Method)`
- PaymentSplit
  - Id, PaymentId, Method, Amount
  - index: `(PaymentId)`
- Refund
  - Id, PaymentId, Amount, Reason, RefundedAtUtc, RefundedByUserId
  - index: `(PaymentId)`

## 4. Notifications

Suggested entities:

- Notification
  - Id, UserId, BusinessId, Channel, TemplateType, PayloadJson, DeliveryStatus, OpenedAtUtc, SentAtUtc, CreatedAt
  - indexes: `(UserId, CreatedAt)`, `(BusinessId, TemplateType)`, `(DeliveryStatus)`

## 5. Reviews

Suggested entities:

- Review
  - Id, BusinessId, CustomerId, StaffUserId, AppointmentId, Rating, Comment, CreatedAt
  - unique index: `(AppointmentId, CustomerId)`
  - indexes: `(BusinessId, Rating)`, `(StaffUserId, Rating)`
- ReviewReply
  - Id, ReviewId, AuthorUserId, Comment, CreatedAt
  - unique index: `(ReviewId)`

## 6. Inventory

Suggested entities:

- Supplier
  - Id, BusinessId, Name, ContactName, Email, Phone, CreatedAt
- Product
  - Id, BusinessId, SupplierId, Name, Sku, UnitCost, RetailPrice, IsActive, CreatedAt
  - unique index: `(BusinessId, Sku)`
- StockItem
  - Id, ProductId, QuantityOnHand, ReorderLevel, UpdatedAt
- StockMovement
  - Id, ProductId, Type, QuantityDelta, Reason, ReferenceId, PerformedByUserId, CreatedAt
  - indexes: `(ProductId, CreatedAt)`

## 7. Audit Logs

Suggested entities:

- AuditLog
  - Id, BusinessId, ActorUserId, EntityName, EntityId, Action, DiffJson, MetadataJson, CreatedAt
  - indexes: `(BusinessId, CreatedAt)`, `(ActorUserId, CreatedAt)`, `(EntityName, EntityId)`

## EF Configuration Guidance

- Use explicit delete behaviors to avoid accidental cascades for critical financial/audit data.
- Add composite indexes for tenant-scoped lookups.
- Use check constraints for status enums, rating bounds, and monetary non-negativity.
- For high-volume tables, index by `(BusinessId, CreatedAt)` for reporting.
