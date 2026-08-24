using Google.Apis.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using QuickBite.Identity.Application.Contracts.Auth;
using QuickBite.Identity.Auth;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Volo.Abp;
using Volo.Abp.Application.Services;
using Volo.Abp.Identity;
using AbpIdentityUser = Volo.Abp.Identity.IdentityUser;
using IHttpClientFactory = System.Net.Http.IHttpClientFactory;

namespace QuickBite.Identity.Application.Auth;

public class AuthService : ApplicationService, IAuthService
{
    private readonly IdentityUserManager _userManager;
    private readonly SignInManager<AbpIdentityUser> _signInManager;
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;

    public AuthService(
        IdentityUserManager userManager,
        SignInManager<AbpIdentityUser> signInManager,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
    }

    public async Task<LoginResultDto> LoginAsync(LoginInputDto input)
    {
        // Finding user by username or email address
        var user = await _userManager.FindByNameAsync(input.UserNameOrEmailAddress)
                   ?? await _userManager.FindByEmailAsync(input.UserNameOrEmailAddress);

        if (user is null)
        {
            return new LoginResultDto()
            {
                ErrorMessage = "User not found",
                Success = false
            };
        }

        // Checking password
        var result = await _signInManager.CheckPasswordSignInAsync(
            user,
            input.Password,
            lockoutOnFailure: true
        );

        if (result.Succeeded)
        {
            await _signInManager.SignInAsync(
                user,
                input.RememberMe
            );

            return new LoginResultDto()
            {
                Success = true
            };
        }
        else
        {
            return new LoginResultDto()
            {
                ErrorMessage = "Username or password is invalid",
                Success = false
            };
        }
    }

    public async Task<GoogleLoginResultDto> GoogleLoginAsync(GoogleLoginDto input)
    {
        if (string.IsNullOrWhiteSpace(input.IdToken))
        {
            throw new UserFriendlyException("Google ID Token is required.");
        }

        // 1. Validate Google ID Token and extract payload
        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(input.IdToken);
        }
        catch (Exception ex)
        {
            Logger.LogWarning(ex, "Invalid Google ID Token provided: {Message}", ex.Message);
            throw new UserFriendlyException("Invalid Google token. Authentication failed.");
        }

        if (string.IsNullOrWhiteSpace(payload.Email))
        {
            throw new UserFriendlyException("Google account must provide a verified email address.");
        }

        // 2. Check if user already exists
        var user = await _userManager.FindByEmailAsync(payload.Email);

        // Strong temporary password for internal OpenIddict token exchange
        var tempPassword = $"Gb_{Guid.NewGuid():N}!{Guid.NewGuid():N}"[..24] + "Aa1@";

        if (user == null)
        {
            // 3. Create new user if not found
            var baseUsername = payload.Email.Split('@')[0];
            var username = baseUsername;

            // Ensure unique username
            if (await _userManager.FindByNameAsync(username) != null)
            {
                username = $"{baseUsername}_{Guid.NewGuid():N}"[..Math.Min(baseUsername.Length + 7, 32)];
            }

            user = new AbpIdentityUser(
                GuidGenerator.Create(),
                username,
                payload.Email,
                CurrentTenant.Id
            )
            {
                Name = payload.GivenName ?? payload.Name ?? baseUsername,
                Surname = payload.FamilyName ?? string.Empty
            };

            user.SetEmailConfirmed(true);

            var createResult = await _userManager.CreateAsync(user, tempPassword);
            if (!createResult.Succeeded)
            {
                var errors = string.Join(", ", createResult.Errors.Select(e => e.Description));
                Logger.LogError("Failed to create Google user: {Errors}", errors);
                throw new UserFriendlyException($"Unable to create user account: {errors}");
            }

            // Assign default role: "Customer"
            await _userManager.AddToRoleAsync(user, "Customer");
            Logger.LogInformation("Successfully registered new Google user: {Email} with role Customer", payload.Email);
        }
        else
        {
            // Reset user password temporarily for OpenIddict token issue
            var resetToken = await _userManager.GeneratePasswordResetTokenAsync(user);
            var resetResult = await _userManager.ResetPasswordAsync(user, resetToken, tempPassword);
            if (!resetResult.Succeeded)
            {
                var errors = string.Join(", ", resetResult.Errors.Select(e => e.Description));
                Logger.LogError("Failed to reset password for Google user {Email}: {Errors}", payload.Email, errors);
                throw new UserFriendlyException("Failed to process Google authentication.");
            }
        }

        // 4. Request JWT Access Token from OpenIddict /connect/token endpoint
        var selfUrl = _configuration["App:SelfUrl"] ?? "https://localhost:44391";
        var tokenEndpoint = $"{selfUrl.TrimEnd('/')}/connect/token";

        var clientId = _configuration["OpenIddict:Applications:Identity_Web:ClientId"] ?? "quickbite_web";
        var clientSecret = _configuration["OpenIddict:Applications:Identity_Web:ClientSecret"] ?? "1q2w3e*";

        var tokenParams = new Dictionary<string, string>
        {
            { "grant_type", "password" },
            { "client_id", clientId },
            { "client_secret", clientSecret },
            { "username", user.UserName },
            { "password", tempPassword },
            { "scope", "openid profile email phone roles Identity quickbite.api permissions" }
        };

        // Bypass SSL validation for internal/localhost calls in development environments
        var handler = new HttpClientHandler
        {
            ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => true
        };

        using var client = new HttpClient(handler);
        var tokenResponse = await client.PostAsync(tokenEndpoint, new FormUrlEncodedContent(tokenParams));

        if (!tokenResponse.IsSuccessStatusCode)
        {
            var errorBody = await tokenResponse.Content.ReadAsStringAsync();
            Logger.LogError("OpenIddict token request failed: {StatusCode}, {Body}", tokenResponse.StatusCode, errorBody);
            throw new UserFriendlyException("Failed to issue access token for Google user.");
        }

        var responseJson = await tokenResponse.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<GoogleLoginResultDto>(responseJson, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        if (result == null || string.IsNullOrWhiteSpace(result.AccessToken))
        {
            throw new UserFriendlyException("Invalid token response received from authentication server.");
        }

        return result;
    }
}