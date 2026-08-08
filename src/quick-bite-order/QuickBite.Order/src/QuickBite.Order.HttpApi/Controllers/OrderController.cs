using QuickBite.Order.Localization;
using Volo.Abp.AspNetCore.Mvc;

namespace QuickBite.Order.Controllers;

/* Inherit your controllers from this class.
 */
public abstract class OrderController : AbpControllerBase
{
    protected OrderController()
    {
        LocalizationResource = typeof(OrderResource);
    }
}
