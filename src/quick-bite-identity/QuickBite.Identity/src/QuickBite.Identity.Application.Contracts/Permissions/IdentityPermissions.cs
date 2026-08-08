namespace QuickBite.Identity.Permissions;

public static class IdentityPermissions
{
    public const string GroupName = "Identity";

    
    // USERS

    public const string Users = GroupName + ".Users";

    public const string UsersView = Users + ".View";
    public const string UsersCreate = Users + ".Create";
    public const string UsersUpdate = Users + ".Update";
    public const string UsersDelete = Users + ".Delete";


    // ROLES

    public const string Roles = GroupName + ".Roles";

    public const string RolesView = Roles + ".View";
    public const string RolesCreate = Roles + ".Create";
    public const string RolesUpdate = Roles + ".Update";
    public const string RolesDelete = Roles + ".Delete";


    // PERMISSION DEFINITIONS

    public const string PermissionDefinitions = GroupName + ".PermissionDefinitions";

    public const string PermissionDefinitionsView = PermissionDefinitions + ".View";

    public const string PermissionDefinitionsCreate = PermissionDefinitions + ".Create";

    public const string PermissionDefinitionsUpdate = PermissionDefinitions + ".Update";

    public const string PermissionDefinitionsDelete = PermissionDefinitions + ".Delete";


    // PERMISSION GRANTS

    public const string PermissionGrants = GroupName + ".PermissionGrants";

    public const string PermissionGrantsView = PermissionGrants + ".View";

    public const string PermissionGrantsCreate = PermissionGrants + ".Create";

    public const string PermissionGrantsUpdate = PermissionGrants + ".Update";

    public const string PermissionGrantsDelete = PermissionGrants + ".Delete";
}
