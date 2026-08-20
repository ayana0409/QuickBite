using System.Collections.Generic;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.Security.Claims;

namespace QuickBite.Order.Permissions;

public class ClaimPermissionValueProvider : PermissionValueProvider
{
    public const string ProviderName = "Claim";

    public override string Name => ProviderName;

    public ClaimPermissionValueProvider(IPermissionStore permissionStore)
        : base(permissionStore)
    {
    }

    public override Task<PermissionGrantResult> CheckAsync(PermissionValueCheckContext context)
    {
        var principal = context.Principal;
        if (principal == null || principal.Identity?.IsAuthenticated != true)
        {
            return Task.FromResult(PermissionGrantResult.Undefined);
        }

        // 1. If user is in Admin role, automatically grant permission
        if (principal.IsInRole("Admin") || 
            principal.IsInRole("admin") ||
            principal.HasClaim(c => (c.Type == ClaimTypes.Role || c.Type == "role" || c.Type == "roles" || c.Type == AbpClaimTypes.Role) && string.Equals(c.Value, "Admin", System.StringComparison.OrdinalIgnoreCase)))
        {
            return Task.FromResult(PermissionGrantResult.Granted);
        }

        // 2. Check "permissions" claim array (JSON string emitted by Identity Server)
        var permissionsClaim = principal.FindFirst("permissions")?.Value;
        if (!string.IsNullOrWhiteSpace(permissionsClaim))
        {
            try
            {
                var grantedList = JsonSerializer.Deserialize<List<string>>(permissionsClaim);
                if (grantedList != null && grantedList.Contains(context.Permission.Name))
                {
                    return Task.FromResult(PermissionGrantResult.Granted);
                }
            }
            catch
            {
                if (permissionsClaim.Contains(context.Permission.Name))
                {
                    return Task.FromResult(PermissionGrantResult.Granted);
                }
            }
        }

        // 3. Check individual "permission" claims
        var individualClaims = principal.FindAll("permission");
        foreach (var claim in individualClaims)
        {
            if (claim.Value == context.Permission.Name)
            {
                return Task.FromResult(PermissionGrantResult.Granted);
            }
        }

        return Task.FromResult(PermissionGrantResult.Undefined);
    }

    public override Task<MultiplePermissionGrantResult> CheckAsync(PermissionValuesCheckContext context)
    {
        var result = new MultiplePermissionGrantResult();
        var principal = context.Principal;

        if (principal == null || principal.Identity?.IsAuthenticated != true)
        {
            foreach (var permission in context.Permissions)
            {
                result.Result.Add(permission.Name, PermissionGrantResult.Undefined);
            }
            return Task.FromResult(result);
        }

        var isAdmin = principal.IsInRole("Admin") || 
                      principal.IsInRole("admin") ||
                      principal.HasClaim(c => (c.Type == ClaimTypes.Role || c.Type == "role" || c.Type == "roles" || c.Type == AbpClaimTypes.Role) && string.Equals(c.Value, "Admin", System.StringComparison.OrdinalIgnoreCase));

        var grantedList = new HashSet<string>();
        var permissionsClaim = principal.FindFirst("permissions")?.Value;
        if (!string.IsNullOrWhiteSpace(permissionsClaim))
        {
            try
            {
                var parsed = JsonSerializer.Deserialize<List<string>>(permissionsClaim);
                if (parsed != null)
                {
                    foreach (var p in parsed) grantedList.Add(p);
                }
            }
            catch
            {
                // Ignore parse errors
            }
        }

        foreach (var claim in principal.FindAll("permission"))
        {
            grantedList.Add(claim.Value);
        }

        foreach (var permission in context.Permissions)
        {
            if (isAdmin || grantedList.Contains(permission.Name))
            {
                result.Result.Add(permission.Name, PermissionGrantResult.Granted);
            }
            else
            {
                result.Result.Add(permission.Name, PermissionGrantResult.Undefined);
            }
        }

        return Task.FromResult(result);
    }
}
