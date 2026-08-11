using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Seeding;

internal static class SeedCatalog
{
    public static IReadOnlyList<SeedBusinessDefinition> Businesses { get; } = BuildBusinesses();
    public static IReadOnlyList<SeedUserDefinition> Users { get; } = BuildUsers();
    public static int MaxBusinesses => Businesses.Count;

    public static SeedScenario BuildScenario(int businessCount)
    {
        var selectedBusinesses = Businesses.Take(Math.Clamp(businessCount, 1, Businesses.Count)).ToList();

        var requiredKeys = new HashSet<string>(StringComparer.Ordinal);
        foreach (var business in selectedBusinesses)
        {
            requiredKeys.Add(business.OwnerUserKey);
            foreach (var staffKey in business.StaffUserKeys)
            {
                requiredKeys.Add(staffKey);
            }

            foreach (var customerKey in business.CustomerUserKeys)
            {
                requiredKeys.Add(customerKey);
            }
        }

        var selectedUsers = Users.Where(u => requiredKeys.Contains(u.Key)).ToList();
        return new SeedScenario(selectedBusinesses, selectedUsers);
    }

    private static List<SeedBusinessDefinition> BuildBusinesses()
    {
        return
        [
            new SeedBusinessDefinition(
                Key: "business-1",
                Name: "Aurelia Luxe Hair Atelier",
                Category: "Luxury Hair Salon",
                Location: "Westlands, Nairobi",
                PhoneNumber: "+254712440001",
                Email: "hello@aurelialuxe.co.ke",
                Description: "Premium color, bridal styling, and restorative hair rituals.",
                LogoUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1",
                MpesaNumber: "4021001",
                OwnerUserKey: "owner-1",
                CreatedAt: DeterministicSeed.AnchorUtc.AddMonths(-7),
                ProgramNames: ["Aurelia Gold", "Color Ritual Club"],
                StampsRequired: 8,
                RewardValue: 1800m,
                RewardDescription: "KES 1,800 service credit",
                RewardExpirationHours: 72,
                ReferralRewardType: ReferralRewardType.Stamp,
                ReferralRewardValue: 2m,
                ReferralsRequired: 2,
                ReferralExpirationDays: 45,
                StaffUserKeys: ["staff-1-manager", "staff-1-senior-stylist", "staff-1-barber", "staff-1-nail-tech", "staff-1-reception"],
                CustomerUserKeys: BuildCustomerKeys("b1", 20),
                IsFocusBusiness: true),

            new SeedBusinessDefinition(
                Key: "business-2",
                Name: "Harborline Modern Barbers",
                Category: "Modern Barbershop",
                Location: "Kilimani, Nairobi",
                PhoneNumber: "+254712440002",
                Email: "bookings@harborlinebarbers.com",
                Description: "Precision cuts, beard architecture, and express grooming.",
                LogoUrl: "https://images.unsplash.com/photo-1622287162716-f311baa1a2b8",
                MpesaNumber: "4021002",
                OwnerUserKey: "owner-2",
                CreatedAt: DeterministicSeed.AnchorUtc.AddMonths(-6),
                ProgramNames: ["Harborline Cuts", "VIP Grooming Pass"],
                StampsRequired: 6,
                RewardValue: 1200m,
                RewardDescription: "KES 1,200 grooming voucher",
                RewardExpirationHours: 48,
                ReferralRewardType: ReferralRewardType.Discount,
                ReferralRewardValue: 700m,
                ReferralsRequired: 3,
                ReferralExpirationDays: 30,
                StaffUserKeys: ["staff-2-manager", "staff-2-master-barber", "staff-2-junior-barber", "staff-2-reception"],
                CustomerUserKeys: BuildCustomerKeys("b2", 16),
                IsFocusBusiness: true),

            new SeedBusinessDefinition(
                Key: "business-3",
                Name: "Velvet Petals Nail Studio",
                Category: "Nail Studio",
                Location: "Runda, Nairobi",
                PhoneNumber: "+254712440003",
                Email: "care@velvetpetals.co.ke",
                Description: "Structured manicures, gel artistry, and restorative hand care.",
                LogoUrl: "https://images.unsplash.com/photo-1604654894610-df63bc536371",
                MpesaNumber: "4021003",
                OwnerUserKey: "owner-3",
                CreatedAt: DeterministicSeed.AnchorUtc.AddMonths(-5),
                ProgramNames: ["Nail Bloom Rewards"],
                StampsRequired: 7,
                RewardValue: 900m,
                RewardDescription: "KES 900 nail treatment credit",
                RewardExpirationHours: 72,
                ReferralRewardType: ReferralRewardType.FreeItem,
                ReferralRewardValue: 1m,
                ReferralsRequired: 2,
                ReferralExpirationDays: 30,
                StaffUserKeys: ["staff-3-lead-tech", "staff-3-assistant"],
                CustomerUserKeys: BuildCustomerKeys("b3", 8),
                IsFocusBusiness: false),

            new SeedBusinessDefinition(
                Key: "business-4",
                Name: "Serein Beauty Spa",
                Category: "Beauty Spa",
                Location: "Lavington, Nairobi",
                PhoneNumber: "+254712440004",
                Email: "appointments@sereinspa.com",
                Description: "Facials, body rituals, and restorative spa therapy.",
                LogoUrl: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1",
                MpesaNumber: "4021004",
                OwnerUserKey: "owner-4",
                CreatedAt: DeterministicSeed.AnchorUtc.AddMonths(-4),
                ProgramNames: ["Serein Wellness Circle"],
                StampsRequired: 10,
                RewardValue: 2200m,
                RewardDescription: "KES 2,200 spa package credit",
                RewardExpirationHours: 96,
                ReferralRewardType: ReferralRewardType.Stamp,
                ReferralRewardValue: 1m,
                ReferralsRequired: 2,
                ReferralExpirationDays: 60,
                StaffUserKeys: ["staff-4-therapist", "staff-4-frontdesk"],
                CustomerUserKeys: BuildCustomerKeys("b4", 7),
                IsFocusBusiness: false),

            new SeedBusinessDefinition(
                Key: "business-5",
                Name: "Northlight Wellness Center",
                Category: "Wellness Center",
                Location: "Karen, Nairobi",
                PhoneNumber: "+254712440005",
                Email: "team@northlightwellness.africa",
                Description: "Holistic wellness programs and recovery-focused treatment plans.",
                LogoUrl: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874",
                MpesaNumber: "4021005",
                OwnerUserKey: "owner-5",
                CreatedAt: DeterministicSeed.AnchorUtc.AddMonths(-3),
                ProgramNames: ["Northlight Restore"],
                StampsRequired: 9,
                RewardValue: 2500m,
                RewardDescription: "KES 2,500 therapy credit",
                RewardExpirationHours: 72,
                ReferralRewardType: ReferralRewardType.Discount,
                ReferralRewardValue: 1000m,
                ReferralsRequired: 2,
                ReferralExpirationDays: 45,
                StaffUserKeys: ["staff-5-practitioner", "staff-5-advisor"],
                CustomerUserKeys: BuildCustomerKeys("b5", 7),
                IsFocusBusiness: false),
        ];
    }

    private static List<SeedUserDefinition> BuildUsers()
    {
        var users = new List<SeedUserDefinition>
        {
            Owner("owner-1", "elena.njeri@aurelialuxe.co.ke", "Elena Njeri", "+254701220101", "Female", 1990, 4, 10, -7),
            Owner("owner-2", "samuel.otieno@harborlinebarbers.com", "Samuel Otieno", "+254701220102", "Male", 1988, 9, 4, -6),
            Owner("owner-3", "faith.cheruiyot@velvetpetals.co.ke", "Faith Cheruiyot", "+254701220103", "Female", 1992, 7, 22, -5),
            Owner("owner-4", "miriam.wanjiru@sereinspa.com", "Miriam Wanjiru", "+254701220104", "Female", 1989, 12, 18, -4),
            Owner("owner-5", "brian.kimani@northlightwellness.africa", "Brian Kimani", "+254701220105", "Male", 1987, 5, 9, -3),

            Staff("staff-1-manager", "ivy.wambui@aurelialuxe.co.ke", "Ivy Wambui", "+254702330101", "Female", 1991, 2, 11),
            Staff("staff-1-senior-stylist", "chris.mwangi@aurelialuxe.co.ke", "Chris Mwangi", "+254702330102", "Male", 1994, 6, 13),
            Staff("staff-1-barber", "leo.kiptoo@aurelialuxe.co.ke", "Leo Kiptoo", "+254702330103", "Male", 1996, 11, 5),
            Staff("staff-1-nail-tech", "amy.naliaka@aurelialuxe.co.ke", "Amy Naliaka", "+254702330104", "Female", 1997, 8, 29),
            Staff("staff-1-reception", "ruth.kendi@aurelialuxe.co.ke", "Ruth Kendi", "+254702330105", "Female", 1998, 1, 19),

            Staff("staff-2-manager", "david.ndungu@harborlinebarbers.com", "David Ndungu", "+254702330201", "Male", 1990, 3, 8),
            Staff("staff-2-master-barber", "omar.hassan@harborlinebarbers.com", "Omar Hassan", "+254702330202", "Male", 1993, 7, 25),
            Staff("staff-2-junior-barber", "ian.kiarie@harborlinebarbers.com", "Ian Kiarie", "+254702330203", "Male", 1999, 10, 12),
            Staff("staff-2-reception", "nina.akinyi@harborlinebarbers.com", "Nina Akinyi", "+254702330204", "Female", 1997, 5, 2),

            Staff("staff-3-lead-tech", "joyce.kipkorir@velvetpetals.co.ke", "Joyce Kipkorir", "+254702330301", "Female", 1994, 4, 15),
            Staff("staff-3-assistant", "peris.bii@velvetpetals.co.ke", "Peris Bii", "+254702330302", "Female", 2000, 9, 30),

            Staff("staff-4-therapist", "joan.muthoni@sereinspa.com", "Joan Muthoni", "+254702330401", "Female", 1992, 12, 1),
            Staff("staff-4-frontdesk", "esther.kilonzo@sereinspa.com", "Esther Kilonzo", "+254702330402", "Female", 1998, 3, 23),

            Staff("staff-5-practitioner", "allan.maina@northlightwellness.africa", "Allan Maina", "+254702330501", "Male", 1991, 6, 9),
            Staff("staff-5-advisor", "grace.karimi@northlightwellness.africa", "Grace Karimi", "+254702330502", "Female", 1995, 2, 16),
        };

        users.AddRange(BuildCustomers("b1", 20, -7));
        users.AddRange(BuildCustomers("b2", 16, -6));
        users.AddRange(BuildCustomers("b3", 8, -5));
        users.AddRange(BuildCustomers("b4", 7, -4));
        users.AddRange(BuildCustomers("b5", 7, -3));

        return users;
    }

    private static SeedUserDefinition Owner(string key, string email, string fullName, string phone, string gender, int y, int m, int d, int monthsOffset)
        => new(
            Key: key,
            Email: email,
            Password: "Owner@1234!",
            FullName: fullName,
            Role: UserRole.Business,
            PhoneNumber: phone,
            AvatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
            DateOfBirth: new DateOnly(y, m, d),
            Gender: gender,
            CreatedAt: DeterministicSeed.AnchorUtc.AddMonths(monthsOffset),
            IsVerified: true);

    private static SeedUserDefinition Staff(string key, string email, string fullName, string phone, string gender, int y, int m, int d)
        => new(
            Key: key,
            Email: email,
            Password: "Staff@1234!",
            FullName: fullName,
            Role: UserRole.Staff,
            PhoneNumber: phone,
            AvatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
            DateOfBirth: new DateOnly(y, m, d),
            Gender: gender,
            CreatedAt: DeterministicSeed.AnchorUtc.AddMonths(-5),
            IsVerified: true);

    private static IEnumerable<SeedUserDefinition> BuildCustomers(string businessKeyPrefix, int count, int monthsOffset)
    {
        var firstNames = new[] { "Amani", "Brenda", "Caleb", "Diana", "Eunice", "Felix", "Gloria", "Hassan", "Imani", "James", "Karen", "Linet", "Mercy", "Noah", "Olive", "Peter", "Queenie", "Ricky", "Stella", "Terry", "Usha", "Victor", "Winnie", "Xavier", "Yvonne", "Zawadi" };
        var lastNames = new[] { "Maina", "Odhiambo", "Wanjiku", "Mutiso", "Kiprotich", "Achieng", "Mwende", "Kariuki", "Njoroge", "Kamau" };

        for (var i = 1; i <= count; i++)
        {
            var first = firstNames[(i * 3) % firstNames.Length];
            var last = lastNames[(i * 5) % lastNames.Length];
            var gender = i % 2 == 0 ? "Female" : "Male";

            yield return new SeedUserDefinition(
                Key: $"customer-{businessKeyPrefix}-{i:D2}",
                Email: $"{first.ToLowerInvariant()}.{last.ToLowerInvariant()}.{businessKeyPrefix}{i:D2}@demo.punched.app",
                Password: i == 1 ? "Customer@1234!" : "Cust@1234!",
                FullName: $"{first} {last}",
                Role: UserRole.Customer,
                PhoneNumber: $"+25471{businessKeyPrefix[^1]}{(30000 + i):D5}",
                AvatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
                DateOfBirth: new DateOnly(1985 + (i % 15), ((i % 12) + 1), ((i % 27) + 1)),
                Gender: gender,
                CreatedAt: DeterministicSeed.AnchorUtc.AddMonths(monthsOffset).AddDays(i),
                IsVerified: true);
        }
    }

    private static string[] BuildCustomerKeys(string businessKeyPrefix, int count)
        => Enumerable.Range(1, count).Select(i => $"customer-{businessKeyPrefix}-{i:D2}").ToArray();
}
