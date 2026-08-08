using QuickBite.Order.Localization;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.Localization;

namespace QuickBite.Order.Permissions;

public class OrderPermissionDefinitionProvider : PermissionDefinitionProvider
{
    public override void Define(IPermissionDefinitionContext context)
    {
        var myGroup = context.AddGroup(OrderPermissions.GroupName);
        //Define your own permissions here. Example:
        //myGroup.AddPermission(OrderPermissions.MyPermission1, L("Permission:MyPermission1"));
    }

    private static LocalizableString L(string name)
    {
        return LocalizableString.Create<OrderResource>(name);
    }
}
