namespace PunchedApi.Infrastructure.Data.Seeding;

public static class CapabilityMatrix
{
    public static IReadOnlyList<SeedModuleCapability> Build() =>
    [
        new SeedModuleCapability { Module = "Businesses", Status = "Implemented", Notes = "businesses table supports core business seed data." },
        new SeedModuleCapability { Module = "Users and Authentication", Status = "Implemented", Notes = "users, user_auth, refresh_tokens fully seedable." },
        new SeedModuleCapability { Module = "Staff Linking", Status = "Implemented", Notes = "users.StaffBusinessId supports tenant staff mapping." },
        new SeedModuleCapability { Module = "Loyalty", Status = "Implemented", Notes = "loyalty_programs, loyalty_cards, stamps, redemptions supported." },
        new SeedModuleCapability { Module = "Referrals", Status = "Implemented", Notes = "referral_programs, referral_links, referrals supported." },
        new SeedModuleCapability { Module = "Roles and Permissions", Status = "Partially Implemented", Notes = "Role enum exists, but no role/permission tables exist for granular RBAC seeds." },
        new SeedModuleCapability { Module = "Services Catalog", Status = "Blocked by Schema", Notes = "No service/service-category tables exist in current EF model." },
        new SeedModuleCapability { Module = "Appointments", Status = "Blocked by Schema", Notes = "No appointment entities or relations currently exist." },
        new SeedModuleCapability { Module = "Payments and Invoices", Status = "Blocked by Schema", Notes = "No payment/invoice ledger tables; redemptions are loyalty payouts only." },
        new SeedModuleCapability { Module = "Notifications", Status = "Blocked by Schema", Notes = "No persisted notification tables exist; SSE is in-memory runtime only." },
        new SeedModuleCapability { Module = "Reviews", Status = "Blocked by Schema", Notes = "No review entities are currently present." },
        new SeedModuleCapability { Module = "Inventory", Status = "Blocked by Schema", Notes = "No inventory product/stock/supplier tables exist." },
        new SeedModuleCapability { Module = "Audit Logs", Status = "Blocked by Schema", Notes = "No persisted audit log entities exist." },
        new SeedModuleCapability { Module = "Business Settings", Status = "Partially Implemented", Notes = "Basic contact and profile fields exist; no dedicated tax/booking/cancellation settings schema." },
    ];
}
