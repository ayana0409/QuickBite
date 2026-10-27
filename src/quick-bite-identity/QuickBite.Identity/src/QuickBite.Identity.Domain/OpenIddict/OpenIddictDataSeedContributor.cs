using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using JetBrains.Annotations;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Localization;
using OpenIddict.Abstractions;
using Volo.Abp;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.Data;
using Volo.Abp.DependencyInjection;
using Volo.Abp.OpenIddict.Applications;
using Volo.Abp.OpenIddict.Scopes;
using Volo.Abp.PermissionManagement;
using Volo.Abp.Uow;

namespace QuickBite.Identity.OpenIddict;

/* Creates initial data that is needed to property run the application
 * and make client-to-server communication possible.
 */
public class OpenIddictDataSeedContributor : IDataSeedContributor, ITransientDependency
{
    private readonly IConfiguration _configuration;
    private readonly IOpenIddictApplicationRepository _openIddictApplicationRepository;
    private readonly IAbpApplicationManager _applicationManager;
    private readonly IOpenIddictScopeRepository _openIddictScopeRepository;
    private readonly IOpenIddictScopeManager _scopeManager;
    private readonly IPermissionDataSeeder _permissionDataSeeder;
    private readonly IStringLocalizer<OpenIddictResponse> L;

    public OpenIddictDataSeedContributor(
        IConfiguration configuration,
        IOpenIddictApplicationRepository openIddictApplicationRepository,
        IAbpApplicationManager applicationManager,
        IOpenIddictScopeRepository openIddictScopeRepository,
        IOpenIddictScopeManager scopeManager,
        IPermissionDataSeeder permissionDataSeeder,
        IStringLocalizer<OpenIddictResponse> l )
    {
        _configuration = configuration;
        _openIddictApplicationRepository = openIddictApplicationRepository;
        _applicationManager = applicationManager;
        _openIddictScopeRepository = openIddictScopeRepository;
        _scopeManager = scopeManager;
        _permissionDataSeeder = permissionDataSeeder;
        L = l;
    }

    [UnitOfWork]
    public virtual async Task SeedAsync(DataSeedContext context)
    {
        await CreateScopesAsync();
        await CreateApplicationsAsync();
    }

    private async Task CreateScopesAsync()
    {
        // Load custom scopes from configuration instead of hardcoding
        var scopeConfigs = _configuration
            .GetSection("OpenIddict:Scopes")
            .Get<List<OpenIddictScopeConfig>>() ?? new List<OpenIddictScopeConfig>();

        foreach (var scopeConfig in scopeConfigs)
        {
            if (string.IsNullOrWhiteSpace(scopeConfig.Name))
            {
                continue;
            }

            if (await _openIddictScopeRepository.FindByNameAsync(scopeConfig.Name) == null)
            {
                await _scopeManager.CreateAsync(new OpenIddictScopeDescriptor
                {
                    Name = scopeConfig.Name,
                    DisplayName = scopeConfig.DisplayName,
                    Resources = { scopeConfig.Resource }
                });
            }
        }
    }

    private static readonly List<string> DefaultScopes = new()
    {
        OpenIddictConstants.Permissions.Scopes.Address,
        OpenIddictConstants.Permissions.Scopes.Email,
        OpenIddictConstants.Permissions.Scopes.Phone,
        OpenIddictConstants.Permissions.Scopes.Profile,
        OpenIddictConstants.Permissions.Scopes.Roles,
        "Identity",
        "offline_access"
    };

    private static readonly List<string> DefaultGrantTypes = new()
    {
        OpenIddictConstants.GrantTypes.AuthorizationCode,
        OpenIddictConstants.GrantTypes.RefreshToken
    };

    private async Task CreateApplicationsAsync()
    {
        var configSection = _configuration.GetSection("OpenIddict:Applications");

        // --- Dynamic clients from "OpenIddict:Applications:Clients" array ---
        var clientConfigs = configSection
            .GetSection("Clients")
            .Get<List<OpenIddictClientConfig>>() ?? new List<OpenIddictClientConfig>();

        // --- Legacy: Identity_Web client (uses dynamic RootUrl) ---
        // Only seed if NOT already defined in Clients array to prevent duplicate or conflicting configuration
        var webClientId = configSection["Identity_Web:ClientId"];
        if (!webClientId.IsNullOrWhiteSpace() &&
            !clientConfigs.Any(c => string.Equals(c.ClientId, webClientId, StringComparison.OrdinalIgnoreCase)))
        {
            var webClientRootUrl = configSection["Identity_Web:RootUrl"]!.EnsureEndsWith('/');
            var webClientSecret = configSection["Identity_Web:ClientSecret"] ?? "1q2w3e*";

            /* Identity_Web client is only needed if you created a tiered
             * solution. Otherwise, you can delete this client. */
            await CreateApplicationAsync(
                name: webClientId!,
                type: OpenIddictConstants.ClientTypes.Confidential,
                consentType: OpenIddictConstants.ConsentTypes.Implicit,
                displayName: "Web Application",
                secret: webClientSecret,
                grantTypes: new List<string>
                {
                    OpenIddictConstants.GrantTypes.AuthorizationCode,
                    OpenIddictConstants.GrantTypes.Implicit,
                    OpenIddictConstants.GrantTypes.RefreshToken
                },
                scopes: ResolveScopes(configSection["Identity_Web:Scopes"]),
                redirectUri: configSection["Identity_Web:RedirectUris"] ??
                    $"{webClientRootUrl}api/auth/callback/oidc,{webClientRootUrl}signin-oidc,https://localhost:44391/signin-oidc",
                clientUri: webClientRootUrl,
                postLogoutRedirectUri: configSection["Identity_Web:PostLogoutRedirectUris"] ??
                    $"{webClientRootUrl}signout-callback-oidc"
            );
        }

        // --- Legacy: Swagger client (uses dynamic RootUrl) ---
        // Only seed if NOT already defined in Clients array
        var swaggerClientId = configSection["Identity_Swagger:ClientId"];
        if (!swaggerClientId.IsNullOrWhiteSpace() &&
            !clientConfigs.Any(c => string.Equals(c.ClientId, swaggerClientId, StringComparison.OrdinalIgnoreCase)))
        {
            var swaggerRootUrl = configSection["Identity_Swagger:RootUrl"]?.TrimEnd('/');

            await CreateApplicationAsync(
                name: swaggerClientId!,
                type: OpenIddictConstants.ClientTypes.Public,
                consentType: OpenIddictConstants.ConsentTypes.Implicit,
                displayName: "Swagger Application",
                secret: null,
                grantTypes: new List<string>
                {
                    OpenIddictConstants.GrantTypes.AuthorizationCode,
                    OpenIddictConstants.GrantTypes.Password
                },
                scopes: ResolveScopes(configSection["Identity_Swagger:Scopes"]),
                redirectUri: $"{swaggerRootUrl}/swagger/oauth2-redirect.html",
                clientUri: swaggerRootUrl
            );
        }

        // --- Dynamic clients from "OpenIddict:Applications:Clients" array ---
        foreach (var clientConfig in clientConfigs)
        {
            if (string.IsNullOrWhiteSpace(clientConfig.ClientId))
            {
                continue;
            }

            var clientType = string.Equals(clientConfig.Type, "confidential", StringComparison.OrdinalIgnoreCase)
                ? OpenIddictConstants.ClientTypes.Confidential
                : OpenIddictConstants.ClientTypes.Public;

            await CreateApplicationAsync(
                name: clientConfig.ClientId,
                type: clientType,
                consentType: OpenIddictConstants.ConsentTypes.Implicit,
                displayName: clientConfig.DisplayName,
                secret: clientConfig.Secret,
                grantTypes: MapGrantTypes(clientConfig.GrantTypes),
                scopes: ResolveScopes(clientConfig.Scopes),
                redirectUri: clientConfig.RedirectUris.Count > 0
                    ? string.Join(",", clientConfig.RedirectUris)
                    : null,
                clientUri: clientConfig.ClientUri,
                postLogoutRedirectUri: clientConfig.PostLogoutRedirectUris.Count > 0
                    ? string.Join(",", clientConfig.PostLogoutRedirectUris)
                    : null
            );
        }
    }

    /// <summary>
    /// Maps string grant type names from config to OpenIddict constant values.
    /// Accepts friendly names (e.g. "authorization_code") or full OpenIddict strings.
    /// Falls back to default grant types if input is empty.
    /// </summary>
    private static List<string> MapGrantTypes(List<string>? grantTypes)
    {
        if (grantTypes == null || grantTypes.Count == 0)
        {
            return new List<string>(DefaultGrantTypes);
        }

        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["authorization_code"] = OpenIddictConstants.GrantTypes.AuthorizationCode,
            ["implicit"]           = OpenIddictConstants.GrantTypes.Implicit,
            ["password"]           = OpenIddictConstants.GrantTypes.Password,
            ["refresh_token"]      = OpenIddictConstants.GrantTypes.RefreshToken,
            ["client_credentials"] = OpenIddictConstants.GrantTypes.ClientCredentials,
            ["device_code"]        = OpenIddictConstants.GrantTypes.DeviceCode,
        };

        var resolved = grantTypes
            .Select(g => map.TryGetValue(g, out var mapped) ? mapped : g)
            .Distinct()
            .ToList();

        return resolved.Count > 0 ? resolved : new List<string>(DefaultGrantTypes);
    }

    /// <summary>
    /// Resolves scope list from a comma-separated config string.
    /// Maps friendly names (e.g. "email") to OpenIddict permission constants.
    /// Custom scopes (e.g. "Identity", "QuickTest") are passed through as-is.
    /// Falls back to default scopes if input is empty or null.
    /// </summary>
    private static List<string> ResolveScopes(string? scopesCsv)
    {
        if (string.IsNullOrWhiteSpace(scopesCsv))
        {
            return new List<string>(DefaultScopes);
        }

        var resolved = scopesCsv
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(MapScopeName)
            .Distinct()
            .ToList();

        return resolved.Count > 0 ? resolved : new List<string>(DefaultScopes);
    }

    /// <summary>
    /// Resolves scope list from a List&lt;string&gt; (from config array binding).
    /// Falls back to default scopes if input is empty or null.
    /// </summary>
    private static List<string> ResolveScopes(List<string>? scopes)
    {
        if (scopes == null || scopes.Count == 0)
        {
            return new List<string>(DefaultScopes);
        }

        var resolved = scopes
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(MapScopeName)
            .Distinct()
            .ToList();

        return resolved.Count > 0 ? resolved : new List<string>(DefaultScopes);
    }

    /// <summary>
    /// Maps a friendly scope short-name to the OpenIddict Permissions.Scopes constant.
    /// Unknown/custom scopes are returned unchanged.
    /// </summary>
    private static string MapScopeName(string scope)
    {
        return scope.ToLowerInvariant() switch
        {
            "address"        => OpenIddictConstants.Permissions.Scopes.Address,
            "email"          => OpenIddictConstants.Permissions.Scopes.Email,
            "phone"          => OpenIddictConstants.Permissions.Scopes.Phone,
            "profile"        => OpenIddictConstants.Permissions.Scopes.Profile,
            "roles"          => OpenIddictConstants.Permissions.Scopes.Roles,
            "offline_access" => "offline_access",
            _                => scope  // custom scopes (e.g. "Identity", "QuickTest") pass through
        };
    }


    private async Task CreateApplicationAsync(
        [NotNull] string name,
        [NotNull] string type,
        [NotNull] string consentType,
        string displayName,
        string? secret,
        List<string> grantTypes,
        List<string> scopes,
        string? clientUri = null,
        string? redirectUri = null,
        string? postLogoutRedirectUri = null,
        List<string>? permissions = null)
    {
        if (!string.IsNullOrEmpty(secret) && string.Equals(type, OpenIddictConstants.ClientTypes.Public,
                StringComparison.OrdinalIgnoreCase))
        {
            throw new BusinessException(L["NoClientSecretCanBeSetForPublicApplications"]);
        }

        if (string.IsNullOrEmpty(secret) && string.Equals(type, OpenIddictConstants.ClientTypes.Confidential,
                StringComparison.OrdinalIgnoreCase))
        {
            throw new BusinessException(L["TheClientSecretIsRequiredForConfidentialApplications"]);
        }

        var client = await _openIddictApplicationRepository.FindByClientIdAsync(name);

        var application = new AbpApplicationDescriptor {
            ClientId = name,
            ClientType = type,
            ClientSecret = secret,
            ConsentType = consentType,
            DisplayName = displayName,
            ClientUri = clientUri,
        };

        if (grantTypes == null || grantTypes.Count == 0)
        {
            grantTypes = new List<string>(DefaultGrantTypes);
        }

        if (scopes == null || scopes.Count == 0)
        {
            scopes = new List<string>(DefaultScopes);
        }

        Check.NotNullOrEmpty(grantTypes, nameof(grantTypes));
        Check.NotNullOrEmpty(scopes, nameof(scopes));

        if (new[] { OpenIddictConstants.GrantTypes.AuthorizationCode, OpenIddictConstants.GrantTypes.Implicit }.All(
                grantTypes.Contains))
        {
            application.Permissions.Add(OpenIddictConstants.Permissions.ResponseTypes.CodeIdToken);

            if (string.Equals(type, OpenIddictConstants.ClientTypes.Public, StringComparison.OrdinalIgnoreCase))
            {
                application.Permissions.Add(OpenIddictConstants.Permissions.ResponseTypes.CodeIdTokenToken);
                application.Permissions.Add(OpenIddictConstants.Permissions.ResponseTypes.CodeToken);
            }
        }

        if (!redirectUri.IsNullOrWhiteSpace() || !postLogoutRedirectUri.IsNullOrWhiteSpace())
        {
            application.Permissions.Add(OpenIddictConstants.Permissions.Endpoints.EndSession);
        }

        var buildInGrantTypes = new[] {
            OpenIddictConstants.GrantTypes.Implicit, OpenIddictConstants.GrantTypes.Password,
            OpenIddictConstants.GrantTypes.AuthorizationCode, OpenIddictConstants.GrantTypes.ClientCredentials,
            OpenIddictConstants.GrantTypes.DeviceCode, OpenIddictConstants.GrantTypes.RefreshToken
        };

        foreach (var grantType in grantTypes)
        {
            if (grantType == OpenIddictConstants.GrantTypes.AuthorizationCode)
            {
                application.Permissions.Add(OpenIddictConstants.Permissions.GrantTypes.AuthorizationCode);
                application.Permissions.Add(OpenIddictConstants.Permissions.ResponseTypes.Code);
            }

            if (grantType == OpenIddictConstants.GrantTypes.AuthorizationCode ||
                grantType == OpenIddictConstants.GrantTypes.Implicit)
            {
                application.Permissions.Add(OpenIddictConstants.Permissions.Endpoints.Authorization);
            }

            if (grantType == OpenIddictConstants.GrantTypes.AuthorizationCode ||
                grantType == OpenIddictConstants.GrantTypes.ClientCredentials ||
                grantType == OpenIddictConstants.GrantTypes.Password ||
                grantType == OpenIddictConstants.GrantTypes.RefreshToken ||
                grantType == OpenIddictConstants.GrantTypes.DeviceCode)
            {
                application.Permissions.Add(OpenIddictConstants.Permissions.Endpoints.Token);
                application.Permissions.Add(OpenIddictConstants.Permissions.Endpoints.Revocation);
                application.Permissions.Add(OpenIddictConstants.Permissions.Endpoints.Introspection);
            }

            if (grantType == OpenIddictConstants.GrantTypes.ClientCredentials)
            {
                application.Permissions.Add(OpenIddictConstants.Permissions.GrantTypes.ClientCredentials);
            }

            if (grantType == OpenIddictConstants.GrantTypes.Implicit)
            {
                application.Permissions.Add(OpenIddictConstants.Permissions.GrantTypes.Implicit);
            }

            if (grantType == OpenIddictConstants.GrantTypes.Password)
            {
                application.Permissions.Add(OpenIddictConstants.Permissions.GrantTypes.Password);
            }

            if (grantType == OpenIddictConstants.GrantTypes.RefreshToken)
            {
                application.Permissions.Add(OpenIddictConstants.Permissions.GrantTypes.RefreshToken);
            }

            if (grantType == OpenIddictConstants.GrantTypes.DeviceCode)
            {
                application.Permissions.Add(OpenIddictConstants.Permissions.GrantTypes.DeviceCode);
                application.Permissions.Add(OpenIddictConstants.Permissions.Endpoints.DeviceAuthorization);
            }

            if (grantType == OpenIddictConstants.GrantTypes.Implicit)
            {
                application.Permissions.Add(OpenIddictConstants.Permissions.ResponseTypes.IdToken);
                if (string.Equals(type, OpenIddictConstants.ClientTypes.Public, StringComparison.OrdinalIgnoreCase))
                {
                    application.Permissions.Add(OpenIddictConstants.Permissions.ResponseTypes.IdTokenToken);
                    application.Permissions.Add(OpenIddictConstants.Permissions.ResponseTypes.Token);
                }
            }

            if (!buildInGrantTypes.Contains(grantType))
            {
                application.Permissions.Add(OpenIddictConstants.Permissions.Prefixes.GrantType + grantType);
            }
        }

        var buildInScopes = new[] {
            OpenIddictConstants.Permissions.Scopes.Address, OpenIddictConstants.Permissions.Scopes.Email,
            OpenIddictConstants.Permissions.Scopes.Phone, OpenIddictConstants.Permissions.Scopes.Profile,
            OpenIddictConstants.Permissions.Scopes.Roles
        };

        foreach (var scope in scopes)
        {
            if (buildInScopes.Contains(scope))
            {
                application.Permissions.Add(scope);
            }
            else
            {
                application.Permissions.Add(OpenIddictConstants.Permissions.Prefixes.Scope + scope);
            }
        }

        if (redirectUri != null)
        {
            var uris = redirectUri.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var rUri in uris)
            {
                if (!rUri.IsNullOrWhiteSpace())
                {
                    if (Uri.TryCreate(rUri.Trim(), UriKind.Absolute, out var uri) && uri.IsWellFormedOriginalString())
                    {
                        if (application.RedirectUris.All(x => x != uri))
                        {
                            application.RedirectUris.Add(uri);
                        }
                    }
                }
            }
        }

        if (postLogoutRedirectUri != null)
        {
            var uris = postLogoutRedirectUri.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var pUri in uris)
            {
                if (!pUri.IsNullOrWhiteSpace())
                {
                    if (Uri.TryCreate(pUri.Trim(), UriKind.Absolute, out var uri) && uri.IsWellFormedOriginalString())
                    {
                        if (application.PostLogoutRedirectUris.All(x => x != uri))
                        {
                            application.PostLogoutRedirectUris.Add(uri);
                        }
                    }
                }
            }
        }

        if (permissions != null)
        {
            await _permissionDataSeeder.SeedAsync(
                ClientPermissionValueProvider.ProviderName,
                name,
                permissions,
                null
            );
        }

        if (client == null)
        {
            await _applicationManager.CreateAsync(application);
            return;
        }

        if (!HasSameRedirectUris(client, application))
        {
            client.RedirectUris = JsonSerializer.Serialize(application.RedirectUris.Select(q => q.ToString().TrimEnd('/')));
            client.PostLogoutRedirectUris = JsonSerializer.Serialize(application.PostLogoutRedirectUris.Select(q => q.ToString().TrimEnd('/')));

            await _applicationManager.UpdateAsync(client.ToModel());
            await _openIddictApplicationRepository.UpdateAsync(client, autoSave: true);
        }

        if (!HasSameScopes(client, application))
        {
            client.Permissions = JsonSerializer.Serialize(application.Permissions.Select(q => q.ToString()));
            await _applicationManager.UpdateAsync(client.ToModel());
            await _openIddictApplicationRepository.UpdateAsync(client, autoSave: true);
        }
    }

    private bool HasSameRedirectUris(OpenIddictApplication existingClient, AbpApplicationDescriptor application)
    {
        if (string.IsNullOrWhiteSpace(existingClient.RedirectUris) || string.IsNullOrWhiteSpace(existingClient.PostLogoutRedirectUris))
        {
            return false;
        }

        try
        {
            var existingUris = JsonSerializer.Deserialize<List<string>>(existingClient.RedirectUris) ?? new List<string>();
            var newUris = application.RedirectUris.Select(q => q.ToString().TrimEnd('/')).ToList();

            var existingPostLogout = JsonSerializer.Deserialize<List<string>>(existingClient.PostLogoutRedirectUris) ?? new List<string>();
            var newPostLogout = application.PostLogoutRedirectUris.Select(q => q.ToString().TrimEnd('/')).ToList();

            var urisMatch = existingUris.Count == newUris.Count && !existingUris.Except(newUris, StringComparer.OrdinalIgnoreCase).Any();
            var postLogoutMatch = existingPostLogout.Count == newPostLogout.Count && !existingPostLogout.Except(newPostLogout, StringComparer.OrdinalIgnoreCase).Any();

            return urisMatch && postLogoutMatch;
        }
        catch
        {
            return false;
        }
    }

    private bool HasSameScopes(OpenIddictApplication existingClient, AbpApplicationDescriptor application)
    {
        if (string.IsNullOrWhiteSpace(existingClient.Permissions))
        {
            return false;
        }

        try
        {
            var existingPermissions = JsonSerializer.Deserialize<List<string>>(existingClient.Permissions) ?? new List<string>();
            var newPermissions = application.Permissions.Select(q => q.ToString()).ToList();

            return existingPermissions.Count == newPermissions.Count && !existingPermissions.Except(newPermissions, StringComparer.OrdinalIgnoreCase).Any();
        }
        catch
        {
            return false;
        }
    }
}
