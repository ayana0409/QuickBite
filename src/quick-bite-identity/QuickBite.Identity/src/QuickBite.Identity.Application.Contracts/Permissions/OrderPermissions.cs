namespace QuickBite.Identity.Permissions;

public static class OrderPermissions
{
    public const string GroupName = "Order";

    #region "Orders"
    public const string Orders = GroupName + ".Orders";
    public const string OrdersAdminView = Orders + ".AdminView";
    public const string OrdersForceCancel = Orders + ".ForceCancel";
    public const string OrdersCreate = Orders + ".Create";
    public const string OrdersUpdate = Orders + ".Update";
    public const string OrdersDelete = Orders + ".Delete";
    #endregion
}
