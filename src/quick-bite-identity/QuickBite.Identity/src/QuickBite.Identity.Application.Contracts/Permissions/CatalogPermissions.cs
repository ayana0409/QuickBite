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
    public const string CategoriesModeration = Categories + ".Moderation";
    #endregion

    #region "Food Item"
    public const string FoodItems = GroupName + ".FoodItems";
    public const string FoodItemsView = FoodItems + ".View";
    public const string FoodItemsCreate = FoodItems + ".Create";
    public const string FoodItemsUpdate = FoodItems + ".Update";
    public const string FoodItemsDelete = FoodItems + ".Delete";
    #endregion

    #region "Requests"
    public const string Requests = GroupName + ".Requests";
    public const string RequestsView = Requests + ".View";
    public const string RequestsProcess = Requests + ".Process";
    #endregion
}