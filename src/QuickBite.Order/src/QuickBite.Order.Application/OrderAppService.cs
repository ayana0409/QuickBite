using System;
using System.Collections.Generic;
using System.Text;
using QuickBite.Order.Localization;
using Volo.Abp.Application.Services;

namespace QuickBite.Order;

/* Inherit your application services from this class.
 */
public abstract class OrderAppService : ApplicationService
{
    protected OrderAppService()
    {
        LocalizationResource = typeof(OrderResource);
    }
}
