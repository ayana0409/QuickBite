using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using QuickBite.Identity.Localization;
using QuickBite.Identity.MultiTenancy;
using Volo.Abp.Identity.Web.Navigation;
using Volo.Abp.SettingManagement.Web.Navigation;
using Volo.Abp.UI.Navigation;
using Volo.Abp.Users;

namespace QuickBite.Identity.Web.Menus;

public class IdentityMenuContributor : IMenuContributor
{
    public async Task ConfigureMenuAsync(MenuConfigurationContext context)
    {
        if (context.Menu.Name == StandardMenus.Main)
        {
            await ConfigureMainMenuAsync(context);
        }
    }

    private Task ConfigureMainMenuAsync(MenuConfigurationContext context)
    {
        var administration = context.Menu.GetAdministration();
        var l = context.GetLocalizer<IdentityResource>();
        var currentUser = context.ServiceProvider.GetRequiredService<ICurrentUser>();
        var configuration = context.ServiceProvider.GetRequiredService<IConfiguration>();

        // Read dynamic ecosystem URLs from configuration / environment variables
        var quickBiteUrl = configuration["Ecosystem:QuickBiteUrl"] 
                           ?? Environment.GetEnvironmentVariable("ECOSYSTEM_QUICKBITE_URL") 
                           ?? "https://quickbite-wnkc.onrender.com";

        var shorterLinkUrl = configuration["Ecosystem:ShorterLinkUrl"] 
                             ?? Environment.GetEnvironmentVariable("ECOSYSTEM_SHORTERLINK_URL") 
                             ?? "https://shink.onrender.com";

        // Top-level menu: Ecosystem Home
        context.Menu.Items.Insert(
            0,
            new ApplicationMenuItem(
                IdentityMenus.Home,
                l["Menu:Home"] ?? "Ecosystem Portal",
                "~/",
                icon: "fas fa-atom",
                order: 0
            )
        );

        // Ecosystem Link 1: QuickBite
        context.Menu.AddItem(
            new ApplicationMenuItem(
                "QuickUniverse.QuickBite",
                "QuickBite",
                url: quickBiteUrl,
                icon: "fas fa-utensils",
                target: "_blank",
                order: 1
            )
        );

        // Ecosystem Link 2: ShorterLink
        context.Menu.AddItem(
            new ApplicationMenuItem(
                "QuickUniverse.ShorterLink",
                "ShorterLink",
                url: shorterLinkUrl,
                icon: "fas fa-link",
                target: "_blank",
                order: 2
            )
        );

        // Only users with "admin" or "Admin" role can access Accounts & Roles under Administration
        var isAdmin = currentUser.IsAuthenticated && (currentUser.IsInRole("admin") || currentUser.IsInRole("Admin"));

        if (isAdmin)
        {
            // Add Accounts under Administration
            administration.AddItem(
                new ApplicationMenuItem(
                    IdentityMenus.Accounts,
                    l["Menu:Accounts"] ?? l["Account"],
                    "~/accounts",
                    icon: "fas fa-users",
                    order: 1
                )
            );

            // Add Roles under Administration
            administration.AddItem(
                new ApplicationMenuItem(
                    IdentityMenus.Roles,
                    l["Menu:Roles"] ?? l["Roles"],
                    "~/roles",
                    icon: "fas fa-user-shield",
                    order: 2
                )
            );
        }

        administration.SetSubItemOrder(IdentityMenuNames.GroupName, 2);
        administration.SetSubItemOrder(SettingManagementMenuNames.GroupName, 3);

        return Task.CompletedTask;
    }
}
