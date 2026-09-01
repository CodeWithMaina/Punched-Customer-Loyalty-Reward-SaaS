using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PunchedApi.Application.Settings;
using PunchedApi.Infrastructure.Services;
using Xunit;

namespace PunchedApi.Tests;

/// <summary>
/// Verifies the fail-closed HMAC-SHA256 webhook signature enforcement added in
/// response to the P0 audit finding (unauthenticated plan granting via the
/// anonymous payments webhook).
/// </summary>
public sealed class BillingWebhookSignatureTests
{
    private static FakeMpesaStkGateway CreateGateway(string secret) =>
        new(Options.Create(new BillingOptions { WebhookSecret = secret }),
            NullLogger<FakeMpesaStkGateway>.Instance);

    private static byte[] Payload() =>
        Encoding.UTF8.GetBytes("""{"event":"payment.completed","businessId":"d1b05f57-8d3f-4a6a-a9f3-6b6a3a3a3a3a","planKey":"pro"}""");

    [Fact]
    public void Rejects_WhenSecretNotConfigured()
    {
        var gateway = CreateGateway(string.Empty);
        Assert.False(gateway.VerifyWebhookSignature(Payload(), null));
    }

    [Fact]
    public void Rejects_MissingOrWrongSignature()
    {
        var gateway = CreateGateway("secret-1");
        Assert.False(gateway.VerifyWebhookSignature(Payload(), null));
        Assert.False(gateway.VerifyWebhookSignature(Payload(), "deadbeef"));
    }

    [Fact]
    public void Accepts_CorrectHmacSignature()
    {
        const string secret = "secret-1";
        var payload = Payload();
        var expected = Convert.ToHexString(HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), payload));

        var gateway = CreateGateway(secret);
        Assert.True(gateway.VerifyWebhookSignature(payload, expected));
    }

    [Fact]
    public void Rejects_SignatureForDifferentPayload()
    {
        const string secret = "secret-1";
        var other = Encoding.UTF8.GetBytes("{}");
        var wrongSig = Convert.ToHexString(HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), other));

        var gateway = CreateGateway(secret);
        Assert.False(gateway.VerifyWebhookSignature(Payload(), wrongSig));
    }
}
