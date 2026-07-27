namespace QuickBite.Identity.Permissions;

public static class CatalogPermissions
{
    public const string GroupName = "Catalog";


    public const string Restaurants =
        GroupName + ".Restaurants";


    public const string RestaurantsView =
        Restaurants + ".View";


    public const string RestaurantsCreate =
        Restaurants + ".Create";


    public const string RestaurantsUpdate =
        Restaurants + ".Update";


    public const string RestaurantsDelete =
        Restaurants + ".Delete";
}