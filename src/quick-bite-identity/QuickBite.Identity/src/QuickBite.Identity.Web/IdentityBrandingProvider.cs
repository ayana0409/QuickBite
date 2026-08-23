using Microsoft.Extensions.Localization;
using QuickBite.Identity.Localization;
using Volo.Abp.Ui.Branding;
using Volo.Abp.DependencyInjection;

namespace QuickBite.Identity.Web;

[Dependency(ReplaceServices = true)]
public class IdentityBrandingProvider : DefaultBrandingProvider
{
    private IStringLocalizer<IdentityResource> _localizer;

    public IdentityBrandingProvider(IStringLocalizer<IdentityResource> localizer)
    {
        _localizer = localizer;
    }

    public override string AppName => _localizer["AppName"] ?? "Quick Universe";
}
