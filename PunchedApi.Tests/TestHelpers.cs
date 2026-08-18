using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Logging;

namespace PunchedApi.Tests;

/// <summary>
/// Shared test infrastructure helpers.
/// </summary>
internal static class TestHelpers
{
    /// <summary>
    /// Creates a no-op ILogger&lt;T&gt; for use in tests.
    /// </summary>
    public static ILogger<T> CreateLogger<T>() => NullLogger<T>.Instance;
}
