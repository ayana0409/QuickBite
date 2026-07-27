using QuickBite.Identity.Permissions;
using System.Collections.Generic;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Security.Claims;

namespace QuickBite.Identity.Claims;

public class PermissionClaimsPrincipalContributor
    : IAbpClaimsPrincipalContributor
{
    private readonly IPermissionDefinitionManager _permissionDefinitionManager;
    private readonly IPermissionChecker _permissionChecker;


    public PermissionClaimsPrincipalContributor(
        IPermissionDefinitionManager permissionDefinitionManager,
        IPermissionChecker permissionChecker)
    {
        _permissionDefinitionManager = permissionDefinitionManager;
        _permissionChecker = permissionChecker;
    }


    public async Task ContributeAsync(
        AbpClaimsPrincipalContributorContext context)
    {
        var identity =
            context.ClaimsPrincipal.Identity as ClaimsIdentity;

        if (identity == null)
            return;


        var permissions = await _permissionDefinitionManager
                        .GetPermissionsAsync();

        var grantedPermissions = new List<string>();

        foreach (var permission in permissions)
        {
            if (await _permissionChecker.IsGrantedAsync(permission.Name))
            {
                grantedPermissions.Add(permission.Name);
            }
        }

        identity.AddClaim(
            new Claim(
                "permissions",
                JsonSerializer.Serialize(grantedPermissions)
            )
        );
    }
}