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
            throw new UserFriendlyException("Google Token is required.");
        }

        var rawToken = input.IdToken.Trim();
        string email = string.Empty;
        string? name = null;
        string? givenName = null;
        string? familyName = null;

        // 1. First attempt: Validate as a signed Google JWT ID Token
        if (rawToken.Contains('.') && rawToken.Split('.').Length == 3)
        {
            try
            {
                var jwtPayload = await GoogleJsonWebSignature.ValidateAsync(rawToken);
                email = jwtPayload.Email;
                name = jwtPayload.Name;
                givenName = jwtPayload.GivenName;
                familyName = jwtPayload.FamilyName;
            }
            catch (Exception ex)
            {
                Logger.LogWarning(ex, "Google JWT ID token validation failed: {Message}", ex.Message);
            }
        }

        // 2. Second attempt: Validate as an OAuth2 Access Token (e.g. from useGoogleLogin)
        if (string.IsNullOrWhiteSpace(email))
        {
            try
            {
                using var httpClient = new HttpClient();
                httpClient.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", rawToken);

                var userInfoResponse = await httpClient.GetAsync("https://www.googleapis.com/oauth2/v3/userinfo");
                if (userInfoResponse.IsSuccessStatusCode)
                {
                    var json = await userInfoResponse.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);
                    var root = doc.RootElement;

                    if (root.TryGetProperty("email", out var emailProp))
                    {
                        email = emailProp.GetString() ?? string.Empty;
                    }
                    if (root.TryGetProperty("name", out var nameProp))
                    {
                        name = nameProp.GetString();
                    }
                    if (root.TryGetProperty("given_name", out var givenNameProp))
                    {
                        givenName = givenNameProp.GetString();
                    }
                    if (root.TryGetProperty("family_name", out var familyNameProp))
                    {
                        familyName = familyNameProp.GetString();
                    }
                }
                else
                {
                    var errContent = await userInfoResponse.Content.ReadAsStringAsync();
                    Logger.LogWarning("Google userinfo verification failed with status {StatusCode}: {Error}", userInfoResponse.StatusCode, errContent);
                }
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Failed to verify token with Google OAuth2 userinfo API.");
            }
        }

        if (string.IsNullOrWhiteSpace(email))
        {
            throw new UserFriendlyException("Invalid Google token. Authentication failed.");
        }

        // 3. Check if user already exists
        var user = await _userManager.FindByEmailAsync(email);

        // Strong temporary password for internal OpenIddict token exchange
        var tempPassword = $"Gb_{Guid.NewGuid():N}!{Guid.NewGuid():N}"[..24] + "Aa1@";

        if (user == null)
        {
            // 4. Create new user if not found
            var baseUsername = email.Split('@')[0];
            var username = baseUsername;

            // Ensure unique username
            if (await _userManager.FindByNameAsync(username) != null)
            {
                username = $"{baseUsername}_{Guid.NewGuid():N}"[..Math.Min(baseUsername.Length + 7, 32)];
            }

            user = new AbpIdentityUser(
                GuidGenerator.Create(),
                username,
                email,
                CurrentTenant.Id
            )
            {
                Name = givenName ?? name ?? baseUsername,
                Surname = familyName ?? string.Empty
            };

            user.SetEmailConfirmed(true);

            // Create user in ABP (ABP IdentityUserManager automatically assigns all roles where IsDefault = true)
            var createResult = await _userManager.CreateAsync(user, tempPassword);
            if (!createResult.Succeeded)
            {
                var errors = string.Join(", ", createResult.Errors.Select(e => e.Description));
                Logger.LogError("Failed to create Google user: {Errors}", errors);
                throw new UserFriendlyException($"Unable to create user account: {errors}");
            }

            Logger.LogInformation("Successfully registered new Google user with default ABP roles: {Email}", email);
        }
        else
        {
            // Reset user password temporarily for OpenIddict token issue
            var resetToken = await _userManager.GeneratePasswordResetTokenAsync(user);
            var resetResult = await _userManager.ResetPasswordAsync(user, resetToken, tempPassword);
            if (!resetResult.Succeeded)
            {
                var errors = string.Join(", ", resetResult.Errors.Select(e => e.Description));
                Logger.LogError("Failed to reset password for Google user {Email}: {Errors}", email, errors);
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
            { "scope", "openid profile email phone roles Identity" }
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