namespace PunchedApi.Domain.Entities;

/// <summary>
/// Defines the role of a registered user.
/// Used for role-based access control and dashboard routing.
/// </summary>
public enum UserRole
{
    /// <summary>End customer who collects stamps and redeems rewards.</summary>
    Customer = 0,

    /// <summary>Business owner who manages loyalty programs and staff.</summary>
    Business = 1,

    /// <summary>Staff member employed by a business who can issue stamps.</summary>
    Staff = 2,

    /// <summary>Platform administrator with full system access.</summary>
    Admin = 3
}
