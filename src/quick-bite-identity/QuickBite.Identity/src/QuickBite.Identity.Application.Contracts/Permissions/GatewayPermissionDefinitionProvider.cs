using QuickBite.Identity.Localization;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.Localization;

namespace QuickBite.Identity.Permissions;

public class GatewayPermissionDefinitionProvider : PermissionDefinitionProvider
{
    public override void Define(IPermissionDefinitionContext context)
    {
        var group = context.AddGroup(
            GatewayPermissions.GroupName,
            L("Permission:Gateway")
        );

        #region "Config"

        var config = group.AddPermission(
            GatewayPermissions.Config,
            L("Permission:Config")
        );

        config.AddChild(
            GatewayPermissions.ConfigView,
            L("Permission:View")
        );

        config.AddChild(
            GatewayPermissions.ConfigUpdate,
            L("Permission:Update")
        );

        #endregion
    }

    private static LocalizableString L(string name)
    {
        return LocalizableString.Create<IdentityResource>(name);
    }
}
