namespace QuickBite.Identity.Permissions;

public static class RestaurantPermissions
{
    public const string GroupName = "Restaurant";


    //------------------------------------------------
    // RESTAURANTS
    //------------------------------------------------

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