using QuickBite.Order.Localization;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.Localization;

namespace QuickBite.Order.Permissions;

public class OrderPermissionDefinitionProvider : PermissionDefinitionProvider
{
    public override void Define(IPermissionDefinitionContext context)
    {
        var myGroup = context.AddGroup(OrderPermissions.GroupName, L("Permission:Order"));
        
        var orders = myGroup.AddPermission(OrderPermissions.Orders.Default, L("Permission:Orders"));
        orders.AddChild(OrderPermissions.Orders.AdminView, L("Permission:Orders.AdminView"));
        orders.AddChild(OrderPermissions.Orders.ForceCancel, L("Permission:Orders.ForceCancel"));
        orders.AddChild(OrderPermissions.Orders.Create, L("Permission:Orders.Create"));
        orders.AddChild(OrderPermissions.Orders.Update, L("Permission:Orders.Update"));
        orders.AddChild(OrderPermissions.Orders.Delete, L("Permission:Orders.Delete"));
    }

    private static LocalizableString L(string name)
    {
        return LocalizableString.Create<OrderResource>(name);
    }
}
