using QuickBite.Identity.Localization;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.Localization;

namespace QuickBite.Identity.Permissions;

public class RestaurantPermissionDefinitionProvider
    : PermissionDefinitionProvider
{
    public override void Define(
        IPermissionDefinitionContext context)
    {

        var group = context.AddGroup(
            RestaurantPermissions.GroupName,
            L("Permission:Restaurant")
        );


        //------------------------------------------------
        // RESTAURANTS
        //------------------------------------------------

        var restaurants = group.AddPermission(
            RestaurantPermissions.Restaurants,
            L("Permission:Restaurants")
        );


        restaurants.AddChild(
            RestaurantPermissions.RestaurantsView,
            L("Permission:View")
        );


        restaurants.AddChild(
            RestaurantPermissions.RestaurantsCreate,
            L("Permission:Create")
        );


        restaurants.AddChild(
            RestaurantPermissions.RestaurantsUpdate,
            L("Permission:Update")
        );


        restaurants.AddChild(
            RestaurantPermissions.RestaurantsDelete,
            L("Permission:Delete")
        );
    }


    private static LocalizableString L(string name)
    {
        return LocalizableString.Create<IdentityResource>(name);
    }
}