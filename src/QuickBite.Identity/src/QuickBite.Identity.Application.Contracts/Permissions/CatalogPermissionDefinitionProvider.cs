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


        //------------------------------------------------
        // RESTAURANTS
        //------------------------------------------------

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
    }


    private static LocalizableString L(string name)
    {
        return LocalizableString.Create<IdentityResource>(name);
    }
}