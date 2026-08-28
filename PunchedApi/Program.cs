using System.IO.Compression;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using PunchedApi.API.Middleware;
using PunchedApi.Application.Authorization;
using PunchedApi.Application.Mappings;
using PunchedApi.Application.Modules;
using PunchedApi.Application.Services;
using PunchedApi.Application.Settings;
using PunchedApi.Application.Validators;
using PunchedApi.Domain.Entities;
using PunchedApi.Domain.Interfaces;
using PunchedApi.Infrastructure.Data;
using PunchedApi.Infrastructure.Data.Seeding;
using PunchedApi.Infrastructure.Data.Seeding.Steps;
using PunchedApi.Infrastructure.Repositories;
using PunchedApi.Infrastructure.Services;
using Serilog;

// ═══════════════════════════════════════════════════════════════
//  SERILOG BOOTSTRAP
// ═══════════════════════════════════════════════════════════════
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    Log.Information("Starting Punched API...");

    var builder = WebApplication.CreateBuilder(args);

    // ── Serilog ─────────────────────────────────────────────
    builder.Host.UseSerilog((context, config) =>
        config.ReadFrom.Configuration(context.Configuration)
              .WriteTo.Console());

    // ═══════════════════════════════════════════════════════════
    //  SERVICE REGISTRATIONS
    // ═══════════════════════════════════════════════════════════

    // ── Database (PostgreSQL via Neon) ──────────────────────
    // DbContext pooling: contexts are stateless here and resolved per-scope,
    // so pooled instances are safely reset and reused across requests. This
    // removes per-request context allocation cost without changing semantics.
    builder.Services.AddDbContextPool<ApplicationDbContext>(options =>
        options.UseNpgsql(
            builder.Configuration.GetConnectionString("DefaultConnection"),
            o => o.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery)));

    // ── Caching / tenant scope resolution ───────────────────
    builder.Services.AddMemoryCache();
    builder.Services.AddSingleton<IBusinessScopeResolver, BusinessScopeResolver>();

    // ── JWT Settings ────────────────────────────────────────
    var jwtSettings = builder.Configuration.GetSection(JwtSettings.SectionName);
    builder.Services.Configure<JwtSettings>(jwtSettings);
    builder.Services.Configure<SeedOptions>(
        builder.Configuration.GetSection(SeedOptions.SectionName));

    builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        var secret = jwtSettings["Secret"]
            ?? throw new InvalidOperationException("JWT Secret is not configured.");

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
            ValidateIssuer = true,
            ValidIssuer = jwtSettings["Issuer"],
            ValidateAudience = true,
            ValidAudience = jwtSettings["Audience"],
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };

        // Allow SSE connections to pass token via query string (EventSource has no header support)
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var token = ctx.Request.Query["access_token"].FirstOrDefault();
                if (!string.IsNullOrEmpty(token) &&
                    ctx.Request.Path.StartsWithSegments("/v1/sse"))
                {
                    ctx.Token = token;
                }
                return Task.CompletedTask;
            }
        };
    });

    builder.Services.AddAuthorization();

    // ── Repositories & Unit of Work ─────────────────────────
    builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
    builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

    // ── Email Settings ───────────────────────────────────────
    builder.Services.Configure<EmailSettings>(
        builder.Configuration.GetSection(EmailSettings.SectionName));

    // ── Application Services ────────────────────────────────
    builder.Services.AddScoped<JwtTokenService>();
    builder.Services.AddScoped<IAuthService, AuthService>();

    // Use ConsoleEmailService for development; switch to SmtpEmailService for production
    if (builder.Environment.IsDevelopment())
        builder.Services.AddScoped<IEmailService, ConsoleEmailService>();
    else
        builder.Services.AddScoped<IEmailService, SmtpEmailService>();

    builder.Services.Configure<PublicAppSettings>(
        builder.Configuration.GetSection(PublicAppSettings.SectionName));

    // Staff invitations (invitation-only staff onboarding)
    builder.Services.AddScoped<IInvitationService, InvitationService>();

    builder.Services.AddScoped<IUserService, UserService>();
    builder.Services.AddScoped<IBusinessService, BusinessService>();
    builder.Services.AddScoped<ILoyaltyService, LoyaltyService>();
    builder.Services.AddScoped<IStampService, StampService>();
    builder.Services.AddScoped<INotificationsService, NotificationsService>();
    builder.Services.AddScoped<IQrService, QrService>();
    builder.Services.AddScoped<IRedemptionService, RedemptionService>();
    builder.Services.AddScoped<IReferralService, ReferralService>();
    builder.Services.AddScoped<IAdminService, AdminService>();
    builder.Services.AddScoped<IAnalyticsAggregationService, AnalyticsAggregationService>();
    builder.Services.AddScoped<ISegmentationService, SegmentationService>();
    builder.Services.AddScoped<IInsightService, InsightService>();
    builder.Services.AddScoped<IPayoutService, PayoutService>();
    builder.Services.AddScoped<IRewardPayoutGateway, FakeMpesaPayoutGateway>();

    // ── Booking (Phase 2/3) ─────────────────────────────────
    builder.Services.AddScoped<IAppointmentService, AppointmentService>();
    builder.Services.AddScoped<AppointmentAvailabilityService>();
    builder.Services.AddScoped<IServiceCatalogService, ServiceCatalogService>();

    // ── Module entitlements (plugin architecture Phases 1-3) ─
    builder.Services.AddScoped<IModuleEntitlementService, ModuleEntitlementService>();

    // ── Subscription lifecycle & billing (Steps 7) ──────────
    builder.Services.AddScoped<ISubscriptionLifecycleService, SubscriptionLifecycleService>();
    builder.Services.AddScoped<SubscriptionExpiryService>();
    builder.Services.AddScoped<IBillingGateway, FakeMpesaStkGateway>();

    // ── Module enforcement (plugin architecture Phases 4-6) ──
    builder.Services.Configure<ModuleEnforcementOptions>(
        builder.Configuration.GetSection(ModuleEnforcementOptions.SectionName));
    builder.Services.AddHttpContextAccessor();
    builder.Services.AddScoped<IBusinessContext, BusinessContext>();
    builder.Services.AddScoped<IPermissionService, PermissionService>();

    // ── Seed framework ─────────────────────────────────────
    builder.Services.AddSingleton<ISeedRandom, SeedRandom>();
    builder.Services.AddScoped<IDatabaseSeeder, DatabaseSeeder>();
    builder.Services.AddScoped<IDatabaseCliRunner, DatabaseCliRunner>();
    builder.Services.AddScoped<IAdminBootstrapper, AdminBootstrapper>();
    builder.Services.AddScoped<IModuleCatalogSeeder, ModuleCatalogSeeder>();
    builder.Services.AddScoped<ISeedStep, DatabasePreparationSeedStep>();
    builder.Services.AddScoped<ISeedStep, IdentitySeedStep>();
    builder.Services.AddScoped<ISeedStep, BusinessSeedStep>();
    builder.Services.AddScoped<ISeedStep, StaffLinkSeedStep>();
    builder.Services.AddScoped<ISeedStep, LoyaltyProgramSeedStep>();
    builder.Services.AddScoped<ISeedStep, ReferralProgramSeedStep>();
    builder.Services.AddScoped<ISeedStep, LoyaltyActivitySeedStep>();
    builder.Services.AddScoped<ISeedStep, AnalyticsBackfillSeedStep>();
    builder.Services.AddScoped<ISeedStep, ReferralSeedStep>();
    builder.Services.AddScoped<ISeedStep, SessionSeedStep>();
    builder.Services.AddScoped<ISeedStep, UnsupportedDomainsSeedStep>();
    builder.Services.AddScoped<ISeedStep, ValidationAndReportSeedStep>();

    // SSE broker: singleton so all requests share the same in-process channels
    builder.Services.AddSingleton<ISseService, SseService>();

    // Periodic cleanup of expired tokens, QR tokens, and stale verification codes
    builder.Services.AddHostedService<CleanupService>();
    builder.Services.AddHostedService<PayoutWorker>();
    builder.Services.AddHostedService<AnalyticsWorker>();
    builder.Services.AddHostedService<SubscriptionExpiryWorker>();

    // ── AutoMapper ──────────────────────────────────────────
    builder.Services.AddAutoMapper(typeof(MappingProfile));

    // ── FluentValidation ────────────────────────────────────
    builder.Services.AddFluentValidationAutoValidation();
    builder.Services.AddValidatorsFromAssemblyContaining<RegisterRequestValidator>();

    // ── Controllers ─────────────────────────────────────────
    builder.Services.AddControllers()
        .AddJsonOptions(options =>
        {
            // Allow string enum values in request/response payloads.
            options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        });

    // ── CORS ────────────────────────────────────────────────
    var corsOrigins = builder.Configuration.GetSection("CorsOrigins").Get<string[]>()
        ?? new[]
        {
            "http://localhost:3000",      // Next.js dev
            "http://localhost:3001",      // Alternative dev port
            "http://localhost:5091",      // Swagger/API local origin
            "https://punched.app",        // Production
            "https://www.punched.app"     // Production www
        };

    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowFrontend", policy =>
            policy.WithOrigins(corsOrigins)
                .AllowAnyMethod()
                .AllowAnyHeader()
                .AllowCredentials());
    });

    // ── Rate Limiting (.NET 8 built-in) ─────────────────────
    builder.Services.AddRateLimiter(options =>
    {
        // OTP / verification code requests: 3 per 15 minutes per IP
        options.AddPolicy("otp", httpContext =>
            RateLimitPartition.GetFixedWindowLimiter(
                httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 3,
                    Window = TimeSpan.FromMinutes(15),
                    QueueLimit = 0
                }));

        // Login attempts: 5 per 30 minutes per IP
        options.AddPolicy("login", httpContext =>
            RateLimitPartition.GetFixedWindowLimiter(
                httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 5,
                    Window = TimeSpan.FromMinutes(30),
                    QueueLimit = 0
                }));

        // General API: 1000 per hour per IP
        options.AddPolicy("general", httpContext =>
            RateLimitPartition.GetFixedWindowLimiter(
                httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 1000,
                    Window = TimeSpan.FromHours(1),
                    QueueLimit = 0
                }));

        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    });

    // ── Swagger / OpenAPI ───────────────────────────────────
    builder.Services.AddEndpointsApiExplorer();

    // ── Response Compression ────────────────────────────────
    builder.Services.AddResponseCompression(options =>
    {
        options.EnableForHttps = true;
        options.Providers.Add<BrotliCompressionProvider>();
        options.Providers.Add<GzipCompressionProvider>();
        options.MimeTypes = ResponseCompressionDefaults.MimeTypes;
    });
    builder.Services.Configure<BrotliCompressionProviderOptions>(options =>
        options.Level = CompressionLevel.Fastest);
    builder.Services.Configure<GzipCompressionProviderOptions>(options =>
        options.Level = CompressionLevel.Fastest);

    // ── Output Caching ──────────────────────────────────────
    // IMPORTANT (tenant security): these endpoints resolve the business from the
    // authenticated user's JWT claims, NOT from the URL. ASP.NET Core OutputCache
    // keys responses by path + query string only, so without varying on the
    // Authorization header two different business owners hitting the same
    // `/v1/businesses/me/dashboard` URL would receive each other's cached data
    // (a cross-tenant leak). Varying by `Authorization` guarantees each user's
    // cached response is keyed to their token. The BusinessId itself is never read
    // from a client-supplied query parameter.
    builder.Services.AddOutputCache(options =>
    {
        // Short cache for analytics endpoints (30s) — vary by token + period/range.
        options.AddPolicy("analytics", builder =>
            builder.Expire(TimeSpan.FromSeconds(30))
                   .SetVaryByHeader("Authorization")
                   .SetVaryByQuery("period", "start", "end", "prev")
                   .Tag("analytics"));

        // Very short cache for dashboard metrics (10s) — vary by token.
        options.AddPolicy("dashboard", builder =>
            builder.Expire(TimeSpan.FromSeconds(10))
                   .SetVaryByHeader("Authorization")
                   .Tag("dashboard"));
    });

    builder.Services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo
        {
            Title = "Punched Loyalty API",
            Version = "v1",
            Description = "MVP API for Punched Loyalty Platform — Authentication & Core Endpoints"
        });

        c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            Name = "Authorization",
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header,
            Description = "Enter your JWT token"
        });

        c.AddSecurityRequirement(new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference
                    {
                        Type = ReferenceType.SecurityScheme,
                        Id = "Bearer"
                    }
                },
                Array.Empty<string>()
            }
        });
    });

    // ═══════════════════════════════════════════════════════════
    //  BUILD APP
    // ═══════════════════════════════════════════════════════════
    var app = builder.Build();

    if (args.Length > 0)
    {
        using var cliScope = app.Services.CreateScope();
        var cliRunner = cliScope.ServiceProvider.GetRequiredService<IDatabaseCliRunner>();
        if (await cliRunner.TryRunAsync(args))
        {
            return;
        }
    }

    // ── Apply pending database migrations on startup ────────
    using (var scope = app.Services.CreateScope())
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await dbContext.Database.MigrateAsync();
        Log.Information("Database migrations applied successfully.");

        var seeder = scope.ServiceProvider.GetRequiredService<IDatabaseSeeder>();
        await seeder.RunAsync();
        var adminBootstrapper = scope.ServiceProvider.GetRequiredService<IAdminBootstrapper>();
        await adminBootstrapper.EnsureDefaultAdminAsync();

        // Module catalog (modules/plans/plan_modules) — idempotent, runs in
        // every environment because entitlement resolution depends on it.
        var moduleCatalogSeeder = scope.ServiceProvider.GetRequiredService<IModuleCatalogSeeder>();
        await moduleCatalogSeeder.EnsureModuleCatalogAsync();
        Log.Information("Module catalog verified.");
    }

    // ── Middleware Pipeline ──────────────────────────────────
    app.UseMiddleware<ExceptionMiddleware>();
    app.UseMiddleware<ApiEventLoggingMiddleware>();

    app.UseResponseCompression();

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/swagger/v1/swagger.json", "Punched API v1");
            c.RoutePrefix = "swagger";
        });
    }

    app.UseHttpsRedirection();
    app.UseCors("AllowFrontend");
    app.UseRateLimiter();
    app.UseAuthentication();
    // Module gating is enforced per-endpoint via [RequireModule] filters
    // (MODULE_SYSTEM_STATUS_AND_PLAN.md Step 4); no coarse middleware by design.
    app.UseAuthorization();
    app.UseOutputCache();

    app.MapControllers();

    // ── Health check endpoint ───────────────────────────────
    app.MapGet("/", () => Results.Ok(new { status = "healthy", service = "Punched API", version = "1.0.0" }));
    app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

    app.Run();
}
catch (Microsoft.Extensions.Hosting.HostAbortedException)
{
    // Expected during EF Core design-time commands (migrations/update).
    Log.Information("Host aborted during EF design-time execution.");
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
