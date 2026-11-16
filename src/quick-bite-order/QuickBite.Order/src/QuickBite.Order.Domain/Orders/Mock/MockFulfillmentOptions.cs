using Microsoft.Extensions.Configuration;

namespace QuickBite.Order.Domain.Orders.Mock;

public class MockFulfillmentOptions
{
    public bool Enabled { get; set; } = true;
    public int PreparationTimePerItemSeconds { get; set; } = 2;
    public int DeliveryTimePerKmSeconds { get; set; } = 3;

    public static MockFulfillmentOptions FromEnvOrConfig(IConfiguration configuration)
    {
        var options = new MockFulfillmentOptions
        {
            // Read directly from appsettings.json "MockFulfillment:Enabled"
            Enabled = configuration.GetValue<bool>("MockFulfillment:Enabled", true),
            PreparationTimePerItemSeconds = configuration.GetValue<int>("MockFulfillment:PreparationTimePerItemSeconds", 2),
            DeliveryTimePerKmSeconds = configuration.GetValue<int>("MockFulfillment:DeliveryTimePerKmSeconds", 3)
        };

        return options;
    }
}
