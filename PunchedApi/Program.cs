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
using PunchedApi.Application.Mappings;
using PunchedApi.Application.Services;
using PunchedApi.Application.Settings;
using PunchedApi.Application.Validators;
using PunchedApi.Domain.Entities;
using PunchedApi.Domain.Interfaces;
using PunchedApi.Infrastructure.Data;
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
    builder.Services.AddDbContext<ApplicationDbContext>(options =>
        options.UseNpgsql(
            builder.Configuration.GetConnectionString("DefaultConnection"),
            o => o.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery)));

    // ── JWT Settings ────────────────────────────────────────
    var jwtSettings = builder.Configuration.GetSection(JwtSettings.SectionName);
    builder.Services.Configure<JwtSettings>(jwtSettings);

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

    builder.Services.AddScoped<IUserService, UserService>();
    builder.Services.AddScoped<IBusinessService, BusinessService>();
    builder.Services.AddScoped<ILoyaltyService, LoyaltyService>();
    builder.Services.AddScoped<IStampService, StampService>();
    builder.Services.AddScoped<IQrService, QrService>();
    builder.Services.AddScoped<IRedemptionService, RedemptionService>();
    builder.Services.AddScoped<IReferralService, ReferralService>();
    builder.Services.AddScoped<IAdminService, AdminService>();

    // SSE broker: singleton so all requests share the same in-process channels
    builder.Services.AddSingleton<ISseService, SseService>();

    // Periodic cleanup of expired tokens, QR tokens, and stale verification codes
    builder.Services.AddHostedService<CleanupService>();

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
    builder.Services.AddOutputCache(options =>
    {
        // Short cache for analytics endpoints (30s)
        options.AddPolicy("analytics", builder =>
            builder.Expire(TimeSpan.FromSeconds(30))
                   .SetVaryByQuery("period")
                   .Tag("analytics"));

        // Very short cache for dashboard metrics (10s)
        options.AddPolicy("dashboard", builder =>
            builder.Expire(TimeSpan.FromSeconds(10))
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

    // ── Apply pending database migrations on startup ────────
    using (var scope = app.Services.CreateScope())
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await dbContext.Database.MigrateAsync();
        Log.Information("Database migrations applied successfully.");

        // ── Seed default Admin user ─────────────────────────
        if (!await dbContext.UserAuths.AnyAsync(u => u.Email == "admin@gmail.com"))
        {
            var adminId = Guid.NewGuid();
            var now = DateTime.UtcNow;

            dbContext.UserAuths.Add(new UserAuth
            {
                Id = adminId,
                Email = "admin@gmail.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("@Admin1234", 12),
                IsVerified = true,
                CreatedAt = now,
            });

            dbContext.Users.Add(new User
            {
                Id = adminId,
                Email = "admin@gmail.com",
                FullName = "Admin Main",
                PhoneNumber = "+2547000000123",
                AvatarUrl = "https://www.freepik.com/free-photos-vectors/people-profile",
                DateOfBirth = new DateOnly(1994, 1, 15),
                Gender = "Male",
                Role = UserRole.Admin,
                CreatedAt = now,
            });

            await dbContext.SaveChangesAsync();
            Log.Information("Default admin user seeded: admin@gmail.com");
        }
    }

    // ── Middleware Pipeline ──────────────────────────────────
    app.UseMiddleware<ExceptionMiddleware>();

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
