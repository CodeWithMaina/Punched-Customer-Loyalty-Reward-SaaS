namespace PunchedApi.Infrastructure.Data.Seeding;

public interface ISeedRandom
{
    int ActualSeed { get; }
    int NextInt(int minInclusive, int maxExclusive);
    double NextDouble();
    bool NextBool(double probabilityTrue = 0.5d);
    T Pick<T>(IReadOnlyList<T> values);
    DateTime NextUtc(DateTime minInclusiveUtc, DateTime maxInclusiveUtc);
}
