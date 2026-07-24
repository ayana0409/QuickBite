using QuickBite.Identity.Localization;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.Localization;

namespace QuickBite.Identity.Permissions;

public class IdentityPermissionDefinitionProvider : PermissionDefinitionProvider
{
    public override void Define(IPermissionDefinitionContext context)
    {
        var group = context.AddGroup(
            IdentityPermissions.GroupName,
            L("Permission:Identity")
        );

        //------------------------------------------------
        // USERS
        //------------------------------------------------

        var users = group.AddPermission(
            IdentityPermissions.Users,
            L("Permission:Users")
        );

        users.AddChild(
            IdentityPermissions.UsersView,
            L("Permission:View"));

        users.AddChild(
            IdentityPermissions.UsersCreate,
            L("Permission:Create"));

        users.AddChild(
            IdentityPermissions.UsersUpdate,
            L("Permission:Update"));

        users.AddChild(
            IdentityPermissions.UsersDelete,
            L("Permission:Delete"));


        //------------------------------------------------
        // ROLES
        //------------------------------------------------

        var roles = group.AddPermission(
            IdentityPermissions.Roles,
            L("Permission:Roles")
        );

        roles.AddChild(
            IdentityPermissions.RolesView,
            L("Permission:View"));

        roles.AddChild(
            IdentityPermissions.RolesCreate,
            L("Permission:Create"));

        roles.AddChild(
            IdentityPermissions.RolesUpdate,
            L("Permission:Update"));

        roles.AddChild(
            IdentityPermissions.RolesDelete,
            L("Permission:Delete"));


        //------------------------------------------------
        // PERMISSION DEFINITIONS
        //------------------------------------------------

        var definitions = group.AddPermission(
            IdentityPermissions.PermissionDefinitions,
            L("Permission:PermissionDefinitions")
        );

        definitions.AddChild(
            IdentityPermissions.PermissionDefinitionsView,
            L("Permission:View"));

        definitions.AddChild(
            IdentityPermissions.PermissionDefinitionsCreate,
            L("Permission:Create"));

        definitions.AddChild(
            IdentityPermissions.PermissionDefinitionsUpdate,
            L("Permission:Update"));

        definitions.AddChild(
            IdentityPermissions.PermissionDefinitionsDelete,
            L("Permission:Delete"));


        //------------------------------------------------
        // PERMISSION GRANTS
        //------------------------------------------------

        var grants = group.AddPermission(
            IdentityPermissions.PermissionGrants,
            L("Permission:PermissionGrants")
        );

        grants.AddChild(
            IdentityPermissions.PermissionGrantsView,
            L("Permission:View"));

        grants.AddChild(
            IdentityPermissions.PermissionGrantsCreate,
            L("Permission:Create"));

        grants.AddChild(
            IdentityPermissions.PermissionGrantsUpdate,
            L("Permission:Update"));

        grants.AddChild(
            IdentityPermissions.PermissionGrantsDelete,
            L("Permission:Delete"));
    }

    private static LocalizableString L(string name)
    {
        return LocalizableString.Create<IdentityResource>(name);
    }
}
