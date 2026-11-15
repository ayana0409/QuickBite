using QuickBite.Identity.Localization;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.Localization;

namespace QuickBite.Identity.Permissions;

/// <summary>
/// Registers device permissions into ABP Permission Definition Manager.
/// </summary>
public class DevicePermissionDefinitionProvider : PermissionDefinitionProvider
{
    public override void Define(IPermissionDefinitionContext context)
    {
        var group = context.AddGroup(
            DevicePermissions.GroupName,
            L("Permission:Device")
        );

        group.AddPermission(
            DevicePermissions.XiaomiNwtAirConditioner,
            L("Permission:XiaomiNwtAirConditioner")
        );
    }

    private static LocalizableString L(string name)
    {
        return LocalizableString.Create<IdentityResource>(name);
    }
}
