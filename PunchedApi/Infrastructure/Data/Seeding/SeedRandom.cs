using System.Security.Cryptography;
using Microsoft.Extensions.Options;
using PunchedApi.Application.Settings;

namespace PunchedApi.Infrastructure.Data.Seeding;

public sealed class SeedRandom : ISeedRandom
{
    private readonly Random _random;

    public SeedRandom(IOptions<SeedOptions> options)
    {
        ActualSeed = options.Value.RandomSeed ?? RandomNumberGenerator.GetInt32(1, int.MaxValue);
        _random = new Random(ActualSeed);
    }

    public int ActualSeed { get; }

    public int NextInt(int minInclusive, int maxExclusive) => _random.Next(minInclusive, maxExclusive);

    public double NextDouble() => _random.NextDouble();

    public bool NextBool(double probabilityTrue = 0.5d) => NextDouble() < probabilityTrue;

    public T Pick<T>(IReadOnlyList<T> values)
    {
        if (values.Count == 0)
        {
            throw new InvalidOperationException("Cannot pick from an empty collection.");
        }

        return values[NextInt(0, values.Count)];
    }

    public DateTime NextUtc(DateTime minInclusiveUtc, DateTime maxInclusiveUtc)
    {
        if (maxInclusiveUtc <= minInclusiveUtc)
        {
            return minInclusiveUtc;
        }

        var rangeTicks = maxInclusiveUtc.Ticks - minInclusiveUtc.Ticks;
        var offsetTicks = (long)(NextDouble() * rangeTicks);
        return new DateTime(minInclusiveUtc.Ticks + offsetTicks, DateTimeKind.Utc);
    }
}
