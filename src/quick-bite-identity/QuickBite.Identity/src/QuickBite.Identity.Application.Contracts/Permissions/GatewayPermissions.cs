namespace QuickBite.Identity.Permissions;

public static class GatewayPermissions
{
    public const string GroupName = "Gateway";

    #region "Config"
    public const string Config = GroupName + ".Config";
    public const string ConfigView = Config + ".View";
    public const string ConfigUpdate = Config + ".Update";
    #endregion
}
