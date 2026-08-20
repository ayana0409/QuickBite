using QuickBite.Identity.Localization;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.Localization;

namespace QuickBite.Identity.Permissions;

public class OrderPermissionDefinitionProvider : PermissionDefinitionProvider
{
    public override void Define(IPermissionDefinitionContext context)
    {
        var group = context.AddGroup(
            OrderPermissions.GroupName,
            L("Permission:Order")
        );

        #region "Orders"

        var orders = group.AddPermission(
            OrderPermissions.Orders,
            L("Permission:Orders")
        );

        orders.AddChild(
            OrderPermissions.OrdersAdminView,
            L("Permission:Orders.AdminView")
        );

        orders.AddChild(
            OrderPermissions.OrdersForceCancel,
            L("Permission:Orders.ForceCancel")
        );

        orders.AddChild(
            OrderPermissions.OrdersCreate,
            L("Permission:Create")
        );

        orders.AddChild(
            OrderPermissions.OrdersUpdate,
            L("Permission:Update")
        );

        orders.AddChild(
            OrderPermissions.OrdersDelete,
            L("Permission:Delete")
        );

        #endregion
    }

    private static LocalizableString L(string name)
    {
        return LocalizableString.Create<IdentityResource>(name);
    }
}
