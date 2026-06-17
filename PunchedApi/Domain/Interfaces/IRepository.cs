using PunchedApi.Domain.Entities;

namespace PunchedApi.Domain.Interfaces;

/// <summary>
/// Generic repository interface providing CRUD operations for all entities.
/// </summary>
/// <typeparam name="T">Entity type inheriting from BaseEntity.</typeparam>
public interface IRepository<T> where T : BaseEntity
{
    /// <summary>
    /// Gets an entity by its unique identifier.
    /// </summary>
    Task<T?> GetByIdAsync(Guid id);

    /// <summary>
    /// Gets all entities of this type.
    /// </summary>
    Task<IEnumerable<T>> GetAllAsync();

    /// <summary>
    /// Adds a new entity to the database.
    /// </summary>
    Task<T> AddAsync(T entity);

    /// <summary>
    /// Updates an existing entity.
    /// </summary>
    void Update(T entity);

    /// <summary>
    /// Deletes an entity.
    /// </summary>
    void Delete(T entity);

    /// <summary>
    /// Finds entities matching a predicate.
    /// </summary>
    Task<IEnumerable<T>> FindAsync(System.Linq.Expressions.Expression<Func<T, bool>> predicate);

    /// <summary>
    /// Finds a single entity matching a predicate or null.
    /// </summary>
    Task<T?> FirstOrDefaultAsync(System.Linq.Expressions.Expression<Func<T, bool>> predicate);

    /// <summary>
    /// Checks if any entity matches the predicate.
    /// </summary>
    Task<bool> AnyAsync(System.Linq.Expressions.Expression<Func<T, bool>> predicate);

    /// <summary>
    /// Counts entities matching a predicate.
    /// </summary>
    Task<int> CountAsync(System.Linq.Expressions.Expression<Func<T, bool>> predicate);
}
