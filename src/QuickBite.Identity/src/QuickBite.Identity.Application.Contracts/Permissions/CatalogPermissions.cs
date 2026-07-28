namespace QuickBite.Identity.Permissions;

public static class CatalogPermissions
{
    public const string GroupName = "Catalog";

#region "Restaurant"
    public const string Restaurants = GroupName + ".Restaurants";
    public const string RestaurantsView = Restaurants + ".View";
    public const string RestaurantsCreate = Restaurants + ".Create";
    public const string RestaurantsUpdate = Restaurants + ".Update";
    public const string RestaurantsDelete = Restaurants + ".Delete";
#endregion
    
#region "Category"
    public const string Categories = GroupName + ".Categories";
    public const string CategoriesView = Categories + ".View";
    public const string CategoriesCreate = Categories + ".Create";
    public const string CategoriesUpdate = Categories + ".Update";
    public const string CategoriesDelete = Categories + ".Delete";
#endregion

}