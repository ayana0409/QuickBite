using System.Collections.Generic;

namespace QuickBite.Identity.OpenIddict;


/// <summary>
/// Represents a custom OpenIddict scope loaded from configuration (appsettings.json / env vars).
/// Maps to the "OpenIddict:Scopes" array.
/// </summary>
public class OpenIddictScopeConfig
{
    /// <summary>Unique scope name (e.g. "Identity", "QuickTest")</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Human-readable display name shown in consent screens</summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>The resource (API) this scope protects (usually same as Name)</summary>
    public string Resource { get; set; } = string.Empty;
}

/// <summary>
/// Represents an OpenIddict client application loaded from configuration.
/// Maps to the "OpenIddict:Applications:Clients" array.
/// </summary>
public class OpenIddictClientConfig
{
    /// <summary>Unique client ID used in OAuth2 flows</summary>
    public string ClientId { get; set; } = string.Empty;

    /// <summary>Human-readable display name</summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>Client type: "public" or "confidential"</summary>
    public string Type { get; set; } = "public";

    /// <summary>Client secret — only required when Type is "confidential"</summary>
    public string? Secret { get; set; }

    /// <summary>
    /// Grant types to allow.
    /// Values: "authorization_code", "password", "refresh_token", "implicit", "client_credentials".
    /// </summary>
    public List<string> GrantTypes { get; set; } = new();

    /// <summary>
    /// Scopes this client can request.
    /// Use built-in names ("address", "email", "phone", "profile", "roles", "offline_access")
    /// or custom scope names defined in OpenIddict:Scopes (e.g. "Identity", "QuickTest").
    /// </summary>
    public List<string> Scopes { get; set; } = new();

    /// <summary>Allowed redirect URIs after successful authorization</summary>
    public List<string> RedirectUris { get; set; } = new();

    /// <summary>Allowed URIs to redirect after logout</summary>
    public List<string> PostLogoutRedirectUris { get; set; } = new();

    /// <summary>URI of the client application itself</summary>
    public string? ClientUri { get; set; }
}
