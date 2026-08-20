namespace QuickBite.Order.Permissions;

public static class OrderPermissions
{
    public const string GroupName = "Order";

    public static class Orders
    {
        public const string Default = GroupName + ".Orders";
        public const string AdminView = Default + ".AdminView";
        public const string ForceCancel = Default + ".ForceCancel";
        public const string Create = Default + ".Create";
        public const string Update = Default + ".Update";
        public const string Delete = Default + ".Delete";
    }
}
