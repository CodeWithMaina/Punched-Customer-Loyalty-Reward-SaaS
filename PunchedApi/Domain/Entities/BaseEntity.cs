namespace PunchedApi.Domain.Entities;

/// <summary>
/// Base entity with common properties shared by all entities.
/// Provides Id and CreatedAt tracking for audit purposes.
/// </summary>
public abstract class BaseEntity
{
    /// <summary>
    /// Unique identifier (UUID/GUID) for the entity.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// UTC timestamp when the entity was created.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
