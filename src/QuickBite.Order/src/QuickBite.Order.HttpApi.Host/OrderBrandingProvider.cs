using Microsoft.Extensions.Localization;
using QuickBite.Order.Localization;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Ui.Branding;

namespace QuickBite.Order;

[Dependency(ReplaceServices = true)]
public class OrderBrandingProvider : DefaultBrandingProvider
{
    private IStringLocalizer<OrderResource> _localizer;

    public OrderBrandingProvider(IStringLocalizer<OrderResource> localizer)
    {
        _localizer = localizer;
    }

    public override string AppName => _localizer["AppName"];
}
