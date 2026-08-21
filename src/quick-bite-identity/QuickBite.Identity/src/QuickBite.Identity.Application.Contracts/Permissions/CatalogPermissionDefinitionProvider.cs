using QuickBite.Identity.Localization;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.Localization;

namespace QuickBite.Identity.Permissions;

public class CatalogPermissionDefinitionProvider
    : PermissionDefinitionProvider
{
    public override void Define(
        IPermissionDefinitionContext context)
    {
        var group = context.AddGroup(
            CatalogPermissions.GroupName,
            L("Permission:Catalog")
        );

        #region "Restaurant"

        var restaurants = group.AddPermission(
            CatalogPermissions.Restaurants,
            L("Permission:Restaurants")
        );

        restaurants.AddChild(
            CatalogPermissions.RestaurantsView,
            L("Permission:View")
        );

        restaurants.AddChild(
            CatalogPermissions.RestaurantsCreate,
            L("Permission:Create")
        );

        restaurants.AddChild(
            CatalogPermissions.RestaurantsUpdate,
            L("Permission:Update")
        );

        restaurants.AddChild(
            CatalogPermissions.RestaurantsDelete,
            L("Permission:Delete")
        );

        #endregion

        #region "Category"

        var categories = group.AddPermission(
            CatalogPermissions.Categories,
            L("Permission:Categories")
        );

        categories.AddChild(
            CatalogPermissions.CategoriesView,
            L("Permission:View")
        );

        categories.AddChild(
            CatalogPermissions.CategoriesCreate,
            L("Permission:Create")
        );

        categories.AddChild(
            CatalogPermissions.CategoriesUpdate,
            L("Permission:Update")
        );

        categories.AddChild(
            CatalogPermissions.CategoriesDelete,
            L("Permission:Delete")
        );

        categories.AddChild(
            CatalogPermissions.CategoriesModeration,
            L("Permission:Moderation")
        );

        #endregion

        #region "Food item"

        var foodItems = group.AddPermission(
            CatalogPermissions.FoodItems,
            L("Permission:FoodItems")
        );

        foodItems.AddChild(
            CatalogPermissions.FoodItemsView,
            L("Permission:View")
        );

        foodItems.AddChild(
            CatalogPermissions.FoodItemsCreate,
            L("Permission:Create")
        );

        foodItems.AddChild(
            CatalogPermissions.FoodItemsUpdate,
            L("Permission:Update")
        );

        foodItems.AddChild(
            CatalogPermissions.FoodItemsDelete,
            L("Permission:Delete")
        );

        #endregion

        #region "Request"

        var requests = group.AddPermission(
            CatalogPermissions.Requests,
            L("Permission:Requests")
        );

        requests.AddChild(
            CatalogPermissions.RequestsView,
            L("Permission:View")
        );

        requests.AddChild(
            CatalogPermissions.RequestsProcess,
            L("Permission:Process")
        );

        #endregion
    }


    private static LocalizableString L(string name)
    {
        return LocalizableString.Create<IdentityResource>(name);
    }
}